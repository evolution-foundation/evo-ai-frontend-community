import {
  Badge,
  Card,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import { VariableTextarea } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';
import { isBalancedExpression } from '@/utils/templateVariables';
import type { MessageTemplate } from '@/types/channels/inbox';
import { TemplateVariableMapping, TemplateVariableSource } from '../SendMessageNode';

// EVO-1267: curated field paths per root source — every entry must be
// resolvable by the CRM's TemplateVariableResolver (attribute or arity-0
// reader on the root record).
const SOURCE_FIELD_PATHS: Record<'contact' | 'conversation' | 'pipeline', string[]> = {
  contact: ['name', 'email', 'phone_number', 'identifier'],
  conversation: ['display_id', 'status'],
  pipeline: ['pipeline_stage.name', 'pipeline.name', 'entered_at'],
};

const VARIABLE_SOURCES: TemplateVariableSource[] = [
  'fixed',
  'contact',
  'conversation',
  'pipeline',
  'expression',
];

interface SendMessageContentProps {
  isTemplateMode: boolean;
  journeyId?: string;
  loading: boolean;
  // Template mode
  inboxId: string | undefined;
  templates: MessageTemplate[];
  loadingTemplates: boolean;
  templateId: string | undefined;
  selectedTemplate: MessageTemplate | undefined;
  onTemplateChange: (templateId: string) => void;
  getVariableMapping: (name: string) => TemplateVariableMapping;
  onVariableMappingChange: (name: string, patch: Partial<TemplateVariableMapping>) => void;
  onVariableSourceChange: (name: string, source: TemplateVariableSource) => void;
  // Text mode
  message: string | undefined;
  onMessageChange: (value: string) => void;
  characterCount: number;
  characterCountColor: string;
}

// The message body: either an approved template (picker + preview + per-
// variable source mapping) or free text — mutually exclusive, so one
// component owns the switch instead of the caller branching in two places.
export function SendMessageContent({
  isTemplateMode,
  journeyId,
  loading,
  inboxId,
  templates,
  loadingTemplates,
  templateId,
  selectedTemplate,
  onTemplateChange,
  getVariableMapping,
  onVariableMappingChange,
  onVariableSourceChange,
  message,
  onMessageChange,
  characterCount,
  characterCountColor,
}: SendMessageContentProps) {
  const { t } = useLanguage('journey');

  if (!isTemplateMode) {
    return (
      <div className="space-y-2">
        <Label htmlFor="send-message-body" className="text-sm font-medium">
          {t('panels.sendMessage.message')}
        </Label>
        <VariableTextarea
          id="send-message-body"
          value={message || ''}
          onChange={e => onMessageChange(e.target.value)}
          placeholder={t('panels.sendMessage.messagePlaceholder')}
          className="min-h-[120px] resize-none"
          disabled={loading}
          journeyId={journeyId}
        />

        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">{t('panels.sendMessage.useVariables')}</span>
          <span className={characterCountColor}>{characterCount}/1000</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="send-message-template-select" className="text-sm font-medium">
          {t('panels.sendMessage.template')}
        </Label>
        {!inboxId ? (
          <p className="text-xs text-muted-foreground">
            {t('panels.sendMessage.selectChannelForTemplate')}
          </p>
        ) : loadingTemplates ? (
          <div className="flex items-center gap-2 p-3 border border-dashed border-border rounded-lg">
            <div className="animate-spin w-4 h-4 border-2 border-flow-node-action-message-fg border-t-transparent rounded-full" />
            <span className="text-sm text-muted-foreground">
              {t('panels.sendMessage.loadingTemplates')}
            </span>
          </div>
        ) : templates.length === 0 ? (
          <Card className="p-4 text-center">
            <p className="text-xs text-muted-foreground">{t('panels.sendMessage.noTemplates')}</p>
          </Card>
        ) : (
          <Select value={templateId} onValueChange={onTemplateChange}>
            <SelectTrigger id="send-message-template-select" className="w-full">
              <SelectValue placeholder={t('panels.sendMessage.chooseTemplate')} />
            </SelectTrigger>
            <SelectContent>
              {templates.map(template => (
                <SelectItem key={template.id} value={String(template.id)}>
                  <div className="flex items-center gap-2">
                    <span>{template.name}</span>
                    {template.language && (
                      <span className="text-xs text-muted-foreground">
                        ({template.language})
                      </span>
                    )}
                    {template.category && (
                      <Badge variant="outline" className="text-[10px]">
                        {template.category}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedTemplate && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('panels.sendMessage.templatePreview')}</Label>
          <Card className="p-3 space-y-2">
            {Array.isArray(selectedTemplate.components) &&
            selectedTemplate.components.length > 0 ? (
              selectedTemplate.components.map((component, index) =>
                component?.text ? (
                  <p
                    key={index}
                    className={
                      component.type === 'BODY'
                        ? 'text-sm whitespace-pre-wrap'
                        : 'text-xs text-muted-foreground whitespace-pre-wrap'
                    }
                  >
                    {component.text}
                  </p>
                ) : null,
              )
            ) : (
              <p className="text-sm whitespace-pre-wrap">{selectedTemplate.content}</p>
            )}
          </Card>
        </div>
      )}

      {selectedTemplate && (selectedTemplate.variables?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <Label id="send-message-template-vars-label" className="text-sm font-medium">
            {t('panels.sendMessage.templateVariables')}
          </Label>
          <div
            className="space-y-3"
            role="group"
            aria-labelledby="send-message-template-vars-label"
          >
            {selectedTemplate.variables!.map(variable => {
              if (!variable.name) return null;
              const mapping = getVariableMapping(variable.name);
              const isRootSource =
                mapping.source === 'contact' ||
                mapping.source === 'conversation' ||
                mapping.source === 'pipeline';
              const expressionInvalid =
                mapping.source === 'expression' &&
                !!(mapping.expression ?? '').trim() &&
                !isBalancedExpression(mapping.expression!);
              const exprErrorId = `send-message-expr-error-${variable.name}`;
              const variableLabelId = `send-message-var-label-${variable.name}`;

              return (
                <div key={variable.name} className="space-y-1">
                  <Label id={variableLabelId} className="text-xs text-muted-foreground">
                    {variable.label || variable.name}
                    {variable.required && (
                      <span className="text-flow-feedback-error-fg"> *</span>
                    )}
                  </Label>
                  <div className="flex gap-2" role="group" aria-labelledby={variableLabelId}>
                    <Select
                      value={mapping.source}
                      onValueChange={source =>
                        onVariableSourceChange(variable.name!, source as TemplateVariableSource)
                      }
                    >
                      <SelectTrigger className="w-44 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VARIABLE_SOURCES.map(source => (
                          <SelectItem key={source} value={source}>
                            {t(`panels.sendMessage.variableSources.${source}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {mapping.source === 'fixed' && (
                      <Input
                        value={mapping.value ?? ''}
                        onChange={e =>
                          onVariableMappingChange(variable.name!, { value: e.target.value })
                        }
                        placeholder={variable.example || variable.name}
                      />
                    )}

                    {isRootSource && (
                      <Select
                        value={mapping.path ?? ''}
                        onValueChange={path =>
                          onVariableMappingChange(variable.name!, { path })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t('panels.sendMessage.chooseField')} />
                        </SelectTrigger>
                        <SelectContent>
                          {SOURCE_FIELD_PATHS[
                            mapping.source as keyof typeof SOURCE_FIELD_PATHS
                          ].map(path => (
                            <SelectItem key={path} value={path}>
                              {t(
                                `panels.sendMessage.variableFields.${mapping.source}.${path.replace(/\./g, '_')}`,
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {mapping.source === 'expression' && (
                      <div className="w-full space-y-1">
                        <VariableTextarea
                          value={mapping.expression ?? ''}
                          onChange={e =>
                            onVariableMappingChange(variable.name!, {
                              expression: e.target.value,
                            })
                          }
                          placeholder={t('panels.sendMessage.expressionPlaceholder')}
                          className="min-h-[40px] resize-none"
                          journeyId={journeyId}
                          aria-invalid={expressionInvalid}
                          aria-describedby={expressionInvalid ? exprErrorId : undefined}
                        />
                        {expressionInvalid && (
                          <p id={exprErrorId} className="text-xs text-flow-feedback-error-fg">
                            {t('panels.sendMessage.invalidExpression')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {mapping.source !== 'fixed' && (
                    <Input
                      value={mapping.fallback ?? ''}
                      onChange={e =>
                        onVariableMappingChange(variable.name!, { fallback: e.target.value })
                      }
                      placeholder={t('panels.sendMessage.fallbackPlaceholder')}
                      className="text-xs"
                    />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {t('panels.sendMessage.variableSourcesHint')}
          </p>
        </div>
      )}
    </div>
  );
}
