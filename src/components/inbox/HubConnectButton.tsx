import i18n from '@/i18n/config';
import { useTranslation as useUiTranslation } from 'react-i18next';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@evoapi/design-system';
import { toast } from 'sonner';
import { Loader2, ExternalLink, CheckCircle2, Link2, AlertCircle } from 'lucide-react';
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
  // Optional on the Hub (omitempty) and not always in Meta's FINISH payload.
  business_id?: string;
}

const META_ORIGINS = ['https://www.facebook.com', 'https://web.facebook.com'];

// The Hub binds connection_mode as required on MetaConnectRequest, and its own
// public widget always sends this literal for WhatsApp.
const HUB_CONNECTION_MODE = 'meta';

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
  const { t: tUi } = useUiTranslation();
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
  // Drives the post-creation view. Without it a handled failure only produced a
  // toast and the screen kept spinning on "waiting" forever.
  const [signupError, setSignupError] = useState<string | null>(null);
  const [inPageSignup, setInPageSignup] = useState(false);
  // Whether the failed attempt's inbox was actually discarded. Drives the
  // recovery button: the public link dies with the Hub channel, so offering to
  // reopen it after a discard would send the operator to a dead page.
  const [discarded, setDiscarded] = useState(false);

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
            tUi("interface:hubconnectbutton.noHubChannelsAvailableForThisTypeCreateOneOr"),
          );
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          (err as { message?: string })?.message ??
          tUi("interface:hubconnectbutton.couldNotListHubChannels");
        setChannelsError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoadingChannels(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, channelType, tUi]);

  // Guards the transition so the socket event and the reconciliation below
  // cannot announce the same connection twice.
  const alreadyConnected = useRef(false);

  const markConnected = useCallback(() => {
    if (alreadyConnected.current) return;
    alreadyConnected.current = true;
    setConnectionStatus('connected');
    toast.success(tUi("interface:hubconnectbutton.channelConnected"));
  }, [tUi]);

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
    if (inboxId === null || connectionStatus === 'connected' || discarded) return;

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
  }, [inboxId, connectionStatus, discarded, markConnected]);

  // The Hub channel is created before the Meta round-trip, so an attempt that
  // ends in cancel or error leaves it orphaned on both sides, burning a slot of
  // the plan's channel quota. Only the inbox this component just created is
  // ever discarded — the id never comes from a listing.
  const discardPendingInbox = useCallback(async (id: number) => {
    try {
      await evolutionHubService.abortConnection(id);
      setDiscarded(true);
    } catch {
      // Best effort by design: the pending inbox stays visible in the channel
      // list and can still be deleted there, which runs the same cleanup.
    }
  }, []);

  const failSignup = useCallback(
    (message: string) => {
      toast.error(message);
      setSignupError(message);
      setSignupData(null);
      setAuthCode(null);
      // A cancel can race a connection that already went through; the backend
      // refuses that discard too, this is just the cheap first check.
      if (inboxId !== null && !alreadyConnected.current) void discardPendingInbox(inboxId);
    },
    [inboxId, discardPendingInbox],
  );

  // The channel ids arrive by postMessage and the code by the FB.login callback;
  // the Hub can only be called with both.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!META_ORIGINS.includes(event.origin)) return;
      try {
        const data = JSON.parse(event.data);
        if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;

        if (data.event === 'FINISH' || data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
          // Defaulting a missing id to '' laundered "Meta sent nothing" into
          // "Meta sent empty" and only surfaced as a generic 400 from the proxy.
          const missing = (['phone_number_id', 'waba_id'] as const).filter((key) => !data.data?.[key]);
          if (missing.length) {
            failSignup(i18n.t("interface:messages.metaMissingFields", { fields: missing.join(', ') }));
            return;
          }

          setSignupData({
            phone_number_id: data.data.phone_number_id,
            waba_id: data.data.waba_id,
            ...(data.data.business_id ? { business_id: data.data.business_id } : {}),
          });
        } else if (data.event === 'CANCEL') {
          failSignup(tUi("interface:hubconnectbutton.connectionCancelledInMeta"));
        } else if (data.event === 'ERROR') {
          failSignup(data.data?.error_message || tUi("interface:hubconnectbutton.metaDeclinedTheConnection"));
        }
      } catch {
        // A Meta message that is not the signup JSON.
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [failSignup, tUi]);

  useEffect(() => {
    if (!signupData || !authCode || inboxId === null) return;

    let cancelled = false;
    evolutionHubService
      .connectWhatsapp(inboxId, { ...signupData, auth_code: authCode, connection_mode: HUB_CONNECTION_MODE })
      .then(() => {
        if (cancelled) return;
        toast.success(tUi("interface:hubconnectbutton.connectionSentToTheHubWaitingForChannelConfirmation"));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        failSignup(apiErrorMessage(error) ?? tUi("interface:hubconnectbutton.couldNotCompleteTheHubConnection"));
      })
      .finally(() => {
        if (cancelled) return;
        setSignupData(null);
        setAuthCode(null);
      });

    return () => {
      cancelled = true;
    };
  }, [signupData, authCode, inboxId, failSignup, tUi]);

  // Returns false when the Hub sends no app/config for the channel (today's
  // shared-app case); the caller then opens the Hub tab.
  const startEmbeddedSignup = async (id: number): Promise<boolean> => {
    let info;
    try {
      info = await evolutionHubService.getConnectInfo(id);
    } catch (error: unknown) {
      // The Hub answers structured (PLAN_FORBIDS_SHARED, QUOTA_EXCEEDED). Falling
      // back to the tab silently would drop the only message the operator gets.
      const message = apiErrorMessage(error);
      if (message) toast.error(message);
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
          // Domain not allowed, popup closed or permission denied — the SDK does
          // not tell them apart, and untreated the screen spun on "connecting" forever.
          failSignup(tUi("interface:hubconnectbutton.metaDidNotCompleteAuthorizationUseTheLinkToOpen"));
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
        toast.error(tUi("interface:hubconnectbutton.inboxCreatedButTheHubDidNotReturnAPublic"));
        return;
      }

      setInboxId(inbox.id);
      setPublicLink(link);
      onCreated?.({ inboxId: inbox.id, publicLink: link });

      const inPage = channelType === 'whatsapp_cloud' && (await startEmbeddedSignup(inbox.id));
      setInPageSignup(inPage);
      if (inPage) {
        toast.success(tUi("interface:hubconnectbutton.inboxCreatedCompleteTheConnectionInTheMetaWindow"));
        return;
      }

      window.open(link, '_blank', 'noopener,noreferrer');
      toast.success(tUi("interface:hubconnectbutton.inboxCreatedCompleteTheConnectionInTheTabThatOpened"));
    } catch (error: unknown) {
      // Hub errors arrive structured (PLAN_FORBIDS_SHARED, QUOTA_EXCEEDED);
      // reading `data.message` raw dropped the translated text.
      const message =
        apiErrorMessage(error) ??
        (error as { message?: string }).message ??
        tUi("interface:hubconnectbutton.couldNotCreateInboxThroughEvoHub");
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLinkExisting = async () => {
    if (!selectedHubChannelId) {
      toast.error(tUi("interface:hubconnectbutton.selectAHubChannelToLink"));
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
      toast.success(tUi("interface:hubconnectbutton.inboxLinkedToTheExistingEvoHubChannel"));
      onCreated?.({ inboxId: inbox.id });
    } catch (error: unknown) {
      const message =
        apiErrorMessage(error) ??
        (error as { message?: string }).message ??
        tUi("interface:hubconnectbutton.couldNotLinkInboxToTheExistingHubChannel");
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Back to the form after a discard: the inbox and the Hub channel behind
  // publicLink are gone, so a retry has to create a new pair.
  const restartConnection = () => {
    alreadyConnected.current = false;
    setSignupError(null);
    setDiscarded(false);
    setInboxId(null);
    setPublicLink(null);
    setInPageSignup(false);
    setConnectionStatus('waiting');
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error(tUi("interface:hubconnectbutton.enterANameForTheInboxBeforeContinuing"));
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
            <span>{tUi("interface:hubconnectbutton.channelConnectedInTheHub")}</span>
          </div>
        </div>
      );
    }

    if (signupError) {
      return (
        <div className="space-y-3 border rounded-md p-4 bg-muted/30" data-testid="hub-failed">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span>{tUi("interface:hubconnectbutton.theConnectionWasNotCompleted")}</span>
          </div>
          <p className="text-xs text-muted-foreground">{signupError}</p>
          {discarded ? (
            <>
              <p className="text-xs text-muted-foreground">
                {tUi("interface:hubconnectbutton.thePendingConnectionWasDiscardedYouCanStartAgainWhenever")}</p>
              <Button type="button" variant="outline" onClick={restartConnection}>
                {tUi("interface:hubconnectbutton.tryAgain")}</Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSignupError(null);
                window.open(publicLink, '_blank', 'noopener,noreferrer');
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {tUi("interface:hubconnectbutton.tryThroughTheHubInAnotherTab")}</Button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-3 border rounded-md p-4 bg-muted/30" data-testid="hub-waiting">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span>{tUi("interface:hubconnectbutton.inboxCreatedWaitingForTheMetaConnectionInTheHub")}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {inPageSignup
            ? tUi("interface:hubconnectbutton.completeAuthorizationInTheMetaWindowIfItDidNot")
            : tUi("interface:hubconnectbutton.ifTheTabDidNotOpenClickTheButtonBelow")}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.open(publicLink, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          {tUi("interface:hubconnectbutton.openConnectionLink")}</Button>
      </div>
    );
  }

  if (linkedDone && inboxId !== null) {
    return (
      <div className="space-y-2 border rounded-md p-4 bg-muted/30">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span>{tUi("interface:hubconnectbutton.inboxLinkedToTheExistingEvoHubChannel")}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {tUi("interface:hubconnectbutton.theChannelIsAlreadyActiveMessagesWillArriveThroughThe")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{tUi("interface:hubconnectbutton.howWouldYouLikeToConnectThisChannelInEvo")}</legend>
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
            <div className="font-medium">{tUi("interface:hubconnectbutton.createNewConnection")}</div>
            <div className="text-xs text-muted-foreground">
              {tUi("interface:hubconnectbutton.createAChannelInTheHubAndOpenTheMeta")}</div>
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
              <div className="font-medium">{tUi("interface:hubconnectbutton.useAnExistingHubChannel")}</div>
              <div className="text-xs text-muted-foreground">
                {tUi("interface:hubconnectbutton.configureThisCrmSWebhookOnAnAlreadyConnectedChannel")}</div>
            </div>
          </label>
        )}
      </fieldset>

      {mode === 'existing' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">{tUi("interface:hubconnectbutton.hubChannel")}</label>
          {loadingChannels ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {tUi("interface:hubconnectbutton.loadingAvailableChannels")}</div>
          ) : (
            <select
              className="w-full border rounded-md px-3 py-2 bg-background text-sm"
              value={selectedHubChannelId}
              onChange={(e) => setSelectedHubChannelId(e.target.value)}
              disabled={availableChannels.length === 0}
            >
              <option value="">{tUi("interface:hubconnectbutton.select")}</option>
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
        {mode === 'new' ? tUi("interface:hubconnectbutton.connectThroughEvoHub") : tUi("interface:hubconnectbutton.linkExistingChannel")}
      </Button>
    </div>
  );
}
