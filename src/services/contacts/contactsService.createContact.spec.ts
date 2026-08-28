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
// Achata um payload JSON nas mesmas chaves com colchete que o Rails espera,
// para comparar ramo-a-ramo o que cada caminho de fato manda.
function flattenForRails(value: unknown, key = ''): Array<[string, string]> {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.flatMap(item => flattenForRails(item, `${key}[]`));
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([subKey, subValue]) =>
      flattenForRails(subValue, key ? `${key}[${subKey}]` : subKey),
    );
  }
  return [[key, String(value)]];
}

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

  // O ramo com avatar precisa MANDAR o mesmo que o ramo JSON manda. O laco
  // antigo testava `typeof value === 'object'` antes de `Array.isArray`, entao
  // labels saiam como `labels[0]`; o Rails le isso como hash e o controller
  // responde 422 'Invalid labels payload' — criar contato com avatar E labels
  // falhava por inteiro.
  it('serializa array como labels[] no ramo com avatar', async () => {
    postMock.mockResolvedValue({ data: { data: { contact: { id: 'c-4' } } } } as never);

    await contactsService.createContact({
      name: 'Dina',
      labels: ['vip', 'lead'],
      avatar: new File(['x'], 'a.png', { type: 'image/png' }),
    } as never);

    const formData = postMock.mock.calls[0][1] as FormData;
    expect(formData.getAll('labels[]')).toEqual(['vip', 'lead']);
    expect(formData.get('labels[0]')).toBeNull();
  });

  it('desce nos atributos aninhados em vez de mandar [object Object]', async () => {
    postMock.mockResolvedValue({ data: { data: { contact: { id: 'c-5' } } } } as never);

    await contactsService.createContact({
      name: 'Elis',
      additional_attributes: { city: 'Recife', location: { city: 'Recife', timezone: 'America/Recife' } },
      avatar: new File(['x'], 'a.png', { type: 'image/png' }),
    } as never);

    const formData = postMock.mock.calls[0][1] as FormData;
    expect(formData.get('additional_attributes[city]')).toBe('Recife');
    expect(formData.get('additional_attributes[location][timezone]')).toBe('America/Recife');
    expect(formData.get('additional_attributes[location]')).toBeNull();
  });

  it('manda o avatar como arquivo, nao como String(value)', async () => {
    postMock.mockResolvedValue({ data: { data: { contact: { id: 'c-6' } } } } as never);
    const avatar = new File(['x'], 'a.png', { type: 'image/png' });

    await contactsService.createContact({ name: 'Fabio', avatar } as never);

    const formData = postMock.mock.calls[0][1] as FormData;
    expect(formData.get('avatar')).toBeInstanceOf(File);
  });

  // O AC do card e "criar COM avatar tem o MESMO comportamento". Os exemplos
  // acima olham a forma do FormData isolada; este cobra a equivalencia, que e a
  // invariante que quebrou.
  it('manda pelos dois ramos o mesmo conjunto de campos', async () => {
    const payload = {
      name: 'Gal',
      email: 'gal@example.com',
      blocked: false,
      labels: ['vip', 'lead'],
      company_ids: ['co-1', 'co-2'],
      custom_attributes: { plano: 'gold' },
      additional_attributes: { city: 'Recife', location: { city: 'Recife', timezone: 'America/Recife' } },
    };

    postMock.mockResolvedValue({ data: { data: { contact: { id: 'c-7' } } } } as never);
    await contactsService.createContact({ ...payload } as never);
    const jsonBody = postMock.mock.calls[0][1] as Record<string, unknown>;

    postMock.mockClear();
    await contactsService.createContact({
      ...payload,
      avatar: new File(['x'], 'a.png', { type: 'image/png' }),
    } as never);
    const formData = postMock.mock.calls[0][1] as FormData;

    const fromJson = flattenForRails(jsonBody).sort();
    const fromForm = [...formData.entries()]
      .filter(([key]) => key !== 'avatar')
      .map(([key, value]) => [key, String(value)] as [string, string])
      .sort();

    expect(fromForm).toEqual(fromJson);
  });

  it('omite array e objeto vazios, que o multipart nao consegue expressar', async () => {
    postMock.mockResolvedValue({ data: { data: { contact: { id: 'c-8' } } } } as never);

    await contactsService.createContact({
      name: 'Hugo',
      labels: [],
      custom_attributes: {},
      avatar: new File(['x'], 'a.png', { type: 'image/png' }),
    } as never);

    const formData = postMock.mock.calls[0][1] as FormData;
    expect(formData.getAll('labels[]')).toEqual([]);
    expect([...formData.keys()]).toEqual(['name', 'avatar']);
  });

  it('serializa Date como ISO em vez de apagar o valor', async () => {
    postMock.mockResolvedValue({ data: { data: { contact: { id: 'c-9' } } } } as never);
    const when = new Date('2026-08-28T12:00:00.000Z');

    await contactsService.createContact({
      name: 'Iris',
      additional_attributes: { seen_at: when },
      avatar: new File(['x'], 'a.png', { type: 'image/png' }),
    } as never);

    const formData = postMock.mock.calls[0][1] as FormData;
    expect(formData.get('additional_attributes[seen_at]')).toBe('2026-08-28T12:00:00.000Z');
  });

  it('estoura com erro claro em dado ciclico em vez de travar a aba', async () => {
    const cyclic: Record<string, unknown> = { city: 'Recife' };
    cyclic.self = cyclic;

    await expect(
      contactsService.createContact({
        name: 'Joao',
        additional_attributes: cyclic,
        avatar: new File(['x'], 'a.png', { type: 'image/png' }),
      } as never),
    ).rejects.toThrow(/profundidade maxima excedida/);
  });

  it('aceita a forma plana caso o backend deixe de aninhar', async () => {
    postMock.mockResolvedValue({
      data: { data: { id: 'c-3', name: 'Caio' } },
    } as never);

    const contact = await contactsService.createContact({ name: 'Caio' } as never);

    expect(contact.id).toBe('c-3');
  });
});
