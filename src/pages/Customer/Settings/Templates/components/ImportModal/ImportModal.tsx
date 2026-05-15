import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from '@evoapi/design-system';
import { Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { templatesService } from '@/services/templates/templatesService';
import type { ImportReport, TemplateCategory } from '@/types/templates';

interface Props {
  open: boolean;
  onClose: () => void;
}

const MAX_BUNDLE_SIZE = 50 * 1024 * 1024;

export default function ImportModal({ open, onClose }: Props) {
  const { t } = useLanguage('templates');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);

  const handleFile = (selected: File | null) => {
    if (!selected) return;
    const ok =
      selected.name.endsWith('.zip') ||
      selected.name.endsWith('.evotpl.zip') ||
      selected.type === 'application/zip';
    if (!ok) {
      toast.error(t('import.errors.invalidType'));
      return;
    }
    if (selected.size > MAX_BUNDLE_SIZE) {
      toast.error(t('import.errors.fileTooLarge'));
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error(t('import.errors.missingFile'));
      return;
    }
    setImporting(true);
    try {
      const result = await templatesService.importTemplate(file);
      setReport(result);
      toast.success(t('page.actions.import'));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { code?: string } } } };
      const code = err?.response?.data?.error?.code;
      if (code === 'TEMPLATE_UNSUPPORTED_SCHEMA') toast.error(t('import.errors.unsupportedSchema'));
      else if (code === 'TEMPLATE_FILE_TOO_LARGE') toast.error(t('import.errors.fileTooLarge'));
      else toast.error(t('import.errors.invalidBundle'));
    } finally {
      setImporting(false);
    }
  };

  const closeAndReset = () => {
    setFile(null);
    setReport(null);
    onClose();
  };

  const counts = (report?.items ?? []).reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeAndReset()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        {!report && (
          <>
            <DialogHeader>
              <DialogTitle>{t('import.title')}</DialogTitle>
              <DialogDescription>{t('import.subtitle')}</DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <input
                ref={inputRef}
                type="file"
                accept=".zip,.evotpl,application/zip"
                hidden
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full border-2 border-dashed rounded-md p-8 hover:bg-muted transition-colors flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm font-medium">{t('import.selectFile')}</span>
                {file && (
                  <span className="text-xs text-muted-foreground">
                    {t('import.fileSelected', {
                      name: file.name,
                      size: `${(file.size / 1024).toFixed(1)} KB`,
                    })}
                  </span>
                )}
              </button>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={closeAndReset}>
                {t('import.report.close')}
              </Button>
              <Button onClick={handleSubmit} disabled={!file || importing}>
                {importing ? t('import.importing') : t('import.submit')}
              </Button>
            </DialogFooter>
          </>
        )}

        {report && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                {t('import.report.title')}
              </DialogTitle>
              <DialogDescription>{t('import.report.subtitle')}</DialogDescription>
            </DialogHeader>

            <div className="py-2 space-y-3">
              <div className="flex gap-4 text-sm">
                <span>{t('import.report.createdCount', { count: counts.created ?? 0 })}</span>
                <span>{t('import.report.renamedCount', { count: counts.renamed ?? 0 })}</span>
                {(counts.skipped ?? 0) > 0 && (
                  <span>{t('import.report.skippedCount', { count: counts.skipped })}</span>
                )}
              </div>

              {report.warnings.length > 0 && (
                <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3">
                  <p className="font-medium flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4" />
                    {t('import.report.warningsTitle')}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {report.warnings.map((w, idx) => (
                      <li key={idx}>
                        <span className="font-mono text-xs">
                          {t(`categories.${w.category as TemplateCategory}`)}
                        </span>
                        {' · '}
                        {w.new_name || w.slug}
                        {w.warning === 'configure_credentials' &&
                          ` — ${t('import.warnings.channelRequiresCredentials')}`}
                        {w.reason && ` — ${w.reason}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <details className="text-sm">
                <summary className="cursor-pointer">{t('import.report.title')} ({report.items.length})</summary>
                <ul className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                  {report.items.map((item, idx) => (
                    <li key={idx}>
                      <span className="font-mono text-xs">{item.category}</span> · {item.new_name || item.slug}{' '}
                      <span className="text-xs text-muted-foreground">[{item.status}]</span>
                    </li>
                  ))}
                </ul>
              </details>
            </div>

            <DialogFooter>
              <Button onClick={closeAndReset}>{t('import.report.close')}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
