import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { listTools } from '@/services/agents';
import { Tool, ToolsResponse } from '@/types';

export const useTools = (params?: { category?: string; tags?: string; search?: string }) => {
  const { t: tUi } = useUiTranslation();
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const loadTools = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response: ToolsResponse = await listTools({
        ...params,
      });

      setTools(response.tools);
      setTotal(response.metadata.total_tools);
    } catch (err) {
      setError(err instanceof Error ? err.message : tUi("tools:messages.loadError"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTools();
  }, [params?.category, params?.tags, params?.search]);

  return {
    tools,
    total,
    isLoading,
    error,
    refetch: loadTools,
  };
};
