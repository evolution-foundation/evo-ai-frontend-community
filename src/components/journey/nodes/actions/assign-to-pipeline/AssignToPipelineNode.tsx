import { Workflow, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface AssignToPipelinePipelineOption {
  id: string;
  name: string;
}

export interface AssignToPipelineNodeData {
  label: string;
  description?: string;
  pipeline_id?: string;
  pipeline_name?: string;
  formDataOptions?: {
    pipelines: AssignToPipelinePipelineOption[];
  };
}

export interface AssignToPipelineNodeType {
  id: string;
  type: 'assign-to-pipeline-node';
  position: { x: number; y: number };
  data: AssignToPipelineNodeData;
}

interface AssignToPipelineNodeProps {
  selected: boolean;
  data: AssignToPipelineNodeData;
  id: string;
}

export function AssignToPipelineNode({ selected, data, id }: AssignToPipelineNodeProps) {
  const { t } = useLanguage('journey');

  const getPipelineName = () => {
    if (data.pipeline_name) return data.pipeline_name;

    if (data.pipeline_id && data.formDataOptions?.pipelines) {
      const pipeline = data.formDataOptions.pipelines.find(
        p => p.id.toString() === data.pipeline_id?.toString(),
      );
      return (
        pipeline?.name ||
        t('flowEditor.nodes.assignToPipeline.pipelineNumber', { pipelineId: data.pipeline_id })
      );
    }

    return t('flowEditor.nodes.assignToPipeline.selectPipeline');
  };

  const pipelineName = getPipelineName();
  const hasPipelineSelected = !!data.pipeline_id;

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="amber"
      isExecuting={false}
      hasSource={true}
      nodeId={id}
      sourceHandleId="assign-to-pipeline-output"
      targetHandleId="assign-to-pipeline-input"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
            <Workflow className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">
              {t('flowEditor.nodes.assignToPipeline.name')}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>

        <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
          <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
            {hasPipelineSelected ? (
              <>
                {t('flowEditor.nodes.assignToPipeline.assignTo')} <strong>{pipelineName}</strong>
              </>
            ) : (
              t('flowEditor.nodes.assignToPipeline.noPipelineSelected')
            )}
          </p>
        </div>
      </div>
    </BaseFlowNode>
  );
}
