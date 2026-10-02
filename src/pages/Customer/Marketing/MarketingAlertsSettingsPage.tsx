import { useEffect, useState } from 'react';
import { Save, Bell, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { BaseHeader } from '@/components/base';
import {
  Button,
  Input,
  Label,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Badge,
} from '@evoapi/design-system';
import { adminConfigService } from '@/services/admin/adminConfigService';
import inboxesService from '@/services/channels/inboxesService';
import type { Inbox } from '@/types/channels/inbox';
import { marketingAlertsService, MarketingAlert } from '@/services/marketing/marketingAlertsService';

const CONFIG_TYPE = 'marketing_alerts';

interface AlertSettings {
  MARKETING_ALERTS_CHANNELS: string;
  MARKETING_ALERTS_INBOX_ID: string;
  MARKETING_ALERTS_WHATSAPP_NUMBER: string;
  MARKETING_ALERTS_EMAIL: string;
}

const DEFAULTS: AlertSettings = {
  MARKETING_ALERTS_CHANNELS: '',
  MARKETING_ALERTS_INBOX_ID: '',
  MARKETING_ALERTS_WHATSAPP_NUMBER: '',
  MARKETING_ALERTS_EMAIL: '',
};

const kindLabel = (kind: MarketingAlert['kind']) => (kind === 'weekly_report' ? 'Relatório Semanal' : 'Checagem Diária');

export default function MarketingAlertsSettingsPage() {
  const [settings, setSettings] = useState<AlertSettings>(DEFAULTS);
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [alerts, setAlerts] = useState<MarketingAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [config, inboxResponse, alertsResponse] = await Promise.all([
          adminConfigService.getConfig(CONFIG_TYPE),
          inboxesService.list(),
          marketingAlertsService.list(),
        ]);
        setSettings((prev) => ({
          ...prev,
          ...Object.fromEntries(Object.entries(config).filter(([, v]) => v !== null && v !== undefined)),
        }));
        setInboxes(inboxResponse.data ?? []);
        setAlerts(alertsResponse);
      } catch {
        toast.error('Erro ao carregar configurações de alertas.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const channels = settings.MARKETING_ALERTS_CHANNELS.split(',').filter(Boolean);
  const hasChannel = (c: string) => channels.includes(c);

  const toggleChannel = (channel: string, checked: boolean) => {
    const next = checked ? [...new Set([...channels, channel])] : channels.filter((c) => c !== channel);
    setSettings((prev) => ({ ...prev, MARKETING_ALERTS_CHANNELS: next.join(',') }));
  };

  const set = (key: keyof AlertSettings, value: string) => setSettings((prev) => ({ ...prev, [key]: value }));

  const useSelectedChannelContact = () => {
    const inbox = inboxes.find((i) => i.id === settings.MARKETING_ALERTS_INBOX_ID);
    if (!inbox?.phone_number) {
      toast.error('Selecione um canal com número de WhatsApp configurado primeiro.');
      return;
    }
    set('MARKETING_ALERTS_WHATSAPP_NUMBER', inbox.phone_number);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminConfigService.saveConfig(CONFIG_TYPE, settings);
      toast.success('Configurações salvas!');
    } catch {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      const updated = await marketingAlertsService.markRead(id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch {
      toast.error('Erro ao marcar como lido.');
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6 p-4 pb-8">
      <BaseHeader
        title="Alertas e Relatórios"
        subtitle="Relatório semanal (toda segunda-feira, resumo da semana anterior) e checagem diária de metas de Marketing (Metas de Clientes)."
      />

      <div className="max-w-2xl space-y-4 rounded-lg border p-4">
        <Label className="text-sm font-semibold">Canais de envio</Label>
        <p className="text-xs text-muted-foreground">Escolha um ou mais — pode marcar todos ao mesmo tempo.</p>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox id="channel-whatsapp" checked={hasChannel('whatsapp')} onCheckedChange={(c) => toggleChannel('whatsapp', !!c)} />
            <Label htmlFor="channel-whatsapp" className="font-normal">
              WhatsApp
            </Label>
          </div>
          {hasChannel('whatsapp') && (
            <div className="ml-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Canal (inbox) que envia</Label>
                <Select value={settings.MARKETING_ALERTS_INBOX_ID} onValueChange={(v) => set('MARKETING_ALERTS_INBOX_ID', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {inboxes.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Nenhum canal encontrado
                      </SelectItem>
                    ) : (
                      inboxes.map((inbox) => (
                        <SelectItem key={inbox.id} value={inbox.id}>
                          {inbox.name} ({inbox.channel_type.replace('Channel::', '')})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Número que recebe</Label>
                <div className="flex gap-2">
                  <Input
                    value={settings.MARKETING_ALERTS_WHATSAPP_NUMBER}
                    onChange={(e) => set('MARKETING_ALERTS_WHATSAPP_NUMBER', e.target.value)}
                    placeholder="+55 11 99999-9999"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={useSelectedChannelContact}>
                    Usar do canal
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox id="channel-email" checked={hasChannel('email')} onCheckedChange={(c) => toggleChannel('email', !!c)} />
            <Label htmlFor="channel-email" className="font-normal">
              E-mail
            </Label>
          </div>
          {hasChannel('email') && (
            <div className="ml-6 max-w-xs">
              <Label className="text-xs">E-mail que recebe</Label>
              <Input
                type="email"
                value={settings.MARKETING_ALERTS_EMAIL}
                onChange={(e) => set('MARKETING_ALERTS_EMAIL', e.target.value)}
                placeholder="voce@empresa.com"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="channel-notification"
              checked={hasChannel('notification')}
              onCheckedChange={(c) => toggleChannel('notification', !!c)}
            />
            <Label htmlFor="channel-notification" className="font-normal">
              Aviso dentro do CRM (lista abaixo)
            </Label>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      <Separator />

      <div className="max-w-2xl">
        <div className="mb-2 flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-semibold">Últimos avisos</Label>
        </div>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum aviso ainda — só aparece aqui quando o canal "Aviso dentro do CRM" está marcado.
          </p>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div key={alert.id} className={`rounded-md border p-3 ${alert.read_at ? 'opacity-70' : ''}`}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{kindLabel(alert.kind)}</Badge>
                    <span className="text-sm font-medium">{alert.title}</span>
                  </div>
                  {!alert.read_at && (
                    <Button size="sm" variant="ghost" className="gap-1" onClick={() => handleMarkRead(alert.id)}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Marcar como lido
                    </Button>
                  )}
                </div>
                <p className="whitespace-pre-line text-xs text-muted-foreground">{alert.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
