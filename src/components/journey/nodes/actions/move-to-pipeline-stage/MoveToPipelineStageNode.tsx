import { Workflow, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface MoveToPipelineStagePipelineOption {
  id: string;
  name: string;
}

export interface MoveToPipelineStageStageOption {
  id: string;
  name: string;
  pipeline_id?: string;
}

export interface MoveToPipelineStageNodeData {
  label: string;
  description?: string;
  pipeline_id?: string;
  pipeline_name?: string;
  stage_id?: string;
  stage_name?: string;
  formDataOptions?: {
    pipelines: MoveToPipelineStagePipelineOption[];
    stages?: MoveToPipelineStageStageOption[];
  };
}

export interface MoveToPipelineStageNodeType {
  id: string;
  type: 'move-to-pipeline-stage-node';
  position: { x: number; y: number };
  data: MoveToPipelineStageNodeData;
}

interface MoveToPipelineStageNodeProps {
  selected: boolean;
  data: MoveToPipelineStageNodeData;
  id: string;
}

export function MoveToPipelineStageNode({ selected, data, id }: MoveToPipelineStageNodeProps) {
  const { t } = useLanguage('journey');

  const hasStageSelected = !!data.stage_id;
  const stageLabel = data.stage_name || data.stage_id;
  const pipelineLabel = data.pipeline_name || data.pipeline_id;

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="amber"
      isExecuting={false}
      hasSource={true}
      nodeId={id}
      sourceHandleId="move-to-pipeline-stage-output"
      targetHandleId="move-to-pipeline-stage-input"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
            <Workflow className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">
              {t('flowEditor.nodes.moveToPipelineStage.name')}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>

        <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
          <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
            {hasStageSelected ? (
              <>
                {t('flowEditor.nodes.moveToPipelineStage.moveTo')} <strong>{stageLabel}</strong>
                {pipelineLabel ? ` (${pipelineLabel})` : ''}
              </>
            ) : (
              t('flowEditor.nodes.moveToPipelineStage.noStageSelected')
            )}
          </p>
        </div>
      </div>
    </BaseFlowNode>
  );
}
