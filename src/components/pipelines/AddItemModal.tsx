import { useState, useEffect, useCallback } from 'react';
import { getContactColor } from '@/utils/avatar';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { Search, User, Phone, Mail, MessageSquare } from 'lucide-react';
import { ConversationForModal, PipelineStage } from '@/types/analytics';
import { pipelinesService } from '@/services/pipelines';
import { toast } from 'sonner';
import { Contact } from '@/types/contacts';

interface Item {
  id: string;
  display_id?: string;
  name?: string;
  status?: string;
  created_at?: string;
  last_activity_at?: string;
  email?: string;
  phone_number?: string;
  avatar_url?: string;
  contact?: {
    id: string;
    name: string;
    email?: string;
    phone_number?: string;
    avatar_url?: string;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  last_message?: {
    content: string;
    created_at: string;
  };
}

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  stages: PipelineStage[];
  preselectedStage?: PipelineStage | null;
  onItemAdded: () => void;
}

export default function AddItemModal({
  open,
  onOpenChange,
  pipelineId,
  stages,
  preselectedStage,
  onItemAdded,
}: AddItemModalProps) {
  const { t } = useLanguage('pipelines');
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [itemType, setItemType] = useState<'conversation' | 'contact'>('conversation');
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Initialize modal
  useEffect(() => {
    if (open) {
      // Reset form
      setSelectedItem(null);
      setSearchQuery('');
      setNotes('');
      setItemType('conversation');

      // Pre-select stage
      if (preselectedStage) {
        setSelectedStage(preselectedStage);
      } else if (stages.length > 0) {
        setSelectedStage(stages[0]);
      }
    }
  }, [open, preselectedStage, stages]);

  // Load available items from API
  const loadAvailableItems = useCallback(async () => {
    setIsLoadingItems(true);
    setAvailableItems([]);
    try {
      let data: ConversationForModal[] | Contact[];

      if (itemType === 'conversation') {
        data = await pipelinesService.getAvailableConversations(pipelineId, {
          search: searchQuery,
        });
      } else {
        data = await pipelinesService.getAvailableContacts(pipelineId, { search: searchQuery }) as Contact[];
      }

      setAvailableItems(data as Item[]);
    } catch (error) {
      console.error('Error loading items:', error);
      toast.error(t('addItem.loadError'));
      setAvailableItems([]);
    } finally {
      setIsLoadingItems(false);
    }
  }, [pipelineId, searchQuery, itemType, t]);

  // Debounced search effect
  useEffect(() => {
    if (!open) return;

    const timeoutId = setTimeout(() => {
      loadAvailableItems();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, itemType, loadAvailableItems, open]);

  // Handle item selection
  const handleItemSelect = (item: Item) => {
    setSelectedItem(item);
  };

  // Handle adding item to pipeline
  const handleAddItem = async () => {
    if (!selectedStage || !selectedItem) return;

    setIsAdding(true);
    try {
      await pipelinesService.addItemToPipeline(pipelineId, {
        item_id: selectedItem.id,
        type: itemType,
        pipeline_stage_id: selectedStage.id,
        custom_fields: {},
        notes: notes,
      });

      // Remove from available items
      setAvailableItems(prev => prev.filter(item => item.id !== selectedItem.id));

      toast.success(t('addItem.success'));
      onItemAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding item:', error);

      // Handle error messages
      let errorMessage = t('addItem.error');
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsAdding(false);
    }
  };

  // Get item display name
  const getItemDisplayName = (item: Item) => {
    if (itemType === 'conversation') {
      return item.contact?.name || t('addItem.unknownUser');
    }
    return item.name || t('addItem.unknownUser');
  };

  const canAddItem = selectedStage && selectedItem;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] min-h-[500px] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('addItem.title')}</DialogTitle>
          <DialogDescription>{t('addItem.description')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 flex-1 overflow-y-auto">
          {/* Stage Selection */}
          <div className="grid gap-2">
            <Label>{t('addItem.selectStage')}</Label>
            <Select
              value={selectedStage?.id.toString()}
              onValueChange={value => {
                const stage = stages.find(s => s.id.toString() === value);
                setSelectedStage(stage || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('addItem.chooseStage')} />
              </SelectTrigger>
              <SelectContent>
                {stages.map(stage => (
                  <SelectItem key={stage.id} value={stage.id.toString()}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      {stage.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Item Type Selection */}
          <div className="grid gap-2">
            <Label>{t('addItem.itemType')}</Label>
            <Select
              value={itemType}
              onValueChange={(value: 'conversation' | 'contact') => {
                setAvailableItems([]);
                setItemType(value);
                setSelectedItem(null);
                setSearchQuery('');
                setNotes('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('addItem.chooseItemType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conversation">{t('addItem.itemTypes.conversation')}</SelectItem>
                <SelectItem value="contact">{t('addItem.itemTypes.contact')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="grid gap-2">
            <Label>{t('addItem.searchItems')}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('addItem.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Items List */}
          <div className="grid gap-2">
            <Label>{t('addItem.availableItems')}</Label>
            <div className="border rounded-lg h-48 overflow-y-auto">
              {isLoadingItems ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : availableItems.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {searchQuery ? t('addItem.noItemsFound') : t('addItem.noItemsAvailable')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {availableItems.map(item => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedItem?.id === item.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => handleItemSelect(item)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: getContactColor(getItemDisplayName(item)) }}
                        >
                          {getItemDisplayName(item)[0]?.toUpperCase() || 'U'}
                        </div>

                        {/* Item Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold truncate">
                              {getItemDisplayName(item)}
                            </h4>
                            {item.display_id && (
                              <span className="text-xs text-muted-foreground">
                                {item.display_id}
                              </span>
                            )}
                          </div>

                          {/* Contact Details */}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                            {(item.email || item.contact?.email) && (
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                <span className="truncate max-w-32">
                                  {item.email || item.contact?.email}
                                </span>
                              </div>
                            )}
                            {(item.phone_number || item.contact?.phone_number) && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                <span>{item.phone_number || item.contact?.phone_number}</span>
                              </div>
                            )}
                          </div>

                          {/* Last Message (for conversations) */}
                          {itemType === 'conversation' && item.last_message && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {item.last_message.content}
                            </p>
                          )}

                          {/* Assignee (for conversations) */}
                          {itemType === 'conversation' && item.assignee && (
                            <div className="flex items-center gap-1 mt-1">
                              <User className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {item.assignee.name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label>{t('addItem.notes')}</Label>
            <Textarea
              placeholder={t('addItem.notesPlaceholder')}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAdding}>
            {t('addItem.cancel')}
          </Button>
          <Button onClick={handleAddItem} disabled={!canAddItem || isAdding}>
            {isAdding ? t('addItem.adding') : t('addItem.add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
