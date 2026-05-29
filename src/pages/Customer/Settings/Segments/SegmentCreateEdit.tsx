import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import { Button, Input, Label, RadioGroup, RadioGroupItem } from '@evoapi/design-system';
import { Plus, Save, ArrowLeft, RefreshCw, Target, Users, Filter, Eye, AlertCircle, List, Workflow } from 'lucide-react';

import { segmentsService } from '@/services/segments/segmentsService';
import { SegmentCanvasBuilder } from '@/components/segments/canvas/SegmentCanvasBuilder';
import {
  Segment,
  SegmentFormData,
  SegmentDefinition,
  SegmentNodeUnion,
  DEFAULT_SEGMENT_DEFINITION,
  UserPropertyNode,
  isSegmentDefinition,
} from '@/types/analytics';
import SegmentConditionEditor from '@/components/segments/SegmentConditionEditor';

export default function SegmentCreateEdit() {
  const { t } = useLanguage('segments');
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  // State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [segment, setSegment] = useState<Segment | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [definitionType, setDefinitionType] = useState<'Everyone' | 'And' | 'Or'>('Everyone');
  const [nodes, setNodes] = useState<SegmentNodeUnion[]>([]);
  const [editorMode, setEditorMode] = useState<'form' | 'canvas'>('form');
  const [originalDefinition, setOriginalDefinition] = useState<SegmentDefinition | null>(null);

  // Preview state (count + sample of matching contacts). The preview is
  // debounced and never mutates the form — on error we only surface a banner
  // so the in-progress definition is preserved (422 keep-work).
  const [previewing, setPreviewing] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewSample, setPreviewSample] = useState<string[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewSeq = useRef(0);

  // Computed values
  const hasChanges = (() => {
    if (!isEditing) return true; // New segments always have changes
    if (!segment) return false;

    const currentDef: SegmentDefinition = {
      nodes: nodes,
      entryNode: {
        id: 'entry',
        type: definitionType,
        children: definitionType === 'Everyone' ? undefined : nodes.map(n => n.id),
      },
    };

    const hasDefinitionChanges = JSON.stringify(currentDef) !== JSON.stringify(originalDefinition);
    const hasNameChanges = name !== segment.name;

    return hasDefinitionChanges || hasNameChanges;
  })();

  // Load segment data
  const loadSegment = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await segmentsService.getSegment(id);
      // A API pode retornar o segmento diretamente ou wrapped em payload
      const loadedSegment = 'data' in response ? response.data : response;

      setSegment(loadedSegment);
      setName(loadedSegment.name);

      let segmentDefinition: SegmentDefinition;

      if (loadedSegment.definition) {
        if (isSegmentDefinition(loadedSegment.definition)) {
          segmentDefinition = loadedSegment.definition;
        } else {
          segmentDefinition = DEFAULT_SEGMENT_DEFINITION;
        }
      } else {
        segmentDefinition = DEFAULT_SEGMENT_DEFINITION;
      }

      setDefinitionType(segmentDefinition.entryNode?.type || 'Everyone');
      setNodes(segmentDefinition.nodes || []);
      setOriginalDefinition(JSON.parse(JSON.stringify(segmentDefinition)));
    } catch (error) {
      console.error('Error loading segment:', error);
      toast.error(t('messages.loadSegmentError'));
      navigate('/settings/segments');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, t]);

  useEffect(() => {
    if (isEditing) {
      loadSegment();
    }
  }, [isEditing, loadSegment]);

  // Handlers
  const handleDefinitionTypeChange = (value: string) => {
    setDefinitionType(value as 'Everyone' | 'And' | 'Or');
    if (value === 'Everyone') {
      setNodes([]);
    }
  };

  const addCondition = () => {
    const newNode: UserPropertyNode = {
      id: uuidv4(),
      type: 'UserProperty',
      path: '',
      operator: {
        type: 'Equals',
        value: '',
      },
    };
    setNodes([...nodes, newNode]);
  };

  const updateCondition = (index: number, node: SegmentNodeUnion) => {
    const updated = [...nodes];
    updated[index] = node;
    setNodes(updated);
  };

  const removeCondition = (index: number) => {
    setNodes(nodes.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t('messages.nameRequired'));
      return;
    }

    setSaving(true);

    try {
      const definition: SegmentDefinition = {
        nodes: nodes,
        entryNode: {
          id: 'entry',
          type: definitionType,
          children: definitionType === 'Everyone' ? undefined : nodes.map(n => n.id),
        },
      };

      const formData: SegmentFormData = {
        name: name.trim(),
        definition,
        status: 'running',
      };

      if (isEditing && id) {
        const response = await segmentsService.updateSegment(id, formData);
        // Lidar com resposta que pode ser segment direto ou wrapped
        const updatedSegment = 'data' in response ? response.data : response;
        setSegment(updatedSegment);
        toast.success(t('messages.updateSuccess'));
      } else {
        await segmentsService.createSegment(formData);
        toast.success(t('messages.createSuccess'));
      }

      navigate('/settings/segments');
    } catch (error) {
      console.error('Error saving segment:', error);
      toast.error(isEditing ? t('messages.updateError') : t('messages.createError'));
    } finally {
      setSaving(false);
    }
  };

  const handleRecompute = async () => {
    if (!id) return;

    setRecomputing(true);
    try {
      await segmentsService.recomputeSegment(id);
      toast.success(t('messages.recomputeSuccess'));
      await loadSegment(); // Reload to get updated data
    } catch (error) {
      console.error('Error recomputing segment:', error);
      toast.error(t('messages.recomputeError'));
    } finally {
      setRecomputing(false);
    }
  };

  const buildCurrentDefinition = useCallback(
    (): SegmentDefinition => ({
      nodes,
      entryNode: {
        id: 'entry',
        type: definitionType,
        children: definitionType === 'Everyone' ? undefined : nodes.map(n => n.id),
      },
    }),
    [nodes, definitionType],
  );

  const runPreview = useCallback(async () => {
    const definition = buildCurrentDefinition();
    const seq = ++previewSeq.current;
    setPreviewing(true);
    setPreviewError(null);
    try {
      const { count, sample } = await segmentsService.previewSegment(definition);
      if (seq !== previewSeq.current) return; // superseded by a newer preview
      setPreviewCount(count);
      setPreviewSample((sample || []).map(c => c.id));
    } catch (error) {
      if (seq !== previewSeq.current) return;
      // 422 keep-work: never touch the form; surface the upstream message.
      const data = (error as { response?: { data?: { errors?: { error?: { message?: unknown }; message?: unknown } } }; message?: string })
        ?.response?.data?.errors;
      const candidate = data?.error?.message ?? data?.message ?? (error as { message?: string })?.message;
      setPreviewError(typeof candidate === 'string' ? candidate : t('preview.error'));
    } finally {
      if (seq === previewSeq.current) setPreviewing(false);
    }
  }, [buildCurrentDefinition, t]);

  // Debounced (500ms) so rapid clicks collapse into a single request.
  const handlePreview = useCallback(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      void runPreview();
    }, 500);
  }, [runPreview]);

  useEffect(
    () => () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    },
    [],
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('createEdit.lastComputedNever');
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">{t('loadingSegment')}</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings/segments')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Target className="h-6 w-6" />
                {isEditing ? t('createEdit.titleEdit') : t('createEdit.titleNew')}
              </h1>
              {isEditing && segment && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {t('createEdit.contactsCount', { count: segment.contactsCount || 0 })}
                  </span>
                  <span>
                    {t('createEdit.lastComputed', { date: formatDate(segment.lastComputedAt) })}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={previewing}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {previewing ? t('actions.previewing') : t('actions.preview')}
            </Button>
            {isEditing && (
              <Button
                variant="outline"
                onClick={handleRecompute}
                disabled={recomputing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${recomputing ? 'animate-spin' : ''}`} />
                {t('actions.recompute')}
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? t('actions.saving') : t('actions.save')}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          {/* Preview result / error (does not affect the form) */}
          {previewError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800/30 dark:bg-red-950/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-200">{previewError}</p>
              </div>
            </div>
          )}
          {previewCount !== null && !previewError && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-sm">
                {t('preview.result', { count: previewCount })}
                {previewSample.length > 0 && (
                  <span className="text-muted-foreground">
                    {' '}
                    {t('preview.sample', { ids: previewSample.join(', ') })}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Nome do Segmento */}
          <div className="rounded-lg border p-6">
            <Label htmlFor="name" className="text-base font-semibold mb-3 block">
              {t('createEdit.name.label')}
            </Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('createEdit.name.placeholder')}
              className="max-w-xl"
            />
            <p className="text-sm text-muted-foreground mt-2">{t('createEdit.name.description')}</p>
          </div>

          {/* Definição do Segmento */}
          <div className="rounded-lg border p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold mb-1 flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  {t('createEdit.definition.title')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('createEdit.definition.description')}
                </p>
              </div>
              {/* Form ⇄ Canvas editor toggle (same underlying definition) */}
              <div className="flex flex-shrink-0 items-center gap-1 rounded-md border p-1">
                <Button
                  type="button"
                  variant={editorMode === 'form' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 gap-1"
                  onClick={() => setEditorMode('form')}
                >
                  <List className="h-3.5 w-3.5" />
                  {t('actions.form')}
                </Button>
                <Button
                  type="button"
                  variant={editorMode === 'canvas' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 gap-1"
                  onClick={() => setEditorMode('canvas')}
                >
                  <Workflow className="h-3.5 w-3.5" />
                  {t('actions.canvas')}
                </Button>
              </div>
            </div>

            {editorMode === 'canvas' ? (
              <SegmentCanvasBuilder
                definitionType={definitionType}
                nodes={nodes}
                onNodesChange={setNodes}
                onDefinitionTypeChange={handleDefinitionTypeChange}
              />
            ) : (
              <>
            {/* Tipo de Combinação */}
            <div className="rounded-lg border p-4 mb-6">
              <Label className="text-sm font-medium mb-3 block">
                {t('createEdit.definition.combinationType')}
              </Label>
              <RadioGroup value={definitionType} onValueChange={handleDefinitionTypeChange}>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="Everyone" id="everyone" className="mt-1" />
                    <div className="flex-1">
                      <label htmlFor="everyone" className="font-medium cursor-pointer">
                        {t('createEdit.definition.everyone.label')}
                      </label>
                      <p className="text-sm text-muted-foreground">
                        {t('createEdit.definition.everyone.description')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="And" id="and" className="mt-1" />
                    <div className="flex-1">
                      <label htmlFor="and" className="font-medium cursor-pointer">
                        {t('createEdit.definition.and.label')}
                      </label>
                      <p className="text-sm text-muted-foreground">
                        {t('createEdit.definition.and.description')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="Or" id="or" className="mt-1" />
                    <div className="flex-1">
                      <label htmlFor="or" className="font-medium cursor-pointer">
                        {t('createEdit.definition.or.label')}
                      </label>
                      <p className="text-sm text-muted-foreground">
                        {t('createEdit.definition.or.description')}
                      </p>
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Mensagem para Everyone */}
            {definitionType === 'Everyone' && (
              <div className="rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 mt-0.5" />
                  <div>
                    <h4 className="font-medium mb-1">
                      {t('createEdit.definition.everyone.messageTitle')}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {t('createEdit.definition.everyone.messageDescription')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de Condições */}
            {definitionType !== 'Everyone' && (
              <div className="space-y-4">
                {nodes.length === 0 && (
                  <div className="text-center py-12 rounded-lg border-2 border-dashed">
                    <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <h3 className="text-lg font-medium mb-1">
                      {t('createEdit.definition.noConditions.title')}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('createEdit.definition.noConditions.description')}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addCondition}
                      className="mx-auto"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('actions.addFirstCondition')}
                    </Button>
                  </div>
                )}

                {nodes.map((node, index) => (
                  <SegmentConditionEditor
                    key={node.id}
                    condition={node}
                    index={index}
                    onUpdate={updateCondition}
                    onRemove={removeCondition}
                  />
                ))}

                {nodes.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCondition}
                    className="w-full border-dashed"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('actions.addCondition')}
                  </Button>
                )}
              </div>
            )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
