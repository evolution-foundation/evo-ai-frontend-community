import { useState, useEffect } from 'react';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Separator,
} from '@evoapi/design-system';
import { Plus, X } from 'lucide-react';
import { VariableInput, VariableMapping, type DataMapping } from '@/components/journey/environment-manager';
import { useLanguage } from '@/hooks/useLanguage';

interface ContactField {
  field: string;
  operator: string;
  value?: unknown;
}

interface ContactConfigurationProps {
  triggerType: 'contactCreated' | 'contactUpdated';
  contactFields: ContactField[];
  onContactFieldsChange: (fields: ContactField[]) => void;
  variableMappings?: DataMapping[];
  onVariableMappingsChange?: (mappings: DataMapping[]) => void;
  journeyId?: string;
}

// Moved to component to use translations

export function ContactConfiguration({
  triggerType,
  contactFields,
  onContactFieldsChange,
  variableMappings = [],
  onVariableMappingsChange,
  journeyId,
}: ContactConfigurationProps) {
  const { t } = useLanguage('journey');
  const [fields, setFields] = useState<ContactField[]>(contactFields);

  const CONTACT_FIELD_OPTIONS = [
    { value: 'name', label: t('triggerComponents.contact.fields.name') },
    { value: 'email', label: t('triggerComponents.contact.fields.email') },
    { value: 'phone', label: t('triggerComponents.contact.fields.phone') },
    { value: 'meio', label: t('triggerComponents.contact.fields.meio') },
    { value: 'sobrenome', label: t('triggerComponents.contact.fields.sobrenome') },
    { value: 'localizacao', label: t('triggerComponents.contact.fields.localizacao') },
    { value: 'codigo_do_pais', label: t('triggerComponents.contact.fields.codigo_do_pais') },
    { value: 'identificador', label: t('triggerComponents.contact.fields.identificador') },
    { value: 'tipo_do_contato', label: t('triggerComponents.contact.fields.tipo_do_contato') },
    { value: 'bloqueado', label: t('triggerComponents.contact.fields.bloqueado') },
    { value: 'ultima_atividade', label: t('triggerComponents.contact.fields.ultima_atividade') },
    { value: 'criado', label: t('triggerComponents.contact.fields.criado') },
    { value: 'atualizado', label: t('triggerComponents.contact.fields.atualizado') },
  ];

  const OPERATOR_OPTIONS = [
    { value: 'equals', label: t('triggerComponents.operators.equals') },
    { value: 'not_equals', label: t('triggerComponents.operators.not_equals') },
    { value: 'contains', label: t('triggerComponents.operators.contains') },
    { value: 'not_contains', label: t('triggerComponents.operators.not_contains') },
    { value: 'starts_with', label: t('triggerComponents.operators.starts_with') },
    { value: 'ends_with', label: t('triggerComponents.operators.ends_with') },
    { value: 'is_empty', label: t('triggerComponents.operators.is_empty') },
    { value: 'is_not_empty', label: t('triggerComponents.operators.is_not_empty') },
  ];

  // Gerar caminhos disponíveis dinamicamente baseado nos campos configurados
  const generateContactPaths = () => {
    const basePaths = [
      'contact.id',
      'contact.name',
      'contact.email',
      'contact.phone',
      'contact.created_at',
      'contact.updated_at',
    ];

    // Adicionar campos configurados
    const fieldPaths = fields
      .filter(field => field.field && field.field.trim())
      .map(field => `contact.${field.field}`);

    // Remover duplicatas
    const allPaths = [...basePaths, ...fieldPaths];
    return [...new Set(allPaths)];
  };

  useEffect(() => {
    setFields(contactFields);
  }, [contactFields]);

  const addField = () => {
    const newField: ContactField = {
      field: '',
      operator: 'equals',
      value: '',
    };
    const updatedFields = [...fields, newField];
    setFields(updatedFields);
    onContactFieldsChange(updatedFields);
  };

  const removeField = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    setFields(updatedFields);
    onContactFieldsChange(updatedFields);
  };

  const updateField = (index: number, updates: Partial<ContactField>) => {
    const updatedFields = fields.map((field, i) =>
      i === index ? { ...field, ...updates } : field,
    );
    setFields(updatedFields);
    onContactFieldsChange(updatedFields);
  };

  const needsValue = (operator: string) => {
    return !['is_empty', 'is_not_empty'].includes(operator);
  };

  return (
    <>
      <Separator />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sidebar-foreground font-medium">
            {triggerType === 'contactCreated'
              ? t('triggerComponents.contact.filtersForCreated')
              : t('triggerComponents.contact.fieldsToMonitor')}
          </Label>
          <Button onClick={addField} variant="outline" size="sm" className="h-8">
            <Plus className="w-3 h-3 mr-1" />
            {t('triggerComponents.contact.addField')}
          </Button>
        </div>

        {fields.length === 0 ? (
          <div className="p-4 rounded-lg bg-sidebar-accent/20 border border-sidebar-border/50 text-center">
            <p className="text-sm text-sidebar-foreground/60">
              {triggerType === 'contactCreated'
                ? t('triggerComponents.contact.noFiltersConfigured')
                : t('triggerComponents.contact.noSpecificFieldsMonitored')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={index}
                className="p-4 rounded-lg bg-sidebar-accent/10 border border-sidebar-border/30 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-sidebar-foreground">
                    {t('triggerComponents.contact.fieldNumber', { number: index + 1 })}
                  </span>
                  <Button
                    onClick={() => removeField(index)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Campo */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">
                      {t('triggerComponents.contact.field')}
                    </Label>
                    <Select
                      value={field.field}
                      onValueChange={value => updateField(index, { field: value })}
                    >
                      <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
                        <SelectValue placeholder={t('triggerComponents.contact.selectField')} />
                      </SelectTrigger>
                      <SelectContent className="bg-sidebar border-sidebar-border">
                        {CONTACT_FIELD_OPTIONS.map(option => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className="text-sidebar-foreground"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Operador */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">
                      {t('triggerComponents.contact.condition')}
                    </Label>
                    <Select
                      value={field.operator}
                      onValueChange={value => updateField(index, { operator: value })}
                    >
                      <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
                        <SelectValue placeholder={t('triggerComponents.contact.selectCondition')} />
                      </SelectTrigger>
                      <SelectContent className="bg-sidebar border-sidebar-border">
                        {OPERATOR_OPTIONS.map(option => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className="text-sidebar-foreground"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Valor */}
                  {needsValue(field.operator) && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">
                        {t('triggerComponents.contact.value')}
                      </Label>
                      <VariableInput
                        value={typeof field.value === 'string' ? field.value : ''}
                        onChange={e => updateField(index, { value: e.target.value })}
                        placeholder={t('triggerComponents.contact.enterValue')}
                        className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground"
                        journeyId={journeyId}
                        onVariableInsert={variable => {
                          console.log('Variable inserted in contact field value:', variable);
                        }}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('triggerComponents.contact.useVariablesHint')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Descrição da Configuração */}
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {triggerType === 'contactCreated' ? (
              <>
                {t('triggerComponents.contact.createdDescription')}{' '}
                {fields.length > 0 && t('triggerComponents.contact.withFiltersConfigured')}.
              </>
            ) : (
              <>
                {t('triggerComponents.contact.updatedDescription')}{' '}
                {fields.length > 0
                  ? t('triggerComponents.contact.withConfiguredFieldsChanged')
                  : ''}
                .
              </>
            )}
          </p>
          {fields.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                {t('triggerComponents.contact.configuredConditions')}:
              </p>
              <ul className="text-xs text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
                {fields.map((field, index) => {
                  const fieldLabel =
                    CONTACT_FIELD_OPTIONS.find(f => f.value === field.field)?.label || field.field;
                  const operatorLabel =
                    OPERATOR_OPTIONS.find(o => o.value === field.operator)?.label || field.operator;
                  return (
                    <li key={index}>
                      {fieldLabel} {operatorLabel.toLowerCase()}{' '}
                      {needsValue(field.operator) && Boolean(field.value) && `"${String(field.value)}"`}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Mapeamento de Variáveis */}
        {onVariableMappingsChange && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {t('triggerComponents.contact.captureContactData')}
              </Label>
              <VariableMapping
                mappings={variableMappings}
                onMappingsChange={onVariableMappingsChange}
                paths={generateContactPaths()}
                journeyId={journeyId}
                className="bg-white dark:bg-gray-900/50 p-4 rounded-lg border"
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}
