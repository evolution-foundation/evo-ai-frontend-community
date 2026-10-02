import { useNavigate } from 'react-router-dom';
import { Bot } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import GenericIntegrationSettings from '@/components/integrations/providers/GenericIntegrationSettings';
import HuggingFaceModal from '@/components/integrations/providers/huggingface/HuggingFaceModal';

export default function HuggingFacePage() {
  const { t } = useLanguage('integrations');
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/settings/integrations');
  };

  return (
    <GenericIntegrationSettings
      appId="huggingface"
      displayName={t('providers.huggingface.name')}
      description={t('providers.huggingface.description')}
      icon={Bot}
      configComponent={HuggingFaceModal}
      onBack={handleBack}
    />
  );
}
