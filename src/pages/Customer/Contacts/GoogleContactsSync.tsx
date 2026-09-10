import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw, Loader2, Download, Upload, MessageCircle, CheckSquare, Square } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@evoapi/design-system';
import { BaseHeader } from '@/components/base';
import {
  googleContactsService,
  GoogleContactCandidate,
  CrmContactCandidate,
  WhatsappContactCandidate,
} from '@/services/contacts/googleContactsService';

export default function GoogleContactsSync() {
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [whatsappConnected, setWhatsappConnected] = useState(false);

  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [onlyInGoogle, setOnlyInGoogle] = useState<GoogleContactCandidate[]>([]);
  const [onlyInCrm, setOnlyInCrm] = useState<CrmContactCandidate[]>([]);
  const [googleDiffLoaded, setGoogleDiffLoaded] = useState(false);
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set());

  const [loadingWhatsapp, setLoadingWhatsapp] = useState(false);
  const [onlyInWhatsapp, setOnlyInWhatsapp] = useState<WhatsappContactCandidate[]>([]);
  const [whatsappDiffLoaded, setWhatsappDiffLoaded] = useState(false);
  const [whatsappReason, setWhatsappReason] = useState<string | undefined>();
  const [selectedWhatsapp, setSelectedWhatsapp] = useState<Set<string>>(new Set());
  const [importingWhatsapp, setImportingWhatsapp] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const status = await googleContactsService.getStatus();
      setGoogleConnected(status.google_connected);
      setWhatsappConnected(status.whatsapp_connected);
    } catch {
      // silencioso — os botões de sincronizar mostram o erro real ao tentar
    } finally {
      setStatusLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const withBusy = (key: string, on: boolean) => {
    setBusyKeys((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const syncGoogle = async () => {
    setLoadingGoogle(true);
    try {
      const result = await googleContactsService.diffGoogle();
      setGoogleConnected(result.connected);
      setOnlyInGoogle(result.only_in_google);
      setOnlyInCrm(result.only_in_crm);
      setGoogleDiffLoaded(true);
      if (!result.connected) {
        toast.error('Google não conectado. Conecte em Configurações > Integrações > Google Workspace (escopo de Contatos).');
      }
    } catch {
      toast.error('Falha ao sincronizar com o Google Contatos.');
    } finally {
      setLoadingGoogle(false);
    }
  };

  const importFromGoogle = async (c: GoogleContactCandidate, idx: number) => {
    const key = `g-${idx}`;
    withBusy(key, true);
    try {
      await googleContactsService.importFromGoogle(c.name || 'Sem nome', c.phone, c.email);
      setOnlyInGoogle((prev) => prev.filter((_, i) => i !== idx));
      toast.success(`"${c.name}" importado para o CRM.`);
    } catch {
      toast.error('Falha ao importar esse contato.');
    } finally {
      withBusy(key, false);
    }
  };

  const addToGoogle = async (c: CrmContactCandidate, idx: number) => {
    const key = `c-${idx}`;
    withBusy(key, true);
    try {
      await googleContactsService.addToGoogle(c.id);
      setOnlyInCrm((prev) => prev.filter((_, i) => i !== idx));
      toast.success(`"${c.name}" adicionado ao Google Contatos.`);
    } catch {
      toast.error('Falha ao adicionar esse contato ao Google.');
    } finally {
      withBusy(key, false);
    }
  };

  const syncWhatsapp = async () => {
    setLoadingWhatsapp(true);
    try {
      const result = await googleContactsService.diffWhatsapp();
      setWhatsappConnected(result.connected);
      setOnlyInWhatsapp(result.only_in_whatsapp);
      setWhatsappReason(result.reason);
      setWhatsappDiffLoaded(true);
      setSelectedWhatsapp(new Set());
      if (!result.connected) {
        toast.error('WhatsApp não respondeu. O canal pode estar desconectado — verifique em Configurações > Canais.');
      }
    } catch {
      toast.error('Falha ao buscar contatos do WhatsApp.');
    } finally {
      setLoadingWhatsapp(false);
    }
  };

  const toggleWhatsappSelection = (phone: string) => {
    setSelectedWhatsapp((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  };

  const toggleSelectAllWhatsapp = () => {
    if (selectedWhatsapp.size === onlyInWhatsapp.length) {
      setSelectedWhatsapp(new Set());
    } else {
      setSelectedWhatsapp(new Set(onlyInWhatsapp.map((c) => c.phone)));
    }
  };

  const importSelectedWhatsapp = async () => {
    const toImport = onlyInWhatsapp.filter((c) => selectedWhatsapp.has(c.phone));
    if (toImport.length === 0) {
      toast.error('Selecione ao menos um contato.');
      return;
    }
    setImportingWhatsapp(true);
    try {
      const result = await googleContactsService.importWhatsapp(toImport);
      setOnlyInWhatsapp((prev) => prev.filter((c) => !selectedWhatsapp.has(c.phone)));
      setSelectedWhatsapp(new Set());
      toast.success(`${result.created} contato(s) importado(s) do WhatsApp.`);
      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} contato(s) não puderam ser importados.`);
      }
    } catch {
      toast.error('Falha ao importar os contatos selecionados.');
    } finally {
      setImportingWhatsapp(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <BaseHeader title="Contatos Google" subtitle="Sincronize os Contatos do CRM com o Google e recupere contatos do WhatsApp que não foram salvos." />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            Google Contatos
            {statusLoaded && (
              <Badge variant={googleConnected ? 'default' : 'destructive'}>
                {googleConnected ? 'Conectado' : 'Desconectado'}
              </Badge>
            )}
          </CardTitle>
          <Button onClick={syncGoogle} disabled={loadingGoogle}>
            {loadingGoogle ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sincronizar Contatos
          </Button>
        </CardHeader>
        <CardContent>
          {!googleDiffLoaded ? (
            <p className="text-sm text-muted-foreground">Clique em "Sincronizar Contatos" pra comparar o CRM com o Google.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold mb-2">No Google, não no CRM ({onlyInGoogle.length})</h4>
                {onlyInGoogle.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nada por aqui.</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {onlyInGoogle.map((c, idx) => (
                      <div key={`${c.phone}-${idx}`} className="flex items-center justify-between border rounded-lg px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{c.name || 'Sem nome'}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.phone || c.email || '—'}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => importFromGoogle(c, idx)} disabled={busyKeys.has(`g-${idx}`)}>
                          <Download className="h-3.5 w-3.5 mr-1" /> Importar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">No CRM, não no Google ({onlyInCrm.length})</h4>
                {onlyInCrm.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nada por aqui.</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {onlyInCrm.map((c, idx) => (
                      <div key={c.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{c.name || 'Sem nome'}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.phone || c.email || '—'}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => addToGoogle(c, idx)} disabled={busyKeys.has(`c-${idx}`)}>
                          <Upload className="h-3.5 w-3.5 mr-1" /> Adicionar ao Google
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" /> Contatos do WhatsApp não salvos
            {statusLoaded && (
              <Badge variant={whatsappConnected ? 'default' : 'destructive'}>
                {whatsappConnected ? 'Conectado' : 'Desconectado'}
              </Badge>
            )}
          </CardTitle>
          <Button onClick={syncWhatsapp} disabled={loadingWhatsapp}>
            {loadingWhatsapp ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Buscar Contatos do WhatsApp
          </Button>
        </CardHeader>
        <CardContent>
          {!whatsappDiffLoaded ? (
            <p className="text-sm text-muted-foreground">
              Busca quem já mandou mensagem ou está salvo no WhatsApp conectado, mas ainda não virou Contato no CRM
              — útil pra pegar quem chegou durante uma desconexão, ou contatos de antes do CRM existir.
            </p>
          ) : whatsappReason === 'instance_unreachable' ? (
            <p className="text-sm text-destructive">
              O WhatsApp conectado não respondeu. O canal pode estar desconectado — verifique em Configurações &gt; Canais.
            </p>
          ) : onlyInWhatsapp.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum contato novo encontrado.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={toggleSelectAllWhatsapp}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  {selectedWhatsapp.size === onlyInWhatsapp.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  Selecionar todos ({onlyInWhatsapp.length})
                </button>
                <Button size="sm" onClick={importSelectedWhatsapp} disabled={importingWhatsapp || selectedWhatsapp.size === 0}>
                  {importingWhatsapp && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                  Importar Selecionados ({selectedWhatsapp.size})
                </Button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {onlyInWhatsapp.map((c) => (
                  <button
                    key={c.phone}
                    type="button"
                    onClick={() => toggleWhatsappSelection(c.phone)}
                    className="w-full flex items-center gap-3 border rounded-lg px-3 py-2 text-left hover:bg-muted/50"
                  >
                    {selectedWhatsapp.has(c.phone) ? (
                      <CheckSquare className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name || c.phone}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
