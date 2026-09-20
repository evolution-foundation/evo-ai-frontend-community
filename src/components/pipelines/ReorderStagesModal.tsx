import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from '@evoapi/design-system';
import { GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { PipelineStage as BasePipelineStage } from '@/types/analytics';

interface PipelineStage extends BasePipelineStage {
  conversations?: Array<unknown>;
}

interface ReorderStagesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStage[];
  onSubmit: (orderedStages: PipelineStage[]) => void;
  loading: boolean;
}

export default function ReorderStagesModal({
  open,
  onOpenChange,
  stages,
  onSubmit,
  loading,
}: ReorderStagesModalProps) {
  const { t } = useLanguage('pipelines');
  const [orderedStages, setOrderedStages] = useState<PipelineStage[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Initialize stages when modal opens
  useEffect(() => {
    if (open && stages.length > 0) {
      // Sort stages by position if available, otherwise by id
      const sortedStages = [...stages].sort((a, b) => {
        if (a.position !== undefined && b.position !== undefined) {
          return a.position - b.position;
        }
        return a.id.localeCompare(b.id);
      });
      setOrderedStages(sortedStages);
    }
  }, [open, stages]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newOrderedStages = [...orderedStages];
    const draggedStage = newOrderedStages[draggedIndex];

    // Remove dragged item
    newOrderedStages.splice(draggedIndex, 1);

    // Insert at new position
    newOrderedStages.splice(dropIndex, 0, draggedStage);

    setOrderedStages(newOrderedStages);
    setDraggedIndex(null);
  };

  const moveStage = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;

    if (toIndex < 0 || toIndex >= orderedStages.length) return;

    const newOrderedStages = [...orderedStages];
    const stage = newOrderedStages[fromIndex];

    // Swap positions
    newOrderedStages[fromIndex] = newOrderedStages[toIndex];
    newOrderedStages[toIndex] = stage;

    setOrderedStages(newOrderedStages);
  };

  const handleSubmit = () => {
    // Add position property to stages based on their order
    const stagesWithPosition = orderedStages.map((stage, index) => ({
      ...stage,
      position: index + 1,
    }));

    onSubmit(stagesWithPosition);
  };

  const hasChanges = JSON.stringify(orderedStages.map(s => s.id)) !== JSON.stringify(stages.map(s => s.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* The list is the only scroll area so 8+ stages cannot push the footer
          past the viewport (CRM-382). */}
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t('reorderStages.title')}</DialogTitle>
          <DialogDescription>
            {t('reorderStages.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-2">
            {orderedStages.map((stage, index) => (
              <div
                key={stage.id}
                className={`group p-3 bg-background border border-border rounded-lg transition-all duration-200 ${
                  draggedIndex === index ? 'opacity-50 scale-95' : 'hover:border-primary/30'
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
              >
                <div className="flex items-center space-x-3">
                  {/* Position Number */}
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                    {index + 1}
                  </div>

                  {/* Stage Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <h4 className="text-sm font-medium text-foreground truncate">
                        {stage.name}
                      </h4>
                    </div>
                    {stage.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {stage.description}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {t('reorderStages.conversationsCount', { count: stage.conversations?.length || 0, plural: (stage.conversations?.length || 0) !== 1 ? 's' : '' })}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center space-x-1">
                    {/* Move Up */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                      onClick={() => moveStage(index, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>

                    {/* Move Down */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                      onClick={() => moveStage(index, 'down')}
                      disabled={index === orderedStages.length - 1}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>

                    {/* Drag Handle */}
                    <div className="cursor-grab active:cursor-grabbing p-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {orderedStages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">{t('reorderStages.noStages')}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t('reorderStages.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChanges || loading}
          >
            {loading ? t('reorderStages.saving') : t('reorderStages.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
