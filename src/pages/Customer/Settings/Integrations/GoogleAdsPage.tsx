import { useNavigate } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import GenericIntegrationSettings from '@/components/integrations/providers/GenericIntegrationSettings';
import GoogleAdsModal from '@/components/integrations/providers/google_ads/GoogleAdsModal';

export default function GoogleAdsPage() {
  const { t } = useLanguage('integrations');
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/settings/integrations');
  };

  return (
    <GenericIntegrationSettings
      appId="google_ads"
      displayName={t('providers.googleAds.name')}
      description={t('providers.googleAds.description')}
      icon={Megaphone}
      configComponent={GoogleAdsModal}
      onBack={handleBack}
    />
  );
}
