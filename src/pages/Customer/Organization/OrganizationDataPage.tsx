import { useEffect, useState } from 'react';
import {
  Building2,
  Image as ImageIcon,
  Palette,
  Phone,
  Share2,
  Hash,
  MapPin,
  Globe,
  Plus,
  Trash2,
  Save,
  X,
  Mail,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { BaseHeader } from '@/components/base';
import {
  Button,
  Input,
  Label,
  Textarea,
  Switch,
} from '@evoapi/design-system';
import { adminConfigService } from '@/services/admin/adminConfigService';

const CONFIG_TYPE = 'organization_profile';

interface OpeningHours {
  open: string;
  close: string;
  closed: boolean;
}

interface Unidade {
  id: string;
  nome: string;
  endereco: string;
  maps_url: string;
  horarios: Record<string, OpeningHours>;
}

interface ColorToken {
  name: string;
  hex: string;
}

interface OrganizationProfile {
  nome_curto: string;
  nome_completo: string;
  cnpj: string;
  categoria: string;
  descricao: string;
  nome_responsavel: string;
  logo_colorido: string;
  logo_preto_branco: string;
  logo_icone: string;
  mascote: string;
  avatar: string;
  missao: string;
  visao: string;
  valores: string;
  email: string;
  contato_geral: string;
  atendimento_direto: string;
  atendimento_ia: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  linkedin: string;
  twitter_x: string;
  hashtags: string;
  unidades: Unidade[];
  site_institucional: string;
  site_lp: string;
  site_comercial: string;
  politicas_privacidade: string;
  termo_servico_url: string;
}

function emptyProfile(): OrganizationProfile {
  return {
    nome_curto: '',
    nome_completo: '',
    cnpj: '',
    categoria: '',
    descricao: '',
    nome_responsavel: '',
    logo_colorido: '',
    logo_preto_branco: '',
    logo_icone: '',
    mascote: '',
    avatar: '',
    missao: '',
    visao: '',
    valores: '',
    email: '',
    contato_geral: '',
    atendimento_direto: '',
    atendimento_ia: '',
    facebook: '',
    instagram: '',
    tiktok: '',
    youtube: '',
    linkedin: '',
    twitter_x: '',
    hashtags: '',
    unidades: [],
    site_institucional: '',
    site_lp: '',
    site_comercial: '',
    politicas_privacidade: '',
    termo_servico_url: '',
  };
}

// Mapeia cada campo do perfil pra sua chave de config no backend
// (GlobalConfig, mesmo mecanismo usado em Cardápio Digital/iFood/etc — ver
// Api::V1::Admin::AppConfigsController::CONFIG_TYPES['organization_profile']).
// unidades/colors são arrays, então viajam como JSON stringificado numa
// única chave cada (ORG_UNIDADES_JSON/ORG_COLORS_JSON) — o resto é 1:1.
const SCALAR_FIELD_KEYS: Array<[keyof OrganizationProfile, string]> = [
  ['nome_curto', 'ORG_NOME_CURTO'],
  ['nome_completo', 'ORG_NOME_COMPLETO'],
  ['cnpj', 'ORG_CNPJ'],
  ['categoria', 'ORG_CATEGORIA'],
  ['descricao', 'ORG_DESCRICAO'],
  ['nome_responsavel', 'ORG_NOME_RESPONSAVEL'],
  ['logo_colorido', 'ORG_LOGO_COLORIDO'],
  ['logo_preto_branco', 'ORG_LOGO_PRETO_BRANCO'],
  ['logo_icone', 'ORG_LOGO_ICONE'],
  ['mascote', 'ORG_MASCOTE'],
  ['avatar', 'ORG_AVATAR'],
  ['missao', 'ORG_MISSAO'],
  ['visao', 'ORG_VISAO'],
  ['valores', 'ORG_VALORES'],
  ['email', 'ORG_EMAIL'],
  ['contato_geral', 'ORG_CONTATO_GERAL'],
  ['atendimento_direto', 'ORG_ATENDIMENTO_DIRETO'],
  ['atendimento_ia', 'ORG_ATENDIMENTO_IA'],
  ['facebook', 'ORG_FACEBOOK'],
  ['instagram', 'ORG_INSTAGRAM'],
  ['tiktok', 'ORG_TIKTOK'],
  ['youtube', 'ORG_YOUTUBE'],
  ['linkedin', 'ORG_LINKEDIN'],
  ['twitter_x', 'ORG_TWITTER_X'],
  ['hashtags', 'ORG_HASHTAGS'],
  ['site_institucional', 'ORG_SITE_INSTITUCIONAL'],
  ['site_lp', 'ORG_SITE_LP'],
  ['site_comercial', 'ORG_SITE_COMERCIAL'],
  ['politicas_privacidade', 'ORG_POLITICAS_PRIVACIDADE'],
  ['termo_servico_url', 'ORG_TERMO_SERVICO_URL'],
];

function safeParseArray<T>(raw: unknown): T[] {
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const IMAGE_FIELDS: Array<{ key: keyof OrganizationProfile; label: string; hint: string }> = [
  { key: 'logo_colorido', label: 'Logo Colorido', hint: 'PNG/SVG, fundo transparente' },
  { key: 'logo_preto_branco', label: 'Logo Preto e Branco', hint: 'Versão monocromática' },
  { key: 'logo_icone', label: 'Logo Ícone', hint: 'Quadrado, para favicons/app' },
  { key: 'mascote', label: 'Mascote', hint: 'Personagem da marca' },
  { key: 'avatar', label: 'Avatar', hint: 'Foto de perfil' },
];

export default function OrganizationDataPage() {
  const [profile, setProfile] = useState<OrganizationProfile>(() => emptyProfile());
  const [colors, setColors] = useState<ColorToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const config = await adminConfigService.getConfig(CONFIG_TYPE);
        const loaded = emptyProfile();
        SCALAR_FIELD_KEYS.forEach(([profileKey, configKey]) => {
          const value = config[configKey];
          if (value !== null && value !== undefined) {
            (loaded[profileKey] as string) = String(value);
          }
        });
        loaded.unidades = safeParseArray<Unidade>(config.ORG_UNIDADES_JSON);
        setProfile(loaded);
        setColors(safeParseArray<ColorToken>(config.ORG_COLORS_JSON));
      } catch {
        toast.error('Erro ao carregar dados da organização');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const set = <K extends keyof OrganizationProfile>(key: K, value: OrganizationProfile[K]) => {
    setProfile((p) => ({ ...p, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      SCALAR_FIELD_KEYS.forEach(([profileKey, configKey]) => {
        payload[configKey] = (profile[profileKey] as string) ?? '';
      });
      payload.ORG_UNIDADES_JSON = JSON.stringify(profile.unidades);
      payload.ORG_COLORS_JSON = JSON.stringify(colors);
      await adminConfigService.saveConfig(CONFIG_TYPE, payload);
      toast.success('Dados da organização salvos!');
    } catch {
      toast.error('Erro ao salvar dados da organização');
    } finally {
      setSaving(false);
    }
  };

  const readImage = (key: keyof OrganizationProfile, file: File) => {
    const reader = new FileReader();
    reader.onload = () => set(key, String(reader.result));
    reader.readAsDataURL(file);
  };

  const ImageField = ({ field }: { field: (typeof IMAGE_FIELDS)[number] }) => {
    const value = profile[field.key] as string;
    return (
      <div className="space-y-1.5">
        <Label>{field.label}</Label>
        <div className="flex items-center gap-3">
          {value ? (
            <div className="relative group">
              <img src={value} alt={field.label} className="h-16 w-16 rounded-lg border border-border object-contain bg-muted/30 p-1" />
              <button
                type="button"
                onClick={() => set(field.key, '')}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center shadow"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <label className="h-16 w-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) readImage(field.key, f); }} />
            </label>
          )}
          <p className="text-xs text-muted-foreground">{field.hint}</p>
        </div>
      </div>
    );
  };

  const SocialField = ({ id, label }: { id: keyof OrganizationProfile; label: string }) => (
    <div className="space-y-1.5">
      <Label htmlFor={`org-${id}`}>{label}</Label>
      <Input
        id={`org-${id}`}
        value={profile[id] as string}
        onChange={(e) => set(id, e.target.value as OrganizationProfile[typeof id])}
        placeholder="@usuario ou https://..."
      />
    </div>
  );

  const SiteField = ({ id, label }: { id: keyof OrganizationProfile; label: string }) => (
    <div className="space-y-1.5">
      <Label htmlFor={`org-${id}`}>{label}</Label>
      <Input
        id={`org-${id}`}
        value={profile[id] as string}
        onChange={(e) => set(id, e.target.value as OrganizationProfile[typeof id])}
        placeholder="https://..."
      />
    </div>
  );

  const addUnidade = () => {
    set('unidades', [
      ...profile.unidades,
      {
        id: crypto.randomUUID(),
        nome: '',
        endereco: '',
        maps_url: '',
        horarios: {
          seg: { open: '09:00', close: '18:00', closed: false },
          ter: { open: '09:00', close: '18:00', closed: false },
          qua: { open: '09:00', close: '18:00', closed: false },
          qui: { open: '09:00', close: '18:00', closed: false },
          sex: { open: '09:00', close: '18:00', closed: false },
          sab: { open: '09:00', close: '13:00', closed: true },
          dom: { open: '09:00', close: '13:00', closed: true },
        },
      },
    ]);
  };

  const updateUnidade = (id: string, updates: Partial<Unidade>) => {
    set('unidades', profile.unidades.map((u) => (u.id === id ? { ...u, ...updates } : u)));
  };

  const addColor = () => setColors((c) => [...c, { name: '', hex: '#000000' }]);
  const updateColor = (idx: number, updates: Partial<ColorToken>) => {
    setColors((c) => c.map((token, i) => (i === idx ? { ...token, ...updates } : token)));
  };
  const removeColor = (idx: number) => setColors((c) => c.filter((_, i) => i !== idx));

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4 pb-8">
      <BaseHeader title="Dados da Empresa" subtitle="Informações cadastrais, marca, contatos e canais." />
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? 'Salvando...' : 'Salvar Dados'}</Button>
      </div>

      {/* Identidade */}
      <section className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /> Identidade</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Nome Curto</Label><Input value={profile.nome_curto} onChange={(e) => set('nome_curto', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Razão Social</Label><Input value={profile.nome_completo} onChange={(e) => set('nome_completo', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>CNPJ</Label><Input value={profile.cnpj} onChange={(e) => set('cnpj', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Responsável</Label><Input value={profile.nome_responsavel} onChange={(e) => set('nome_responsavel', e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label>Descrição</Label><Textarea rows={3} value={profile.descricao} onChange={(e) => set('descricao', e.target.value)} /></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>Missão</Label><Textarea rows={2} value={profile.missao} onChange={(e) => set('missao', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Visão</Label><Textarea rows={2} value={profile.visao} onChange={(e) => set('visao', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Valores</Label><Textarea rows={2} value={profile.valores} onChange={(e) => set('valores', e.target.value)} /></div>
        </div>
      </section>

      {/* Identidade Visual */}
      <section className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Palette className="w-4 h-4 text-primary" /> Identidade Visual</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {IMAGE_FIELDS.map((field) => (
            <ImageField key={field.key} field={field} />
          ))}
        </div>
        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex justify-between items-center">
            <Label>Paleta de Cores</Label>
            <Button type="button" size="sm" variant="ghost" onClick={addColor}><Plus className="w-4 h-4 mr-1" /> Adicionar Cor</Button>
          </div>
          {colors.map((token, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input type="color" value={token.hex} onChange={(e) => updateColor(idx, { hex: e.target.value })} className="h-9 w-10 rounded border border-border bg-transparent cursor-pointer shrink-0" />
              <Input value={token.name} onChange={(e) => updateColor(idx, { name: e.target.value })} placeholder="Nome (ex: Cor Primária)" />
              <Input value={token.hex} onChange={(e) => updateColor(idx, { hex: e.target.value })} placeholder="#000000" className="font-mono text-xs w-32" />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeColor(idx)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      </section>

      {/* Unidades */}
      <section className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex justify-between items-center">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Unidades</h4>
            <Button size="sm" onClick={addUnidade}><Plus className="w-4 h-4 mr-1"/> Adicionar Unidade</Button>
        </div>
        {profile.unidades.map((u, idx) => (
          <div key={u.id} className="border p-3 rounded-lg space-y-2">
            <div className="flex justify-between items-start">
                <Input value={u.nome} onChange={(e) => updateUnidade(u.id, { nome: e.target.value })} placeholder="Nome da unidade" className="w-1/2" />
                <Button variant="ghost" size="sm" onClick={() => set('unidades', profile.unidades.filter((_, i) => i !== idx))}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </div>
            <Input value={u.endereco} onChange={(e) => updateUnidade(u.id, { endereco: e.target.value })} placeholder="Endereço" />
            <Input value={u.maps_url} onChange={(e) => updateUnidade(u.id, { maps_url: e.target.value })} placeholder="Link Google Maps" />

            <div className="grid grid-cols-7 gap-1 text-xs mt-2">
                {Object.entries(u.horarios).map(([dia, h]) => (
                    <div key={dia} className="border rounded p-1">
                        <div className="uppercase font-bold text-center">{dia}</div>
                        <Switch checked={!h.closed} onCheckedChange={(v) => updateUnidade(u.id, { horarios: { ...u.horarios, [dia]: { ...h, closed: !v } } })} />
                        <Input type="time" value={h.open} onChange={(e) => updateUnidade(u.id, { horarios: { ...u.horarios, [dia]: { ...h, open: e.target.value } } })} className="p-0 text-xs h-6"/>
                        <Input type="time" value={h.close} onChange={(e) => updateUnidade(u.id, { horarios: { ...u.horarios, [dia]: { ...h, close: e.target.value } } })} className="p-0 text-xs h-6"/>
                    </div>
                ))}
            </div>
          </div>
        ))}
      </section>

      {/* Contatos */}
      <section className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> Contatos</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label><Mail className="w-3.5 h-3.5 inline mr-1" />Email</Label><Input value={profile.email} onChange={(e) => set('email', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Contato Geral</Label><Input value={profile.contato_geral} onChange={(e) => set('contato_geral', e.target.value)} /></div>
            <div className="space-y-1.5"><Label><User className="w-3.5 h-3.5 inline mr-1" />Atendimento Direto</Label><Input value={profile.atendimento_direto} onChange={(e) => set('atendimento_direto', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Atendimento IA</Label><Input value={profile.atendimento_ia} onChange={(e) => set('atendimento_ia', e.target.value)} /></div>
        </div>
      </section>

      {/* Redes Sociais */}
      <section className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Share2 className="w-4 h-4 text-primary" /> Redes Sociais</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <SocialField id="facebook" label="Facebook" />
          <SocialField id="instagram" label="Instagram" />
          <SocialField id="tiktok" label="TikTok" />
          <SocialField id="youtube" label="YouTube" />
          <SocialField id="linkedin" label="LinkedIn" />
          <SocialField id="twitter_x" label="X (Twitter)" />
        </div>
        <div className="space-y-1.5"><Label><Hash className="w-3.5 h-3.5 inline mr-1" />Hashtags</Label><Input value={profile.hashtags} onChange={(e) => set('hashtags', e.target.value)} placeholder="#marca #slogan" /></div>
      </section>

      {/* Sites */}
      <section className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Sites</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SiteField id="site_institucional" label="Site Institucional" />
          <SiteField id="site_lp" label="Landing Page" />
          <SiteField id="site_comercial" label="Site Comercial" />
          <SiteField id="politicas_privacidade" label="Política de Privacidade" />
          <SiteField id="termo_servico_url" label="Termo de Serviço" />
        </div>
      </section>
    </div>
  );
}
