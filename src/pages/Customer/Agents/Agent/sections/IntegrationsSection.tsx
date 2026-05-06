import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
} from '@evoapi/design-system';
import { ExternalLink, Plug, Check, Settings, Loader2, AlertCircle } from 'lucide-react';
import ElevenLabsConfigDialog from '@/components/integrations/ElevenLabsConfigDialog';
import GoogleCalendarConfigDialog from '@/components/integrations/GoogleCalendarConfigDialog';
import GoogleSheetsConfigDialog from '@/components/integrations/GoogleSheetsConfigDialog';
import { useIntegrations } from '@/hooks/useIntegrations';
import BrandIcon from '@/components/BrandIcon';

interface Integration {
  id: string;
  name: string;
  description: string;
}

interface IntegrationsSectionProps {
  integrations?: Record<string, unknown>;
  onIntegrationsChange?: (integrations: Record<string, unknown>) => void;
  agentId: string;
}

const IntegrationsSection = ({
  integrations = {},
  onIntegrationsChange,
  agentId,
}: IntegrationsSectionProps) => {
  const { t } = useLanguage('aiAgents');
  const [showElevenLabsConfig, setShowElevenLabsConfig] = useState(false);
  const [showGoogleCalendarConfig, setShowGoogleCalendarConfig] = useState(false);
  const [showGoogleSheetsConfig, setShowGoogleSheetsConfig] = useState(false);

  // Use custom hook for integrations status
  const { credentialsConfigured, isCheckingIntegrations, isConnected, reloadConfigs } =
    useIntegrations(agentId);

  // Integrações que sempre estão disponíveis (não dependem de OAuth global)
  const ALWAYS_AVAILABLE_INTEGRATIONS = ['elevenlabs', 'google-calendar', 'google-sheets'];

  const availableIntegrations: Integration[] = [
    {
      id: 'elevenlabs',
      name: 'ElevenLabs',
      description:
        t('edit.integrations.elevenlabs.description') ||
        'Com ElevenLabs você da a capacidade do seu agente responder seus clientes em áudio, tornando ainda mais humanizado.',
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description:
        t('edit.integrations.googleCalendar.description') ||
        'Permite agendar eventos, verificar disponibilidade e gerenciar calendários.',
    },
    {
      id: 'google-sheets',
      name: 'Google Sheets',
      description:
        t('edit.integrations.googleSheets.description') ||
        'Permite criar, ler, atualizar e gerenciar planilhas do Google Sheets.',
    },
    // {
    //   id: 'gmail',
    //   name: 'Gmail',
    //   description: t('edit.integrations.gmail.description') || 'Conecte o agente ao Gmail para ler, enviar e gerenciar emails automaticamente.',
    // },
    // {
    //   id: 'google-drive',
    //   name: 'Google Drive',
    //   description: t('edit.integrations.googleDrive.description') || 'Permite que o agente acesse, busque e gerencie arquivos no Google Drive.',
    // }
  ];

  return (
    <div className="space-y-8">
      {/* Cabeçalho da Seção */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b">
          <div className="p-2 rounded-lg bg-indigo-500/10">
            <Plug className="h-5 w-5 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">
              {t('edit.integrations.title') || 'Integrações'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('edit.integrations.subtitle') ||
                'Conecte o seu agente a outros aplicativos, isso permite que ele obtenha informações mais precisas ou agende reuniões para você.'}
            </p>
          </div>
        </div>

        <div className="pl-11">
          {isCheckingIntegrations ? (
            <div className="flex flex-col gap-3 items-center py-12 h-32 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin" />
              <div className="text-sm">
                {t('integrations.checking') || 'Verificando integrações...'}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableIntegrations.map(integration => {
                // Integrações que sempre estão disponíveis (ElevenLabs usa API Key, Google Calendar configurado localmente)
                const isAlwaysAvailable = ALWAYS_AVAILABLE_INTEGRATIONS.includes(integration.id);
                const hasCredentials =
                  isAlwaysAvailable || (credentialsConfigured[integration.id] ?? false);
                const connected = isConnected(integration.id);

                return (
                  <Card
                    key={integration.id}
                    className="hover:border-primary/50 transition-colors flex flex-col"
                  >
                    <CardHeader className="flex flex-col items-center text-center space-y-4 pb-4">
                      {/* Logo centralizada e maior — BrandIcon aplica a cor oficial da marca */}
                      <div className="flex items-center justify-center w-20 h-20 p-3 rounded-lg bg-muted/50">
                        <BrandIcon id={integration.id} size={48} className="h-12 w-12" />
                      </div>

                      {/* Título */}
                      <CardTitle className="text-xl font-semibold">{integration.name}</CardTitle>

                      {/* Coming Soon Badge — only for integrations that depend on OAuth credentials
                          not yet configured globally. ElevenLabs / Google Calendar / Google Sheets
                          are always available (API key or per-agent OAuth), so no "coming soon"
                          badge for them — just the ATIVAR / ATIVO state below. */}
                      {!connected && !isAlwaysAvailable && (
                        <span className="px-1 py-0.5 text-[12px] font-medium bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                          {t('edit.integrations.comingSoon') || 'Em breve'}
                        </span>
                      )}

                      {/* Descrição */}
                      <CardDescription className="text-sm leading-relaxed">
                        {integration.description}
                      </CardDescription>
                    </CardHeader>

                    {/* Botões */}
                    <CardContent className="mt-auto pt-0 space-y-2">
                      {connected ? (
                        <>
                          {/* Botão de Status - Conectado */}
                          <Button
                            variant="success"
                            className="w-full gap-2 bg-green-600 text-white hover:bg-green-700 border-green-600 cursor-default"
                            disabled
                          >
                            <Check className="h-4 w-4" />
                            {t('edit.integrations.active') || 'ATIVO'}
                          </Button>
                          {/* Botão de Configuração */}
                          <Button
                            variant="outline"
                            className="w-full gap-2"
                            onClick={() => {
                              if (integration.id === 'elevenlabs') {
                                setShowElevenLabsConfig(true);
                              } else if (integration.id === 'google-calendar') {
                                setShowGoogleCalendarConfig(true);
                              } else if (integration.id === 'google-sheets') {
                                setShowGoogleSheetsConfig(true);
                              }
                            }}
                          >
                            <Settings className="h-4 w-4" />
                            {t('edit.integrations.configure') || 'CONFIGURAR'}
                          </Button>
                        </>
                      ) : hasCredentials ? (
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() => {
                            if (integration.id === 'elevenlabs') {
                              setShowElevenLabsConfig(true);
                            } else if (integration.id === 'google-calendar') {
                              setShowGoogleCalendarConfig(true);
                            } else if (integration.id === 'google-sheets') {
                              setShowGoogleSheetsConfig(true);
                            }
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                          {t('edit.integrations.activate') || 'ATIVAR'}
                        </Button>
                      ) : (
                        <>
                          {/* Credenciais globais não configuradas */}
                          <Button
                            variant="outline"
                            className="w-full gap-2 border-gray-300 text-gray-500 cursor-not-allowed"
                            disabled
                          >
                            <AlertCircle className="h-4 w-4" />
                            {t('edit.integrations.notAvailable') || 'NÃO DISPONÍVEL'}
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dialog de configuração ElevenLabs */}
      <ElevenLabsConfigDialog
        open={showElevenLabsConfig}
        onOpenChange={setShowElevenLabsConfig}
        initialConfig={
          integrations.elevenlabs as
            | Partial<{
                apiKey: string;
                respondInAudio: 'when_client_asks' | 'always' | 'never';
                voice: string;
                stability: number;
                similarity: number;
              }>
            | undefined
        }
        onSave={config => {
          if (onIntegrationsChange) {
            onIntegrationsChange({
              ...integrations,
              elevenlabs: config,
            });
          }
          // Reload configs to update status
          reloadConfigs();
        }}
        onDeactivate={
          integrations.elevenlabs
            ? () => {
                if (onIntegrationsChange) {
                  const newIntegrations = { ...integrations };
                  delete newIntegrations.elevenlabs;
                  onIntegrationsChange(newIntegrations);
                }
                // Reload configs to update status
                reloadConfigs();
              }
            : undefined
        }
      />

      {/* Dialog de configuração Google Calendar */}
      <GoogleCalendarConfigDialog
        open={showGoogleCalendarConfig}
        onOpenChange={setShowGoogleCalendarConfig}
        agentId={agentId}
        initialConfig={
          integrations['google-calendar'] as Parameters<
            typeof GoogleCalendarConfigDialog
          >[0]['initialConfig']
        }
        onSave={config => {
          if (onIntegrationsChange) {
            onIntegrationsChange({
              ...integrations,
              'google-calendar': config,
            });
          }
          // Reload configs to update status
          reloadConfigs();
        }}
        onDisconnect={
          integrations['google-calendar']
            ? () => {
                if (onIntegrationsChange) {
                  const newIntegrations = { ...integrations };
                  delete newIntegrations['google-calendar'];
                  onIntegrationsChange(newIntegrations);
                }
                // Reload configs to update status
                reloadConfigs();
              }
            : undefined
        }
      />

      {/* Dialog de configuração Google Sheets */}
      <GoogleSheetsConfigDialog
        open={showGoogleSheetsConfig}
        onOpenChange={setShowGoogleSheetsConfig}
        agentId={agentId}
        initialConfig={
          integrations['google-sheets'] as Parameters<
            typeof GoogleSheetsConfigDialog
          >[0]['initialConfig']
        }
        onSave={config => {
          if (onIntegrationsChange) {
            onIntegrationsChange({
              ...integrations,
              'google-sheets': config,
            });
          }
          // Reload configs to update status
          reloadConfigs();
        }}
        onDisconnect={
          integrations['google-sheets']
            ? () => {
                if (onIntegrationsChange) {
                  const newIntegrations = { ...integrations };
                  delete newIntegrations['google-sheets'];
                  onIntegrationsChange(newIntegrations);
                }
                // Reload configs to update status
                reloadConfigs();
              }
            : undefined
        }
      />
    </div>
  );
};

export default IntegrationsSection;
