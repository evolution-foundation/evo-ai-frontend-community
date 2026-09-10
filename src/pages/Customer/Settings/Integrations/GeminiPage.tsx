import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import GenericIntegrationSettings from '@/components/integrations/providers/GenericIntegrationSettings';
import GeminiModal from '@/components/integrations/providers/gemini/GeminiModal';

export default function GeminiPage() {
  const { t } = useLanguage('integrations');
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/settings/integrations');
  };

  return (
    <GenericIntegrationSettings
      appId="gemini"
      displayName={t('providers.gemini.name')}
      description={t('providers.gemini.description')}
      icon={Sparkles}
      configComponent={GeminiModal}
      onBack={handleBack}
    />
  );
}
