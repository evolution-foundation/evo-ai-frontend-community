import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditorPage from './EditorPage';
import {
  generateEditorId,
  getEditorMenus,
  injectEditorMenus,
  saveEditorMenus,
  upsertEditorMenu,
  type EditorMenu,
} from '@/utils/editorMenus';

const STORAGE_KEY = 'evo-editor-menus';

beforeEach(() => {
  localStorage.removeItem(STORAGE_KEY);
});

describe('EditorPage', () => {
  it('renders the builder with the add-menu entry', () => {
    render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Editor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /adicionar menu/i })).toBeInTheDocument();
    expect(screen.getByText(/nenhum menu criado ainda/i)).toBeInTheDocument();
  });

  it('creates a menu with an item and persists it to localStorage', () => {
    render(
      <MemoryRouter>
        <EditorPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /adicionar menu/i }));

    fireEvent.change(screen.getByLabelText('Nome do menu'), {
      target: { value: 'Comercial' },
    });

    // Combobox de posição: clica, lista opções e escolhe a primeira ("Dashboard")
    const combo = screen.getByRole('combobox');
    fireEvent.focus(combo);
    const firstOption = screen.getByText('menu.customer.dashboard');
    fireEvent.click(firstOption);
    expect(combo).toHaveValue('menu.customer.dashboard');

    // Adiciona um conteúdo e define o título
    fireEvent.click(screen.getByRole('button', { name: /adicionar conteúdo \/ submenu/i }));
    fireEvent.change(screen.getByPlaceholderText('Título do conteúdo'), {
      target: { value: 'Tabela de preços' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    const menus = getEditorMenus();
    expect(menus).toHaveLength(1);
    expect(menus[0].name).toBe('Comercial');
    expect(menus[0].placement).toBe('after');
    expect(menus[0].items[0].title).toBe('Tabela de preços');
  });
});

describe('injectEditorMenus (pure)', () => {
  const base = [
    { id: 'a', name: 'Dashboard', href: '/dashboard', icon: () => null },
    { id: 'b', name: 'Contatos', href: '/contacts', icon: () => null },
  ] as never[];

  const buildMenu = (placement: 'before' | 'after'): EditorMenu => ({
    id: generateEditorId(),
    name: 'Comercial',
    placement,
    anchorName: 'Contatos',
    items: [
      {
        id: generateEditorId(),
        title: 'Item',
        contentType: 'link',
        url: 'https://x.com',
      },
    ],
  });

  it('places the custom menu after the anchor item', () => {
    const result = injectEditorMenus(base);
    // sem menus salvos ainda, lista intacta
    expect(result.map((i) => i.name)).toEqual(['Dashboard', 'Contatos']);

    upsertEditorMenu(buildMenu('after'));
    const injected = injectEditorMenus(base);
    expect(injected.map((i) => i.name)).toEqual(['Dashboard', 'Contatos', 'Comercial']);
  });

  it('places the custom menu before the anchor item', () => {
    upsertEditorMenu(buildMenu('before'));
    const injected = injectEditorMenus(base);
    expect(injected.map((i) => i.name)).toEqual(['Dashboard', 'Comercial', 'Contatos']);
  });

  it('appends at the end when the anchor does not exist', () => {
    const menu = buildMenu('before');
    menu.anchorName = 'Inexistente';
    saveEditorMenus([menu]);
    const injected = injectEditorMenus(base);
    expect(injected[injected.length - 1].name).toBe('Comercial');
  });

  it('keeps nested submenu layers through save → load → inject', () => {
    const childId = generateEditorId();
    const menu: EditorMenu = {
      id: generateEditorId(),
      name: 'Comercial',
      placement: 'after',
      anchorName: 'Contatos',
      items: [
        {
          id: generateEditorId(),
          title: 'Pasta',
          contentType: 'link',
          url: '',
          children: [
            { id: generateEditorId(), title: 'Sub', contentType: 'html', html: '<b>oi</b>' },
            { id: childId, title: 'Folha', contentType: 'link', url: 'exemplo.com.br' },
          ],
        },
      ],
    };
    upsertEditorMenu(menu);

    // round-trip preserva a hierarquia
    const loaded = getEditorMenus()[0];
    expect(loaded.items[0].children).toHaveLength(2);
    expect(loaded.items[0].children![1].title).toBe('Folha');

    const injected = injectEditorMenus(base);
    const injectedMenu = injected.find((i) => i.name === 'Comercial')!;
    // pai é alternador de painel (não navega para o construtor)
    expect(injectedMenu.href).toBe('#');
    expect(injectedMenu.subItems).toHaveLength(1);
    expect(injectedMenu.subItems![0].children).toHaveLength(2);
    expect(injectedMenu.subItems![0].children![1].href.endsWith(childId)).toBe(true);
  });

  it('gives each leaf its own /editor/content/:id href', () => {
    upsertEditorMenu({
      id: generateEditorId(),
      name: 'Vários',
      placement: 'after',
      anchorName: 'Dashboard',
      items: [
        { id: generateEditorId(), title: 'Um', contentType: 'link', url: 'a.com' },
        { id: generateEditorId(), title: 'Dois', contentType: 'html', html: '<p>x</p>' },
      ],
    });
    const injected = injectEditorMenus(base);
    const subs = injected.find((i) => i.name === 'Vários')!.subItems!;
    const hrefs = subs.map((s) => s.href);
    expect(hrefs[0]).toMatch(/^\/editor\/content\/[^/]+$/);
    expect(hrefs[1]).toMatch(/^\/editor\/content\/[^/]+$/);
    expect(hrefs[0]).not.toBe(hrefs[1]);
  });
});
