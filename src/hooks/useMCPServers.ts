import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { listMCPServers } from '@/services/agents';
import { MCPServer } from '@/types/ai';

export const useMCPServers = () => {
  const { t: tUi } = useUiTranslation();
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMCPServers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const servers = await listMCPServers();
      setMcpServers(servers);
    } catch (err) {
      setError(err instanceof Error ? err.message : tUi("mcpServers:messages.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [tUi]);

  useEffect(() => {
    loadMCPServers();
  }, [loadMCPServers]);

  return {
    mcpServers,
    isLoading,
    error,
    refetch: loadMCPServers,
  };
};
