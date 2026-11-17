import { Download, FileText, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { pipelinesService } from '@/services/pipelines';
import type { DealTabProps } from '../dealContext';

export default function FilesTab({ deal, reload }: DealTabProps) {
  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    if (!input.files?.length) return;
    const files = Array.from(input.files);
    if (files.length > 10 || files.some(file => file.size > 10 * 1024 * 1024)) {
      toast.error('Envie até 10 arquivos, com no máximo 10 MB cada.');
      return;
    }
    try {
      await pipelinesService.uploadDealFiles(deal.id, files);
      await reload();
      toast.success('Arquivos enviados.');
    } catch {
      toast.error('Não foi possível enviar os arquivos.');
    }
    input.value = '';
  };
  const remove = async (fileId: string) => {
    try {
      await pipelinesService.removeDealFile(deal.id, fileId);
      await reload();
      toast.success('Arquivo removido.');
    } catch {
      toast.error('Não foi possível remover o arquivo.');
    }
  };
  return (
    <section className="deal-panel" aria-label="Arquivos do negócio">
      <header className="deal-panel-header">
        <div><h2>Arquivos do negócio</h2><p>Até 10 arquivos por envio e 10 MB por arquivo.</p></div>
        <label className="deal-upload"><Plus className="h-4 w-4" />Enviar arquivos<input type="file" multiple className="sr-only" onChange={upload} /></label>
      </header>
      {deal.files?.length ? (
        <ul className="deal-files">
          {deal.files.map(file => (
            <li key={file.id}>
              {file.thumbnail_url ? <img src={file.thumbnail_url} alt="" /> : <FileText className="h-8 w-8" aria-hidden="true" />}
              <div><p title={file.name}>{file.name}</p><small>{file.byte_size ? `${(file.byte_size / 1024 / 1024).toFixed(2)} MB` : ''}</small></div>
              <a href={file.url} target="_blank" rel="noreferrer" aria-label={`Baixar ${file.name}`}><Download className="h-4 w-4" /></a>
              <button type="button" onClick={() => void remove(file.id)} aria-label={`Remover ${file.name}`}><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      ) : <p className="deal-empty-note">Nenhum arquivo anexado.</p>}
    </section>
  );
}
