import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@evoapi/design-system/dialog';
import { Button } from '@evoapi/design-system/button';
import { Input } from '@evoapi/design-system/input';
import { Badge } from '@evoapi/design-system/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@evoapi/design-system/avatar';
import { Checkbox } from '@evoapi/design-system/checkbox';
import { Search, User, Users, Tag, X, Plus } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import LabelModal from '@/components/labels/LabelModal';

export interface AssignmentOption {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
  color?: string;
}

export type AssignmentType = 'agent' | 'team' | 'label';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => Promise<void>;
  type: AssignmentType;
  title: string;
  description: string;
  options: AssignmentOption[];
  currentSelection?: string[];
  multiSelect?: boolean;
  isLoading?: boolean;
  searchPlaceholder?: string;
  canCreateInline?: boolean;
  onCreateInline?: (data: { title: string; description?: string; color: string; show_on_sidebar?: boolean }) => Promise<AssignmentOption>;
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  type,
  title,
  description,
  options,
  currentSelection = [],
  multiSelect = false,
  isLoading = false,
  searchPlaceholder,
  canCreateInline = false,
  onCreateInline,
}) => {
  const { t } = useLanguage('chat');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(currentSelection);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extraOptions, setExtraOptions] = useState<AssignmentOption[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

  const defaultSearchPlaceholder = searchPlaceholder || t('assignmentModal.searchPlaceholder');

  const hasSelectionChanged = useMemo(() => {
    const sorted = [...selectedIds].sort();
    const sortedCurrent = [...currentSelection].sort();
    return sorted.length !== sortedCurrent.length || sorted.some((id, i) => id !== sortedCurrent[i]);
  }, [selectedIds, currentSelection]);

  // Reset selection when modal opens/closes or currentSelection changes
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(currentSelection);
      setSearchTerm('');
      setExtraOptions([]);
    }
  }, [isOpen, currentSelection]);

  const allOptions = useMemo(() => [...options, ...extraOptions], [options, extraOptions]);

  // Filter options based on search term (trimmed to stay consistent with hasExactMatch).
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredOptions = allOptions.filter(
    option =>
      option.name.toLowerCase().includes(normalizedSearch) ||
      option.description?.toLowerCase().includes(normalizedSearch),
  );

  const hasExactMatch =
    searchTerm.trim().length > 0 &&
    allOptions.some(o => o.name.toLowerCase() === searchTerm.trim().toLowerCase());

  const showCreateOption = canCreateInline && !!onCreateInline && !hasExactMatch;

  const handleOpenLabelModal = () => {
    setIsLabelModalOpen(true);
  };

  const handleLabelModalSubmit = async (data: {
    title: string;
    description?: string;
    color: string;
    show_on_sidebar?: boolean;
  }) => {
    if (!onCreateInline) return;
    setIsCreating(true);
    try {
      const newOption = await onCreateInline(data);
      setExtraOptions(prev => [...prev, newOption]);
      setSelectedIds(prev => [...prev, newOption.id]);
      setSearchTerm('');
      setIsLabelModalOpen(false);
    } catch {
      // Caller is expected to surface a toast; we keep the LabelModal open so the user can retry
      // without losing the form state.
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleSelection = (optionId: string) => {
    if (multiSelect) {
      setSelectedIds(prev =>
        prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId],
      );
    } else {
      setSelectedIds(prev => (prev.includes(optionId) ? [] : [optionId]));
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(selectedIds);
      onClose();
    } catch (error) {
      console.error('Error in assignment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'agent':
        return <User className="h-5 w-5" />;
      case 'team':
        return <Users className="h-5 w-5" />;
      case 'label':
        return <Tag className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const renderOption = (option: AssignmentOption) => {
    const isSelected = selectedIds.includes(option.id);

    return (
      <div
        key={option.id}
        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent ${isSelected ? 'bg-accent border-primary' : 'border-border'
          }`}
        onClick={() => handleToggleSelection(option.id)}
      >
        {multiSelect && (
          <Checkbox checked={isSelected} onChange={() => handleToggleSelection(option.id)} />
        )}

        {type === 'label' ? (
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: option.color || '#6b7280' }}
          />
        ) : (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={option.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {option.name[0]?.toUpperCase() || getIcon()}
            </AvatarFallback>
          </Avatar>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{option.name}</p>
          {option.description && (
            <p className="text-sm text-muted-foreground truncate">{option.description}</p>
          )}
        </div>

        {!multiSelect && isSelected && (
          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
        )}
      </div>
    );
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={defaultSearchPlaceholder}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Current Selection Display */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">
                {t('assignmentModal.selected')}
              </span>
              {selectedIds.map(id => {
                const option = allOptions.find(opt => opt.id === id);
                if (!option) return null;

                return (
                  <Badge key={id} variant="secondary" className="flex items-center gap-1">
                    {option.name}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={e => {
                        e.stopPropagation();
                        handleToggleSelection(id);
                      }}
                    />
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">
                  {t('assignmentModal.loading')}
                </div>
              </div>
            ) : (
              <>
                {filteredOptions.length === 0 && !showCreateOption && (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">
                      {searchTerm
                        ? t('assignmentModal.noResults')
                        : t('assignmentModal.noOptions')}
                    </div>
                  </div>
                )}
                {filteredOptions.map(renderOption)}
                {showCreateOption && (
                  <div
                    className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-primary/50 cursor-pointer transition-all hover:bg-primary/5 hover:border-primary"
                    onClick={handleOpenLabelModal}
                  >
                    <Plus className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium text-primary">
                      {searchTerm.trim()
                        ? t('assignmentModal.createLabel', { name: searchTerm.trim() })
                        : t('assignmentModal.newLabel')}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('assignmentModal.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !hasSelectionChanged}
            className="w-full sm:w-auto"
          >
            {isSubmitting
              ? t('assignmentModal.applying')
              : t('assignmentModal.apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {canCreateInline && onCreateInline && (
      <LabelModal
        open={isLabelModalOpen}
        onOpenChange={setIsLabelModalOpen}
        isNew={true}
        loading={isCreating}
        initialTitle={searchTerm.trim()}
        onSubmit={handleLabelModalSubmit}
      />
    )}
  </>
  );
};

export default AssignmentModal;
