import { useEffect, useState } from 'react';
import { Button } from '@evoapi/design-system';
import { toast } from 'sonner';
import { Loader2, ExternalLink, CheckCircle2, Link2 } from 'lucide-react';
import { api } from '@/services/core';
import {
  evolutionHubService,
  type HubChannel,
} from '@/services/integrations';

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

type Mode = 'new' | 'existing';

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
  const [mode, setMode] = useState<Mode>('new');
  const [submitting, setSubmitting] = useState(false);
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [inboxId, setInboxId] = useState<number | null>(null);
  const [linkedDone, setLinkedDone] = useState(false);

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
      window.open(link, '_blank', 'noopener,noreferrer');
      toast.success('Inbox criada. Conclua a conexão na aba que foi aberta.');
      onCreated?.({ inboxId: inbox.id, publicLink: link });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
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
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
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
    return (
      <div className="space-y-3 border rounded-md p-4 bg-muted/30">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
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
