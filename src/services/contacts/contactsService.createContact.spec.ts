import { beforeEach, describe, expect, it, vi } from 'vitest';
import { contactsService } from './contactsService';
import api from '@/services/core/api';

vi.mock('@/services/core/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// O POST /contacts responde `data: { contact, contact_inbox }`, enquanto GET e
// PATCH respondem o contato na raiz. Sem desembrulhar, o create devolvia o
// envelope e a tela navegava para /contacts/undefined.
describe('contactsService.createContact', () => {
  const postMock = vi.mocked(api.post);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('desembrulha o contato aninhado do POST', async () => {
    postMock.mockResolvedValue({
      data: { data: { contact: { id: 'c-1', name: 'Ana' }, contact_inbox: { id: 'ci-1' } } },
    } as never);

    const contact = await contactsService.createContact({ name: 'Ana' } as never);

    expect(contact.id).toBe('c-1');
    expect(contact.name).toBe('Ana');
  });

  it('desembrulha tambem no ramo com avatar (FormData)', async () => {
    postMock.mockResolvedValue({
      data: { data: { contact: { id: 'c-2', name: 'Bia' }, contact_inbox: null } },
    } as never);

    const contact = await contactsService.createContact({
      name: 'Bia',
      avatar: new File(['x'], 'a.png', { type: 'image/png' }),
    } as never);

    expect(contact.id).toBe('c-2');
  });

  it('aceita a forma plana caso o backend deixe de aninhar', async () => {
    postMock.mockResolvedValue({
      data: { data: { id: 'c-3', name: 'Caio' } },
    } as never);

    const contact = await contactsService.createContact({ name: 'Caio' } as never);

    expect(contact.id).toBe('c-3');
  });
});
