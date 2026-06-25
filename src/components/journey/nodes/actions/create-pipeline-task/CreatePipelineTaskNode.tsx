import { ClipboardList, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface CreatePipelineTaskAgentOption {
  id: string | number;
  name: string;
  email?: string;
}

export interface CreatePipelineTaskDueDate {
  value: number;
  unit: string;
}

export interface CreatePipelineTaskNodeData {
  label?: string;
  title?: string;
  description?: string;
  task_type?: string;
  priority?: string;
  assigned_to_id?: string;
  assigned_to_name?: string;
  due_date?: CreatePipelineTaskDueDate | null;
  formDataOptions?: { agents: CreatePipelineTaskAgentOption[] };
}

export interface CreatePipelineTaskNodeType {
  id: string;
  type: 'create-pipeline-task-node';
  position: { x: number; y: number };
  data: CreatePipelineTaskNodeData;
}

interface CreatePipelineTaskNodeProps {
  selected: boolean;
  data: CreatePipelineTaskNodeData;
  id: string;
}

export function CreatePipelineTaskNode({ selected, data, id }: CreatePipelineTaskNodeProps) {
  const { t } = useLanguage('journey');
  const hasTitle = !!data.title?.trim();

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="amber"
      isExecuting={false}
      hasSource={true}
      nodeId={id}
      sourceHandleId="create-pipeline-task-output"
      targetHandleId="create-pipeline-task-input"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">
              {t('flowEditor.nodes.createPipelineTask.name')}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>

        <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
          <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
            {hasTitle ? (
              <>
                {t('flowEditor.nodes.createPipelineTask.willCreate')} <strong>{data.title}</strong>
              </>
            ) : (
              t('flowEditor.nodes.createPipelineTask.noTitle')
            )}
          </p>
        </div>
      </div>
    </BaseFlowNode>
  );
}
