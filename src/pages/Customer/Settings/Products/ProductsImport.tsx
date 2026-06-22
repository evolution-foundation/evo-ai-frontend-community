import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Button,
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
import { ArrowLeft, FileUp, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserPermissions } from '@/hooks/useUserPermissions';
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
  type RowValidation,
} from '@/utils/products/bulkImport';
import type { ProductBulkServerError } from '@/types/products';

type Stage = 'upload' | 'mapping' | 'preview' | 'done';

interface DryRunState {
  conflicts: ProductBulkServerError[];
  /**
   * True once the server has actually been asked. An empty `conflicts` list
   * by itself is ambiguous — could mean "no problems" or "never checked".
   * `ran` disambiguates so Submit only enables after a real server pass.
   */
  ran: boolean;
}

export default function ProductsImport() {
  const { t } = useLanguage('products');
  const { can } = useUserPermissions();
  const navigate = useNavigate();
  const canCreate = can('products', 'create');

  const [stage, setStage] = useState<Stage>('upload');
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
          <TabsTrigger value="upload" disabled>{t('import.tabs.upload')}</TabsTrigger>
          <TabsTrigger value="mapping" disabled>{t('import.tabs.mapping')}</TabsTrigger>
          <TabsTrigger value="preview" disabled>{t('import.tabs.preview')}</TabsTrigger>
          <TabsTrigger value="done" disabled>{t('import.tabs.done')}</TabsTrigger>
        </TabsList>

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
            <Button variant="outline" onClick={() => setStage('mapping')}>
              {t('import.preview.backToMapping')}
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
                          #{err.index + 1} (CSV {csvLine})
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
              <Button
                onClick={() => {
                  setStage('upload');
                  setHeaders([]);
                  setRows([]);
                  setMapping({});
                  setValidations([]);
                  setDryRun(null);
                  setFileName('');
                }}
              >
                {t('import.done.importAnother')}
              </Button>
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
