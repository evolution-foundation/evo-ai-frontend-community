import { useEffect, useState } from 'react';
import { Palette, MessageSquare, Code2, Save, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { BaseHeader } from '@/components/base';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@evoapi/design-system';
import { adminConfigService } from '@/services/admin/adminConfigService';
import inboxesService from '@/services/channels/inboxesService';
import type { Inbox } from '@/types/channels/inbox';

const CONFIG_TYPE = 'digital_menu';

interface MenuSettings {
  MENU_COMPANY_NAME: string;
  MENU_HEADER_COLOR: string;
  MENU_BACKGROUND_COLOR: string;
  MENU_FOOTER_COLOR: string;
  MENU_ICON_COLOR: string;
  MENU_TEXT_COLOR: string;
  MENU_TITLE_COLOR: string;
  MENU_COMPANY_NAME_COLOR: string;
  MENU_GTM_ID: string;
  MENU_WHATSAPP_NUMBER: string;
  MENU_ORDER_INBOX_ID: string;
}

const DEFAULTS: MenuSettings = {
  MENU_COMPANY_NAME: '',
  MENU_HEADER_COLOR: '#0a0a0a',
  MENU_BACKGROUND_COLOR: '#0a0a0a',
  MENU_FOOTER_COLOR: '#0a0a0a',
  MENU_ICON_COLOR: '#ffffff',
  MENU_TEXT_COLOR: '#a1a1aa',
  MENU_TITLE_COLOR: '#ffffff',
  MENU_COMPANY_NAME_COLOR: '#ffffff',
  MENU_GTM_ID: '',
  MENU_WHATSAPP_NUMBER: '',
  MENU_ORDER_INBOX_ID: '',
};

const COLOR_FIELDS: Array<{ key: keyof MenuSettings; label: string }> = [
  { key: 'MENU_HEADER_COLOR', label: 'Cor do header' },
  { key: 'MENU_BACKGROUND_COLOR', label: 'Cor de fundo' },
  { key: 'MENU_FOOTER_COLOR', label: 'Cor do footer' },
  { key: 'MENU_ICON_COLOR', label: 'Cor dos ícones' },
  { key: 'MENU_TEXT_COLOR', label: 'Cor dos textos' },
  { key: 'MENU_TITLE_COLOR', label: 'Cor do título' },
  { key: 'MENU_COMPANY_NAME_COLOR', label: 'Cor do nome da empresa' },
];

export default function DigitalMenuSettingsPage() {
  const [settings, setSettings] = useState<MenuSettings>(DEFAULTS);
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [config, inboxResponse] = await Promise.all([
          adminConfigService.getConfig(CONFIG_TYPE),
          inboxesService.list(),
        ]);
        setSettings((prev) => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(config).filter(([, v]) => v !== null && v !== undefined),
          ),
        }));
        setInboxes(inboxResponse.data ?? []);
      } catch {
        toast.error('Erro ao carregar configurações do cardápio digital');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const set = (key: keyof MenuSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Atalho: o número que recebe os pedidos normalmente é o mesmo número do
  // canal de WhatsApp já conectado no CRM — evita o admin ter que digitar/
  // copiar manualmente.
  const useSelectedChannelContact = () => {
    const inbox = inboxes.find((i) => i.id === settings.MENU_ORDER_INBOX_ID);
    if (!inbox?.phone_number) {
      toast.error('Selecione um canal com número de WhatsApp configurado primeiro.');
      return;
    }
    set('MENU_WHATSAPP_NUMBER', inbox.phone_number);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminConfigService.saveConfig(CONFIG_TYPE, settings);
      toast.success('Configurações do cardápio digital salvas!');
    } catch {
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <BaseHeader title="Cardápio Digital" subtitle="Aparência e destino dos pedidos da página pública do cardápio." />
      <div className="flex items-center justify-between">
        <a
          href="/cardapio-digital"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          Ver cardápio digital <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      {/* Identidade */}
      <section className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" /> Identidade visual
        </h4>
        <div className="space-y-1.5">
          <Label>Nome da empresa (exibido no topo do cardápio)</Label>
          <Input
            value={settings.MENU_COMPANY_NAME}
            onChange={(e) => set('MENU_COMPANY_NAME', e.target.value)}
            placeholder="Ex: Bigquen Burger"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {COLOR_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label>{field.label}</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings[field.key] || '#000000'}
                  onChange={(e) => set(field.key, e.target.value)}
                  className="h-9 w-10 rounded border border-border bg-transparent cursor-pointer shrink-0"
                />
                <Input
                  value={settings[field.key]}
                  onChange={(e) => set(field.key, e.target.value)}
                  placeholder="#000000"
                  className="font-mono text-xs"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Analytics */}
      <section className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Code2 className="w-4 h-4 text-primary" /> Analytics
        </h4>
        <div className="space-y-1.5 max-w-sm">
          <Label>GTM (Google Tag Manager) — ID do container</Label>
          <Input
            value={settings.MENU_GTM_ID}
            onChange={(e) => set('MENU_GTM_ID', e.target.value)}
            placeholder="GTM-XXXXXXX"
          />
        </div>
      </section>

      {/* Pedidos / WhatsApp */}
      <section className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" /> Envio de pedidos
        </h4>
        <p className="text-xs text-muted-foreground">
          Quando o cliente finaliza um pedido no cardápio digital, o resumo é enviado por WhatsApp
          usando um dos canais já conectados no CRM.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>WhatsApp de redirecionamento (número que recebe os pedidos)</Label>
            <div className="flex items-center gap-2">
              <Input
                value={settings.MENU_WHATSAPP_NUMBER}
                onChange={(e) => set('MENU_WHATSAPP_NUMBER', e.target.value)}
                placeholder="55 11 91234-1234"
              />
              <Button type="button" variant="outline" size="sm" onClick={useSelectedChannelContact} className="shrink-0">
                Usar contato do cliente
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Canal integrado que envia a mensagem</Label>
            <Select value={settings.MENU_ORDER_INBOX_ID} onValueChange={(v) => set('MENU_ORDER_INBOX_ID', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um canal..." />
              </SelectTrigger>
              <SelectContent>
                {inboxes.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum canal integrado ainda.</div>
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
        </div>
      </section>
    </div>
  );
}
