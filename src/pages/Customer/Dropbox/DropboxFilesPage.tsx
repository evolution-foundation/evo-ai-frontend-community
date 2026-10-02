import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, File as FileIcon, Upload, FolderPlus, Trash2, ExternalLink, Loader2, RefreshCw, ChevronRight, Home } from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { toast } from 'sonner';
import { BaseHeader } from '@/components/base';
import { dropboxFilesService, DropboxEntry, isDropboxFolder } from '@/services/dropbox/dropboxFilesService';

export default function DropboxFilesPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<DropboxEntry[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const status = await dropboxFilesService.getStatus();
      setConnected(status.connected);
      if (!status.connected) return;

      const { entries: list } = await dropboxFilesService.listFolder(path);
      setEntries(list);
    } catch {
      toast.error('Erro ao carregar arquivos do Dropbox.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(currentPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath]);

  const breadcrumbs = [
    { path: '', name: 'Dropbox' },
    ...currentPath
      .split('/')
      .filter(Boolean)
      .map((_, i, arr) => ({ path: '/' + arr.slice(0, i + 1).join('/'), name: arr[i] })),
  ];

  const openFile = async (entry: DropboxEntry) => {
    try {
      const { link } = await dropboxFilesService.getTemporaryLink(entry.path_lower);
      window.open(link, '_blank', 'noopener');
    } catch {
      toast.error('Erro ao gerar link do arquivo.');
    }
  };

  const handleCreateFolder = async () => {
    const name = prompt('Nome da nova pasta:');
    if (!name?.trim()) return;
    try {
      await dropboxFilesService.createFolder(`${currentPath}/${name.trim()}`);
      toast.success('Pasta criada!');
      load(currentPath);
    } catch {
      toast.error('Erro ao criar pasta.');
    }
  };

  const handleDelete = async (entry: DropboxEntry) => {
    if (!confirm(`Excluir "${entry.name}"?`)) return;
    try {
      await dropboxFilesService.deleteEntry(entry.path_lower);
      toast.success('Excluído.');
      load(currentPath);
    } catch {
      toast.error('Erro ao excluir.');
    }
  };

  const handleUpload = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await dropboxFilesService.uploadFile(file, currentPath);
      toast.success('Arquivo enviado!');
      load(currentPath);
    } catch {
      toast.error('Erro ao enviar arquivo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading && connected === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (connected === false) {
    return (
      <div className="flex flex-col min-h-full bg-background p-6 space-y-6">
        <BaseHeader title="Dropbox" subtitle="Dropbox conectado ao CRM." />
        <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4 max-w-lg mx-auto mt-12">
          <p className="text-sm text-muted-foreground">Nenhuma conta Dropbox conectada ainda.</p>
          <Button onClick={() => navigate('/settings/integrations/dropbox')}>Conectar Dropbox</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-background p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <BaseHeader title="Dropbox" subtitle="Arquivos do Dropbox conectado." />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => load(currentPath)} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
          <Button variant="outline" onClick={handleCreateFolder}>
            <FolderPlus className="w-4 h-4 mr-2" /> Nova Pasta
          </Button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => handleUpload(e.target.files)} />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload className="w-4 h-4 mr-2" /> {uploading ? 'Enviando...' : 'Enviar Arquivo'}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.path || 'root'} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5" />}
            <button
              onClick={() => setCurrentPath(crumb.path)}
              className={`hover:text-foreground flex items-center gap-1 ${i === breadcrumbs.length - 1 ? 'text-foreground font-medium' : ''}`}
            >
              {i === 0 && <Home className="w-3.5 h-3.5" />}
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-16">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Pasta vazia.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {entries.map((entry) => (
            <div
              key={entry.path_lower}
              className="group relative rounded-lg border border-border bg-card p-3 flex flex-col items-center gap-2 hover:border-primary/50 transition cursor-pointer"
              onClick={() => (isDropboxFolder(entry) ? setCurrentPath(entry.path_lower) : openFile(entry))}
            >
              {isDropboxFolder(entry) ? (
                <Folder className="w-10 h-10 text-blue-500" />
              ) : (
                <FileIcon className="w-10 h-10 text-muted-foreground" />
              )}
              <span className="text-xs text-center line-clamp-2 break-all">{entry.name}</span>
              <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                {!isDropboxFolder(entry) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openFile(entry); }}
                    className="p-1 rounded bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground"
                    title="Abrir"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(entry); }}
                  className="p-1 rounded bg-background/80 hover:bg-background text-muted-foreground hover:text-destructive"
                  title="Excluir"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
