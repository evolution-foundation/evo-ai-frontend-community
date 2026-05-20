import { useState, useEffect } from 'react';
import { Button, Label, Input } from '@evoapi/design-system';
import { FileText } from 'lucide-react';
import { SendTranscriptNodeData } from './SendTranscriptNode';
import { automationService } from '@/services/automation/automationService';
import { BaseFlowPanel } from '@/components/base';
import { useLanguage } from '@/hooks/useLanguage';

interface SendTranscriptPanelProps {
  nodeId: string;
  data: SendTranscriptNodeData;
  onUpdate: (nodeId: string, newData: SendTranscriptNodeData) => void;
  onClose: () => void;
}

export function SendTranscriptPanel({ nodeId, data, onUpdate, onClose }: SendTranscriptPanelProps) {
  const { t } = useLanguage('journey');
  const [email, setEmail] = useState<string>(data.email || '');
  const [subject, setSubject] = useState<string>(data.subject || '');
  const [formDataOptions, setFormDataOptions] = useState<{
    teams: any[];
    agents: any[];
  }>({
    teams: [],
    agents: [],
  });
  const [loading, setLoading] = useState(true);

  // Load form data options on mount
  useEffect(() => {
    const loadFormData = async () => {
      try {
        setLoading(true);
        const formData = await automationService.getFormData();
        setFormDataOptions({
          teams: formData.teams || [],
          agents: formData.agents || [],
        });
      } catch (error) {
        console.error(t('panels.sendTranscript.loadDataError'), error);
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, []);

  const handleSave = () => {
    const updatedData: SendTranscriptNodeData = {
      ...data,
      email: email.trim(),
      subject: subject.trim(),
      formDataOptions,
      // Backend compatibility - save email as params array like Vue
      action_params: [email.trim()],
    };

    onUpdate(nodeId, updatedData);
    onClose();
  };

  // Update node with form data when available
  useEffect(() => {
    if (formDataOptions.teams.length > 0 || formDataOptions.agents.length > 0) {
      const updatedData: SendTranscriptNodeData = {
        ...data,
        formDataOptions,
      };
      onUpdate(nodeId, updatedData);
    }
  }, [formDataOptions, data, nodeId, onUpdate]);

  const getCharacterCount = (text: string) => {
    return text.length;
  };

  const getCharacterCountColor = (text: string, max: number) => {
    const count = getCharacterCount(text);
    if (count > max) return 'text-red-600';
    if (count > max * 0.8) return 'text-orange-600';
    return 'text-sidebar-foreground/60';
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <BaseFlowPanel
      title={t('panels.sendTranscript.title')}
      icon={<FileText className="w-5 h-5 text-teal-500" />}
      onClose={onClose}
      width="w-[420px]"
    >
      {/* Campo de Email */}
      <div className="space-y-2">
        <Label className="text-sidebar-foreground font-medium">
          {t('panels.sendTranscript.destinationEmail')}
        </Label>
        <Input
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={t('panels.sendTranscript.emailPlaceholder')}
          className="bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50"
          disabled={loading}
          type="email"
        />

        {email && !isValidEmail(email) && (
          <p className="text-xs text-red-600">{t('panels.sendTranscript.invalidEmail')}</p>
        )}

        <p className="text-xs text-sidebar-foreground/60">
          {t('panels.sendTranscript.emailDescription')}
        </p>
      </div>

      {/* Campo de Assunto */}
      <div className="space-y-2">
        <Label className="text-sidebar-foreground font-medium">
          {t('panels.sendTranscript.emailSubject')}
        </Label>
        <Input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder={t('panels.sendTranscript.subjectPlaceholder')}
          className="bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50"
          disabled={loading}
        />

        {/* Contador de caracteres */}
        <div className="flex justify-between items-center text-xs">
          <span className="text-sidebar-foreground/50">
            {t('panels.sendTranscript.variablesHint')}
          </span>
          <span className={getCharacterCountColor(subject, 100)}>
            {t('panels.sendTranscript.characterCount', { count: getCharacterCount(subject) })}
          </span>
        </div>
      </div>

      {/* Preview da configuração */}
      {email && isValidEmail(email) && (
        <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/30">
          <div className="text-sm text-teal-800 dark:text-teal-200">
            <div className="font-medium mb-1">{t('panels.sendTranscript.previewTitle')}</div>
            <div className="space-y-1">
              <div className="text-xs">
                <strong>{t('panels.sendTranscript.previewToLabel')}</strong> {email}
              </div>
              {subject && (
                <div className="text-xs">
                  <strong>{t('panels.sendTranscript.previewSubjectLabel')}</strong>{' '}
                  {subject || t('panels.sendTranscript.previewDefaultSubject')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Informações sobre a transcrição */}
      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
        <div className="text-xs text-blue-800 dark:text-blue-200">
          <div className="font-medium mb-1">{t('panels.sendTranscript.transcriptInfo.title')}</div>
          <div className="space-y-1">
            <div>• {t('panels.sendTranscript.transcriptInfo.includesMessages')}</div>
            <div>• {t('panels.sendTranscript.transcriptInfo.includesMetadata')}</div>
            <div>• {t('panels.sendTranscript.transcriptInfo.formatHTML')}</div>
            <div>• {t('panels.sendTranscript.transcriptInfo.processedOnExecution')}</div>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1 h-10">
          {t('panels.actions.cancel')}
        </Button>
        <Button
          onClick={handleSave}
          className="flex-1 h-10"
          disabled={
            !email.trim() || !isValidEmail(email) || loading || getCharacterCount(subject) > 100
          }
        >
          {t('panels.actions.save')}
        </Button>
      </div>
    </BaseFlowPanel>
  );
}
