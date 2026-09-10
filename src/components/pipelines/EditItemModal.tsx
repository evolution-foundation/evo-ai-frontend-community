import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useAccountUsers } from '@/hooks/useAccountUsers';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Tabs,
  TabsContent,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@evoapi/design-system';
import {
  Plus,
  Trash2,
  ChevronsUpDown,
  Check,
  X,
  FileText,
  Briefcase,
  Boxes,
  CheckSquare,
  Clock,
  Save,
} from 'lucide-react';
import { PipelineItem, PipelineStage, Pipeline, PipelineTask, CreateTaskData, UpdateTaskData, PipelineServiceDefinition } from '@/types/analytics';
import pipelineServiceDefinitionsService from '@/services/pipelines/pipelineServiceDefinitionsService';
import { getContactColor } from '@/utils/avatar';
import { cn } from '@/lib/utils';
import PipelineItemCustomAttributes from './PipelineItemCustomAttributes';
import PipelineTasksList, { PipelineTasksListRef } from './tasks/PipelineTasksList';
import CreateTaskModal from './tasks/CreateTaskModal';
import EditTaskModal from './tasks/EditTaskModal';

interface Service {
  name: string;
  value: string;
}

interface EditItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PipelineItem | null;
  stages: PipelineStage[];
  pipeline?: Pipeline | null;
  onSubmit: (data: {
    notes: string;
    stage_id: string;
    services: Service[];
    currency: string;
    custom_attributes?: Record<string, unknown>;
  }) => void;
  loading: boolean;
  /** Optional: opens the ScheduleActionModal for this item's contact (board wires it). */
  onSchedule?: (item: PipelineItem) => void;
}

type TabKey = 'details' | 'services' | 'attributes' | 'tasks';

