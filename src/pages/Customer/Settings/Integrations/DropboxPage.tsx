import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, CheckCircle, Loader2, Lock, LockOpen } from 'lucide-react';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '@evoapi/design-system';
import { toast } from 'sonner';
import IntegrationBackButton from '@/components/integrations/shared/IntegrationBackButton';
import { adminConfigService } from '@/services/admin/adminConfigService';
import { integrationsService } from '@/services/integrations';
import { Integration, IntegrationHook } from '@/types/integrations';

function isMasked(value: unknown): boolean {
  return typeof value === 'string' && value.includes('••••');
}

export default function DropboxPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [appKey, setAppKey] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [secretModified, setSecretModified] = useState(false);
  const [secretConfigured, setSecretConfigured] = useState(false);

  const [integration, setIntegration] = useState<Integration | null>(null);
  const [hook, setHook] = useState<IntegrationHook | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [config, app] = await Promise.all([
        adminConfigService.getConfig('dropbox'),
        integrationsService.getIntegration('dropbox'),
      ]);

      const rawKey = config.DROPBOX_APP_KEY;
      setAppKey(typeof rawKey === 'string' ? rawKey : '');

      setSecretConfigured(isMasked(config.DROPBOX_APP_SECRET));
      setSecretModified(false);
      setAppSecret('');

      setIntegration(app);
      setHook(app.hooks?.find((h) => h.app_id === 'dropbox') || null);
    } catch {
      toast.error('Erro ao carregar configuração do Dropbox.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appKey.trim()) {
      toast.error('Informe o App Key.');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, string | null> = { DROPBOX_APP_KEY: appKey.trim() };
      if (secretModified) {
        payload.DROPBOX_APP_SECRET = appSecret || null;
      }
      await adminConfigService.saveConfig('dropbox', payload);
      toast.success('Credenciais salvas com sucesso!');
      await load();
    } catch {
      toast.error('Erro ao salvar credenciais.');
    } finally {
      setSaving(false);
    }
  };

  const handleConnect = () => {
    if (integration?.action) {
      window.location.href = integration.action;
    }
  };

  const handleDisconnect = async () => {
    if (!hook) return;
    setDisconnecting(true);
    try {
      await integrationsService.deleteIntegrationHook(hook.id);
      toast.success('Conta Dropbox desconectada.');
      await load();
    } catch {
      toast.error('Erro ao desconectar.');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const connectedEmail = (hook?.settings as { email?: string } | undefined)?.email;
  const callbackUrl = `${window.location.origin}/settings/integrations/dropbox/callback`;

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center gap-4 mb-6">
        <IntegrationBackButton onBack={() => navigate('/settings/integrations')} />
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Dropbox</h1>
        <p className="text-muted-foreground text-sm">
          Conecte uma conta Dropbox para navegar, subir e gerenciar arquivos na aba Dropbox do menu principal.
        </p>
      </div>

      <div className="max-w-xl space-y-6">
        {hook ? (
          <Card>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                Conectado{connectedEmail ? ` como ${connectedEmail}` : ''}
              </div>
              <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? 'Desconectando...' : 'Desconectar'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Nenhuma conta Dropbox conectada ainda.</span>
              <Button onClick={handleConnect} disabled={!integration?.action}>
                <ExternalLink className="w-4 h-4 mr-2" /> Conectar com Dropbox
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credenciais do App Dropbox</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="db_app_key">App Key</Label>
                <Input
                  id="db_app_key"
                  value={appKey}
                  onChange={(e) => setAppKey(e.target.value)}
                  placeholder="ex: 8k2j9x7c1a0b3zz"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="db_app_secret">App Secret</Label>
                  {!secretModified &&
                    (secretConfigured ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        <Lock className="h-3 w-3" /> Configurado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <LockOpen className="h-3 w-3" /> Não configurado
                      </span>
                    ))}
                </div>
                <Input
                  id="db_app_secret"
                  type="password"
                  autoComplete="off"
                  placeholder={secretConfigured ? '••••••••' : 'App Secret'}
                  value={appSecret}
                  onChange={(e) => {
                    setAppSecret(e.target.value);
                    setSecretModified(e.target.value.length > 0);
                  }}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Crie um app "Scoped access" no{' '}
                <a
                  href="https://www.dropbox.com/developers/apps"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Dropbox App Console
                </a>{' '}
                com os escopos <code className="text-[11px] bg-muted px-1 rounded">files.metadata.write</code>,{' '}
                <code className="text-[11px] bg-muted px-1 rounded">files.content.write</code> e{' '}
                <code className="text-[11px] bg-muted px-1 rounded">files.content.read</code>, e cadastre esta URL de
                redirecionamento (OAuth 2 &gt; Redirect URIs):
                <br />
                <code className="text-[11px] bg-muted px-1 py-0.5 rounded break-all inline-block mt-1">
                  {callbackUrl}
                </code>
              </p>

              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Credenciais'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
