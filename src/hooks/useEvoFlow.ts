import { useGlobalConfig } from '@/contexts/GlobalConfigContext';
import { buildFlowUrl, validFlowUrl } from '@/services/core/apiEvoFlow';

export function useEvoFlow() {
  const config = useGlobalConfig();
  return {
    loading: (config.configLoading ?? config.setupLoading),
    configured: !(config.configLoading ?? config.setupLoading) && Boolean(validFlowUrl(config.evoFlowPublicUrl) || buildFlowUrl),
  };
}
