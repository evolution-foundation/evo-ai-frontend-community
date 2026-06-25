import { useMemo, useState } from 'react';
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@evoapi/design-system';
import { LogOut } from 'lucide-react';
import { ExitJourneyNodeData } from './ExitJourneyNode';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { useLanguage } from '@/hooks/useLanguage';

interface ExitJourneyPanelProps {
  nodeId: string;
  data: ExitJourneyNodeData;
  onUpdate: (nodeId: string, newData: ExitJourneyNodeData) => void;
  onClose: () => void;
}

// Preset reasons. The exit-journey executor stores `exitReason` as free
// text (defaulting to 'completed'); presets keep analytics consistent
// while `custom` lets the author record an arbitrary value.
const PRESET_REASONS = ['completed', 'abandoned', 'transferred', 'error'] as const;
const CUSTOM = '__custom__';

export function ExitJourneyPanel({ nodeId, data, onUpdate, onClose }: ExitJourneyPanelProps) {
  const { t } = useLanguage('journey');

  const initialReason = (data.exitReason || 'completed').trim();
  const isPreset = (PRESET_REASONS as readonly string[]).includes(initialReason);

  const [selectedReason, setSelectedReason] = useState<string>(
    isPreset ? initialReason : CUSTOM,
  );
  const [customReason, setCustomReason] = useState<string>(isPreset ? '' : initialReason);
  const [exitMessage, setExitMessage] = useState<string>(data.exitMessage || '');

  const [originalReason] = useState<string>(initialReason);
  const [originalMessage] = useState<string>(() => data.exitMessage || '');

  const resolvedReason = useMemo(
    () => (selectedReason === CUSTOM ? customReason.trim() : selectedReason),
    [selectedReason, customReason],
  );

  const isValid = resolvedReason.length > 0;
  const dirty = useMemo(
    () => resolvedReason !== originalReason || exitMessage !== originalMessage,
    [resolvedReason, originalReason, exitMessage, originalMessage],
  );

  const handleSave = () => {
    const updatedData: ExitJourneyNodeData = {
      ...data,
      exitReason: resolvedReason,
      // Keep the key absent when blank so the backend default applies.
      exitMessage: exitMessage.trim() ? exitMessage.trim() : undefined,
    };
    onUpdate(nodeId, updatedData);
    onClose();
  };

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.exitJourney.title')}
      icon={<LogOut className="h-5 w-5 text-flow-node-exit-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty}
      saveDisabled={!isValid}
      saveLabel={t('panels.actions.save')}
      cancelLabel={t('panels.actions.cancel')}
    >
      <div className="space-y-4">
        <FlowFeedbackBanner variant="info">
          <p className="text-xs">{t('panels.exitJourney.intro')}</p>
        </FlowFeedbackBanner>

        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('panels.exitJourney.reasonLabel')}</Label>
          <Select value={selectedReason} onValueChange={setSelectedReason}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('panels.exitJourney.reasonPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {PRESET_REASONS.map(reason => (
                <SelectItem key={reason} value={reason}>
                  {t(`panels.exitJourney.reasons.${reason}`)}
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM}>{t('panels.exitJourney.reasons.custom')}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t('panels.exitJourney.reasonHint')}</p>
        </div>

        {selectedReason === CUSTOM && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {t('panels.exitJourney.customReasonLabel')}
            </Label>
            <Input
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              placeholder={t('panels.exitJourney.customReasonPlaceholder')}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('panels.exitJourney.messageLabel')}</Label>
          <Textarea
            value={exitMessage}
            onChange={e => setExitMessage(e.target.value)}
            placeholder={t('panels.exitJourney.messagePlaceholder')}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">{t('panels.exitJourney.messageHint')}</p>
        </div>

        {!isValid && (
          <FlowFeedbackBanner variant="warn">
            <p className="text-xs">{t('panels.exitJourney.reasonRequired')}</p>
          </FlowFeedbackBanner>
        )}
      </div>
    </NodeConfigModal>
  );
}
