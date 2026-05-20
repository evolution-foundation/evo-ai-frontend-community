import { useState, useEffect } from 'react';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Badge,
  Card,
  Label,
} from '@evoapi/design-system';
import { ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { TransferJourneyNodeData } from './TransferJourneyNode';
import { BaseFlowPanel } from '@/components/base';
import { journeyService } from '@/services';
import type { Journey } from '@/types/automation';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

interface TransferJourneyPanelProps {
  nodeId: string;
  data: TransferJourneyNodeData;
  onUpdate: (nodeId: string, newData: TransferJourneyNodeData) => void;
  onClose: () => void;
  journeyId: string;
}

export function TransferJourneyPanel({
  nodeId,
  data,
  onUpdate,
  onClose,
  journeyId,
}: TransferJourneyPanelProps) {
  const { t } = useLanguage('journey');

  const [formData, setFormData] = useState<TransferJourneyNodeData>({
    ...data,
    targetJourneyId: data.targetJourneyId || '',
    targetJourneyName: data.targetJourneyName || '',
  });

  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJourneys = async () => {
      try {
        setLoading(true);
        const response = await journeyService.getJourneys({
          limit: 100,
        });

        // Filter out the current journey and only show active journeys
        const availableJourneys = response.data.filter(j => j.id !== journeyId && j.isActive);
        setJourneys(availableJourneys);
      } catch (error) {
        console.error('Erro ao carregar jornadas:', error);
        toast.error(t('panels.transferJourney.messages.loadError'));
        setJourneys([]);
      } finally {
        setLoading(false);
      }
    };

    fetchJourneys();
  }, [journeyId]);

  const handleSave = () => {
    if (!formData.targetJourneyId) {
      toast.error(t('panels.transferJourney.messages.selectRequired'));
      return;
    }

    onUpdate(nodeId, formData);
    toast.success(t('panels.transferJourney.messages.configuredSuccess'));
    onClose();
  };

  const handleJourneyChange = (journeyId: string) => {
    const selectedJourney = journeys.find(j => j.id === journeyId);
    setFormData(prev => ({
      ...prev,
      targetJourneyId: journeyId,
      targetJourneyName: selectedJourney?.name || '',
    }));
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return <Badge variant="success">{t('panels.transferJourney.status.active')}</Badge>;
    } else {
      return <Badge variant="secondary">{t('panels.transferJourney.status.inactive')}</Badge>;
    }
  };

  const isValid = !!formData.targetJourneyId;

  return (
    <BaseFlowPanel
      title={t('panels.transferJourney.title')}
      icon={<ArrowRight className="w-5 h-5 text-orange-500" />}
      onClose={onClose}
      width="w-[600px]"
    >
      <Separator />

      <div className="space-y-4">
        {/* Status de validação */}
        {!isValid && (
          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/30">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {t('panels.transferJourney.incompleteConfig')}:
            </p>
            <ul className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 list-disc list-inside">
              <li>{t('panels.transferJourney.selectDestination')}</li>
            </ul>
          </div>
        )}

        {/* Seleção da Jornada */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {t('panels.transferJourney.destinationJourney')}
          </Label>

          {loading ? (
            <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mr-2" />
              <span className="text-sm text-muted-foreground">
                {t('panels.transferJourney.loading')}
              </span>
            </div>
          ) : journeys.length === 0 ? (
            <Card className="p-6 text-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">
                {t('panels.transferJourney.noJourneysAvailable')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('panels.transferJourney.noActiveJourneys')}
              </p>
            </Card>
          ) : (
            <>
              <Select value={formData.targetJourneyId} onValueChange={handleJourneyChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('panels.transferJourney.chooseJourney')} />
                </SelectTrigger>
                <SelectContent>
                  {journeys.map(journey => (
                    <SelectItem key={journey.id} value={journey.id || ''}>
                      <div className="flex items-center justify-between w-full gap-3">
                        <span className="font-medium">{journey.name}</span>
                        {getStatusBadge(journey.isActive)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <p className="text-xs text-muted-foreground mt-2">
                {t('panels.transferJourney.onlyActiveJourneys')}
              </p>
            </>
          )}
        </div>

        {/* Preview da Configuração */}
        {formData.targetJourneyId && <Separator />}

        {formData.targetJourneyId && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-orange-500" />
              <h4 className="text-sm font-medium">{t('panels.transferJourney.previewTitle')}</h4>
            </div>

            <Card className="p-4 bg-orange-50 dark:bg-orange-950/10 border-orange-200 dark:border-orange-800">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                      {t('panels.transferJourney.transferConfigured')}
                    </p>
                    <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
                      {t('panels.transferJourney.contactWillBeTransferred')}:
                    </p>
                    <Badge variant="outline" className="mt-2">
                      {formData.targetJourneyName}
                    </Badge>
                  </div>
                </div>

                <div className="border-t border-orange-200 dark:border-orange-800 pt-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-orange-800 dark:text-orange-200">
                        {t('panels.transferJourney.important')}:
                      </p>
                      <ul className="text-xs text-orange-700 dark:text-orange-300 space-y-0.5">
                        <li>• {t('panels.transferJourney.warnings.exitImmediately')}</li>
                        <li>• {t('panels.transferJourney.warnings.startFromFirst')}</li>
                        <li>• {t('panels.transferJourney.warnings.noDataTransfer')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Botões de ação */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1 h-10">
          {t('panels.transferJourney.actions.cancel')}
        </Button>
        <Button onClick={handleSave} className="flex-1 h-10" disabled={!isValid}>
          {isValid
            ? t('panels.transferJourney.actions.save')
            : t('panels.transferJourney.actions.configureJourney')}
        </Button>
      </div>
    </BaseFlowPanel>
  );
}
