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

export default function GoogleWorkspacePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [secretModified, setSecretModified] = useState(false);
  const [secretConfigured, setSecretConfigured] = useState(false);

  const [integration, setIntegration] = useState<Integration | null>(null);
  const [hook, setHook] = useState<IntegrationHook | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [config, app] = await Promise.all([
        adminConfigService.getConfig('google_oauth'),
        integrationsService.getIntegration('google_workspace'),
      ]);

      const rawId = config.GOOGLE_OAUTH_CLIENT_ID;
      setClientId(typeof rawId === 'string' ? rawId : '');

      setSecretConfigured(isMasked(config.GOOGLE_OAUTH_CLIENT_SECRET));
      setSecretModified(false);
      setClientSecret('');

      setIntegration(app);
      setHook(app.hooks?.find((h) => h.app_id === 'google_workspace') || null);
    } catch {
      toast.error('Erro ao carregar configuração do Google.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId.trim()) {
      toast.error('Informe o Client ID.');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, string | null> = { GOOGLE_OAUTH_CLIENT_ID: clientId.trim() };
      if (secretModified) {
        payload.GOOGLE_OAUTH_CLIENT_SECRET = clientSecret || null;
      }
      await adminConfigService.saveConfig('google_oauth', payload);
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
      toast.success('Conta Google desconectada.');
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
  const callbackUrl = `${window.location.origin}/settings/integrations/google-workspace/callback`;

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center gap-4 mb-6">
        <IntegrationBackButton onBack={() => navigate('/settings/integrations')} />
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Google Login</h1>
        <p className="text-muted-foreground text-sm">
          Conecte uma conta Google para permitir acesso de leitura ao Google Drive e ao Google Tag Manager.
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
              <span className="text-sm text-muted-foreground">Nenhuma conta Google conectada ainda.</span>
              <Button onClick={handleConnect} disabled={!integration?.action}>
                <ExternalLink className="w-4 h-4 mr-2" /> Conectar com Google
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credenciais OAuth do Google</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gw_client_id">Client ID</Label>
                <Input
                  id="gw_client_id"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="xxxxxxxxxxxx.apps.googleusercontent.com"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="gw_client_secret">Client Secret</Label>
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
                  id="gw_client_secret"
                  type="password"
                  autoComplete="off"
                  placeholder={secretConfigured ? '••••••••' : 'GOCSPX-...'}
                  value={clientSecret}
                  onChange={(e) => {
                    setClientSecret(e.target.value);
                    setSecretModified(e.target.value.length > 0);
                  }}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Mesma credencial já usada pelo canal de Gmail. Cadastre no{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Google Cloud Console
                </a>{' '}
                com esta URL de redirecionamento autorizada:
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
