import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { Button } from '@evoapi/design-system';
import { Download, Upload, Package } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';
import ExportWizard from './components/ExportWizard/ExportWizard';
import ImportModal from './components/ImportModal/ImportModal';

export default function Templates() {
  const { t } = useLanguage('templates');
  const { can } = useUserPermissions();

  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const canExport = can('templates', 'export');
  const canImport = can('templates', 'import');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between p-6 border-b">
        <div>
          <h1 className="text-2xl font-semibold">{t('page.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('page.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {canExport && (
            <Button onClick={() => setExportOpen(true)} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              {t('page.actions.export')}
            </Button>
          )}
          {canImport && (
            <Button onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              {t('page.actions.import')}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 p-6">
        <EmptyState
          icon={Package}
          title={t('page.title')}
          description={t('page.empty')}
        />
      </div>

      {exportOpen && <ExportWizard open={exportOpen} onClose={() => setExportOpen(false)} />}
      {importOpen && <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />}
    </div>
  );
}
