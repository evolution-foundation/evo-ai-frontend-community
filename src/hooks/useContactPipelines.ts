import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useEffect, useMemo } from 'react';
import { pipelinesService } from '@/services/pipelines';
import type { Pipeline, PipelineStage, PipelineItem } from '@/types/analytics';

interface PipelineData {
  pipeline: Pipeline;
  stages: PipelineStage[];
  items: PipelineItem[];
}

interface UseContactPipelinesOptions {
  pipelineIds: string[];
  enabled?: boolean;
}

interface ContactPipelineInfo {
  pipeline: Pipeline;
  stage: PipelineStage;
  conversationId: string;
}

export function useContactPipelines({ pipelineIds, enabled = true }: UseContactPipelinesOptions) {
  const { t: tUi } = useUiTranslation();
  const [pipelinesData, setPipelinesData] = useState<Map<string, PipelineData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Carregar dados de todos os pipelines uma vez
  const pipelineIdsKey = useMemo(() => pipelineIds.join(','), [pipelineIds]);

  useEffect(() => {
    if (!enabled || pipelineIds.length === 0) {
      setPipelinesData(new Map());
      return;
    }

    const loadPipelinesData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Carregar todos os dados em paralelo
        const loadPromises = pipelineIds.map(async (pipelineId: string) => {
          try {
            const [pipelineResponse, stagesResponse, itemsResponse] = await Promise.all([
              pipelinesService.getPipeline(pipelineId),
              pipelinesService.getPipelineStages(pipelineId),
              pipelinesService.getPipelineItems(pipelineId),
            ]);

            return {
              pipelineId,
              data: {
                pipeline: pipelineResponse,
                stages: stagesResponse.data || [],
                items: itemsResponse.data || [],
              },
            };
          } catch (err) {
            console.error(`Error loading pipeline ${pipelineId}:`, err);
            return null;
          }
        });

        const results = await Promise.all(loadPromises);
        const dataMap = new Map<string, PipelineData>();

        results.forEach(result => {
          if (result) {
            dataMap.set(result.pipelineId, result.data);
          }
        });

        setPipelinesData(dataMap);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(tUi("interface:usecontactpipelines.couldNotLoadPipelineData")));
        console.error('Error loading pipelines data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPipelinesData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineIdsKey, enabled, tUi]);

  // Função helper para obter pipelines de um contato específico
  const getContactPipelines = useMemo(() => {
    return (contactConversationIds: string[]): ContactPipelineInfo[] => {
      if (contactConversationIds.length === 0 || pipelinesData.size === 0) {
        return [];
      }

      const contactPipelines: ContactPipelineInfo[] = [];

      pipelinesData.forEach(data => {
        // Encontrar conversas do contato neste pipeline
        const conversationItems = data.items.filter(
          (item: PipelineItem) =>
            item.type === 'conversation' && contactConversationIds.includes(String(item.item_id)),
        );

        if (conversationItems.length > 0) {
          const item = conversationItems[0] as PipelineItem;
          const stageId = item.pipeline_stage_id || item.stage_id;
          const stage = data.stages.find((s: PipelineStage) => String(s.id) === String(stageId));

          if (stage) {
            contactPipelines.push({
              pipeline: data.pipeline,
              stage,
              conversationId: String(item.item_id),
            });
          }
        }
      });

      return contactPipelines;
    };
  }, [pipelinesData]);

  return {
    pipelinesData,
    isLoading,
    error,
    getContactPipelines,
  };
}
