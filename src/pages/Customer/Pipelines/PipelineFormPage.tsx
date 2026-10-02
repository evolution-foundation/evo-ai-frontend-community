import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import {
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
import {
  ArrowLeft,
  X,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  Users,
  Lock,
  Globe,
} from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionsContext';
import { pipelinesService } from '@/services/pipelines';
import { CreatePipelineData, PipelineStage } from '@/types/analytics';
import TeamsService from '@/services/teams/teamsService';
import { Team } from '@/types/users/teams';

interface StageFormData {
  name: string;
  color: string;
  description: string;
}

// Stage templates per pipeline type — same seeds the modal used, kept here so
// selecting a type reveals its stages (mockup §3.6 "seleção de tipo revela etapas").
const getStageTemplates = (
  t: (key: string) => string,
): Record<
  string,
  Omit<PipelineStage, 'id' | 'pipeline_id' | 'conversations_count' | 'created_at' | 'updated_at'>[]
> => ({
  delivery_burger: [
    { name: '📥 Novos Leads', color: '#3B82F6', description: 'Clientes que acabaram de chamar no WhatsApp', position: 1 },
    { name: '💬 Em Atendimento', color: '#F59E0B', description: 'IA/Atendente tirando dúvidas ou montando pedido', position: 2 },
    { name: '📝 Pedido Confirmado', color: '#8B5CF6', description: 'Pedido finalizado e pagamento validado', position: 3 },
    { name: '🔥 Fila de Produção', color: '#EF4444', description: 'Preparo na cozinha pelos chapeiros', position: 4 },
    { name: '⏳ Aguardando Entregador', color: '#EC4899', description: 'Pedido embalado aguardando motoboy', position: 5 },
    { name: '🛵 Em Rota de Entrega', color: '#06B6D4', description: 'Entregador saiu com o pedido', position: 6 },
    { name: '✅ Entregue / Concluído', color: '#10B981', description: 'Pedido entregue e feedback automático', position: 7 },
    { name: '❌ Cancelado / Problemas', color: '#6B7280', description: 'Pedidos cancelados ou não finalizados', position: 8 },
  ],
  sales: [
    { name: t('createPipeline.templates.sales.newLead.name'), color: '#3B82F6', description: t('createPipeline.templates.sales.newLead.description'), position: 1 },
    { name: t('createPipeline.templates.sales.qualification.name'), color: '#F59E0B', description: t('createPipeline.templates.sales.qualification.description'), position: 2 },
    { name: t('createPipeline.templates.sales.proposal.name'), color: '#8B5CF6', description: t('createPipeline.templates.sales.proposal.description'), position: 3 },
    { name: t('createPipeline.templates.sales.closing.name'), color: '#10B981', description: t('createPipeline.templates.sales.closing.description'), position: 4 },
  ],
  support: [
    { name: t('createPipeline.templates.support.new.name'), color: '#3B82F6', description: t('createPipeline.templates.support.new.description'), position: 1 },
    { name: t('createPipeline.templates.support.inProgress.name'), color: '#F59E0B', description: t('createPipeline.templates.support.inProgress.description'), position: 2 },
    { name: t('createPipeline.templates.support.waiting.name'), color: '#8B5CF6', description: t('createPipeline.templates.support.waiting.description'), position: 3 },
    { name: t('createPipeline.templates.support.resolved.name'), color: '#10B981', description: t('createPipeline.templates.support.resolved.description'), position: 4 },
  ],
  marketing: [
    { name: t('createPipeline.templates.marketing.lead.name'), color: '#3B82F6', description: t('createPipeline.templates.marketing.lead.description'), position: 1 },
    { name: t('createPipeline.templates.marketing.nurturing.name'), color: '#F59E0B', description: t('createPipeline.templates.marketing.nurturing.description'), position: 2 },
    { name: t('createPipeline.templates.marketing.qualified.name'), color: '#8B5CF6', description: t('createPipeline.templates.marketing.qualified.description'), position: 3 },
    { name: t('createPipeline.templates.marketing.converted.name'), color: '#10B981', description: t('createPipeline.templates.marketing.converted.description'), position: 4 },
  ],
  custom: [
    { name: t('createPipeline.templates.custom.start.name'), color: '#3B82F6', description: t('createPipeline.templates.custom.start.description'), position: 1 },
    { name: t('createPipeline.templates.custom.inProgress.name'), color: '#F59E0B', description: t('createPipeline.templates.custom.inProgress.description'), position: 2 },
    { name: t('createPipeline.templates.custom.completed.name'), color: '#10B981', description: t('createPipeline.templates.custom.completed.description'), position: 3 },
  ],
});

const TYPE_CHIPS: Array<CreatePipelineData['pipeline_type']> = [
  'delivery_burger' as any,
  'custom',
  'sales',
  'support',
  'marketing',
];

/**
 * "/pipelines/new" — full-page pipeline creation (mockup §3.6). Same form logic and
 * submit shape as the old CreatePipelineModal, laid out as a full screen instead of a
 * cramped dialog. On success it navigates straight into the new board.
 */
export default function PipelineFormPage() {
  const { t } = useLanguage('pipelines');
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [searchParams] = useSearchParams();

  // Scope pré-selecionado quando aberto a partir do submenu Empresa/Pessoal
  // (?scope=empresa|pessoal — ver Pipelines.tsx#handleCreatePipeline).
  const initialScope = searchParams.get('scope') === 'pessoal' ? 'pessoal' : 'empresa';

  const [formData, setFormData] = useState<CreatePipelineData>({
    name: '',
    description: '',
    pipeline_type: 'custom',
    scope: initialScope,
    visibility: 'private',
    is_active: true,
    stages: [],
  });
  const [newStage, setNewStage] = useState<StageFormData>({ name: '', color: '#6366F1', description: '' });
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [hasManualStageChanges, setHasManualStageChanges] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const stageTemplates = useMemo(() => getStageTemplates(t), [t]);

  const close = useCallback(
    () => navigate(`/pipelines/${initialScope}`),
    [navigate, initialScope],
  );

  // Seed stages from the selected type until the user edits them manually.
  useEffect(() => {
    if (!hasManualStageChanges && formData.pipeline_type && stageTemplates[formData.pipeline_type]) {
      const stages = stageTemplates[formData.pipeline_type].map(stage => ({
        ...stage,
        id: (Date.now() + Math.random()).toString(),
        pipeline_id: '0',
        conversations_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      setFormData(prev => ({ ...prev, stages }));
    }
  }, [formData.pipeline_type, hasManualStageChanges, stageTemplates]);

  // Load teams lazily when visibility becomes 'team'.
  useEffect(() => {
    if (formData.visibility === 'team' && teams.length === 0) {
      setTeamsLoading(true);
      TeamsService.getTeams({ page: 1, per_page: 100, sort: 'name', order: 'asc' })
        .then(response => setTeams(response.data))
        .catch(err => console.error('Error loading teams:', err))
        .finally(() => setTeamsLoading(false));
    }
    if (formData.visibility !== 'team') setTeamIds([]);
  }, [formData.visibility, teams.length]);

  const addStage = () => {
    if (!newStage.name.trim()) return;
    const stage: PipelineStage = {
      ...newStage,
      id: Date.now().toString(),
      position: (formData.stages?.length || 0) + 1,
      pipeline_id: '0',
      conversations_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setFormData(prev => ({ ...prev, stages: [...(prev.stages || []), stage] }));
    setHasManualStageChanges(true);
    setNewStage({ name: '', color: '#6366F1', description: '' });
  };

  const removeStage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      stages: prev.stages?.filter((_, i) => i !== index).map((s, i) => ({ ...s, position: i + 1 })) || [],
    }));
    setHasManualStageChanges(true);
  };

  const resetToTemplate = () => {
    setFormData(prev => {
      if (prev.pipeline_type && stageTemplates[prev.pipeline_type]) {
        const stages = stageTemplates[prev.pipeline_type].map(stage => ({
          ...stage,
          id: (Date.now() + Math.random()).toString(),
          pipeline_id: '0',
          conversations_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        return { ...prev, stages };
      }
      return prev;
    });
    setHasManualStageChanges(false);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    const stages = [...(formData.stages || [])];
    const [dragged] = stages.splice(draggedIndex, 1);
    stages.splice(dropIndex, 0, dragged);
    setFormData(prev => ({ ...prev, stages: stages.map((s, i) => ({ ...s, position: i + 1 })) }));
    setHasManualStageChanges(true);
    setDraggedIndex(null);
  };

  const canCreate =
    formData.name.trim().length > 0 &&
    (formData.stages?.length || 0) > 0 &&
    (formData.visibility !== 'team' || teamIds.length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;
    if (!can('pipelines', 'create')) {
      toast.error(t('messages.noPermissionCreate'));
      return;
    }
    setSubmitting(true);
    try {
      const response = await pipelinesService.createPipeline({
        ...formData,
        team_ids: formData.visibility === 'team' ? teamIds : undefined,
      });
      toast.success(t('messages.createSuccess'));
      if (response.id) navigate(`/pipelines/${response.id}`);
      else navigate(`/pipelines/${initialScope}`);
    } catch (error) {
      console.error('Error creating pipeline:', error);
      toast.error(t('messages.createError'));
      setSubmitting(false);
    }
  };

  const visIcon = (v: string) =>
    v === 'private' ? <Lock className="h-3.5 w-3.5" /> : v === 'public' ? <Globe className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />;

  return (
    <div className="h-full flex flex-col p-4">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" onClick={close} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('createPipeline.back')}
          </Button>
          <h1 className="text-base font-semibold truncate">{t('createPipeline.pageTitle')}</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={close} aria-label={t('createPipeline.cancel')}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto pt-5">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 max-w-6xl mx-auto">
            {/* Left — basic info (2/5) */}
            <div className="lg:col-span-2 space-y-5">
              <h3 className="text-lg font-semibold">{t('createPipeline.basicInfo')}</h3>

              <div className="space-y-2">
                <Label htmlFor="name">{t('createPipeline.pipelineName')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('createPipeline.pipelineNamePlaceholder')}
                  required
                  disabled={submitting}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('createPipeline.descriptionLabel')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('createPipeline.descriptionPlaceholder')}
                  rows={3}
                  disabled={submitting}
                />
              </div>

              {/* Empresa/Pessoal — decide em qual submenu o pipeline aparece */}
              <div className="space-y-2">
                <Label>Onde criar</Label>
                <div className="flex gap-2">
                  {(['empresa', 'pessoal'] as const).map(scopeOption => {
                    const active = (formData.scope ?? 'empresa') === scopeOption;
                    return (
                      <button
                        key={scopeOption}
                        type="button"
                        disabled={submitting}
                        onClick={() => setFormData({ ...formData, scope: scopeOption })}
                        className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors capitalize ${
                          active
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-background border-border text-muted-foreground hover:border-primary/40'
                        }`}
                      >
                        {scopeOption}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Type as chips (mockup) */}
              <div className="space-y-2">
                <Label>{t('createPipeline.type')}</Label>
                <div className="flex flex-wrap gap-2">
                  {TYPE_CHIPS.map(type => {
                    const active = formData.pipeline_type === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        disabled={submitting}
                        onClick={() => setFormData({ ...formData, pipeline_type: type })}
                        className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                          active
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-background border-border text-muted-foreground hover:border-primary/40'
                        }`}
                      >
                        {t(`createPipeline.types.${type}`)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visibility */}
              <div className="space-y-2">
                <Label htmlFor="visibility">{t('createPipeline.visibility')}</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(value: 'private' | 'public' | 'team') =>
                    setFormData({ ...formData, visibility: value })
                  }
                  disabled={submitting}
                >
                  <SelectTrigger id="visibility">
                    <span className="flex items-center gap-2">
                      {visIcon(formData.visibility || 'private')}
                      <SelectValue />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">{t('createPipeline.visibilities.private')}</SelectItem>
                    <SelectItem value="public">{t('createPipeline.visibilities.public')}</SelectItem>
                    <SelectItem value="team">{t('createPipeline.visibilities.team')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.visibility === 'team' && (
                <div className="space-y-2">
                  <Label>{t('createPipeline.teamSelection.label')}</Label>
                  {teamIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {teamIds.map(id => {
                        const team = teams.find(tm => tm.id === id);
                        return team ? (
                          <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs">
                            <Users className="h-3 w-3" />
                            {team.name}
                            <button type="button" onClick={() => setTeamIds(prev => prev.filter(tid => tid !== id))} className="hover:text-destructive">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div className="border border-border rounded-lg max-h-40 overflow-y-auto">
                    {teamsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : teams.length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground py-4">
                        {t('createPipeline.teamSelection.noTeams')}
                      </div>
                    ) : (
                      <div className="p-1.5 space-y-0.5">
                        {teams.map(team => (
                          <label key={team.id} className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={teamIds.includes(team.id)}
                              onChange={() =>
                                setTeamIds(prev =>
                                  prev.includes(team.id) ? prev.filter(id => id !== team.id) : [...prev, team.id],
                                )
                              }
                              className="rounded border-border"
                            />
                            <span className="text-sm">{team.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {teamIds.length === 0 && (
                    <p className="text-xs text-destructive">{t('createPipeline.teamSelection.required')}</p>
                  )}
                </div>
              )}
            </div>

            {/* Right — stages (3/5) */}
            <div className="lg:col-span-3 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{t('createPipeline.stages')}</h3>
                <div className="flex items-center gap-2">
                  {hasManualStageChanges && (
                    <Button type="button" variant="ghost" size="sm" onClick={resetToTemplate} className="text-primary text-xs">
                      {t('createPipeline.reset')}
                    </Button>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {t('createPipeline.stagesCount', { count: formData.stages?.length || 0 })}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {formData.stages?.map((stage, index) => (
                  <div
                    key={`${stage.name}-${index}`}
                    draggable
                    onDragStart={e => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={e => handleDrop(e, index)}
                    className={`flex items-center justify-between p-3.5 bg-background border rounded-xl hover:shadow-sm transition-all cursor-move group ${
                      draggedIndex === index ? 'opacity-50 scale-95 border-primary/40' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="text-xs font-medium text-muted-foreground w-5 text-center">{index + 1}</span>
                      <div className="w-3 h-3 rounded-full ring-1 ring-background" style={{ backgroundColor: stage.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{stage.name}</div>
                        {stage.description && (
                          <div className="text-xs text-muted-foreground truncate">{stage.description}</div>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStage(index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive p-1 h-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}

                {/* Inline add-stage row */}
                <div className="border-2 border-dashed border-border rounded-xl p-3 bg-muted/30 space-y-2">
                  <Input
                    value={newStage.name}
                    onChange={e => setNewStage({ ...newStage, name: e.target.value })}
                    placeholder={t('createPipeline.newStageName')}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addStage())}
                    className="text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newStage.color}
                      onChange={e => setNewStage({ ...newStage, color: e.target.value })}
                      className="w-9 h-9 border border-border rounded cursor-pointer"
                      aria-label={t('createPipeline.newStageColor')}
                    />
                    <Input
                      value={newStage.description}
                      onChange={e => setNewStage({ ...newStage, description: e.target.value })}
                      placeholder={t('createPipeline.newStageDescription')}
                      className="text-sm flex-1"
                    />
                    <Button type="button" onClick={addStage} disabled={!newStage.name.trim()} size="sm" className="px-3">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {(!formData.stages || formData.stages.length === 0) && (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    {t('createPipeline.addStageMessage')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border shrink-0">
          <Button type="button" variant="outline" onClick={close} disabled={submitting}>
            {t('createPipeline.cancel')}
          </Button>
          <Button type="submit" disabled={submitting || !canCreate}>
            {submitting ? t('createPipeline.creating') : t('createPipeline.create')}
          </Button>
        </div>
      </form>
    </div>
  );
}
