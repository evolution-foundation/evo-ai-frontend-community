import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
} from '@evoapi/design-system';
import { Play, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface ElevenLabsConfig {
  apiKey: string;
  respondInAudio: 'when_client_asks' | 'always' | 'never';
  voice: string;
  stability: number;
  similarity: number;
}

interface ElevenLabsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: ElevenLabsConfig) => void;
  onDeactivate?: () => void;
  initialConfig?: Partial<ElevenLabsConfig>;
}

interface Voice {
  voice_id: string;
  name: string;
}

const ElevenLabsConfigDialog = ({
  open,
  onOpenChange,
  onSave,
  onDeactivate,
  initialConfig,
}: ElevenLabsConfigDialogProps) => {
  const { t: tUi } = useUiTranslation();
  const { t } = useLanguage('aiAgents');

  const [config, setConfig] = useState<ElevenLabsConfig>({
    apiKey: initialConfig?.apiKey || '',
    respondInAudio: initialConfig?.respondInAudio || 'when_client_asks',
    voice: initialConfig?.voice || '',
    stability: initialConfig?.stability ?? 80,
    similarity: initialConfig?.similarity ?? 50,
  });

  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [voicesError, setVoicesError] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setConfig({
        apiKey: initialConfig.apiKey || '',
        respondInAudio: initialConfig.respondInAudio || 'when_client_asks',
        voice: initialConfig.voice || '',
        stability: initialConfig.stability ?? 80,
        similarity: initialConfig.similarity ?? 50,
      });
    }
  }, [initialConfig]);

  // Fetch voices from ElevenLabs API when apiKey changes
  useEffect(() => {
    const fetchVoices = async () => {
      if (!config.apiKey || config.apiKey.length < 10) {
        setAvailableVoices([]);
        return;
      }

      setLoadingVoices(true);
      setVoicesError(false);

      try {
        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
          method: 'GET',
          headers: {
            'xi-api-key': config.apiKey,
          },
        });

        if (!response.ok) {
          throw new Error(tUi("interface:elevenlabsconfigdialog.couldNotFetchVoices"));
        }

        const data = await response.json();
        const voices = data.voices.map((voice: any) => ({
          voice_id: voice.voice_id,
          name: voice.name,
        }));

        setAvailableVoices(voices);

        // Se não há voz selecionada e temos vozes disponíveis, seleciona a primeira
        if (!config.voice && voices.length > 0) {
          setConfig((prev) => ({ ...prev, voice: voices[0].voice_id }));
        }
      } catch (error) {
        console.error('Error fetching ElevenLabs voices:', error);
        setVoicesError(true);
        setAvailableVoices([]);
      } finally {
        setLoadingVoices(false);
      }
    };

    fetchVoices();
  }, [config.apiKey, tUi]);

  const handleSave = () => {
    onSave(config);
    onOpenChange(false);
  };

  const handleDeactivate = () => {
    if (onDeactivate) {
      onDeactivate();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t('edit.integrations.elevenlabs.configTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">
              {t('edit.integrations.elevenlabs.apiKey')}
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder={t('edit.integrations.elevenlabs.apiKeyPlaceholder')}
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            />
          </div>

          {/* Quando responder em áudio */}
          {config.apiKey && !voicesError && (
            <div className="space-y-3">
              <Label>
                {t('edit.integrations.elevenlabs.whenToRespond')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('edit.integrations.elevenlabs.whenToRespondDescription')}
              </p>

              <Select
                value={config.respondInAudio}
                onValueChange={(value: 'when_client_asks' | 'always' | 'never') =>
                  setConfig({ ...config, respondInAudio: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="when_client_asks">
                    {t('edit.integrations.elevenlabs.whenClientAsksInAudio')}
                  </SelectItem>
                  <SelectItem value="always">
                    {t('edit.integrations.elevenlabs.alwaysRespondInAudio')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Qual voz deseja usar */}
          {config.apiKey && !voicesError && (
            <div className="space-y-3">
              <Label>
                {t('edit.integrations.elevenlabs.voiceSelection')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('edit.integrations.elevenlabs.voiceSelectionDescription')}
              </p>

              <div className="flex gap-2">
                <Select
                  value={config.voice}
                  onValueChange={(value) => setConfig({ ...config, voice: value })}
                  disabled={loadingVoices || availableVoices.length === 0}
                >
                  <SelectTrigger className="flex-1">
                    {loadingVoices ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('edit.integrations.elevenlabs.loadingVoices')}
                      </span>
                    ) : (
                      <SelectValue placeholder={t('edit.integrations.elevenlabs.selectVoice')} />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {availableVoices.map((voice) => (
                      <SelectItem key={voice.voice_id} value={voice.voice_id}>
                        {voice.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    // TODO: Implementar preview da voz
                    console.log('Preview voice:', config.voice);
                  }}
                  disabled={!config.voice || loadingVoices}
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {config.apiKey && voicesError && (
            <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
              <p className="text-sm text-destructive">
                {t('edit.integrations.elevenlabs.errorLoadingVoices')} {tUi("interface:elevenlabsconfigdialog.checkThatTheApiKeyIsCorrect")}</p>
            </div>
          )}

          {/* Estabilidade */}
          {config.apiKey && !voicesError && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>
                  {t('edit.integrations.elevenlabs.stability')}
                </Label>
                <span className="text-sm font-medium">{config.stability}%</span>
              </div>
              <Slider
                value={[config.stability]}
                onValueChange={(value) => setConfig({ ...config, stability: value[0] })}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          )}

          {/* Similaridade */}
          {config.apiKey && !voicesError && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>
                  {t('edit.integrations.elevenlabs.similarity')}
                </Label>
                <span className="text-sm font-medium">{config.similarity}%</span>
              </div>
              <Slider
                value={[config.similarity]}
                onValueChange={(value) => setConfig({ ...config, similarity: value[0] })}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={!config.apiKey}
              className="w-full"
            >
              {t('edit.integrations.elevenlabs.applyConfig')}
            </Button>

            {onDeactivate && (
              <Button
                variant="ghost"
                onClick={handleDeactivate}
                className="w-full text-destructive hover:text-destructive/80"
              >
                {t('edit.integrations.elevenlabs.deactivate')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ElevenLabsConfigDialog;
