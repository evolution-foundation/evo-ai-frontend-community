import { forwardRef, useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
} from '@evoapi/design-system';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useJourneyVariables } from '@/hooks/useJourneyVariables';
import { useLanguage } from '@/hooks/useLanguage';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';
import type { CustomAttributeDefinition } from '@/types/settings';
import { getSystemVariables } from './EnvironmentManager';

export interface VariableSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  onCreateNew?: () => void;
  placeholder?: string;
  className?: string;
  showCreateOption?: boolean;
  showSystemVariables?: boolean;
  showContactAttributes?: boolean;
  disabled?: boolean;
  journeyId?: string; // Para buscar variáveis da jornada
}

const VariableSelect = forwardRef<HTMLButtonElement, VariableSelectProps>(
  (
    {
      value,
      onValueChange,
      onCreateNew,
      placeholder,
      className,
      showCreateOption = true,
      showSystemVariables = false,
      showContactAttributes = false,
      disabled = false,
      journeyId,
      ...props
    },
    ref,
  ) => {
    const { t } = useLanguage('journey');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [contactAttributes, setContactAttributes] = useState<CustomAttributeDefinition[]>([]);
    const [newVariableName, setNewVariableName] = useState('');
    const [newVariableType, setNewVariableType] = useState<'text' | 'number' | 'boolean' | 'date'>(
      'text',
    );
    const [newVariableDescription, setNewVariableDescription] = useState('');
    const [newVariableDefaultValue, setNewVariableDefaultValue] = useState('');
    const { variables, addVariable } = useJourneyVariables(journeyId);

    const SYSTEM_VARIABLES = getSystemVariables(t);

    // Fetch contact custom attribute definitions so they can be branched on as
    // condition fields. On error, leave the list empty — the section simply
    // does not render and the rest of the picker keeps working.
    useEffect(() => {
      if (!showContactAttributes) return;

      let active = true;
      customAttributesService
        .getCustomAttributes('contact_attribute')
        .then(res => {
          if (active) setContactAttributes(res.data);
        })
        .catch(error => {
          console.error('Error fetching contact custom attributes:', error);
        });

      return () => {
        active = false;
      };
    }, [showContactAttributes]);

    const handleValueChange = (selectedValue: string) => {
      if (selectedValue === '__new__') {
        if (onCreateNew) {
          onCreateNew();
        } else {
          setShowCreateModal(true);
        }
      } else {
        onValueChange?.(selectedValue);
      }
    };

    const handleCreateVariable = async () => {
      const trimmedName = newVariableName.trim();

      if (!trimmedName) {
        alert(t('environmentManager.form.fields.name.required'));
        return;
      }

      // Validar nome (sem espaços, apenas letras, números e underscore)
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(trimmedName)) {
        alert(t('environmentManager.form.fields.name.invalid'));
        return;
      }

      // Verificar se já existe
      if (variables.some(v => v.name === trimmedName)) {
        alert(t('environmentManager.form.fields.name.exists'));
        return;
      }

      const newVariable = {
        name: trimmedName,
        type: newVariableType,
        description: newVariableDescription.trim() || undefined,
        defaultValue: newVariableDefaultValue.trim() || undefined,
      };

      try {
        await addVariable(newVariable);
        onValueChange?.(`{{${trimmedName}}}`);

        // Reset form
        setNewVariableName('');
        setNewVariableType('text');
        setNewVariableDescription('');
        setNewVariableDefaultValue('');
        setShowCreateModal(false);
      } catch (error) {
        console.error('Erro ao criar variável:', error);
        alert(t('environmentManager.form.messages.createError'));
      }
    };

    return (
      <>
        <Select
          key={`select-${JSON.stringify(variables.map(v => v.id))}`}
          value={value}
          onValueChange={handleValueChange}
          onOpenChange={() => {}}
          disabled={disabled}
          {...props}
        >
          <SelectTrigger
            ref={ref}
            className={cn(
              'w-full bg-sidebar border-sidebar-border text-sidebar-foreground',
              className,
            )}
          >
            <SelectValue
              placeholder={placeholder || t('environmentManager.form.fields.name.placeholder')}
            />
          </SelectTrigger>
          <SelectContent className="bg-sidebar border-sidebar-border max-h-[400px]">
            {/* Opção de criar nova variável */}
            {showCreateOption && (
              <>
                <SelectItem value="__new__" className="text-sidebar-foreground">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span className="font-medium">
                      {t('environmentManager.customVariables.actions.new')}
                    </span>
                  </div>
                </SelectItem>

                {(variables.length > 0 || showSystemVariables) && <Separator className="my-2" />}
              </>
            )}

            {/* Variáveis do Sistema */}
            {showSystemVariables && (
              <>
                <div className="px-2 py-1 text-xs font-medium text-gray-500">
                  {t('environmentManager.tabs.system')}
                </div>
                {[
                  t('environmentManager.categories.contact'),
                  t('environmentManager.categories.event'),
                  t('environmentManager.categories.webhook'),
                  t('environmentManager.categories.journey'),
                  t('environmentManager.categories.conversation'),
                ].map(category => {
                  const categoryVars = SYSTEM_VARIABLES.filter(v => v.category === category);
                  if (categoryVars.length === 0) return null;

                  return (
                    <div key={category}>
                      <div className="px-2 py-1 text-xs text-muted-foreground">{category}</div>
                      {categoryVars.map(variable => (
                        <SelectItem
                          key={variable.value}
                          value={variable.value}
                          className="text-sidebar-foreground"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{variable.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  );
                })}

                {variables.length > 0 && <Separator className="my-2" />}
              </>
            )}

            {/* Atributos do Contato */}
            {showContactAttributes && contactAttributes.length > 0 && (
              <>
                {/* Only add a leading separator when the system block above did
                    not already render its trailing one (which it does iff there
                    are custom journey variables) — avoids a double separator. */}
                {showSystemVariables && variables.length === 0 && (
                  <Separator className="my-2" />
                )}
                <div className="px-2 py-1 text-xs font-medium text-gray-500">
                  {t('environmentManager.categories.contactAttributes')}
                </div>
                {contactAttributes.map(attribute => (
                  <SelectItem
                    key={attribute.id}
                    value={`{{contact.customAttributes.${attribute.attribute_key}}}`}
                    className="text-sidebar-foreground"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{attribute.attribute_display_name}</span>
                    </div>
                  </SelectItem>
                ))}

                {variables.length > 0 && <Separator className="my-2" />}
              </>
            )}

            {/* Variáveis Personalizadas */}
            {variables.length > 0 && (
              <>
                <div className="px-2 py-1 text-xs font-medium text-gray-500">
                  {t('environmentManager.tabs.custom', { count: variables.length })}
                </div>
                {variables.map(variable => (
                  <SelectItem
                    key={variable.id}
                    value={`{{${variable.name}}}`}
                    className="text-sidebar-foreground"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{variable.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </>
            )}

            {/* Estado vazio */}
            {variables.length === 0 && !showSystemVariables && !showCreateOption && (
              <div className="px-2 py-4 text-center text-sm text-gray-500">
                {t('environmentManager.customVariables.empty.title')}
              </div>
            )}
          </SelectContent>
        </Select>

        {/* Modal de Criação de Variável */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Plus className="w-4 h-4 text-primary" />
                </div>
                {t('environmentManager.form.create.title')}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">
                  {t('environmentManager.form.fields.name.label')}
                </Label>
                <Input
                  value={newVariableName}
                  onChange={e => setNewVariableName(e.target.value)}
                  placeholder={t('environmentManager.form.fields.name.placeholder')}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('environmentManager.form.fields.name.help')}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">
                  {t('environmentManager.form.fields.type.label')}
                </Label>
                <Select
                  value={newVariableType}
                  onValueChange={(value: 'text' | 'number' | 'boolean' | 'date') =>
                    setNewVariableType(value)
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">
                      📝 {t('environmentManager.form.fields.type.text')}
                    </SelectItem>
                    <SelectItem value="number">
                      🔢 {t('environmentManager.form.fields.type.number')}
                    </SelectItem>
                    <SelectItem value="boolean">
                      ☑️ {t('environmentManager.form.fields.type.boolean')}
                    </SelectItem>
                    <SelectItem value="date">
                      📅 {t('environmentManager.form.fields.type.date')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">
                  {t('environmentManager.form.fields.description.label')}
                </Label>
                <Input
                  value={newVariableDescription}
                  onChange={e => setNewVariableDescription(e.target.value)}
                  placeholder={t('environmentManager.form.fields.description.placeholder')}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">
                  {t('environmentManager.form.fields.defaultValue.label')}
                </Label>
                <Input
                  value={newVariableDefaultValue}
                  onChange={e => setNewVariableDefaultValue(e.target.value)}
                  placeholder={t('environmentManager.form.fields.defaultValue.placeholder')}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="flex-1"
              >
                {t('environmentManager.form.actions.cancel')}
              </Button>
              <Button
                onClick={handleCreateVariable}
                className="flex-1"
                disabled={!newVariableName.trim()}
              >
                {t('environmentManager.form.create.button')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  },
);

VariableSelect.displayName = 'VariableSelect';

export { VariableSelect };
