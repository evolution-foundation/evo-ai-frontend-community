import api from '@/services/core/api';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  iconLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  modifiedTime?: string;
  size?: string;
  parents?: string[];
}

export interface StatusResponse {
  connected: boolean;
}

export interface ListFilesResponse {
  files: DriveFile[];
}

const FOLDER_MIME = 'application/vnd.google-apps.folder';
export const isDriveFolder = (file: DriveFile) => file.mimeType === FOLDER_MIME;

// Endpoint único (despacha por `acao`), mesmo padrão do Google Calendar/
// Google Contacts — ver Api::V1::Reports::GoogleDriveController.
async function call<T>(acao: string, extra: Record<string, unknown> = {}): Promise<T> {
  const response = await api.post('/reports/google_drive', { acao, ...extra });
  return response.data.data as T;
}

export const googleDriveService = {
  getStatus: () => call<StatusResponse>('status'),
  listFiles: (folderId?: string | null) => call<ListFilesResponse>('listar_arquivos', { folder_id: folderId }),
  createFolder: (name: string, parentId?: string | null) =>
    call<DriveFile>('criar_pasta', { name, parent_id: parentId }),
  deleteFile: (fileId: string) => call('excluir_arquivo', { file_id: fileId }),
  uploadFile: async (file: File, parentId?: string | null): Promise<DriveFile> => {
    const formData = new FormData();
    formData.append('acao', 'subir_arquivo');
    formData.append('file', file, file.name);
    if (parentId) formData.append('parent_id', parentId);
    const response = await api.post('/reports/google_drive', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data as DriveFile;
  },
};
