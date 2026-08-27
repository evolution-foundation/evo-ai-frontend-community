import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@evoapi/design-system';
import { toast } from 'sonner';
import { Loader2, ExternalLink, CheckCircle2, Link2 } from 'lucide-react';
import { api } from '@/services/core';
import { apiErrorMessage } from '@/utils/apiHelpers';
import { useGlobalConfig } from '@/contexts/GlobalConfigContext';
import {
  evolutionHubService,
  type HubChannel,
} from '@/services/integrations';
import { useFacebookSdk } from '@/hooks/useFacebookSdk';

/**
 * Hub-relayed Inbox creation button.
 *
 * Rendered in place of the native Meta OAuth form whenever the Evo Hub
 * feature is active (see GlobalConfigContext.evolutionHubEnabled).
 *
 * Dois modos:
 *   - 'new'      → POST /inboxes com via_hub: true. Cria canal NOVO no Hub
 *                  e devolve public_link pra OAuth Meta. Fluxo padrão.
 *   - 'existing' → POST /inboxes com via_hub_existing + hub_channel_id.
 *                  Linka a um canal já conectado no Hub (sem OAuth novo).
 *                  Útil quando o canal foi criado pela UI do Hub ou por
 *                  outra integração e o operador só quer "consumir" no CRM.
 */
export interface HubConnectButtonProps {
  channelType: 'whatsapp_cloud' | 'facebook_page' | 'instagram';
  name: string;
  onCreated?: (payload: { inboxId: number; publicLink?: string }) => void;
}

interface InboxCreateResponse {
  data: {
    id: number;
    name: string;
    evolution_hub?: {
      public_link?: string;
      linked?: boolean;
      hub_channel_id?: string;
    };
  };
}

interface InboxShowResponse {
  data: {
    id: number;
    connection_state?: string;
    health_source?: string;
  };
}

type Mode = 'new' | 'existing';

interface SignupData {
  phone_number_id: string;
  waba_id: string;
  business_id: string;
}

const META_ORIGINS = ['https://www.facebook.com', 'https://web.facebook.com'];

const HUB_TYPE_BY_CHANNEL: Record<
  HubConnectButtonProps['channelType'],
  HubChannel['type']
> = {
  whatsapp_cloud: 'whatsapp',
  facebook_page: 'facebook',
  instagram: 'instagram',
};

