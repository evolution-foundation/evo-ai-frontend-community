import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import GenericIntegrationSettings from '@/components/integrations/providers/GenericIntegrationSettings';
import GroqModal from '@/components/integrations/providers/groq/GroqModal';

export default function GroqPage() {
  const { t } = useLanguage('integrations');
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/settings/integrations');
  };

  return (
    <GenericIntegrationSettings
      appId="groq"
      displayName={t('providers.groq.name')}
      description={t('providers.groq.description')}
      icon={Zap}
      configComponent={GroqModal}
      onBack={handleBack}
    />
  );
}
