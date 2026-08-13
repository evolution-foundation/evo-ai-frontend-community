import { useState, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  Input,
} from '@evoapi/design-system';
import { Upload, Trash2, FileText, Download } from 'lucide-react';

interface ContactImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (file: File, label?: string) => Promise<void>;
  loading?: boolean;
}

export default function ContactImportModal({
  open,
  onOpenChange,
  onImport,
  loading = false,
}: ContactImportModalProps) {
  const { t } = useLanguage('contacts');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [batchLabel, setBatchLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const csvTemplateUrl = '/downloads/import-contacts-sample.csv';

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        alert(t('import.errors.invalidType'));
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(t('import.errors.maxSize'));
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      await onImport(selectedFile, batchLabel.trim() || undefined);
      handleRemoveFile();
      setBatchLabel('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error importing contacts:', error);
    } finally {
      setUploading(false);
    }
  };

  const processFileName = (fileName: string): string => {
    const lastDotIndex = fileName.lastIndexOf('.');
    const extension = fileName.slice(lastDotIndex);
    const baseName = fileName.slice(0, lastDotIndex);

    return baseName.length > 20
      ? `${baseName.slice(0, 20)}...${extension}`
      : fileName;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('import.title')}</DialogTitle>
          <DialogDescription>
            {t('import.description')}{' '}
            <a
              href={csvTemplateUrl}
              download="import-contacts-sample.csv"
              className="text-blue-600 hover:text-blue-700 underline inline-flex items-center gap-1"
            >
              <Download className="h-3 w-3" />
              {t('import.downloadTemplate')}
            </a>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">{t('import.fileLabel')}</Label>

            {!selectedFile ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || uploading}
                  className="w-full justify-start"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t('import.chooseFile')}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <FileText className="h-5 w-5 text-gray-500" />
                <span className="flex-1 text-sm text-gray-700">
                  {processFileName(selectedFile.name)}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || uploading}
                  >
                    {t('import.changeFile')}
                  </Button>
                  <div className="w-px h-4 bg-gray-300" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    disabled={loading || uploading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="import-batch-label">{t('import.labelField')}</Label>
            <Input
              id="import-batch-label"
              value={batchLabel}
              onChange={(e) => setBatchLabel(e.target.value)}
              placeholder={t('import.labelPlaceholder')}
              disabled={loading || uploading}
            />
            <p className="text-xs text-muted-foreground">
              {t('import.labelDescription')}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              {t('import.formatTitle')}
            </h4>
            <p className="text-xs text-blue-700">
              {t('import.formatDescription')}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading || uploading}
          >
            {t('import.actions.cancel')}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedFile || loading || uploading}
          >
            {uploading ? t('import.actions.importing') : t('import.actions.import')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
