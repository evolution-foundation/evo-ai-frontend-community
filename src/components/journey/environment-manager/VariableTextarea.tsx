import React, { useState, useRef, forwardRef } from 'react';
import {
  Textarea,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Badge,
} from '@evoapi/design-system';
import { Variable } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSystemVariables, VariableOption } from './EnvironmentManager';
import { useJourneyVariables } from '@/hooks/useJourneyVariables';
import { useLanguage } from '@/hooks/useLanguage';

export interface VariableTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  journeyId?: string;
  onVariableInsert?: (variable: string) => void;
  showVariableButton?: boolean;
  variableButtonTooltip?: string;
}

const VariableTextarea = forwardRef<HTMLTextAreaElement, VariableTextareaProps>(
  (
    {
      className,
      journeyId,
      onVariableInsert,
      showVariableButton = true,
      variableButtonTooltip,
      ...props
    },
    ref,
  ) => {
    const { t } = useLanguage('journey');
    const [open, setOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { variables } = useJourneyVariables(journeyId);

    // Usar a ref passada ou a ref interna
    const finalRef = (ref as React.RefObject<HTMLTextAreaElement>) || textareaRef;

    const SYSTEM_VARIABLES = getSystemVariables(t);
    // Combinar variáveis do sistema com variáveis customizadas
    const allVariables: VariableOption[] = [
      ...SYSTEM_VARIABLES,
      ...(variables || []).map(variable => ({
        value: `{{${variable.name}}}`,
        label: variable.name,
        description:
          variable.description ||
          `${t('environmentManager.customVariables.actions.default', { value: variable.type })}`,
        category: t('environmentManager.categories.others'),
      })),
    ];

    const handleVariableSelect = (variable: VariableOption) => {
      if (finalRef.current) {
        const textarea = finalRef.current;
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const currentValue = textarea.value || '';

        const newValue =
          currentValue.substring(0, start) + variable.value + currentValue.substring(end);

        // Update the textarea value directly first
        textarea.value = newValue;

        // Create and dispatch the input event to trigger React's onChange
        const syntheticEvent = {
          target: textarea,
          currentTarget: textarea,
          type: 'input',
          bubbles: true,
          cancelable: false,
          defaultPrevented: false,
          eventPhase: 3,
          isTrusted: true,
          nativeEvent: new Event('input', { bubbles: true }),
          preventDefault: () => {},
          stopPropagation: () => {},
          persist: () => {},
        };

        // Trigger React's onChange handler if it exists
        if (props.onChange) {
          props.onChange(syntheticEvent as any);
        }

        // Set cursor position after the inserted variable
        setTimeout(() => {
          const newPosition = start + variable.value.length;
          textarea.setSelectionRange(newPosition, newPosition);
          textarea.focus();
        }, 0);
      }

      onVariableInsert?.(variable.value);
      setOpen(false);
    };

    const groupedVariables = allVariables.reduce((groups, variable) => {
      const category = variable.category || t('environmentManager.categories.others');
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(variable);
      return groups;
    }, {} as Record<string, VariableOption[]>);

    // Ordenar categorias: Sistema primeiro, depois Customizadas
    const categoryOrder = [
      t('environmentManager.categories.contact'),
      t('environmentManager.categories.event'),
      t('environmentManager.categories.webhook'),
      t('environmentManager.categories.journey'),
      t('environmentManager.categories.others'),
    ];
    const sortedCategories = Object.keys(groupedVariables).sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a);
      const bIndex = categoryOrder.indexOf(b);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    return (
      <div className="relative">
        <Textarea ref={finalRef} className={cn('pr-10', className)} {...props} />

        {showVariableButton && (
          <div className="absolute right-2 top-2">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-muted"
                  aria-label={
                    variableButtonTooltip ||
                    t('environmentManager.customVariables.actions.insertVariable')
                  }
                  title={
                    variableButtonTooltip ||
                    t('environmentManager.customVariables.actions.insertVariable')
                  }
                >
                  <Variable className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-3 border-b">
                  <h4 className="font-medium text-sm">{t('environmentManager.title')}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('environmentManager.description')}
                  </p>
                </div>

                <div className="max-h-60 overflow-y-auto">
                  {sortedCategories.map(category => (
                    <div key={category} className="p-2">
                      <div className="px-2 py-1">
                        <Badge
                          variant={
                            category === t('environmentManager.categories.others')
                              ? 'default'
                              : 'outline'
                          }
                          className="text-xs"
                        >
                          {category}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        {groupedVariables[category].map(variable => (
                          // eslint-disable-next-line no-restricted-syntax -- pre-EVO-1253 raw <button>; environment-manager refactor not in scope of EVO-1274; revisit when a dedicated card covers env vars UI.
                          <button
                            key={variable.value}
                            type="button"
                            onClick={() => handleVariableSelect(variable)}
                            className="w-full text-left px-2 py-2 rounded-md hover:bg-muted transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium truncate">{variable.label}</div>
                                {variable.description && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {variable.description}
                                  </div>
                                )}
                              </div>
                              <code className="text-xs bg-muted px-1 py-0.5 rounded flex-shrink-0">
                                {variable.value}
                              </code>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {(variables || []).length === 0 && (
                    <div className="p-4 text-center text-muted-foreground">
                      <p className="text-sm">
                        {t('environmentManager.customVariables.empty.subtitle')}
                      </p>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    );
  },
);

VariableTextarea.displayName = 'VariableTextarea';

export { VariableTextarea };
