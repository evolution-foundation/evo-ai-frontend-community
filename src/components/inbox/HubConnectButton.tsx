import { useState } from 'react';
import { Button } from '@evoapi/design-system';
import { toast } from 'sonner';
import { Loader2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { api } from '@/services/core';

/**
 * Hub-relayed Inbox creation button.
 *
 * Rendered in place of the native Meta OAuth form whenever the Evo Hub
 * feature is active (see GlobalConfigContext.evolutionHubEnabled). Calls the
 * CRM's POST /api/v2/accounts/:id/inboxes with via_hub: true; the controller
 * delegates to EvolutionHub::InboxBuilder which talks to the Hub and returns
 * a public_link the user opens in a new tab to finish the Meta authorization.
 */
export interface HubConnectButtonProps {
  /** Maps to the CRM's channel_type param. */
  channelType: 'whatsapp_cloud' | 'facebook_page' | 'instagram';
  /** Inbox name chosen by the operator in the form before this step. */
  name: string;
  /** Optional callback fired after the inbox is created (and the link opened). */
  onCreated?: (payload: { inboxId: number; publicLink: string }) => void;
}

interface InboxCreateResponse {
  data: {
    id: number;
    name: string;
    evolution_hub?: { public_link?: string };
  };
}

export default function HubConnectButton({
  channelType,
  name,
  onCreated,
}: HubConnectButtonProps) {
  const [submitting, setSubmitting] = useState(false);
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [inboxId, setInboxId] = useState<number | null>(null);

  const handleClick = async () => {
    if (!name.trim()) {
      toast.error('Informe um nome para a inbox antes de conectar');
      return;
    }
    setSubmitting(true);
    try {
      const response = await api.post<InboxCreateResponse>(
        `/inboxes`,
        {
          via_hub: true,
          inbox: { name: name.trim(), channel_type: channelType },
        },
      );

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

  return (
    <Button type="button" onClick={handleClick} disabled={submitting}>
      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ExternalLink className="h-4 w-4 mr-2" />}
      Conectar via Evo Hub
    </Button>
  );
}
