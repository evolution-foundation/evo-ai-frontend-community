import { MessageSquareReply, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface SendCannedResponseOption {
  id: string;
  label: string;
}

export interface SendCannedResponseNodeData {
  label: string;
  description?: string;
  canned_response_id?: string;
  canned_response_label?: string;
  formDataOptions?: {
    cannedResponses: SendCannedResponseOption[];
  };
}

export interface SendCannedResponseNodeType {
  id: string;
  type: 'send-canned-response-node';
  position: { x: number; y: number };
  data: SendCannedResponseNodeData;
}

interface SendCannedResponseNodeProps {
  selected: boolean;
  data: SendCannedResponseNodeData;
  id: string;
}

export function SendCannedResponseNode({ selected, data, id }: SendCannedResponseNodeProps) {
  const { t } = useLanguage('journey');

  const getResponseLabel = () => {
    if (data.canned_response_label) return data.canned_response_label;

    if (data.canned_response_id && data.formDataOptions?.cannedResponses) {
      const response = data.formDataOptions.cannedResponses.find(
        r => r.id.toString() === data.canned_response_id?.toString(),
      );
      return (
        response?.label ||
        t('flowEditor.nodes.sendCannedResponse.responseNumber', {
          responseId: data.canned_response_id,
        })
      );
    }

    return t('flowEditor.nodes.sendCannedResponse.selectResponse');
  };

  const responseLabel = getResponseLabel();
  const hasResponseSelected = !!data.canned_response_id;

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="blue"
      isExecuting={false}
      hasSource={true}
      nodeId={id}
      sourceHandleId="send-canned-response-output"
      targetHandleId="send-canned-response-input"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <MessageSquareReply className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">
              {t('flowEditor.nodes.sendCannedResponse.name')}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>

        <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
          <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
            {hasResponseSelected ? (
              <>
                {t('flowEditor.nodes.sendCannedResponse.sendingResponse')}{' '}
                <strong>{responseLabel}</strong>
              </>
            ) : (
              t('flowEditor.nodes.sendCannedResponse.noResponseSelected')
            )}
          </p>
        </div>
      </div>
    </BaseFlowNode>
  );
}