export default function EditItemModal({
  open,
  onOpenChange,
  item,
  stages,
  pipeline,
  onSubmit,
  loading,
  onSchedule,
}: EditItemModalProps) {
  const { t } = useLanguage('pipelines');
  const { users } = useAccountUsers();
  const [notes, setNotes] = useState('');
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [currency, setCurrency] = useState('BRL');
  const [customAttributes, setCustomAttributes] = useState<Record<string, unknown>>({});
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [catalogServices, setCatalogServices] = useState<PipelineServiceDefinition[]>([]);
  const [openServicePopover, setOpenServicePopover] = useState<number | null>(null);

  // Task modals state
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<PipelineTask | null>(null);
  const [parentTaskForSubtask, setParentTaskForSubtask] = useState<PipelineTask | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  const tasksListRef = useRef<PipelineTasksListRef>(null);

  // Update counts when ref changes
  useEffect(() => {
    const updateCounts = () => {
      if (tasksListRef.current) {
        setPendingCount(tasksListRef.current.pendingCount);
        setOverdueCount(tasksListRef.current.overdueCount);
      }
    };
    updateCounts();
    const handleCountChange = () => updateCounts();
    window.addEventListener('tasksCountChanged', handleCountChange);
    return () => window.removeEventListener('tasksCountChanged', handleCountChange);
  }, []);

  // Initialize form when modal opens or item changes
  useEffect(() => {
    let cancelled = false;
    if (open && item) {
      setNotes(item.notes || '');
      setSelectedStageId(item.stage_id);
      setServices(item.custom_fields?.services || []);
      setCurrency(item.custom_fields?.currency || 'BRL');
      setActiveTab(item.type === 'task' ? 'tasks' : 'details');

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { services: _services, currency: _currency, ...customAttrs } = item.custom_fields || {};
      setCustomAttributes(customAttrs);

      pipelineServiceDefinitionsService
        .getServiceDefinitions(item.pipeline_id)
        .then(data => {
          if (!cancelled) setCatalogServices(data);
        })
        .catch(() => {
          if (!cancelled) setCatalogServices([]);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [open, item]);

  const handleSubmit = () => {
    if (!selectedStageId) return;
    onSubmit({ notes, stage_id: selectedStageId, services, currency, custom_attributes: customAttributes });
  };

  const addService = () => setServices([...services, { name: '', value: '' }]);
  const removeService = (index: number) => setServices(services.filter((_, i) => i !== index));
  const updateService = (index: number, field: 'name' | 'value', value: string) => {
    const updated = [...services];
    updated[index][field] = value;
    setServices(updated);
  };
  const selectCatalogService = (index: number, catalogService: PipelineServiceDefinition) => {
    const updated = [...services];
    updated[index] = { name: catalogService.name, value: catalogService.default_value.toString() };
    setServices(updated);
    setOpenServicePopover(null);
  };
  const calculateTotalValue = () =>
    services.reduce((total, service) => total + (parseFloat(service.value) || 0), 0);
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

  const canSubmit = selectedStageId !== null;

  // Task handlers
  const handleCreateTask = async (data: CreateTaskData) => {
    if (!tasksListRef.current) return;
    setTaskLoading(true);
    try {
      const result = await tasksListRef.current.createTask(data);
      if (result) setShowCreateTaskModal(false);
    } finally {
      setTaskLoading(false);
    }
  };
  const handleEditTask = async (taskId: string, data: UpdateTaskData) => {
    if (!tasksListRef.current) return;
    setTaskLoading(true);
    try {
      const result = await tasksListRef.current.updateTask(taskId, data);
      if (result) {
        setShowEditTaskModal(false);
        setTaskToEdit(null);
      }
    } finally {
      setTaskLoading(false);
    }
  };
  const handleEditTaskClick = (task: PipelineTask) => {
    setTaskToEdit(task);
    setShowEditTaskModal(true);
  };
  const handleAddSubtaskClick = (parentTask: PipelineTask) => {
    setParentTaskForSubtask(parentTask);
    setShowCreateTaskModal(true);
  };
  const handleCreateTaskModalClose = () => {
    setShowCreateTaskModal(false);
    setParentTaskForSubtask(null);
  };

  if (!item) return null;

  const getItemDisplayName = () => {
    if (item.type === 'task') {
      return item.title || t('kanban.task.untitled');
    }
    if (item.type === 'contact' || !item.conversation) {
      return item.contact?.name || t('editItem.unknownUser');
    }
    return item.conversation?.contact?.name || t('editItem.unknownUser');
  };
  const getItemDisplayId = () => {
    if (item.type === 'conversation' && item.conversation) return item.conversation.display_id;
    return item.id;
  };

  const displayName = getItemDisplayName();
  const currentStage = stages.find(s => String(s.id) === String(selectedStageId));

  // Tab pill: active = primary-tinted; inactive = subtle muted.
  const tabPill = (key: TabKey) =>
    cn(
      'flex items-center gap-1.5 px-[15px] py-[9px] rounded-lg text-[13.5px] font-semibold cursor-pointer transition-colors',
      activeTab === key
        ? 'bg-primary/10 border border-primary/30 text-primary'
        : 'border border-transparent text-muted-foreground hover:bg-muted',
    );

  const sectionCard = 'rounded-2xl border border-border p-5';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[620px] w-full max-h-[92vh] p-0 gap-0 rounded-[18px] overflow-hidden">
        <DialogTitle className="sr-only">{t('editItem.title')}</DialogTitle>

        {/* Custom header */}
        <div className="flex items-start gap-3 px-6 py-5 border-b border-border">
          <div
            className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-sm"
            style={{ backgroundColor: getContactColor(displayName) }}
          >
            {displayName?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground truncate">{displayName}</h2>
              <span className="text-[13px] text-muted-foreground shrink-0">#{getItemDisplayId()}</span>
            </div>
            {currentStage && (
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="w-[9px] h-[9px] rounded-full shrink-0"
                  style={{ backgroundColor: currentStage.color }}
                />
                <span className="text-[12.5px] text-muted-foreground truncate">
                  {t('editItem.stageLabel')} {currentStage.name}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onSchedule && (
              <button
                type="button"
                onClick={() => onSchedule(item)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-[13px] font-semibold text-foreground hover:bg-muted/80 transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                {t('editItem.scheduleAction')}
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label={t('editItem.cancel')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabKey)} className="w-full">
          {/* Tab pills */}
          <div className="flex items-center gap-2 px-6 pt-4">
            <button type="button" className={tabPill('details')} onClick={() => setActiveTab('details')}>
              <FileText className="w-[15px] h-[15px]" />
              {t('editItem.tabs.details')}
            </button>
            <button type="button" className={tabPill('services')} onClick={() => setActiveTab('services')}>
              <Briefcase className="w-[15px] h-[15px]" />
              {t('editItem.tabs.services')}
            </button>
            <button type="button" className={tabPill('attributes')} onClick={() => setActiveTab('attributes')}>
              <Boxes className="w-[15px] h-[15px]" />
              {t('editItem.tabs.attributes')}
            </button>
            <button type="button" className={tabPill('tasks')} onClick={() => setActiveTab('tasks')}>
              <CheckSquare className="w-[15px] h-[15px]" />
              {t('editItem.tabs.tasks')}
              {(pendingCount > 0 || overdueCount > 0) && (
                <span className="ml-1 px-1.5 py-0.5 text-xs font-medium rounded-full bg-primary text-primary-foreground">
                  {pendingCount + overdueCount}
                </span>
              )}
            </button>
          </div>

          {/* Fixed-height body — keeps the panel a stable size across tabs */}
          <div className="px-6 pt-4 pb-2 h-[470px]">
            <div className="h-full overflow-y-auto pr-1">
              {/* Details */}
              <TabsContent value="details" className="mt-0">
                <div className={cn(sectionCard, 'space-y-5')}>
                  <div className="grid gap-2">
                    <Label className="text-[12.5px] font-bold uppercase tracking-wide text-muted-foreground">
                      {t('editItem.currentStage')}
                    </Label>
                    <Select value={selectedStageId?.toString()} onValueChange={value => setSelectedStageId(value)}>
                      <SelectTrigger className="max-w-[280px]">
                        <SelectValue placeholder={t('editItem.chooseStage')} />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map(stage => (
                          <SelectItem key={stage.id} value={stage.id.toString()}>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                              {stage.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="h-px bg-border/70" />

                  <div className="grid gap-2">
                    <Label className="text-[12.5px] font-bold uppercase tracking-wide text-muted-foreground">
                      {t('editItem.currency')}
                    </Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="max-w-[280px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">{t('editItem.currencies.brl')}</SelectItem>
                        <SelectItem value="USD">{t('editItem.currencies.usd')}</SelectItem>
                        <SelectItem value="EUR">{t('editItem.currencies.eur')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="h-px bg-border/70" />

                  <div className="grid gap-2">
                    <Label className="text-[12.5px] font-bold uppercase tracking-wide text-muted-foreground">
                      {t('editItem.notes')}
                    </Label>
                    <Textarea
                      placeholder={t('editItem.notesPlaceholder')}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="min-h-24 focus:border-primary"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Services */}
              <TabsContent value="services" className="mt-0">
                <div className={cn(sectionCard, 'space-y-4')}>
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-[15px] font-bold text-foreground">
                      <Briefcase className="w-4 h-4 text-primary" />
                      {t('editItem.services')}
                    </h3>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addService}
                      className="h-8 bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {t('editItem.addService')}
                    </Button>
                  </div>

                  {services.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-10 text-center border border-dashed border-border rounded-xl">
                      {t('editItem.noServices')}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {services.map((service, index) => (
                        <div key={index} className="border border-border rounded-lg p-3">
                          <div className="flex gap-2 mb-2">
                            <Popover
                              open={openServicePopover === index}
                              onOpenChange={isOpen => setOpenServicePopover(isOpen ? index : null)}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openServicePopover === index}
                                  className="flex-1 justify-between font-normal"
                                >
                                  <span className={service.name ? '' : 'text-muted-foreground'}>
                                    {service.name || t('editItem.serviceName')}
                                  </span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0" align="start">
                                <Command
                                  filter={(value, search) => {
                                    const it = catalogServices.find(cs => cs.id === value);
                                    if (!it) return 0;
                                    return it.name.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                                  }}
                                >
                                  <CommandInput
                                    placeholder={t('editItem.searchService') || 'Buscar ou digitar serviço...'}
                                    value={service.name}
                                    onValueChange={value => updateService(index, 'name', value)}
                                  />
                                  <CommandList>
                                    <CommandEmpty>
                                      {service.name ? (
                                        <button
                                          type="button"
                                          className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded cursor-pointer"
                                          onClick={() => setOpenServicePopover(null)}
                                        >
                                          {t('editItem.useCustomService', { name: service.name })}
                                        </button>
                                      ) : (
                                        <span>{t('editItem.noServicesFound') || 'Nenhum serviço encontrado'}</span>
                                      )}
                                    </CommandEmpty>
                                    {catalogServices.length > 0 && (
                                      <CommandGroup heading={t('editItem.catalogServices') || 'Catálogo de serviços'}>
                                        {catalogServices.map(cs => (
                                          <CommandItem key={cs.id} value={cs.id} onSelect={() => selectCatalogService(index, cs)}>
                                            <Check
                                              className={`mr-2 h-4 w-4 ${service.name === cs.name ? 'opacity-100' : 'opacity-0'}`}
                                            />
                                            <div className="flex flex-col">
                                              <span>{cs.name}</span>
                                              <span className="text-xs text-muted-foreground">
                                                {cs.currency} {cs.formatted_default_value}
                                              </span>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    )}
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeService(index)}
                              className="px-2 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <Input
                            type="number"
                            placeholder={t('editItem.serviceValue')}
                            value={service.value}
                            onChange={e => updateService(index, 'value', e.target.value)}
                            step="0.01"
                            min="0"
                          />
                        </div>
                      ))}

                      <div className="pt-3 border-t border-border">
                        <div className="flex justify-between items-center text-sm font-medium">
                          <span className="text-muted-foreground">{t('editItem.totalValue')}</span>
                          <span className="font-bold text-primary">
                            {currency} {formatCurrency(calculateTotalValue())}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Attributes */}
              <TabsContent value="attributes" className="mt-0">
                <div className={sectionCard}>
                  <h3 className="flex items-center gap-2 text-[15px] font-bold text-foreground mb-4">
                    <Boxes className="w-4 h-4 text-primary" />
                    {t('editItem.customAttributes')}
                  </h3>
                  <PipelineItemCustomAttributes
                    attributes={customAttributes}
                    onAttributesChange={setCustomAttributes}
                    disabled={loading}
                    pipelineId={item.pipeline_id}
                    stageId={item.stage_id}
                    itemId={item.id}
                    pipelineCustomFields={pipeline?.custom_fields}
                    stageCustomFields={stages.find(s => s.id === item.stage_id)?.custom_fields}
                  />
                </div>
              </TabsContent>

              {/* Tasks */}
              <TabsContent value="tasks" className="mt-0">
                <div className={sectionCard}>
                  <PipelineTasksList
                    ref={tasksListRef}
                    pipelineId={item.pipeline_id}
                    pipelineItemId={item.id}
                    onCreateClick={() => setShowCreateTaskModal(true)}
                    onEditClick={handleEditTaskClick}
                    onAddSubtask={handleAddSubtaskClick}
                  />
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('editItem.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? t('editItem.saving') : t('editItem.save')}
          </Button>
        </div>
      </DialogContent>

      {/* Task Modals */}
      <CreateTaskModal
        open={showCreateTaskModal}
        onOpenChange={handleCreateTaskModalClose}
        onSubmit={handleCreateTask}
        loading={taskLoading}
        availableUsers={users}
        parentTask={parentTaskForSubtask}
      />
      <EditTaskModal
        open={showEditTaskModal}
        onOpenChange={setShowEditTaskModal}
        task={taskToEdit}
        onSubmit={handleEditTask}
        loading={taskLoading}
        availableUsers={users}
      />
    </Dialog>
  );
}
