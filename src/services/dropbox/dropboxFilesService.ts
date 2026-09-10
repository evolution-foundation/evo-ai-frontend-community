import api from '@/services/core/api';

export interface DropboxEntry {
  '.tag': 'file' | 'folder';
  name: string;
  path_lower: string;
  path_display: string;
  size?: number;
  client_modified?: string;
  server_modified?: string;
}

export interface StatusResponse {
  connected: boolean;
}

export interface ListFolderResponse {
  entries: DropboxEntry[];
  has_more: boolean;
  cursor?: string;
}

export const isDropboxFolder = (entry: DropboxEntry) => entry['.tag'] === 'folder';

// Endpoint único (despacha por `acao`), mesmo padrão do Google Drive/
// Calendar/Contacts — ver Api::V1::Reports::DropboxController.
async function call<T>(acao: string, extra: Record<string, unknown> = {}): Promise<T> {
  const response = await api.post('/reports/dropbox', { acao, ...extra });
  return response.data.data as T;
}

export const dropboxFilesService = {
  getStatus: () => call<StatusResponse>('status'),
  listFolder: (path: string) => call<ListFolderResponse>('listar_arquivos', { path }),
  createFolder: (path: string) => call('criar_pasta', { path }),
  deleteEntry: (path: string) => call('excluir_arquivo', { path }),
  getTemporaryLink: (path: string) => call<{ link: string }>('link_temporario', { path }),
  uploadFile: async (file: File, folderPath: string): Promise<void> => {
    const formData = new FormData();
    formData.append('acao', 'subir_arquivo');
    formData.append('file', file, file.name);
    formData.append('folder_path', folderPath);
    await api.post('/reports/dropbox', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
