import { useEffect, useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
} from '@evoapi/design-system';
import { AlertCircle, MessageSquareReply } from 'lucide-react';
import { SendCannedResponseNodeData, SendCannedResponseOption } from './SendCannedResponseNode';
import { cannedResponsesService } from '@/services/cannedResponses/cannedResponsesService';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { useLanguage } from '@/hooks/useLanguage';

interface SendCannedResponsePanelProps {
  nodeId: string;
  data: SendCannedResponseNodeData;
  onUpdate: (nodeId: string, newData: SendCannedResponseNodeData) => void;
  onClose: () => void;
}

const buildLabel = (shortCode?: string, content?: string): string => {
  if (shortCode) return `/${shortCode}`;
  return (content ?? '').slice(0, 60);
};

export function SendCannedResponsePanel({
  nodeId,
  data,
  onUpdate,
  onClose,
}: SendCannedResponsePanelProps) {
  const { t } = useLanguage('journey');
  const [cannedResponseId, setCannedResponseId] = useState<string>(
    data.canned_response_id?.toString() || '',
  );
  const [originalCannedResponseId] = useState<string>(
    () => data.canned_response_id?.toString() || '',
  );
  const [cannedResponses, setCannedResponses] = useState<SendCannedResponseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const loadCannedResponses = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const response = await cannedResponsesService.getCannedResponses();
        const list = (response?.data || []).map(cr => ({
          id: cr.id.toString(),
          label: buildLabel(cr.short_code, cr.content),
        }));
        setCannedResponses(list);
      } catch (error) {
        console.error(t('panels.sendCannedResponse.loadDataError'), error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    loadCannedResponses();
  }, []);

  const handleSave = () => {
    const selected = cannedResponses.find(r => r.id === cannedResponseId);

    const updatedData: SendCannedResponseNodeData = {
      ...data,
      canned_response_id: cannedResponseId || '',
      canned_response_label: selected?.label || '',
      formDataOptions: { cannedResponses },
    };

    onUpdate(nodeId, updatedData);
    onClose();
  };

  const dirty = useMemo(
    () => cannedResponseId !== originalCannedResponseId,
    [cannedResponseId, originalCannedResponseId],
  );
  const isValid = Boolean(cannedResponseId);

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.sendCannedResponse.title')}
      icon={<MessageSquareReply className="h-5 w-5 text-blue-500" />}
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
              <span>{t('panels.sendCannedResponse.loadErrorBanner')}</span>
            </div>
          </FlowFeedbackBanner>
        )}
        <div className="space-y-2">
          <Label className="text-sidebar-foreground font-medium">
            {t('panels.sendCannedResponse.response')}
          </Label>
          <Select value={cannedResponseId} onValueChange={setCannedResponseId} disabled={loading}>
            <SelectTrigger
              className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground"
              aria-label={t('panels.sendCannedResponse.response')}
            >
              <SelectValue
                placeholder={
                  loading
                    ? t('panels.sendCannedResponse.loadingResponses')
                    : t('panels.sendCannedResponse.selectResponse')
                }
              />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border">
              {cannedResponses.map(response => (
                <SelectItem
                  key={response.id}
                  value={response.id}
                  className="text-sidebar-foreground"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-blue-100 dark:bg-blue-950/30 text-blue-500 flex items-center justify-center">
                      <MessageSquareReply className="w-4 h-4" />
                    </div>
                    <div className="font-medium truncate">{response.label}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!loading && cannedResponses.length === 0 && (
            <p className="text-sm text-sidebar-foreground/60">
              {t('panels.sendCannedResponse.noResponsesFound')}
            </p>
          )}
        </div>

        {cannedResponseId && (
          <FlowFeedbackBanner variant="info">
            <div className="flex items-center gap-2">
              <MessageSquareReply className="w-4 h-4" />
              <span>
                {t('panels.sendCannedResponse.willSendResponse')}{' '}
                <strong>
                  {cannedResponses.find(r => r.id === cannedResponseId)?.label ||
                    `${t('panels.sendCannedResponse.response')} #${cannedResponseId}`}
                </strong>
              </span>
            </div>
          </FlowFeedbackBanner>
        )}
      </div>
    </NodeConfigModal>
  );
}
