import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, File as FileIcon, Upload, FolderPlus, Trash2, ExternalLink, Loader2, RefreshCw, ChevronRight, Home } from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { toast } from 'sonner';
import { BaseHeader } from '@/components/base';
import { googleDriveService, DriveFile, isDriveFolder } from '@/services/google/googleDriveService';

interface Breadcrumb {
  id: string | null;
  name: string;
}

export default function GoogleDrivePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [path, setPath] = useState<Breadcrumb[]>([{ id: null, name: 'Meu Drive' }]);
  const [uploading, setUploading] = useState(false);

  const currentFolderId = path[path.length - 1].id;

  const load = useCallback(async (folderId: string | null) => {
    setLoading(true);
    try {
      const status = await googleDriveService.getStatus();
      setConnected(status.connected);
      if (!status.connected) return;

      const { files: list } = await googleDriveService.listFiles(folderId);
      setFiles(list);
    } catch {
      toast.error('Erro ao carregar arquivos do Google Drive.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(currentFolderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId]);

  const openFolder = (file: DriveFile) => {
    setPath((prev) => [...prev, { id: file.id, name: file.name }]);
  };

  const goToBreadcrumb = (index: number) => {
    setPath((prev) => prev.slice(0, index + 1));
  };

  const openFile = (file: DriveFile) => {
    if (file.webViewLink) window.open(file.webViewLink, '_blank', 'noopener');
  };

  const handleCreateFolder = async () => {
    const name = prompt('Nome da nova pasta:');
    if (!name?.trim()) return;
    try {
      await googleDriveService.createFolder(name.trim(), currentFolderId);
      toast.success('Pasta criada!');
      load(currentFolderId);
    } catch {
      toast.error('Erro ao criar pasta.');
    }
  };

  const handleDelete = async (file: DriveFile) => {
    if (!confirm(`Excluir "${file.name}"?`)) return;
    try {
      await googleDriveService.deleteFile(file.id);
      toast.success('Excluído.');
      load(currentFolderId);
    } catch {
      toast.error('Erro ao excluir.');
    }
  };

  const handleUpload = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await googleDriveService.uploadFile(file, currentFolderId);
      toast.success('Arquivo enviado!');
      load(currentFolderId);
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
        <BaseHeader title="Drive" subtitle="Google Drive conectado ao CRM." />
        <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4 max-w-lg mx-auto mt-12">
          <p className="text-sm text-muted-foreground">
            Nenhuma conta Google conectada com acesso ao Drive (ou a conexão existente é só de leitura e precisa ser
            refeita).
          </p>
          <Button onClick={() => navigate('/settings/integrations/google_workspace')}>
            Conectar Google Drive
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-background p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <BaseHeader title="Drive" subtitle="Arquivos do Google Drive conectado." />
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => load(currentFolderId)} disabled={loading}>
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
        {path.map((crumb, i) => (
          <span key={crumb.id || 'root'} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5" />}
            <button
              onClick={() => goToBreadcrumb(i)}
              className={`hover:text-foreground flex items-center gap-1 ${i === path.length - 1 ? 'text-foreground font-medium' : ''}`}
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
      ) : files.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">Pasta vazia.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="group relative rounded-lg border border-border bg-card p-3 flex flex-col items-center gap-2 hover:border-primary/50 transition cursor-pointer"
              onClick={() => (isDriveFolder(file) ? openFolder(file) : openFile(file))}
            >
              {isDriveFolder(file) ? (
                <Folder className="w-10 h-10 text-blue-500" />
              ) : file.thumbnailLink ? (
                <img src={file.thumbnailLink} alt="" className="w-10 h-10 object-cover rounded" />
              ) : (
                <FileIcon className="w-10 h-10 text-muted-foreground" />
              )}
              <span className="text-xs text-center line-clamp-2 break-all">{file.name}</span>
              <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                {!isDriveFolder(file) && file.webViewLink && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openFile(file); }}
                    className="p-1 rounded bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground"
                    title="Abrir"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
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