export default function HubConnectButton({
  channelType,
  name,
  onCreated,
}: HubConnectButtonProps) {
  // Flag genérica (default ON p/ community standalone): quando false (deploy
  // enterprise/SaaS), esconde "Usar canal existente do Hub". Motivo: a listagem
  // de canais existentes do Hub usa credenciais GLOBAIS e NÃO filtra por tenant
  // → vaza conexões de outras agências (vazamento cross-tenant). Só "Criar nova
  // conexão". Defesa em profundidade: o backend também 403a available_channels.
  const config = useGlobalConfig();
  const allowExistingHubChannels = config.hubAllowExistingChannels !== false;

  const [mode, setMode] = useState<Mode>('new');
  const [submitting, setSubmitting] = useState(false);
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [inboxId, setInboxId] = useState<number | null>(null);
  const [linkedDone, setLinkedDone] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'waiting' | 'connected'>('waiting');

  const { loadSdk, initSdk } = useFacebookSdk();
  const [signupData, setSignupData] = useState<SignupData | null>(null);
  const [authCode, setAuthCode] = useState<string | null>(null);

  const [availableChannels, setAvailableChannels] = useState<HubChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const [selectedHubChannelId, setSelectedHubChannelId] = useState<string>('');

  // Carrega a lista de canais existentes só quando o operador escolhe
  // 'existing' — evita o roundtrip pro Hub quando não vai ser usado.
  useEffect(() => {
    if (mode !== 'existing') return;
    let cancelled = false;
    setLoadingChannels(true);
    setChannelsError(null);
    evolutionHubService
      .getAvailableChannels(HUB_TYPE_BY_CHANNEL[channelType])
      .then((channels) => {
        if (cancelled) return;
        setAvailableChannels(channels);
        if (channels.length === 0) {
          setChannelsError(
            'Nenhum canal disponível no Hub para este tipo. Crie um novo ou linke um canal de outro tipo.',
          );
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          (err as { message?: string })?.message ??
          'Falha ao listar canais do Hub';
        setChannelsError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoadingChannels(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, channelType]);

  // Guards the transition so the socket event and the reconciliation below
  // cannot announce the same connection twice.
  const alreadyConnected = useRef(false);

  const markConnected = useCallback(() => {
    if (alreadyConnected.current) return;
    alreadyConnected.current = true;
    setConnectionStatus('connected');
    toast.success('Canal conectado.');
  }, []);

  // The Hub webhooks the CRM when the operator finishes the Meta signup and the
  // backend re-emits it on ActionCable; without this the screen only learned
  // about the connection on a manual refresh.
  useEffect(() => {
    if (inboxId === null) return;

    const onConnection = (event: Event) => {
      const detail = (event as CustomEvent).detail as
        | { inbox_id?: string | number; connection_status?: string }
        | undefined;
      if (!detail) return;
      // Loose comparison on purpose: the id arrives as a string and the local
      // state holds a number.
      if (String(detail.inbox_id) !== String(inboxId)) return;

      if (detail.connection_status === 'connected') {
        markConnected();
      } else if (detail.connection_status === 'disconnected') {
        alreadyConnected.current = false;
        setConnectionStatus('waiting');
      }
    };

    window.addEventListener('evolution:hubChannelConnection', onConnection);
    return () => window.removeEventListener('evolution:hubChannelConnection', onConnection);
  }, [inboxId, markConnected]);

  // ActionCable has no replay: a transition broadcast while the socket was down
  // is lost, and the socket is often still down while the operator sits in the
  // Hub tab. Re-read the inbox when the tab comes back so the screen settles
  // anyway. `provider_event` means the Hub actually confirmed the connection —
  // `stored_flag` is the resolver assuming a configured token channel is live.
  useEffect(() => {
    if (inboxId === null || connectionStatus === 'connected') return;

    const reconcile = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const response = await api.get<InboxShowResponse>(`/inboxes/${inboxId}`);
        const inbox = response.data?.data;
        if (inbox?.connection_state === 'connected' && inbox?.health_source === 'provider_event') {
          markConnected();
        }
      } catch {
        // Best effort — the ActionCable event stays the primary path.
      }
    };

    document.addEventListener('visibilitychange', reconcile);
    window.addEventListener('focus', reconcile);
    return () => {
      document.removeEventListener('visibilitychange', reconcile);
      window.removeEventListener('focus', reconcile);
    };
  }, [inboxId, connectionStatus, markConnected]);

  // Os ids do canal chegam por postMessage e o code pelo callback do FB.login;
  // só dá para postar no Hub com os dois.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!META_ORIGINS.includes(event.origin)) return;
      try {
        const data = JSON.parse(event.data);
        if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;

        if (data.event === 'FINISH' || data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
          setSignupData({
            phone_number_id: data.data?.phone_number_id ?? '',
            waba_id: data.data?.waba_id ?? '',
            business_id: data.data?.business_id ?? '',
          });
        } else if (data.event === 'CANCEL') {
          toast.error('Conexão cancelada na Meta.');
          setSubmitting(false);
        } else if (data.event === 'ERROR') {
          toast.error(data.data?.error_message || 'A Meta recusou a conexão.');
          setSubmitting(false);
        }
      } catch {
        // Mensagem da Meta que não é JSON do signup.
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!signupData || !authCode || inboxId === null) return;

    let cancelled = false;
    evolutionHubService
      .connectWhatsapp(inboxId, { ...signupData, auth_code: authCode })
      .then(() => {
        if (cancelled) return;
        toast.success('Conexão enviada ao Hub. Aguardando confirmação do canal…');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        toast.error(apiErrorMessage(error) ?? 'Falha ao concluir a conexão no Hub');
      })
      .finally(() => {
        if (cancelled) return;
        setSignupData(null);
        setAuthCode(null);
        setSubmitting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [signupData, authCode, inboxId]);

  // Sem app e config do canal (o caso do app compartilhado hoje) devolve false
  // e o chamador abre a aba do Hub.
  const startEmbeddedSignup = async (id: number): Promise<boolean> => {
    let info;
    try {
      info = await evolutionHubService.getConnectInfo(id);
    } catch {
      return false;
    }

    if (!info?.meta_app_id || !info?.meta_config_id) return false;
    if (info.byo_config_missing || info.can_connect === false) return false;

    try {
      await loadSdk();
    } catch {
      return false;
    }
    if (!window.FB) return false;

    initSdk({ appId: info.meta_app_id });
    window.FB.login(
      (response: unknown) => {
        const code = (response as { authResponse?: { code?: string } })?.authResponse?.code;
        if (!code) {
          // Domínio não liberado, popup fechado ou permissão negada — o SDK não
          // distingue, e sem tratar a tela ficava "conectando" para sempre.
          toast.error('A Meta não concluiu a autorização. Use o link para abrir o fluxo em outra aba.');
          setSubmitting(false);
          return;
        }
        setAuthCode(code);
      },
      {
        config_id: info.meta_config_id,
        response_type: 'code',
        override_default_response_type: true,
        extras: { version: 'v3', featureType: 'whatsapp_business_app_onboarding' },
      },
    );
    return true;
  };

  const handleCreateNew = async () => {
    setSubmitting(true);
    try {
      const response = await api.post<InboxCreateResponse>(`/inboxes`, {
        via_hub: true,
        inbox: { name: name.trim(), channel_type: channelType },
      });

      const inbox = response.data?.data;
      const link = inbox?.evolution_hub?.public_link ?? null;

      if (!link) {
        toast.error('Inbox criada, mas o Hub não retornou link público. Verifique a configuração.');
        return;
      }

      setInboxId(inbox.id);
      setPublicLink(link);
      onCreated?.({ inboxId: inbox.id, publicLink: link });

      const inPage = channelType === 'whatsapp_cloud' && (await startEmbeddedSignup(inbox.id));
      if (inPage) {
        toast.success('Inbox criada. Conclua a conexão na janela da Meta.');
        return;
      }

      window.open(link, '_blank', 'noopener,noreferrer');
      toast.success('Inbox criada. Conclua a conexão na aba que foi aberta.');
    } catch (error: unknown) {
      // Hub errors arrive structured (PLAN_FORBIDS_SHARED, QUOTA_EXCEEDED);
      // reading `data.message` raw dropped the translated text.
      const message =
        apiErrorMessage(error) ??
        (error as { message?: string }).message ??
        'Falha ao criar inbox via Evo Hub';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLinkExisting = async () => {
    if (!selectedHubChannelId) {
      toast.error('Selecione um canal do Hub para vincular.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await api.post<InboxCreateResponse>(`/inboxes`, {
        via_hub_existing: true,
        hub_channel_id: selectedHubChannelId,
        inbox: { name: name.trim(), channel_type: channelType },
      });

      const inbox = response.data?.data;
      setInboxId(inbox.id);
      setLinkedDone(true);
      toast.success('Inbox vinculada ao canal Evo Hub existente.');
      onCreated?.({ inboxId: inbox.id });
    } catch (error: unknown) {
      const message =
        apiErrorMessage(error) ??
        (error as { message?: string }).message ??
        'Falha ao linkar inbox ao canal Hub existente';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Informe um nome para a inbox antes de continuar.');
      return;
    }
    if (mode === 'new') {
      handleCreateNew();
    } else {
      handleLinkExisting();
    }
  };

  // Estado pós-sucesso: 'criar novo' mostra link pra reabrir aba OAuth;
  // 'linkar existente' só mostra confirmação (canal já está conectado).
  if (publicLink && inboxId !== null) {
    if (connectionStatus === 'connected') {
      return (
        <div className="space-y-2 border rounded-md p-4 bg-muted/30" data-testid="hub-connected">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span>Canal conectado no Hub.</span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3 border rounded-md p-4 bg-muted/30" data-testid="hub-waiting">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span>Inbox criada. Aguardando conexão Meta no Hub…</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Se a aba não abriu, clique no botão abaixo para reabrir.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.open(publicLink, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Abrir link de conexão
        </Button>
      </div>
    );
  }

  if (linkedDone && inboxId !== null) {
    return (
      <div className="space-y-2 border rounded-md p-4 bg-muted/30">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>Inbox vinculada ao canal Evo Hub existente.</span>
        </div>
        <p className="text-xs text-muted-foreground">
          O canal já está ativo — mensagens chegarão pelo webhook do Hub.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Como conectar este canal no Evo Hub?</legend>
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name="hub_mode"
            value="new"
            checked={mode === 'new'}
            onChange={() => setMode('new')}
            className="mt-1"
          />
          <div>
            <div className="font-medium">Criar nova conexão</div>
            <div className="text-xs text-muted-foreground">
              Cria um canal novo no Hub e abre o fluxo de OAuth Meta em outra aba.
            </div>
          </div>
        </label>
        {allowExistingHubChannels && (
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="hub_mode"
              value="existing"
              checked={mode === 'existing'}
              onChange={() => setMode('existing')}
              className="mt-1"
            />
            <div>
              <div className="font-medium">Usar canal existente do Hub</div>
              <div className="text-xs text-muted-foreground">
                Apenas configura o webhook deste CRM em um canal já conectado.
              </div>
            </div>
          </label>
        )}
      </fieldset>

      {mode === 'existing' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Canal do Hub</label>
          {loadingChannels ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando canais disponíveis…
            </div>
          ) : (
            <select
              className="w-full border rounded-md px-3 py-2 bg-background text-sm"
              value={selectedHubChannelId}
              onChange={(e) => setSelectedHubChannelId(e.target.value)}
              disabled={availableChannels.length === 0}
            >
              <option value="">— Selecione —</option>
              {availableChannels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name} ({channel.status})
                </option>
              ))}
            </select>
          )}
          {channelsError && (
            <p className="text-xs text-destructive">{channelsError}</p>
          )}
        </div>
      )}

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || (mode === 'existing' && !selectedHubChannelId)}
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : mode === 'new' ? (
          <ExternalLink className="h-4 w-4 mr-2" />
        ) : (
          <Link2 className="h-4 w-4 mr-2" />
        )}
        {mode === 'new' ? 'Conectar via Evo Hub' : 'Vincular canal existente'}
      </Button>
    </div>
  );
}
