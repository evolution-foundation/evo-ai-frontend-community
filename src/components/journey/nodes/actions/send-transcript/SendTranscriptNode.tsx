import { FileText, Settings } from 'lucide-react';
import { BaseFlowNode } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

export interface SendTranscriptNodeData {
  label: string;
  description?: string;
  email?: string;
  subject?: string;
  // Dados para traduzir IDs para nomes
  formDataOptions?: {
    teams: any[];
    agents: any[];
  };
  // Backend compatibility - params array like Vue
  action_params?: string[];
}

export interface SendTranscriptNodeType {
  id: string;
  type: 'send-transcript-node';
  position: { x: number; y: number };
  data: SendTranscriptNodeData;
}

interface SendTranscriptNodeProps {
  selected: boolean;
  data: SendTranscriptNodeData;
  id: string;
}

export function SendTranscriptNode({ selected, data, id }: SendTranscriptNodeProps) {
  const { t } = useLanguage('journey');
  const hasEmail = !!(data.email && data.email.trim());
  const hasSubject = !!(data.subject && data.subject.trim());

  const getDisplayText = () => {
    if (!hasEmail) {
      return t('panels.sendTranscript.node.noEmailConfigured');
    }

    if (!hasSubject) {
      return t('panels.sendTranscript.node.sendToWithoutSubject', { email: data.email });
    }

    return t('panels.sendTranscript.node.sendTo', { email: data.email });
  };

  const getSubjectPreview = () => {
    if (!hasSubject) return null;
    
    const subject = data.subject!.trim();
    const maxLength = 40;
    
    if (subject.length <= maxLength) {
      return `"${subject}"`;
    }
    
    return `"${subject.substring(0, maxLength)}..."`;
  };

  return (
    <BaseFlowNode
      selected={selected}
      hasTarget={true}
      borderColor="teal"
      isExecuting={false}
      hasSource={true}
      nodeId={id}
      sourceHandleId="send-transcript-output"
      targetHandleId="send-transcript-input"
    >
      <div className="space-y-3">
        {/* Header com ação */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">
              {t('panels.sendTranscript.node.title')}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <Settings className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>

        {/* Informação do email e assunto */}
        <div className="p-2 rounded-md bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/30">
          <p className="text-xs text-teal-800 dark:text-teal-200 leading-relaxed">
            {getDisplayText()}
          </p>
          
          {/* Preview do assunto se configurado */}
          {hasSubject && (
            <div className="mt-1 pt-1 border-t border-teal-200/50 dark:border-teal-700/50">
              <p className="text-xs text-teal-700 dark:text-teal-300 italic">
                {t('panels.sendTranscript.node.subjectLabel')} {getSubjectPreview()}
              </p>
            </div>
          )}
        </div>
      </div>
    </BaseFlowNode>
  );
}