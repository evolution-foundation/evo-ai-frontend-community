import { useLanguage } from '@/hooks/useLanguage';
import {
  Textarea,
  Card,
  CardContent,
  Checkbox,
  Label,
} from '@evoapi/design-system';
import { Info } from 'lucide-react';
import AgentToggle from '@/components/agents/configuration/AgentToggle';

export interface ContactEditConfig {
  enabled: boolean;
  editableFields: string[];
  instructions: string;
}

interface ContactEditRulesProps {
  config: ContactEditConfig;
  onChange: (config: ContactEditConfig) => void;
}

const CONTACT_FIELDS = [
  { id: 'name', label: 'Nome', category: 'basic' },
  { id: 'email', label: 'Email', category: 'basic' },
  { id: 'phone_number', label: 'Telefone', category: 'basic' },
  { id: 'location', label: 'Localização', category: 'basic' },
  { id: 'country_code', label: 'País', category: 'basic' },
  { id: 'website', label: 'Website', category: 'basic' },
  { id: 'industry', label: 'Indústria', category: 'basic' },
  { id: 'tax_id', label: 'CPF/CNPJ', category: 'basic' },
  { id: 'company_name', label: 'Nome da Empresa', category: 'additional' },
  { id: 'city', label: 'Cidade', category: 'additional' },
  { id: 'description', label: 'Descrição', category: 'additional' },
  { id: 'social_profiles', label: 'Redes Sociais', category: 'additional' },
];

// `py-0` cancels the Card base `py-6`, which would stack with the CardContent.
const CARD_CLASS =
  'rounded-[14px] border-border bg-card py-0 shadow-[0_1px_2px_rgba(16,24,40,0.04)]';
const LINK_CLASS = 'text-[13px] font-semibold text-primary hover:underline';
const SECTION_LABEL_CLASS =
  'text-[11.5px] font-semibold uppercase tracking-[0.5px] text-muted-foreground';
const FIELD_LABEL_CLASS = 'flex-1 cursor-pointer text-[13.5px] text-foreground';

const ContactEditRules = ({ config, onChange }: ContactEditRulesProps) => {
  const { t } = useLanguage('aiAgents');

  const handleToggle = (checked: boolean) => {
    onChange({
      ...config,
      enabled: checked,
    });
  };

  const handleFieldToggle = (fieldId: string, checked: boolean) => {
    const newFields = checked
      ? [...config.editableFields, fieldId]
      : config.editableFields.filter(f => f !== fieldId);

    onChange({
      ...config,
      editableFields: newFields,
    });
  };

  const handleSelectAll = () => {
    onChange({
      ...config,
      editableFields: CONTACT_FIELDS.map(f => f.id),
    });
  };

  const handleDeselectAll = () => {
    onChange({
      ...config,
      editableFields: [],
    });
  };

  const handleInstructionsChange = (instructions: string) => {
    onChange({
      ...config,
      instructions,
    });
  };

  const basicFields = CONTACT_FIELDS.filter(f => f.category === 'basic');
  const additionalFields = CONTACT_FIELDS.filter(f => f.category === 'additional');

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-[10px] border border-primary/30 bg-primary/10 p-3">
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
        <div className="flex-1">
          <p className="text-sm leading-[1.5] text-primary">
            {t('edit.configuration.contactEditRules.description') ||
              'Permite que o agente edite informações do contato durante a conversa. Configure quais campos podem ser alterados e quando isso deve acontecer.'}
          </p>
        </div>
      </div>

      <Card className={CARD_CLASS}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm font-bold text-foreground">
                {t('edit.configuration.contactEditRules.enableEditing') || 'Permitir edição de contatos'}
              </Label>
              <p className="mt-[3px] text-[13px] text-muted-foreground">
                {t('edit.configuration.contactEditRules.enableEditingDescription') ||
                  'Habilita o agente a modificar informações de contato'}
              </p>
            </div>
            <AgentToggle checked={config.enabled} onCheckedChange={handleToggle} />
          </div>
        </CardContent>
      </Card>

      {config.enabled && (
        <>
          <Card className={CARD_CLASS}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm font-bold text-foreground">
                  {t('edit.configuration.contactEditRules.editableFields') || 'Campos editáveis'}
                </Label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleSelectAll} className={LINK_CLASS}>
                    {t('edit.configuration.contactEditRules.selectAll') || 'Selecionar todos'}
                  </button>
                  <span className="text-[13px] text-muted-foreground/70">|</span>
                  <button type="button" onClick={handleDeselectAll} className={LINK_CLASS}>
                    {t('edit.configuration.contactEditRules.deselectAll') || 'Desmarcar todos'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className={SECTION_LABEL_CLASS}>
                  {t('edit.configuration.contactEditRules.basicFields') || 'Campos Básicos'}
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {basicFields.map(field => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`field-${field.id}`}
                        checked={config.editableFields.includes(field.id)}
                        onCheckedChange={checked => handleFieldToggle(field.id, !!checked)}
                      />
                      <label htmlFor={`field-${field.id}`} className={FIELD_LABEL_CLASS}>
                        {field.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <p className={SECTION_LABEL_CLASS}>
                  {t('edit.configuration.contactEditRules.additionalFields') || 'Campos Adicionais'}
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {additionalFields.map(field => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`field-${field.id}`}
                        checked={config.editableFields.includes(field.id)}
                        onCheckedChange={checked => handleFieldToggle(field.id, !!checked)}
                      />
                      <label htmlFor={`field-${field.id}`} className={FIELD_LABEL_CLASS}>
                        {field.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {config.editableFields.length}{' '}
                {t('edit.configuration.contactEditRules.fieldsSelected') || 'campos selecionados'}
              </p>
            </CardContent>
          </Card>

          <Card className={CARD_CLASS}>
            <CardContent className="space-y-2 p-4">
              <Label className="text-sm font-bold text-foreground">
                {t('edit.configuration.contactEditRules.instructions') || 'Instruções'}
              </Label>
              <p className="text-[13px] text-muted-foreground">
                {t('edit.configuration.contactEditRules.instructionsDescription') ||
                  'Defina quando e como o agente deve editar as informações do contato'}
              </p>
              <Textarea
                value={config.instructions || ''}
                onChange={e => handleInstructionsChange(e.target.value)}
                placeholder={
                  t('edit.configuration.contactEditRules.instructionsPlaceholder') ||
                  'Ex: Atualize o nome do contato quando ele se apresentar. Adicione o email quando o cliente fornecer. Atualize a cidade quando o cliente mencionar sua localização...'
                }
                maxLength={500}
                className="min-h-[80px] rounded-[9px] border-border bg-card text-sm placeholder:text-muted-foreground/70"
              />
              <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                <span>
                  {t('edit.configuration.contactEditRules.tip') || 'Dica:'}{' '}
                  {t('edit.configuration.contactEditRules.tipContent') ||
                    'Seja específico sobre quando cada campo deve ser editado'}
                </span>
                <span className="flex-shrink-0">{(config.instructions?.length || 0)}/500</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ContactEditRules;
