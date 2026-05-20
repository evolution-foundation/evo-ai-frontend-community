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
import { labelsService } from '@/services/contacts/labelsService';
import { Label as LabelType } from '@/types/settings';
import { useLanguage } from '@/hooks/useLanguage';

interface LabelConfigurationProps {
  labelId: string;
  labelAction: 'applied' | 'removed';
  onLabelIdChange: (labelId: string, labelName?: string) => void;
  onLabelActionChange: (action: 'applied' | 'removed') => void;
}

export function LabelConfiguration({
  labelId,
  labelAction,
  onLabelIdChange,
  onLabelActionChange,
}: LabelConfigurationProps) {
  const { t } = useLanguage('journey');
  const [availableLabels, setAvailableLabels] = useState<LabelType[]>([]);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAvailableLabels([]);
    setError(null);

    const loadLabels = async () => {
      if (loadingLabels) return;

      setLoadingLabels(true);
      setError(null);

      try {
        const response = await labelsService.getLabels();
        setAvailableLabels(response.data || []);
      } catch (error) {
        console.error('Error loading labels:', error);
        setError(t('triggerComponents.label.loadError'));
      } finally {
        setLoadingLabels(false);
      }
    };

    loadLabels();
  }, [t]);

  const selectedLabel = availableLabels.find(l => l.id === labelId);

  return (
    <>
      <Separator />
      <div className="space-y-4">
        <Label className="text-sidebar-foreground font-medium">
          {t('triggerComponents.label.configuration')}
        </Label>

        {/* Ação da Etiqueta */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('triggerComponents.label.labelAction')}</Label>
          <Select
            value={labelAction}
            onValueChange={(value: 'applied' | 'removed') => onLabelActionChange(value)}
          >
            <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
              <SelectValue placeholder={t('triggerComponents.label.selectAction')} />
            </SelectTrigger>
            <SelectContent className="bg-sidebar border-sidebar-border">
              <SelectItem value="applied" className="text-sidebar-foreground">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-500">
                    {t('triggerComponents.label.applied')}
                  </Badge>
                  <span>{t('triggerComponents.label.whenApplied')}</span>
                </div>
              </SelectItem>
              <SelectItem value="removed" className="text-sidebar-foreground">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{t('triggerComponents.label.removed')}</Badge>
                  <span>{t('triggerComponents.label.whenRemoved')}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Seleção da Etiqueta */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('triggerComponents.label.label')}</Label>
          {error ? (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          ) : (
            <Select
              value={labelId}
              onValueChange={selectedLabelId => {
                const selectedLabel = availableLabels.find(l => l.id === selectedLabelId);
                onLabelIdChange(selectedLabelId, selectedLabel?.title);
              }}
              disabled={loadingLabels}
            >
              <SelectTrigger className="w-full bg-sidebar border-sidebar-border text-sidebar-foreground">
                <SelectValue
                  placeholder={
                    loadingLabels
                      ? t('triggerComponents.label.loadingLabels')
                      : t('triggerComponents.label.selectLabel')
                  }
                />
              </SelectTrigger>
              <SelectContent className="bg-sidebar border-sidebar-border">
                {loadingLabels ? (
                  <div className="p-2 text-sm text-sidebar-foreground/60 text-center">
                    {t('triggerComponents.label.loading')}
                  </div>
                ) : availableLabels.length === 0 ? (
                  <div className="p-2 text-sm text-sidebar-foreground/60 text-center">
                    {t('triggerComponents.label.noLabelsFound')}
                  </div>
                ) : (
                  availableLabels.map(label => (
                    <SelectItem key={label.id} value={label.id} className="text-sidebar-foreground">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: label.color || '#6b7280' }}
                        />
                        <span className="font-medium">{label.title}</span>
                        {label.description && (
                          <span className="text-xs text-sidebar-foreground/60">
                            • {label.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Informações da Etiqueta Selecionada */}
        {selectedLabel && (
          <div className="p-4 rounded-lg bg-sidebar-accent/20 border border-sidebar-border/50">
            <h4 className="text-sm font-medium text-sidebar-foreground mb-2">
              {t('triggerComponents.label.selectedLabel')}
            </h4>
            <div className="space-y-2 text-sm text-sidebar-foreground/70">
              <div className="flex justify-between items-center">
                <span>{t('triggerComponents.label.name')}:</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedLabel.color || '#6b7280' }}
                  />
                  <span className="font-medium">{selectedLabel.title}</span>
                </div>
              </div>
              {selectedLabel.description && (
                <div className="flex justify-between">
                  <span>{t('triggerComponents.label.description')}:</span>
                  <span className="font-medium">{selectedLabel.description}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{t('triggerComponents.label.createdAt')}:</span>
                <span className="font-medium">
                  {new Date(selectedLabel.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Descrição da Configuração */}
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {labelAction === 'applied'
              ? t('triggerComponents.label.appliedDescription')
              : t('triggerComponents.label.removedDescription')}
            {selectedLabel && (
              <span className="block mt-1 font-medium">
                {t('triggerComponents.label.label')}: {selectedLabel.title}
              </span>
            )}
          </p>
        </div>
      </div>
    </>
  );
}
