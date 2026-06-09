import { useEffect, useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from '@evoapi/design-system';
import { AlertCircle, Workflow } from 'lucide-react';
import {
  MoveToPipelineStageNodeData,
  MoveToPipelineStagePipelineOption,
  MoveToPipelineStageStageOption,
} from './MoveToPipelineStageNode';
import { pipelinesService } from '@/services/pipelines/pipelinesService';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { useLanguage } from '@/hooks/useLanguage';

interface MoveToPipelineStagePanelProps {
  nodeId: string;
  data: MoveToPipelineStageNodeData;
  onUpdate: (nodeId: string, newData: MoveToPipelineStageNodeData) => void;
  onClose: () => void;
}

export function MoveToPipelineStagePanel({
  nodeId,
  data,
  onUpdate,
  onClose,
}: MoveToPipelineStagePanelProps) {
  const { t } = useLanguage('journey');
  const [pipelineId, setPipelineId] = useState<string>(data.pipeline_id?.toString() || '');
  const [stageId, setStageId] = useState<string>(data.stage_id?.toString() || '');
  const [originalStageId] = useState<string>(() => data.stage_id?.toString() || '');
  const [pipelines, setPipelines] = useState<MoveToPipelineStagePipelineOption[]>([]);
  const [stages, setStages] = useState<MoveToPipelineStageStageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStages, setLoadingStages] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const loadPipelines = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const response = await pipelinesService.getPipelines();
        const list = (response?.data || []).map(p => ({ id: p.id.toString(), name: p.name }));
        setPipelines(list);
      } catch (error) {
        console.error(t('panels.moveToPipelineStage.loadDataError'), error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    loadPipelines();
  }, []);

  useEffect(() => {
    if (!pipelineId) {
      setStages([]);
      return;
    }

    const loadStages = async () => {
      try {
        setLoadingStages(true);
        const response = await pipelinesService.getPipelineStages(pipelineId);
        const list = (response?.data || []).map(s => ({
          id: s.id.toString(),
          name: s.name,
          pipeline_id: pipelineId,
        }));
        setStages(list);
      } catch (error) {
        console.error(t('panels.moveToPipelineStage.loadStagesError'), error);
        setStages([]);
      } finally {
        setLoadingStages(false);
      }
    };

    loadStages();
  }, [pipelineId]);

  const handlePipelineChange = (value: string) => {
    setPipelineId(value);
    setStageId('');
  };

  const handleSave = () => {
    const selectedPipeline = pipelines.find(p => p.id === pipelineId);
    const selectedStage = stages.find(s => s.id === stageId);

    const updatedData: MoveToPipelineStageNodeData = {
      ...data,
      pipeline_id: pipelineId || '',
      pipeline_name: selectedPipeline?.name || '',
      stage_id: stageId || '',
      stage_name: selectedStage?.name || '',
      formDataOptions: { pipelines, stages },
    };

    onUpdate(nodeId, updatedData);
    onClose();
  };

  const dirty = useMemo(() => stageId !== originalStageId, [stageId, originalStageId]);
  const isValid = Boolean(stageId);

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.moveToPipelineStage.title')}
      icon={<Workflow className="h-5 w-5 text-flow-node-action-pipeline-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty && isValid}
      loading={loading}
      saveLabel={t('panels.actions.save')}
      cancelLabel={t('panels.actions.cancel')}
    >
      <div className="space-y-4">
        {loadError && (
          <FlowFeedbackBanner variant="error">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{t('panels.moveToPipelineStage.loadErrorBanner')}</span>
            </div>
          </FlowFeedbackBanner>
        )}

        <div className="space-y-2">
          <Label className="text-sidebar-foreground font-medium">
            {t('panels.moveToPipelineStage.pipeline')}
          </Label>
          <Select value={pipelineId} onValueChange={handlePipelineChange} disabled={loading}>
            <SelectTrigger
              className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground"
              aria-label={t('panels.moveToPipelineStage.pipeline')}
            >
              <SelectValue
                placeholder={
                  loading
                    ? t('panels.moveToPipelineStage.loadingPipelines')
                    : t('panels.moveToPipelineStage.selectPipeline')
                }
              />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border">
              {pipelines.map(pipeline => (
                <SelectItem
                  key={pipeline.id}
                  value={pipeline.id}
                  className="text-sidebar-foreground"
                >
                  {pipeline.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sidebar-foreground font-medium">
            {t('panels.moveToPipelineStage.stage')}
          </Label>
          <Select value={stageId} onValueChange={setStageId} disabled={!pipelineId || loadingStages}>
            <SelectTrigger
              className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground"
              aria-label={t('panels.moveToPipelineStage.stage')}
            >
              <SelectValue
                placeholder={
                  loadingStages
                    ? t('panels.moveToPipelineStage.loadingStages')
                    : t('panels.moveToPipelineStage.selectStage')
                }
              />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border">
              {stages.map(stage => (
                <SelectItem key={stage.id} value={stage.id} className="text-sidebar-foreground">
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!loadingStages && pipelineId && stages.length === 0 && (
            <p className="text-sm text-sidebar-foreground/60">
              {t('panels.moveToPipelineStage.noStagesFound')}
            </p>
          )}
        </div>

        {stageId && (
          <FlowFeedbackBanner variant="info">
            <div className="flex items-center gap-2">
              <Workflow className="w-4 h-4" />
              <span>
                {t('panels.moveToPipelineStage.conversationWillMove')}{' '}
                <strong>{stages.find(s => s.id === stageId)?.name}</strong>
              </span>
            </div>
          </FlowFeedbackBanner>
        )}
      </div>
    </NodeConfigModal>
  );
}
