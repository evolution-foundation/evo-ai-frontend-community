import i18n from '@/i18n/config';
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
  { id: 'name', get label() { return i18n.t("contacts:export.fields.name"); }, category: 'basic' },
  { id: 'email', get label() { return i18n.t("contacts:export.fields.email"); }, category: 'basic' },
  { id: 'phone_number', get label() { return i18n.t("contacts:card.phone"); }, category: 'basic' },
  { id: 'location', get label() { return i18n.t("contacts:form.sections.location"); }, category: 'basic' },
  { id: 'country_code', get label() { return i18n.t("contacts:details.fields.country"); }, category: 'basic' },
  { id: 'website', get label() { return i18n.t("journey:panels.assignBot.website"); }, category: 'basic' },
  { id: 'industry', get label() { return i18n.t("interface:contacteditrules.industry"); }, category: 'basic' },
  { id: 'tax_id', label: 'CPF/CNPJ', category: 'basic' },
  { id: 'company_name', get label() { return i18n.t("contacts:form.fields.company.label"); }, category: 'additional' },
  { id: 'city', get label() { return i18n.t("contacts:details.fields.city"); }, category: 'additional' },
  { id: 'description', get label() { return i18n.t("aiAgents:basicInfo.description"); }, category: 'additional' },
  { id: 'social_profiles', get label() { return i18n.t("contacts:form.sections.socialProfiles"); }, category: 'additional' },
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
            {t('edit.configuration.contactEditRules.description')}
          </p>
        </div>
      </div>

      <Card className={CARD_CLASS}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm font-bold text-foreground">
                {t('edit.configuration.contactEditRules.enableEditing')}
              </Label>
              <p className="mt-[3px] text-[13px] text-muted-foreground">
                {t('edit.configuration.contactEditRules.enableEditingDescription')}
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
                  {t('edit.configuration.contactEditRules.editableFields')}
                </Label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleSelectAll} className={LINK_CLASS}>
                    {t('edit.configuration.contactEditRules.selectAll')}
                  </button>
                  <span className="text-[13px] text-muted-foreground/70">|</span>
                  <button type="button" onClick={handleDeselectAll} className={LINK_CLASS}>
                    {t('edit.configuration.contactEditRules.deselectAll')}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className={SECTION_LABEL_CLASS}>
                  {t('edit.configuration.contactEditRules.basicFields')}
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
                  {t('edit.configuration.contactEditRules.additionalFields')}
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
                {t('edit.configuration.contactEditRules.fieldsSelected')}
              </p>
            </CardContent>
          </Card>

          <Card className={CARD_CLASS}>
            <CardContent className="space-y-2 p-4">
              <Label className="text-sm font-bold text-foreground">
                {t('edit.configuration.contactEditRules.instructions')}
              </Label>
              <p className="text-[13px] text-muted-foreground">
                {t('edit.configuration.contactEditRules.instructionsDescription')}
              </p>
              <Textarea
                value={config.instructions || ''}
                onChange={e => handleInstructionsChange(e.target.value)}
                placeholder={
                  t('edit.configuration.contactEditRules.instructionsPlaceholder')
                }
                maxLength={500}
                className="min-h-[80px] rounded-[9px] border-border bg-card text-sm placeholder:text-muted-foreground/70"
              />
              <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                <span>
                  {t('edit.configuration.contactEditRules.tip')}{' '}
                  {t('edit.configuration.contactEditRules.tipContent')}
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
