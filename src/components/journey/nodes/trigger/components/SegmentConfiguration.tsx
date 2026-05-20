import { useState, useEffect } from 'react';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Badge,
} from '@evoapi/design-system';
import { segmentsService } from '@/services/segments/segmentsService';
import { Segment } from '@/types/analytics';
import { useLanguage } from '@/hooks/useLanguage';

interface SegmentConfigurationProps {
  segmentId: string;
  segmentAction: 'entered' | 'exited';
  onSegmentIdChange: (segmentId: string, segmentName?: string) => void;
  onSegmentActionChange: (action: 'entered' | 'exited') => void;
}

export function SegmentConfiguration({
  segmentId,
  segmentAction,
  onSegmentIdChange,
  onSegmentActionChange,
}: SegmentConfigurationProps) {
  const { t } = useLanguage('journey');
  const [availableSegments, setAvailableSegments] = useState<Segment[]>([]);
  const [loadingSegments, setLoadingSegments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAvailableSegments([]);
    setError(null);

    const loadSegments = async () => {
      if (loadingSegments) return;

      setLoadingSegments(true);
      setError(null);

      try {
        const response = await segmentsService.getSegments({
          limit: 100, // Buscar todos os segmentos
          status: 'running', // Apenas segmentos ativos
        });
        setAvailableSegments(response.data || []);
      } catch (error) {
        console.error('Error loading segments:', error);
        setError(t('triggerComponents.segment.loadError'));
      } finally {
        setLoadingSegments(false);
      }
    };

    loadSegments();
  }, [t]);

  const selectedSegment = availableSegments.find(s => s.id === segmentId);

  return (
    <>
      <Separator />
      <div className="space-y-4">
        <Label className="text-sidebar-foreground font-medium">
          {t('triggerComponents.segment.configuration')}
        </Label>

        {/* Ação do Segmento */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {t('triggerComponents.segment.segmentAction')}
          </Label>
          <Select
            value={segmentAction}
            onValueChange={(value: 'entered' | 'exited') => onSegmentActionChange(value)}
          >
            <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
              <SelectValue placeholder={t('triggerComponents.segment.selectAction')} />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border">
              <SelectItem value="entered" className="text-sidebar-foreground">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-500">
                    {t('triggerComponents.segment.entered')}
                  </Badge>
                  <span>{t('triggerComponents.segment.whenEntered')}</span>
                </div>
              </SelectItem>
              <SelectItem value="exited" className="text-sidebar-foreground">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{t('triggerComponents.segment.exited')}</Badge>
                  <span>{t('triggerComponents.segment.whenExited')}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Seleção do Segmento */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('triggerComponents.segment.segment')}</Label>
          {error ? (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          ) : (
            <Select
              value={segmentId}
              onValueChange={selectedSegmentId => {
                const selectedSegment = availableSegments.find(s => s.id === selectedSegmentId);
                onSegmentIdChange(selectedSegmentId, selectedSegment?.name);
              }}
              disabled={loadingSegments}
            >
              <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
                <SelectValue
                  placeholder={
                    loadingSegments
                      ? t('triggerComponents.segment.loadingSegments')
                      : t('triggerComponents.segment.selectSegment')
                  }
                />
              </SelectTrigger>
              <SelectContent className="bg-sidebar border-sidebar-border">
                {loadingSegments ? (
                  <div className="p-2 text-sm text-sidebar-foreground/60 text-center">
                    {t('triggerComponents.segment.loading')}
                  </div>
                ) : availableSegments.length === 0 ? (
                  <div className="p-2 text-sm text-sidebar-foreground/60 text-center">
                    {t('triggerComponents.segment.noActiveSegmentsFound')}
                  </div>
                ) : (
                  availableSegments.map(segment => (
                    <SelectItem
                      key={segment.id}
                      value={segment.id}
                      className="text-sidebar-foreground"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{segment.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {segment.contactsCount || segment.computedCount || 0}{' '}
                            {t('triggerComponents.segment.contacts')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-sidebar-foreground/60">
                          <span>
                            {t('triggerComponents.segment.status')}:{' '}
                            {segment.status === 'running'
                              ? t('triggerComponents.segment.active')
                              : t('triggerComponents.segment.paused')}
                          </span>
                          {segment.lastComputedAt && (
                            <span>
                              • {t('triggerComponents.segment.updated')}:{' '}
                              {new Date(segment.lastComputedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Informações do Segmento Selecionado */}
        {selectedSegment && (
          <div className="p-4 rounded-lg bg-sidebar-accent/20 border border-sidebar-border/50">
            <h4 className="text-sm font-medium text-sidebar-foreground mb-2">
              {t('triggerComponents.segment.selectedSegment')}
            </h4>
            <div className="space-y-2 text-sm text-sidebar-foreground/70">
              <div className="flex justify-between">
                <span>{t('triggerComponents.segment.name')}:</span>
                <span className="font-medium">{selectedSegment.name}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('triggerComponents.segment.contacts')}:</span>
                <span className="font-medium">
                  {selectedSegment.contactsCount || selectedSegment.computedCount || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t('triggerComponents.segment.status')}:</span>
                <Badge
                  variant={selectedSegment.status === 'running' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {selectedSegment.status === 'running'
                    ? t('triggerComponents.segment.active')
                    : t('triggerComponents.segment.paused')}
                </Badge>
              </div>
              {selectedSegment.lastComputedAt && (
                <div className="flex justify-between">
                  <span>{t('triggerComponents.segment.lastUpdate')}:</span>
                  <span className="font-medium">
                    {new Date(selectedSegment.lastComputedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Descrição da Configuração */}
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {segmentAction === 'entered'
              ? t('triggerComponents.segment.enteredDescription')
              : t('triggerComponents.segment.exitedDescription')}
            {selectedSegment && (
              <span className="block mt-1 font-medium">
                {t('triggerComponents.segment.segment')}: {selectedSegment.name} (
                {selectedSegment.contactsCount || selectedSegment.computedCount || 0}{' '}
                {t('triggerComponents.segment.contacts')})
              </span>
            )}
          </p>
        </div>
      </div>
    </>
  );
}
