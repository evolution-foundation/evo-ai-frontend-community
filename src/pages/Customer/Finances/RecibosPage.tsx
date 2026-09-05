import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud,
  Loader2,
  Trash2,
  Check,
  ReceiptText,
  AlertTriangle,
  Sparkles,
  Brain,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { Button, Input, Label } from '@evoapi/design-system';
import { toast } from 'sonner';
import { BaseHeader } from '@/components/base';
import {
  financialTransactionsService,
  receiptExtractionService,
  FinancialScope,
  AiProvider,
  AiProvidersStatus,
} from '@/services/finances/financesService';

const PROVIDER_META: Record<AiProvider, { label: string; icon: typeof Brain }> = {
  openai: { label: 'OpenAI', icon: Brain },
  gemini: { label: 'Google Gemini', icon: Sparkles },
};

type DraftStatus = 'processing' | 'ready' | 'error' | 'saving' | 'saved';

interface Draft {
  id: string;
  file: File;
  previewUrl: string;
  status: DraftStatus;
  errorMessage?: string;
  receiptUrl?: string;
  usedProvider?: AiProvider;
  description: string;
  category: string;
  amount: string;
  date: string;
  paymentMethod: string;
  scope: FinancialScope;
}

function parseAmount(value: string): number | null {
  const parsed = parseFloat(String(value).replace(/\./g, '').replace(',', '.'));
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function todayDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

let draftSeq = 0;
const nextId = () => `draft-${Date.now()}-${draftSeq++}`;

export default function RecibosPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [providersStatus, setProvidersStatus] = useState<AiProvidersStatus | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<AiProvider | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(true);

  const loadProvidersStatus = useCallback(async () => {
    setLoadingProviders(true);
    try {
      const status = await receiptExtractionService.getProvidersStatus();
      setProvidersStatus(status);
      setSelectedProvider((prev) => {
        if (prev && status[prev]) return prev;
        if (status.openai) return 'openai';
        if (status.gemini) return 'gemini';
        return null;
      });
    } catch {
      setProvidersStatus({ openai: false, gemini: false });
    } finally {
      setLoadingProviders(false);
    }
  }, []);

  useEffect(() => {
    loadProvidersStatus();
  }, [loadProvidersStatus]);

  const noProviderConnected = providersStatus && !providersStatus.openai && !providersStatus.gemini;

  const updateDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const removeDraft = (id: string) => {
    setDrafts((prev) => {
      const target = prev.find((d) => d.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((d) => d.id !== id);
    });
  };

  const processDraft = useCallback(
    async (id: string, file: File) => {
      try {
        const result = await receiptExtractionService.extract(file, selectedProvider || undefined);
        updateDraft(id, {
          status: 'ready',
          receiptUrl: result.receipt_url,
          usedProvider: result.provider,
          description: result.fornecedor ? `Compra - ${result.fornecedor}` : 'Despesa via nota fiscal',
          category: result.categoria_sugerida || '',
          amount: result.valor_total != null ? String(result.valor_total).replace('.', ',') : '',
          date: result.data_compra || todayDate(),
          paymentMethod: result.forma_pagamento || '',
        });
      } catch {
        updateDraft(id, {
          status: 'error',
          errorMessage: 'Não foi possível ler esta imagem automaticamente. Preencha os dados manualmente.',
        });
      }
    },
    [selectedProvider],
  );

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
      if (files.length === 0) {
        toast.error('Selecione arquivos de imagem (foto ou print da nota fiscal/recibo).');
        return;
      }
      const newDrafts: Draft[] = files.map((file) => ({
        id: nextId(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'processing',
        description: '',
        category: '',
        amount: '',
        date: todayDate(),
        paymentMethod: '',
        scope: 'store',
      }));
      setDrafts((prev) => [...newDrafts, ...prev]);
      newDrafts.forEach((d) => processDraft(d.id, d.file));
    },
    [processDraft],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const handleSave = async (draft: Draft) => {
    const amount = parseAmount(draft.amount);
    if (amount == null || amount <= 0) {
      toast.error('Informe um valor válido maior que zero.');
      return;
    }
    if (!draft.description.trim()) {
      toast.error('Informe a descrição da despesa.');
      return;
    }
    updateDraft(draft.id, { status: 'saving' });
    try {
      await financialTransactionsService.createTransaction({
        kind: 'expense',
        scope: draft.scope,
        description: draft.description.trim(),
        category: draft.category.trim() || 'Notas/Recibos',
        amount,
        transaction_date: new Date(`${draft.date}T12:00:00`).toISOString(),
        receipt_url: draft.receiptUrl || null,
      });
      toast.success('Despesa lançada com sucesso!');
      updateDraft(draft.id, { status: 'saved' });
    } catch {
      toast.error('Erro ao lançar a despesa.');
      updateDraft(draft.id, { status: 'ready' });
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-background p-6 space-y-6">
      <BaseHeader
        title="Notas & Recibos"
        subtitle="Envie a foto de uma nota fiscal ou recibo e a IA extrai fornecedor, valor e data para lançar a despesa automaticamente."
      />

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Provedor de IA</span>
          <Button variant="ghost" size="sm" onClick={loadProvidersStatus} disabled={loadingProviders}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingProviders ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          {(Object.keys(PROVIDER_META) as AiProvider[]).map((provider) => {
            const meta = PROVIDER_META[provider];
            const Icon = meta.icon;
            const connected = !!providersStatus?.[provider];
            const active = selectedProvider === provider;
            return (
              <button
                key={provider}
                type="button"
                disabled={!connected}
                onClick={() => setSelectedProvider(provider)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : connected
                      ? 'border-border text-foreground hover:bg-muted/40'
                      : 'border-border text-muted-foreground/50 cursor-not-allowed'
                }`}
                title={connected ? undefined : 'Não configurado em Configurações > Integrações'}
              >
                <Icon className="w-4 h-4" />
                {meta.label}
                <span
                  className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`}
                />
              </button>
            );
          })}
        </div>

        {noProviderConnected && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 mt-3">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Nenhum provedor de IA configurado — a leitura automática não vai funcionar até você conectar um.
            <Link
              to="/settings/integrations"
              className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
            >
              <Settings className="w-3 h-3" /> Ir para Integrações
            </Link>
          </div>
        )}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={`rounded-xl border-2 border-dashed p-10 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/40'
        }`}
      >
        <UploadCloud className="w-8 h-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Clique ou arraste as fotos das notas/recibos aqui</p>
        <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP — pode enviar várias de uma vez</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {drafts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhuma nota enviada ainda. As despesas lançadas aparecem em Financeiro &gt; Loja/Pessoal.
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="rounded-xl border border-border bg-card p-4 flex flex-col md:flex-row gap-4"
            >
              <img
                src={draft.previewUrl}
                alt="Nota fiscal"
                className="w-full md:w-32 h-32 object-cover rounded-lg border border-border shrink-0"
              />

              <div className="flex-1 min-w-0">
                {draft.status === 'processing' && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                    <Loader2 className="w-4 h-4 animate-spin" /> Lendo a imagem com IA...
                  </div>
                )}

                {draft.status !== 'processing' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {draft.status === 'error' && (
                      <div className="sm:col-span-2 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> {draft.errorMessage}
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <Label className="text-xs">Descrição</Label>
                      <Input
                        value={draft.description}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateDraft(draft.id, { description: e.target.value })
                        }
                        disabled={draft.status === 'saved'}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Categoria</Label>
                      <Input
                        value={draft.category}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateDraft(draft.id, { category: e.target.value })
                        }
                        placeholder="Ex: Fornecedores"
                        disabled={draft.status === 'saved'}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Valor Total (R$)</Label>
                      <Input
                        value={draft.amount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateDraft(draft.id, { amount: e.target.value })
                        }
                        placeholder="0,00"
                        disabled={draft.status === 'saved'}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Data da Compra</Label>
                      <Input
                        type="date"
                        value={draft.date}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateDraft(draft.id, { date: e.target.value })
                        }
                        disabled={draft.status === 'saved'}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Escopo</Label>
                      <select
                        value={draft.scope}
                        onChange={(e) => updateDraft(draft.id, { scope: e.target.value as FinancialScope })}
                        disabled={draft.status === 'saved'}
                        className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm"
                      >
                        <option value="store">Loja</option>
                        <option value="personal">Pessoal</option>
                      </select>
                    </div>
                    {draft.paymentMethod && (
                      <div className="sm:col-span-2 text-xs text-muted-foreground">
                        Forma de pagamento identificada:{' '}
                        <span className="font-medium text-foreground">{draft.paymentMethod}</span>
                      </div>
                    )}
                    {draft.usedProvider && (
                      <div className="sm:col-span-2 text-xs text-muted-foreground">
                        Lido com: <span className="font-medium text-foreground">{PROVIDER_META[draft.usedProvider].label}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex md:flex-col gap-2 justify-end md:justify-start shrink-0">
                {draft.status === 'saved' ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 px-3 py-2">
                    <Check className="w-4 h-4" /> Lançada
                  </span>
                ) : (
                  <Button
                    onClick={() => handleSave(draft)}
                    disabled={draft.status === 'processing' || draft.status === 'saving'}
                  >
                    {draft.status === 'saving' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ReceiptText className="w-4 h-4 mr-2" />
                    )}
                    Lançar Despesa
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => removeDraft(draft.id)} title="Remover">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
