import React, { useState, useRef, forwardRef } from 'react';
import {
  Input,
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
import { PhoneInput } from '@/components/shared/PhoneInput';

export interface VariableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // Optional: contexts without a journey (campaigns, automations) omit it, so the
  // variable autocomplete falls back to system variables only — no journey fetch.
  journeyId?: string;
  onVariableInsert?: (variable: string) => void;
  showVariableButton?: boolean;
  variableButtonTooltip?: string;
}

const VariableInput = forwardRef<HTMLInputElement, VariableInputProps>(
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
    const inputRef = useRef<HTMLInputElement>(null);
    const { variables } = useJourneyVariables(journeyId);

    // Usar a ref passada ou a ref interna
    const finalRef = (ref as React.RefObject<HTMLInputElement>) || inputRef;

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
        const input = finalRef.current;
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const currentValue = input.value || '';

        const newValue =
          currentValue.substring(0, start) + variable.value + currentValue.substring(end);

        // Update the input value directly first
        input.value = newValue;

        // Create and dispatch the input event to trigger React's onChange
        const syntheticEvent = {
          target: input,
          currentTarget: input,
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
          input.setSelectionRange(newPosition, newPosition);
          input.focus();
        }, 0);
      }

      onVariableInsert?.(variable.value);
      setOpen(false);
    };

    const handlePhoneVariableSelect = (variable: VariableOption, currentValue: string) => {
      // Para PhoneInput, inserir variável no valor atual
      // Inserir no final do valor atual (similar ao comportamento padrão)
      const newValue = currentValue + variable.value;

      // Criar evento sintético compatível com React InputHTMLAttributes
      if (props.onChange) {
        const syntheticEvent = {
          target: { value: newValue },
          currentTarget: { value: newValue },
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
        props.onChange(syntheticEvent as any);
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

    // Se o tipo for "tel", usar PhoneInput APENAS se não houver variáveis no valor
    const isPhoneType = props.type === 'tel';
    const currentValue = typeof props.value === 'string' ? props.value : '';
    // Verificar se o valor contém variáveis (ex: {{contact.phone}})
    const hasVariables = currentValue.includes('{{') && currentValue.includes('}}');
    // Usar PhoneInput apenas se for tipo tel E não tiver variáveis
    const shouldUsePhoneInput = isPhoneType && !hasVariables;

    return (
      <div className="relative">
        {shouldUsePhoneInput ? (
          <PhoneInput
            value={currentValue}
            onChange={value => {
              // Converter string do PhoneInput para formato de evento para manter compatibilidade
              if (props.onChange) {
                const syntheticEvent = {
                  target: { value: value || '' },
                  currentTarget: { value: value || '' },
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
                props.onChange(syntheticEvent as any);
              }
            }}
            placeholder={props.placeholder}
            defaultCountry="BR"
            disabled={props.disabled}
            className={cn(className)}
          />
        ) : (
          <Input 
            ref={finalRef} 
            className={cn('pr-10', className)} 
            type={isPhoneType ? 'tel' : props.type}
            {...props} 
          />
        )}

        {showVariableButton && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10">
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
                            onClick={() =>
                              shouldUsePhoneInput
                                ? handlePhoneVariableSelect(variable, currentValue)
                                : handleVariableSelect(variable)
                            }
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

VariableInput.displayName = 'VariableInput';

export { VariableInput };
