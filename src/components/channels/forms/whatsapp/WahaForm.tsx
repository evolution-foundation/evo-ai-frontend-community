import { FormField } from '../../shared/FormField';
import { FormSection } from '../../shared/FormSection';
import { FormData } from '@/hooks/channels/useChannelForm';
import { PhoneInput } from '@/components/shared/PhoneInput';

interface WahaFormProps {
  form: FormData;
  onFormChange: (key: string, value: string | boolean) => void;
}

export const WahaForm = ({ form, onFormChange }: WahaFormProps) => {
  const getStr = (key: string, fallback = ''): string =>
    typeof form[key] === 'string' ? (form[key] as string) : fallback;

  return (
    <div className="space-y-6">
      <FormField
        label="Base URL"
        value={getStr('base_url')}
        onChange={value => onFormChange('base_url', value)}
        placeholder="https://waha.example.com"
        type="url"
        required
      />

      <FormField
        label="API Key"
        value={getStr('api_key')}
        onChange={value => onFormChange('api_key', value)}
        placeholder="Enter the WAHA API key"
        type="password"
        required
      />

      <FormField
        label="Session name"
        value={getStr('session_name')}
        onChange={value => onFormChange('session_name', value)}
        placeholder="default"
      />

      <div data-tour="whatsapp-credentials">
        <label className="text-sm font-medium text-sidebar-foreground/80 block mb-1">
          Phone number <span className="text-destructive">*</span>
        </label>
        <PhoneInput
          value={getStr('phone_number')}
          onChange={value => onFormChange('phone_number', value)}
          placeholder="Enter the WhatsApp phone number"
          defaultCountry="BR"
        />
      </div>

      <FormSection
        title="About WAHA"
        className="bg-gray-50/10 border-gray-200/20"
      >
        <div className="text-sm text-sidebar-foreground/70 space-y-2">
          <p>
            WAHA (WhatsApp HTTP API) connects to a self-hosted WAHA instance. Inform the base URL,
            API key, session name and phone number for the session you want to link.
          </p>
        </div>
      </FormSection>
    </div>
  );
};
