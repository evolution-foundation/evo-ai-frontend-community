import { GitBranch } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@evoapi/design-system';
import { Contact } from '@/types/contacts';
import { useLanguage } from '@/hooks/useLanguage';

interface ContactPipelinesBadgeProps {
  contact: Contact;
  maxPipelines?: number;
  compact?: boolean;
}

export default function ContactPipelinesBadge({
  contact,
  maxPipelines = 2,
  compact = false,
}: ContactPipelinesBadgeProps) {
  const { t } = useLanguage('contacts');

  // Use pipelines data from contact object (already loaded from API)
  const contactPipelines = contact.pipelines || [];

  // Se não há pipelines para este contato, não mostrar nada
  if (contactPipelines.length === 0) {
    return null;
  }

  const visiblePipelines = contactPipelines.slice(0, maxPipelines);
  const hiddenPipelines = contactPipelines.slice(maxPipelines);

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {visiblePipelines.map((info, index) => (
          <TooltipProvider key={`${info.pipeline.id}-${index}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-600 text-white cursor-help">
                  <GitBranch className="w-2.5 h-2.5" />
                  <span className="truncate max-w-16">{info.pipeline.name}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="px-3 py-2 bg-popover border border-border shadow-lg rounded-lg">
                <div className="text-center">
                  <div className="text-sm font-semibold text-foreground">{info.pipeline.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{info.stage.name}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        {hiddenPipelines.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-purple-600/70 text-white cursor-help">
                  +{hiddenPipelines.length}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="px-3 py-2 bg-popover border border-border shadow-lg rounded-lg max-w-xs">
                <div className="text-sm font-semibold text-foreground mb-2">
                  {t('pipelines.morePipelines', { count: hiddenPipelines.length })}
                </div>
                <div className="space-y-1">
                  {hiddenPipelines.map((info, index) => (
                    <div key={`hidden-${info.pipeline.id}-${index}`} className="text-xs text-muted-foreground">
                      {info.pipeline.name} • {info.stage.name}
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {visiblePipelines.map((info, index) => (
        <div key={`${info.pipeline.id}-${index}`} className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-600 text-white">
            <GitBranch className="w-2.5 h-2.5" />
            <span className="truncate max-w-24">{info.pipeline.name}</span>
          </div>
          <span className="text-xs text-muted-foreground truncate">{info.stage.name}</span>
        </div>
      ))}
      {hiddenPipelines.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-xs text-muted-foreground cursor-help">
                {t('pipelines.morePipelines', { count: hiddenPipelines.length })}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="px-3 py-2 bg-popover border border-border shadow-lg rounded-lg max-w-xs">
              <div className="text-sm font-semibold text-foreground mb-2">
                {t('pipelines.morePipelines', { count: hiddenPipelines.length })}
              </div>
              <div className="space-y-1">
                {hiddenPipelines.map((info, index) => (
                  <div key={`hidden-${info.pipeline.id}-${index}`} className="text-xs text-muted-foreground">
                    {info.pipeline.name} • {info.stage.name}
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

