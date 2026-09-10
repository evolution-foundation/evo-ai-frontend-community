import { useNavigate } from 'react-router-dom';
import { AudioWaveform } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import GenericIntegrationSettings from '@/components/integrations/providers/GenericIntegrationSettings';
import ElevenLabsModal from '@/components/integrations/providers/elevenlabs/ElevenLabsModal';

export default function ElevenLabsPage() {
  const { t } = useLanguage('integrations');
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/settings/integrations');
  };

  return (
    <GenericIntegrationSettings
      appId="elevenlabs"
      displayName={t('providers.elevenlabs.name')}
      description={t('providers.elevenlabs.description')}
      icon={AudioWaveform}
      configComponent={ElevenLabsModal}
      onBack={handleBack}
    />
  );
}
