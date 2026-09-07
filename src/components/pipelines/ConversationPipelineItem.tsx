import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Loader2 } from 'lucide-react';
import { PipelineItem, PipelineStage, Pipeline } from '@/types/analytics';
import { pipelinesService } from '@/services/pipelines';
import PipelineItemCard from './PipelineItemCard';
import EditItemModal from './EditItemModal';
import { toast } from 'sonner';

interface ConversationPipelineItemProps {
  conversationId?: string;
  pipelines: Pipeline[];
  isLoadingPipelines: boolean;
  onPipelineUpdated?: () => void;
}

export default function ConversationPipelineItem({
  conversationId,
  pipelines,
  isLoadingPipelines,
  onPipelineUpdated,
}: ConversationPipelineItemProps) {
  const { t } = useLanguage('pipelines');
  const [pipelineItems, setPipelineItems] = useState<PipelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PipelineItem | null>(null);
  const [isUpdatingItem, setIsUpdatingItem] = useState(false);
  const [pipelineStagesMap, setPipelineStagesMap] = useState<Map<string, PipelineStage[]>>(new Map());
  const [pipelinesMap, setPipelinesMap] = useState<Map<string, Pipeline>>(new Map());

  const loadPipelineItem = useCallback(async () => {
      const allItems: PipelineItem[] = [];
      const stagesMap = new Map<string, PipelineStage[]>();
      const pipelinesMapData = new Map<string, Pipeline>();

      for (const pipeline of pipelines) {
        pipelinesMapData.set(pipeline.id, pipeline);

        // Armazenar stages do pipeline para usar no modal de edição
        if (pipeline.stages) {
          stagesMap.set(pipeline.id, pipeline.stages);

          // Coletar todos os items de todos os stages
          for (const stage of pipeline.stages) {
            if (stage.items && stage.items.length > 0) {
              allItems.push(...stage.items);
            }
          }
        }
      }

      setPipelineItems(allItems);
      setPipelineStagesMap(stagesMap);
      setPipelinesMap(pipelinesMapData);
      setIsLoading(isLoadingPipelines || false);
  }, [conversationId, pipelines, isLoadingPipelines]);

  useEffect(() => {
    loadPipelineItem();
  }, [loadPipelineItem]);

  const handleEdit = (item: PipelineItem) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleRemove = async (item: PipelineItem) => {
    try {
      await pipelinesService.removeItemFromPipeline(item.pipeline_id, item.id);
      toast.success(t('kanban.messages.itemRemoved'));
      // Remover item da lista local
      setPipelineItems((prev) => prev.filter((i) => i.id !== item.id));
      onPipelineUpdated?.();
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error(t('kanban.messages.itemRemoveError'));
    }
  };

  const handleItemUpdated = () => {
    setShowEditModal(false);
    setSelectedItem(null);
    loadPipelineItem();
    onPipelineUpdated?.();
  };

  const handleUpdateItem = async (data: {
    notes: string;
    stage_id: string;
    services: Array<{ name: string; value: string }>;
    currency: string;
    custom_attributes?: Record<string, unknown>;
  }) => {
    if (!selectedItem) return;

    setIsUpdatingItem(true);
    try {
      await pipelinesService.updateItemInPipeline(selectedItem.pipeline_id, selectedItem.id, {
        pipeline_stage_id: data.stage_id,
        notes: data.notes,
        custom_fields: {
          services: data.services,
          currency: data.currency,
          ...(data.custom_attributes || {}),
        },
      });
      toast.success(t('kanban.messages.itemUpdated'));
      handleItemUpdated();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error(t('kanban.messages.itemUpdateError'));
    } finally {
      setIsUpdatingItem(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (pipelineItems.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground mb-4">
          {t('kanban.messages.notInPipeline')}
        </p>
      </div>
    );
  }

  const getStageForItem = (item: PipelineItem): PipelineStage | undefined => {
    const stages = pipelineStagesMap.get(item.pipeline_id);
    if (!stages) return undefined;
    const stageId = item.pipeline_stage_id || item.stage_id;
    return stages.find((stage) => String(stage.id) === String(stageId));
  };

  return (
    <div className="space-y-4">
      {/* Cards dos items do pipeline */}
      {pipelineItems.map((item) => {
        const pipeline = pipelinesMap.get(item.pipeline_id);
        const stage = getStageForItem(item);

        return (
          <PipelineItemCard
            key={item.id}
            item={item}
            pipeline={pipeline}
            stage={stage}
            onView={handleEdit}
            onEdit={handleEdit}
            onRemove={handleRemove}
            showActions={true}
          />
        );
      })}

      {showEditModal && selectedItem && (
        <EditItemModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          item={selectedItem}
          stages={pipelineStagesMap.get(selectedItem.pipeline_id) || []}
          onSubmit={handleUpdateItem}
          loading={isUpdatingItem}
        />
      )}
    </div>
  );
}
