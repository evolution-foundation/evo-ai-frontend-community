import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ContentViewPage from './ContentViewPage';
import {
  generateEditorId,
  saveEditorMenus,
  type EditorMenu,
} from '@/utils/editorMenus';

const STORAGE_KEY = 'evo-editor-menus';

beforeEach(() => {
  localStorage.removeItem(STORAGE_KEY);
});

function renderAt(nodeId: string) {
  return render(
    <MemoryRouter initialEntries={[`/editor/content/${nodeId}`]}>
      <Routes>
        <Route path="/editor/content/:nodeId" element={<ContentViewPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ContentViewPage', () => {
  it('renders a link leaf inside an iframe (same pattern as Sites tab)', () => {
    const nodeId = generateEditorId();
    const menu: EditorMenu = {
      id: generateEditorId(),
      name: 'Teste',
      placement: 'after',
      anchorName: 'Dashboard',
      items: [{ id: nodeId, title: 'Site do cliente', contentType: 'link', url: 'exemplo.com.br' }],
    };
    saveEditorMenus([menu]);

    renderAt(nodeId);

    // header mostra o título e o botão de nova aba
    expect(screen.getByText('Site do cliente')).toBeInTheDocument();
    expect(screen.getByText(/abrir em nova aba/i)).toBeInTheDocument();

    // iframe aponta para a URL normalizada
    const iframe = document.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.getAttribute('src')).toBe('https://exemplo.com.br');
  });

  it('renders html content via srcDoc', () => {
    const nodeId = generateEditorId();
    saveEditorMenus([
      {
        id: generateEditorId(),
        name: 'Teste',
        placement: 'after',
        anchorName: 'Dashboard',
        items: [
          { id: nodeId, title: 'Tabela', contentType: 'html', html: '<h1>Olá</h1>' },
        ],
      },
    ]);

    renderAt(nodeId);

    const iframe = document.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.getAttribute('srcdoc')).toContain('<h1>Olá</h1>');
  });

  it('shows not-found when the node id does not exist', () => {
    renderAt('id-inexistente');
    expect(screen.getByText(/conteúdo não encontrado/i)).toBeInTheDocument();
  });
});
