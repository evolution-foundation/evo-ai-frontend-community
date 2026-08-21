import React, { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Textarea,
  Button,
  Label,
} from '@evoapi/design-system';
import { Upload, X } from 'lucide-react';
import { MACRO_ACTION_TYPES, MacroAction } from '@/types/automation';
import type { MacroFormData, MacroFormDataSource, MacroFormOption } from '@/services/macros';

interface ActionRowProps {
  action: MacroAction;
  index: number;
  options: Pick<MacroFormData, 'inboxes' | 'agents' | 'teams' | 'labels' | 'campaigns'>;
  onUpdate: (index: number, action: MacroAction) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  errors: Record<string, string>;
  disabled: boolean;
  optionsLoading: boolean;
  failedSources: MacroFormDataSource[];
}

export default function MacroActionRow({
  action,
  index,
  options,
  onUpdate,
  onRemove,
  canRemove,
  errors,
  disabled,
  optionsLoading,
  failedSources,
}: ActionRowProps) {
  const { t } = useLanguage('macros');
  const [uploadingFile, setUploadingFile] = useState(false);

  const selectedActionConfig = MACRO_ACTION_TYPES.find(a => a.key === action.action_name);

  // The list is deliberately unfiltered: no inbox exists at form time, and one
  // macro runs over conversations from several inboxes. Warning about an agent
  // is only truthful once there is a loaded list to pick one from — while it is
  // loading, empty or failed, the placeholder already owns the message.
  const assignAgentWarningId = `macro-action-${index}-assign-agent-warning`;
  const showAssignAgentWarning =
    action.action_name === 'assign_agent' && !optionsLoading && options.agents.length > 0;

  const handleFieldChange = (field: keyof MacroAction, value: string) => {
    const updated = { ...action, [field]: value };

    // Reset params when the action changes
    if (field === 'action_name') {
      updated.action_params = [];
    }

    onUpdate(index, updated);
  };

  const handleParamsChange = (params: MacroAction['action_params']) => {
    onUpdate(index, { ...action, action_params: params });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      // TODO: real upload
      // const blobId = await macroService.uploadAttachment(file);
      const blobId = `blob_${Date.now()}`; // Mock, never accepted by the backend

      handleParamsChange([blobId]);
    } catch (error) {
      console.error('Failed to upload the attachment:', error);
    } finally {
      setUploadingFile(false);
    }
  };

  // An empty list has three causes and the user has to tell them apart: the
  // fetch is still running, the source answered with an error, or nothing is
  // registered. Reporting the failed source as "none registered" is the same
  // lie the empty state was split up to stop telling.
  const renderPlaceholderItem = (emptyKey: string, source: MacroFormDataSource | null) => {
    let messageKey = emptyKey;
    if (optionsLoading) {
      messageKey = 'actionRow.loadingOptions';
    } else if (source && failedSources.includes(source)) {
      messageKey = 'actionRow.loadFailed';
    }

    return (
      <SelectItem value="__placeholder__" disabled className="text-sidebar-foreground">
        {t(messageKey)}
      </SelectItem>
    );
  };

  const renderActionInput = () => {
    if (!selectedActionConfig) return null;

    const { inputType, options: actionOptions } = selectedActionConfig;

    switch (inputType) {
      case 'select': {
        let selectOptions: MacroFormOption[] = [];
        let selectEmptyKey = 'actionRow.emptyOptions';
        // Static option lists cannot fail to load, so they carry no source.
        let selectSource: MacroFormDataSource | null = null;

        // Options depend on the action
        switch (action.action_name) {
          case 'assign_agent':
            selectOptions = options.agents;
            selectEmptyKey = 'actionRow.emptyAgents';
            selectSource = 'agents';
            break;
          case 'assign_team':
            selectOptions = options.teams;
            selectEmptyKey = 'actionRow.emptyTeams';
            selectSource = 'teams';
            break;
          case 'change_priority':
          case 'change_status':
            selectOptions = actionOptions || [];
            break;
          default:
            selectOptions = actionOptions || [];
        }

        return (
          <Select
            value={action.action_params[0]?.toString() || ''}
            onValueChange={value => handleParamsChange([value])}
            disabled={disabled}
          >
            <SelectTrigger
              className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground"
              aria-describedby={showAssignAgentWarning ? assignAgentWarningId : undefined}
            >
              <SelectValue placeholder={t('actionRow.selectPlaceholder')} />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border">
              {selectOptions.length === 0 ? (
                renderPlaceholderItem(selectEmptyKey, selectSource)
              ) : (
                selectOptions.map(option => (
                  <SelectItem
                    key={String(option.value || option.id || '')}
                    value={String(option.value || option.id || '')}
                    className="text-sidebar-foreground"
                  >
                    {option.label || option.name || option.title}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        );
      }

      case 'multi_select': {
        let multiSelectOptions: MacroFormOption[] = [];
        let multiSelectEmptyKey = 'actionRow.emptyOptions';
        let multiSelectSource: MacroFormDataSource | null = null;

        switch (action.action_name) {
          case 'add_label':
          case 'remove_label':
            multiSelectOptions = options.labels;
            multiSelectEmptyKey = 'actionRow.emptyLabels';
            multiSelectSource = 'labels';
            break;
          default:
            multiSelectOptions = actionOptions || [];
        }

        return (
          <div className="space-y-2">
            <Select
              value=""
              onValueChange={value => {
                if (value && !action.action_params.includes(value)) {
                  handleParamsChange([...action.action_params, value]);
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
                <SelectValue placeholder={t('actionRow.multiSelectPlaceholder')} />
              </SelectTrigger>
              <SelectContent className="bg-sidebar border-sidebar-border">
                {multiSelectOptions.length === 0 ? (
                  renderPlaceholderItem(multiSelectEmptyKey, multiSelectSource)
                ) : (
                  multiSelectOptions.map(option => (
                    <SelectItem
                      key={String(option.value || option.id || '')}
                      value={String(option.value || option.id || '')}
                      className="text-sidebar-foreground"
                    >
                      {option.label || option.name || option.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {/* Selected values */}
            {action.action_params.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {action.action_params.map(paramValue => {
                  const option = multiSelectOptions.find(
                    o => String(o.value || o.id || '') === String(paramValue),
                  );
                  return (
                    <div
                      key={String(paramValue)}
                      className="flex items-center gap-1 px-2 py-1 bg-sidebar-accent text-sidebar-foreground rounded text-sm"
                    >
                      {option?.label || option?.name || option?.title || paramValue}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent text-sidebar-foreground/60"
                        onClick={() =>
                          handleParamsChange(action.action_params.filter(p => p !== paramValue))
                        }
                        disabled={disabled}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      }

      case 'textarea':
        return (
          <Textarea
            value={action.action_params[0] || ''}
            onChange={e => handleParamsChange([e.target.value])}
            placeholder={t('actionRow.textareaPlaceholder')}
            className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground"
            disabled={disabled}
            rows={3}
          />
        );

      case 'text':
        return (
          <Input
            type="text"
            value={action.action_params[0] || ''}
            onChange={e => handleParamsChange([e.target.value])}
            placeholder={
              action.action_name === 'snooze_conversation'
                ? t('actionRow.hoursPlaceholder')
                : t('actionRow.textPlaceholder')
            }
            className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground"
            disabled={disabled}
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            value={action.action_params[0] || ''}
            onChange={e => handleParamsChange([e.target.value])}
            placeholder={t('actionRow.emailPlaceholder')}
            className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground"
            disabled={disabled}
          />
        );

      case 'url':
        return (
          <Input
            type="url"
            value={action.action_params[0] || ''}
            onChange={e => handleParamsChange([e.target.value])}
            placeholder={t('actionRow.urlPlaceholder')}
            className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground"
            disabled={disabled}
          />
        );

      case 'file':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || uploadingFile}
                className="bg-sidebar border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={() => document.getElementById(`file-${index}`)?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingFile ? t('actionRow.fileUploading') : t('actionRow.fileSelectButton')}
              </Button>

              <input
                id={`file-${index}`}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={disabled}
              />
            </div>

            {action.action_params.length > 0 && (
              <div className="text-sm text-sidebar-foreground/70">
                {t('actionRow.fileSelected', { filename: action.action_params[0] })}
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-sm text-sidebar-foreground/70 italic">{t('actionRow.noConfig')}</div>
        );
    }
  };

  return (
    <div className="p-4 border border-sidebar-border rounded-lg bg-sidebar-accent/30">
      {/* Action and its configuration on the same row */}
      <div className="flex items-end gap-4">
        {/* Action */}
        <div className="flex-1 space-y-2">
          <Label className="text-sm text-sidebar-foreground/70">
            {t('modal.form.actionLabel')}
          </Label>
          <Select
            value={action.action_name}
            onValueChange={value => handleFieldChange('action_name', value)}
            disabled={disabled}
          >
            <SelectTrigger
              className={`w-full bg-sidebar border-sidebar-border text-sidebar-foreground ${
                errors[`action_${index}_name`] ? 'border-red-500' : ''
              }`}
            >
              <SelectValue placeholder={t('actionRow.selectPlaceholder')} />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border">
              {MACRO_ACTION_TYPES.map(actionConfig => (
                <SelectItem
                  key={actionConfig.key}
                  value={actionConfig.key}
                  className="text-sidebar-foreground"
                >
                  <div>
                    <div className="font-medium">{actionConfig.name}</div>
                    <div className="text-xs text-sidebar-foreground/60">
                      {actionConfig.description}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors[`action_${index}_name`] && (
            <p className="text-sm text-red-500">{errors[`action_${index}_name`]}</p>
          )}
        </div>

        {/* Action configuration */}
        {selectedActionConfig && selectedActionConfig.inputType && (
          <div className="flex-1 space-y-2">
            <Label className="text-sm text-sidebar-foreground/70">
              {t('modal.form.configLabel')}
            </Label>
            {renderActionInput()}
          </div>
        )}

        {/* Remove button */}
        {canRemove && (
          <div className="pb-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRemove(index)}
              disabled={disabled}
              className="bg-sidebar border-sidebar-border text-sidebar-foreground hover:bg-red-500/10 hover:border-red-500 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Outside the row: inside it, the extra height would push the bottom
          aligned column off the baseline the other column keeps. */}
      {showAssignAgentWarning && (
        <p id={assignAgentWarningId} className="mt-3 text-sm text-sidebar-foreground/70">
          {t('actionRow.assignAgentInboxWarning')}
        </p>
      )}
    </div>
  );
}
