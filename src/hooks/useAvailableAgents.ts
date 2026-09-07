import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { getAccessibleAgents } from '@/services/agents';

export interface AvailableAgent {
  id: string;
  name: string;
  description: string;
}

export const useAvailableAgents = (clientId: string) => {
  const { t: tUi } = useUiTranslation();
  const [availableAgents, setAvailableAgents] = useState<AvailableAgent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAvailableAgents = async () => {
    if (!clientId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await getAccessibleAgents(0, 1000);

      if (response.data) {
        const agents = response.data.map((agent: any) => ({
          id: agent.id,
          name: agent.name,
          description: agent.description || tUi("interface:useavailableagents.agentHasNoDescription"),
        }));

        setAvailableAgents(agents);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tUi("aiAgents:subAgents.loadError"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAvailableAgents();
  }, [clientId]);

  return {
    availableAgents,
    isLoading,
    error,
    refetch: loadAvailableAgents,
  };
};
