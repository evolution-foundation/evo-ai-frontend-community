import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Button,
  Input,
  RadioGroup,
  RadioGroupItem,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@evoapi/design-system';
import {
  ArrowLeft,
  FileUp,
  FileSpreadsheet,
  ShoppingCart,
  Store,
  KeyRound,
  HelpCircle,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import { productsService } from '@/services/products/productsService';
import { parseCsv, CsvParseError, findDuplicateHeaders } from '@/utils/csv/parseCsv';
import {
  autoMap,
  BULK_FIELDS,
  MAX_BULK_ROWS,
  normalizeServerErrorMessage,
  REQUIRED_FIELDS,
  unmappedRequiredFields,
  validateAll,
  type BulkField,
  type BulkItem,
  type RowValidation,
} from '@/utils/products/bulkImport';
import type {
  ProductBulkServerError,
  ProductImportCredentials,
  ProductImportSource,
  FetchedProductItem,
} from '@/types/products';

/** '' is the connector source; 'csv' keeps the original local-file flow. */
type Source = 'csv' | ProductImportSource | '';
type Stage = 'source' | 'credentials' | 'upload' | 'mapping' | 'preview' | 'done';

interface DryRunState {
  conflicts: ProductBulkServerError[];
  /**
   * True once the server has actually been asked. An empty `conflicts` list
   * by itself is ambiguous — could mean "no problems" or "never checked".
   * `ran` disambiguates so Submit only enables after a real server pass.
   */
  ran: boolean;
}

/** Credential fields required per connector, in display order. */
const CREDENTIAL_FIELDS: Record<ProductImportSource, Array<keyof ProductImportCredentials>> = {
  woocommerce: ['store_url', 'consumer_key', 'consumer_secret'],
  shopify: ['shop_domain', 'access_token'],
};

const HELP_STEPS: Record<ProductImportSource, string[]> = {
  woocommerce: ['step1', 'step2', 'step3', 'step4'],
  shopify: ['step1', 'step2', 'step3', 'step4'],
};

/**
 * A connector item arrives already mapped, but numeric fields come as the
 * store's raw strings — normalize them into the BulkItem shape the shared
 * preview/dry-run path expects.
 */
function toBulkItem(raw: FetchedProductItem): BulkItem {
  const price = raw.default_price;
  const parsedPrice = price === undefined || price === null || price === '' ? undefined : Number(price);
  return {
    name: raw.name,
    kind: raw.kind,
    slug: raw.slug,
    description: raw.description || undefined,
    sku: raw.sku || undefined,
    default_price: parsedPrice !== undefined && Number.isFinite(parsedPrice) ? parsedPrice : undefined,
    currency: raw.currency,
    purchase_url: raw.purchase_url || undefined,
    status: raw.status,
    stock_quantity: raw.stock_quantity ?? undefined,
    labels: raw.labels,
    // EVO-2226: pass the connector's image URLs through to /products/bulk, which
    // downloads + attaches them server-side.
    image_urls: raw.image_urls,
  };
}

export default function ProductsImport() {
  const { t } = useLanguage('products');
  const { can } = usePermissions();
  const navigate = useNavigate();
  const canCreate = can('products', 'create');

  const [stage, setStage] = useState<Stage>('source');
  const [source, setSource] = useState<Source>('');
  const [credentials, setCredentials] = useState<ProductImportCredentials>({});
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchCount, setFetchCount] = useState(0);

  const [fileName, setFileName] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [rowLines, setRowLines] = useState<number[]>([]);
  const [mapping, setMapping] = useState<Record<string, BulkField | ''>>({});
  const [validations, setValidations] = useState<RowValidation[]>([]);
  const [dryRun, setDryRun] = useState<DryRunState | null>(null);
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isConnector = source === 'woocommerce' || source === 'shopify';

  const requiredMissing = useMemo(() => unmappedRequiredFields(mapping), [mapping]);
  const clientInvalidCount = useMemo(
    () => validations.filter((v) => v.errors.length > 0).length,
    [validations],
  );
  const allErrors = useMemo(() => {
    const fromClient = validations.flatMap<ProductBulkServerError>((v) =>
      v.errors.length === 0
        ? []
        : [
            {
              index: v.index,
              sku: v.item?.sku ?? null,
              errors: v.errors.reduce<Record<string, string[]>>((acc, e) => {
                (acc[e.field] ||= []).push(e.message);
                return acc;
              }, {}),
            },
          ],
    );
    return [...fromClient, ...(dryRun?.conflicts ?? [])];
  }, [validations, dryRun]);

  /* ---------------- source ---------------- */

  const proceedFromSource = useCallback(() => {
    if (source === 'csv') {
      setStage('upload');
    } else if (source === 'woocommerce' || source === 'shopify') {
      setCredentials({});
      setStage('credentials');
    }
  }, [source]);

  /* ---------------- connector fetch ---------------- */

  const runFetch = useCallback(async () => {
    if (source !== 'woocommerce' && source !== 'shopify') return;
    const required = CREDENTIAL_FIELDS[source];
    const missing = required.filter((k) => !credentials[k]?.trim());
    if (missing.length > 0) {
      toast.error(t('import.credentials.missing'));
      return;
    }
    setFetchLoading(true);
    try {
      const res = await productsService.importFetch(source, credentials);
      const items = res.data?.items ?? [];
      if (items.length === 0) {
        toast.error(t('import.credentials.noProducts'));
        return;
      }
      const fetched: RowValidation[] = items.map((raw, index) => ({
        index,
        csvLine: index + 1,
        item: toBulkItem(raw),
        errors: [],
      }));
      setValidations(fetched);
      setFetchCount(fetched.length);
      setDryRun(null);
      setStage('preview');
    } catch (error) {
      handleFetchError(error, t);
    } finally {
      setFetchLoading(false);
    }
  }, [source, credentials, t]);

  /* ---------------- upload ---------------- */

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = parseCsv(text);
        if (parsed.headers.length === 0) {
          toast.error(t('import.errors.emptyFile'));
          return;
        }
        if (parsed.rows.length > MAX_BULK_ROWS) {
          toast.error(t('import.errors.tooManyRows', { max: MAX_BULK_ROWS, received: parsed.rows.length }));
          return;
        }
        if (parsed.rows.length === 0) {
          toast.error(t('import.errors.noDataRows'));
          return;
        }
        // `mapping` is keyed by header string and the sample lookup uses
        // headers.indexOf, so duplicate or empty-name headers would silently
        // overwrite each other. Reject both before reaching the mapping step.
        const emptyHeaderIndexes = parsed.headers
          .map((h, idx) => (h.trim() === '' ? idx + 1 : -1))
          .filter((i) => i > 0);
        if (emptyHeaderIndexes.length > 0) {
          toast.error(t('import.errors.emptyHeader', { columns: emptyHeaderIndexes.join(', ') }));
          return;
        }
        const duplicates = findDuplicateHeaders(parsed.headers);
        if (duplicates.length > 0) {
          toast.error(t('import.errors.duplicateHeaders', { headers: duplicates.join(', ') }));
          return;
        }
        const initialMapping = autoMap(parsed.headers);
        setFileName(file.name);
        setHeaders(parsed.headers);
        setRows(parsed.rows);
        setRowLines(parsed.rowLines);
        setMapping(initialMapping);
        setValidations([]);
        setDryRun(null);
        setStage('mapping');
      } catch (error) {
        if (error instanceof CsvParseError) {
          toast.error(
            t('import.errors.parseError', {
              line: error.line,
              message: t(`import.parseErrorCodes.${error.code}`),
            }),
          );
        } else {
          toast.error(t('import.errors.readError'));
        }
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [t],
  );

  /* ---------------- mapping → preview ---------------- */

  const proceedToPreview = useCallback(() => {
    if (requiredMissing.length > 0) {
      toast.error(t('import.errors.missingRequired', { fields: requiredMissing.join(', ') }));
      return;
    }
    setValidations(validateAll(rows, headers, rowLines, mapping));
    setDryRun(null);
    setStage('preview');
  }, [requiredMissing, rows, headers, rowLines, mapping, t]);

  /* ---------------- dry-run ---------------- */

  const runDryRun = useCallback(async () => {
    const validItems = validations.filter((v) => v.errors.length === 0).map((v) => v.item!);
    if (validItems.length === 0) {
      toast.error(t('import.errors.noValidRows'));
      return;
    }
    setDryRunLoading(true);
    try {
      const response = await productsService.bulkProducts({ products: validItems, dry_run: true });
      setDryRun({ ran: true, conflicts: response.data.errors });
    } catch (error) {
      handleApiError(error, t, true);
    } finally {
      setDryRunLoading(false);
    }
  }, [validations, t]);

  /* ---------------- submit ---------------- */

  const canSubmit =
    dryRun !== null &&
    dryRun.ran &&
    !dryRunLoading &&
    !submitting &&
    clientInvalidCount === 0 &&
    dryRun.conflicts.length === 0 &&
    validations.length > 0;

  const handleSubmit = useCallback(async () => {
    const items = validations.filter((v) => v.errors.length === 0).map((v) => v.item!);
    setSubmitting(true);
    try {
      const response = await productsService.bulkProducts({ products: items });
      toast.success(t('import.success', { count: response.meta.created }));
      setStage('done');
    } catch (error) {
      const surfaced = handleApiError(error, t, false);
      if (surfaced.kind === 'validation') {
        // Surface the server's per-row details in the same table the dry-run
        // uses. `ran` stays true so Submit stays disabled until the new
        // conflict list goes back to empty after another dry-run.
        setDryRun({ ran: true, conflicts: surfaced.details });
      }
    } finally {
      setSubmitting(false);
    }
  }, [validations, t]);

  const resetAll = useCallback(() => {
    setStage('source');
    setSource('');
    setCredentials({});
    setFetchCount(0);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setValidations([]);
    setDryRun(null);
    setFileName('');
  }, []);

  /* ---------------- render ---------------- */

  if (!canCreate) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="rounded border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {t('import.forbidden')}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('import.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('import.subtitle', { max: MAX_BULK_ROWS })}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/products')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('import.back')}
        </Button>
      </div>

      <Tabs value={stage}>
        <TabsList>
          <TabsTrigger value="source" disabled>{t('import.tabs.source')}</TabsTrigger>
          {isConnector && <TabsTrigger value="credentials" disabled>{t('import.tabs.credentials')}</TabsTrigger>}
          {source === 'csv' && <TabsTrigger value="upload" disabled>{t('import.tabs.upload')}</TabsTrigger>}
          {source === 'csv' && <TabsTrigger value="mapping" disabled>{t('import.tabs.mapping')}</TabsTrigger>}
          <TabsTrigger value="preview" disabled>{t('import.tabs.preview')}</TabsTrigger>
          <TabsTrigger value="done" disabled>{t('import.tabs.done')}</TabsTrigger>
        </TabsList>

        {/* ---------------- source ---------------- */}
        <TabsContent value="source">
          <RadioGroup
            value={source}
            onValueChange={(v) => setSource(v as Source)}
            className="grid gap-3 sm:grid-cols-3"
          >
            <SourceCard value="csv" icon={<FileSpreadsheet className="h-6 w-6" />} selected={source === 'csv'}
              onSelect={() => setSource('csv')}
              title={t('import.source.csv.title')} desc={t('import.source.csv.desc')} />
            <SourceCard value="woocommerce" icon={<ShoppingCart className="h-6 w-6" />} selected={source === 'woocommerce'}
              onSelect={() => setSource('woocommerce')}
              title={t('import.source.woocommerce.title')} desc={t('import.source.woocommerce.desc')} />
            <SourceCard value="shopify" icon={<Store className="h-6 w-6" />} selected={source === 'shopify'}
              onSelect={() => setSource('shopify')}
              title={t('import.source.shopify.title')} desc={t('import.source.shopify.desc')} />
          </RadioGroup>
          <div className="mt-4 flex justify-end">
            <Button onClick={proceedFromSource} disabled={source === ''} data-testid="source-continue">
              {t('import.source.continue')}
            </Button>
          </div>
        </TabsContent>

        {/* ---------------- credentials ---------------- */}
        {isConnector && (
          <TabsContent value="credentials">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t(`import.source.${source}.title`)}
              </p>
              <CredentialsHelp source={source} t={t} />
            </div>
            <div className="max-w-xl space-y-4">
              {CREDENTIAL_FIELDS[source].map((field) => (
                <div key={field}>
                  <label htmlFor={`cred-${field}`} className="mb-1 block text-sm font-medium">
                    {t(`import.credentials.fields.${field}`)}
                  </label>
                  <Input
                    id={`cred-${field}`}
                    data-testid={`cred-${field}`}
                    type={field === 'consumer_secret' || field === 'access_token' ? 'password' : 'text'}
                    autoComplete="off"
                    placeholder={t(`import.credentials.placeholders.${field}`)}
                    value={credentials[field] ?? ''}
                    onChange={(e) => setCredentials((c) => ({ ...c, [field]: e.target.value }))}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">{t('import.credentials.oneTimeNote')}</p>
            </div>
            <div className="mt-4 flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStage('source')}>
                {t('import.credentials.back')}
              </Button>
              <Button onClick={runFetch} disabled={fetchLoading} data-testid="fetch-products">
                {fetchLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('import.credentials.fetch')}
              </Button>
            </div>
          </TabsContent>
        )}

        <TabsContent value="upload">
          <div className="border border-dashed rounded-lg p-10 text-center">
            <FileUp className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm">{t('import.upload.hint', { max: MAX_BULK_ROWS })}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
              data-testid="csv-file-input"
            />
            <Button className="mt-4" onClick={() => fileInputRef.current?.click()}>
              {t('import.upload.selectFile')}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="mapping">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t('import.mapping.file', { name: fileName, count: rows.length })}
            </p>
            <Button variant="outline" onClick={() => setStage('upload')}>
              {t('import.mapping.changeFile')}
            </Button>
          </div>
          <div className="rounded border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left p-2">{t('import.mapping.csvHeader')}</th>
                  <th className="text-left p-2">{t('import.mapping.sample')}</th>
                  <th className="text-left p-2">{t('import.mapping.field')}</th>
                </tr>
              </thead>
              <tbody>
                {headers.map((header) => (
                  <tr key={header} className="border-t">
                    <td className="p-2 font-mono">{header}</td>
                    <td className="p-2 text-muted-foreground">
                      {rows[0]?.[headers.indexOf(header)] ?? ''}
                    </td>
                    <td className="p-2">
                      <Select
                        value={mapping[header] || 'ignore'}
                        onValueChange={(v) =>
                          setMapping((m) => ({ ...m, [header]: v === 'ignore' ? '' : (v as BulkField) }))
                        }
                      >
                        <SelectTrigger className="w-[220px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ignore">{t('import.mapping.ignore')}</SelectItem>
                          {BULK_FIELDS.map((f) => (
                            <SelectItem key={f} value={f}>
                              {t(`import.fields.${f}`)}
                              {REQUIRED_FIELDS.includes(f) ? ' *' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {requiredMissing.length > 0 && (
            <p className="mt-3 text-sm text-destructive">
              {t('import.mapping.missingRequired', {
                fields: requiredMissing.map((f) => t(`import.fields.${f}`)).join(', '),
              })}
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStage('upload')}>{t('import.mapping.back')}</Button>
            <Button onClick={proceedToPreview} disabled={requiredMissing.length > 0}>
              {t('import.mapping.next')}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          {isConnector && (
            <p className="mb-3 text-sm text-muted-foreground">
              {t('import.preview.fetched', { count: fetchCount, source: t(`import.source.${source}.title`) })}
            </p>
          )}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <SummaryCard
              tone={clientInvalidCount === 0 ? 'ok' : 'error'}
              label={t('import.preview.valid')}
              value={validations.length - clientInvalidCount}
            />
            <SummaryCard
              tone={clientInvalidCount === 0 ? 'ok' : 'error'}
              label={t('import.preview.invalid')}
              value={clientInvalidCount}
            />
            <SummaryCard
              tone={dryRun && dryRun.conflicts.length === 0 ? 'ok' : 'warn'}
              label={t('import.preview.conflicts')}
              value={dryRun?.conflicts.length ?? '-'}
            />
          </div>

          <div className="mb-4 flex items-center gap-2">
            <Button onClick={runDryRun} disabled={dryRunLoading || clientInvalidCount > 0}>
              {dryRunLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('import.preview.runDryRun')}
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('import.preview.import')}
            </Button>
            <Button variant="outline" onClick={() => setStage(source === 'csv' ? 'mapping' : 'credentials')}>
              {source === 'csv' ? t('import.preview.backToMapping') : t('import.preview.backToCredentials')}
            </Button>
          </div>

          {allErrors.length > 0 && (
            <div className="rounded border border-destructive/40">
              <div className="bg-destructive/5 px-3 py-2 text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                {t('import.preview.errorsHeading', { count: allErrors.length })}
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left p-2">{t('import.preview.row')}</th>
                    <th className="text-left p-2">{t('import.preview.sku')}</th>
                    <th className="text-left p-2">{t('import.preview.errors')}</th>
                  </tr>
                </thead>
                <tbody>
                  {allErrors.map((err) => {
                    const csvLine = rowLines[err.index] ?? err.index + 2;
                    return (
                      <tr key={`${err.index}-${err.sku ?? ''}`} className="border-t align-top">
                        <td className="p-2 font-mono whitespace-nowrap">
                          #{err.index + 1}
                          {source === 'csv' ? ` (CSV ${csvLine})` : ''}
                        </td>
                        <td className="p-2 font-mono">{err.sku ?? '—'}</td>
                        <td className="p-2">
                          <ul className="list-disc pl-4">
                            {Object.entries(err.errors).map(([field, msgs]) =>
                              msgs.map((msg, i) => (
                                <li key={`${field}-${i}`}>
                                  <strong>{field}:</strong>{' '}
                                  {t(`import.serverErrors.${normalizeServerErrorMessage(msg)}`, { defaultValue: msg })}
                                </li>
                              )),
                            )}
                          </ul>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="done">
          <div className="rounded border border-emerald-500/40 bg-emerald-500/5 p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h2 className="mt-2 text-lg font-medium">{t('import.done.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('import.done.subtitle')}</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="outline" onClick={() => navigate('/products')}>
                {t('import.done.backToList')}
              </Button>
              <Button onClick={resetAll}>{t('import.done.importAnother')}</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- helpers ---------------- */

// `metadata` is intentionally absent from BULK_FIELDS / auto-map: CSV is a
// hostile format for nested JSON. Expose a JSON column only if a real user
// asks for it.

function SourceCard({
  value,
  icon,
  title,
  desc,
  selected,
  onSelect,
}: {
  value: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      htmlFor={`source-${value}`}
      data-testid={`source-${value}`}
      onClick={onSelect}
      className={`flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition-colors ${
        selected ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/40'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{icon}</span>
        <RadioGroupItem value={value} id={`source-${value}`} />
      </div>
      <div className="font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </label>
  );
}

function CredentialsHelp({
  source,
  t,
}: {
  source: ProductImportSource;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className="h-auto p-0" data-testid="help-trigger">
          <HelpCircle className="h-4 w-4 mr-1" />
          {t('import.help.trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            {t(`import.help.${source}.title`)}
          </DialogTitle>
          <DialogDescription className="sr-only">{t('import.help.trigger')}</DialogDescription>
        </DialogHeader>
        <ol className="list-decimal space-y-2 pl-5 text-sm">
          {HELP_STEPS[source].map((step) => (
            <li key={step}>{t(`import.help.${source}.${step}`)}</li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ tone, label, value }: { tone: 'ok' | 'warn' | 'error'; label: string; value: number | string }) {
  const palette =
    tone === 'ok'
      ? 'border-emerald-500/40 bg-emerald-500/5'
      : tone === 'warn'
        ? 'border-amber-500/40 bg-amber-500/5'
        : 'border-destructive/40 bg-destructive/5';
  return (
    <div className={`rounded border ${palette} p-3`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

type ApiErrorOutcome =
  | { kind: 'validation'; details: ProductBulkServerError[] }
  | { kind: 'other' };

/**
 * Surfaces a connector fetch failure (`POST /products/import_fetch`). The
 * backend relays the store's own message verbatim in a 422 (bad credentials,
 * unsupported source, SSRF-refused host, empty catalog), so we show it as-is
 * rather than flattening every failure into a generic toast.
 */
function handleFetchError(
  error: unknown,
  t: (key: string, opts?: Record<string, unknown>) => string,
): void {
  if (!axios.isAxiosError(error)) {
    toast.error(t('import.errors.network'));
    return;
  }
  const status = error.response?.status;
  if (status === 403) {
    toast.error(t('import.errors.forbidden'));
    return;
  }
  if (status === 401) {
    toast.error(t('import.errors.unauthorized'));
    return;
  }
  const body = error.response?.data as { error?: { message?: string }; message?: string } | undefined;
  const message = body?.error?.message ?? body?.message;
  toast.error(message ? t('import.credentials.fetchFailed', { message }) : t('import.errors.network'));
}

/**
 * Maps the bulk endpoint error shape (defined in
 * app/controllers/api/v1/products_controller.rb#bulk) into a friendly toast
 * and, when applicable, a structured payload the caller can render
 * row-by-row.
 */
function handleApiError(
  error: unknown,
  t: (key: string, opts?: Record<string, unknown>) => string,
  isDryRun: boolean,
): ApiErrorOutcome {
  if (!axios.isAxiosError(error)) {
    toast.error(t('import.errors.network'));
    return { kind: 'other' };
  }
  const status = error.response?.status;
  const body = error.response?.data as { error?: { code?: string; message?: string; details?: unknown } } | undefined;

  if (status === 401) {
    toast.error(t('import.errors.unauthorized'));
    return { kind: 'other' };
  }
  if (status === 403) {
    toast.error(t('import.errors.forbidden'));
    return { kind: 'other' };
  }
  if (status === 429) {
    toast.error(t('import.errors.rateLimited'));
    return { kind: 'other' };
  }
  if (status === 422) {
    if (body?.error?.code === 'LIMIT_EXCEEDED') {
      const details = body.error.details as { max?: number; received?: number } | undefined;
      toast.error(t('import.errors.tooManyRows', { max: details?.max ?? MAX_BULK_ROWS, received: details?.received ?? 0 }));
      return { kind: 'other' };
    }
    if (Array.isArray(body?.error?.details)) {
      const details = body!.error!.details as ProductBulkServerError[];
      toast.error(
        isDryRun
          ? t('import.errors.dryRunInvalid', { count: details.length })
          : t('import.errors.serverInvalid', { count: details.length }),
      );
      return { kind: 'validation', details };
    }
    toast.error(body?.error?.message ?? t('import.errors.network'));
    return { kind: 'other' };
  }
  toast.error(t('import.errors.network'));
  return { kind: 'other' };
}
