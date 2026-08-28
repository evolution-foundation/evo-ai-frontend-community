import type { AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { contactsService } from './contactsService';
import api from '@/services/core/api';
import type { ContactFormData } from '@/types/contacts';

vi.mock('@/services/core/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// Fixtures stay typed against ContactFormData so a rename in the type breaks the specs.
function contactData(overrides: Partial<ContactFormData> = {}): ContactFormData {
  return { name: 'Ana', type: 'person', ...overrides };
}

function apiResponse(data: unknown): AxiosResponse {
  return { data } as AxiosResponse;
}

function avatarFile(): File {
  return new File(['x'], 'a.png', { type: 'image/png' });
}

describe('contactsService.createContact', () => {
  const postMock = vi.mocked(api.post);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unwraps the contact nested in the POST response', async () => {
    postMock.mockResolvedValue(
      apiResponse({ data: { contact: { id: 'c-1', name: 'Ana' }, contact_inbox: { id: 'ci-1' } } }),
    );

    const contact = await contactsService.createContact(contactData());

    expect(contact.id).toBe('c-1');
    expect(contact.name).toBe('Ana');
  });

  it('unwraps in the avatar branch too', async () => {
    postMock.mockResolvedValue(
      apiResponse({ data: { contact: { id: 'c-2', name: 'Bia' }, contact_inbox: null } }),
    );

    const contact = await contactsService.createContact(contactData({ name: 'Bia', avatar: avatarFile() }));

    expect(contact.id).toBe('c-2');
  });

  // The old loop tested `typeof value === 'object'` before Array.isArray, so labels went
  // out as `labels[0]`; Rails reads that as a hash and answers 422 Invalid labels payload.
  it('serializes arrays as labels[] in the avatar branch', async () => {
    postMock.mockResolvedValue(apiResponse({ data: { contact: { id: 'c-4' } } }));

    await contactsService.createContact(
      contactData({ name: 'Dina', labels: ['vip', 'lead'], avatar: avatarFile() }),
    );

    const formData = postMock.mock.calls[0][1] as FormData;
    expect(formData.getAll('labels[]')).toEqual(['vip', 'lead']);
    expect(formData.get('labels[0]')).toBeNull();
  });

  it('descends into nested attributes instead of sending [object Object]', async () => {
    postMock.mockResolvedValue(apiResponse({ data: { contact: { id: 'c-5' } } }));

    await contactsService.createContact(
      contactData({
        name: 'Elis',
        additional_attributes: { city: 'Recife', location: { city: 'Recife', timezone: 'America/Recife' } },
        avatar: avatarFile(),
      }),
    );

    const formData = postMock.mock.calls[0][1] as FormData;
    expect(formData.get('additional_attributes[city]')).toBe('Recife');
    expect(formData.get('additional_attributes[location][timezone]')).toBe('America/Recife');
    expect(formData.get('additional_attributes[location]')).toBeNull();
  });

  it('sends the avatar as a file, not as String(value)', async () => {
    postMock.mockResolvedValue(apiResponse({ data: { contact: { id: 'c-6' } } }));

    await contactsService.createContact(contactData({ name: 'Fabio', avatar: avatarFile() }));

    const formData = postMock.mock.calls[0][1] as FormData;
    expect(formData.get('avatar')).toBeInstanceOf(File);
  });

  // The card's acceptance criterion: creating WITH an avatar behaves the same. The
  // expected keys are spelled out so the oracle does not restate the implementation.
  it('sends the same fields through both branches', async () => {
    const payload = contactData({
      name: 'Gal',
      email: 'gal@example.com',
      blocked: false,
      labels: ['vip', 'lead'],
      company_ids: ['co-1', 'co-2'],
      custom_attributes: { plano: 'gold' },
      additional_attributes: { city: 'Recife', location: { city: 'Recife', timezone: 'America/Recife' } },
    });
    const expectedFields: Array<[string, string]> = [
      ['name', 'Gal'],
      ['type', 'person'],
      ['email', 'gal@example.com'],
      ['blocked', 'false'],
      ['labels[]', 'vip'],
      ['labels[]', 'lead'],
      ['company_ids[]', 'co-1'],
      ['company_ids[]', 'co-2'],
      ['custom_attributes[plano]', 'gold'],
      ['additional_attributes[city]', 'Recife'],
      ['additional_attributes[location][city]', 'Recife'],
      ['additional_attributes[location][timezone]', 'America/Recife'],
    ];

    postMock.mockResolvedValue(apiResponse({ data: { contact: { id: 'c-7' } } }));
    await contactsService.createContact({ ...payload });
    expect(postMock.mock.calls[0][1]).toEqual(payload);

    postMock.mockClear();
    await contactsService.createContact({ ...payload, avatar: avatarFile() });
    const formData = postMock.mock.calls[0][1] as FormData;
    const sent = [...formData.entries()]
      .filter(([key]) => key !== 'avatar')
      .map(([key, value]) => [key, String(value)] as [string, string]);

    expect(sent.sort()).toEqual(expectedFields.sort());
  });

  it('drops empty arrays and objects, which multipart cannot express', async () => {
    postMock.mockResolvedValue(apiResponse({ data: { contact: { id: 'c-8' } } }));

    await contactsService.createContact(
      contactData({ name: 'Hugo', labels: [], custom_attributes: {}, avatar: avatarFile() }),
    );

    const formData = postMock.mock.calls[0][1] as FormData;
    expect(formData.getAll('labels[]')).toEqual([]);
    expect([...formData.keys()]).toEqual(['name', 'type', 'avatar']);
  });

  it('serializes Date as ISO instead of dropping the value', async () => {
    postMock.mockResolvedValue(apiResponse({ data: { contact: { id: 'c-9' } } }));
    const when = new Date('2026-08-28T12:00:00.000Z');

    await contactsService.createContact(
      contactData({ name: 'Iris', custom_attributes: { seen_at: when }, avatar: avatarFile() }),
    );

    const formData = postMock.mock.calls[0][1] as FormData;
    expect(formData.get('custom_attributes[seen_at]')).toBe('2026-08-28T12:00:00.000Z');
  });

  // MAX_FORM_DEPTH is 8, counted from the top-level key: a leaf seven levels below it is
  // still serialized, one level deeper raises.
  it('serializes up to the depth limit and raises past it', async () => {
    const nest = (levels: number): Record<string, unknown> =>
      levels === 1 ? { k: 'leaf' } : { k: nest(levels - 1) };
    postMock.mockResolvedValue(apiResponse({ data: { contact: { id: 'c-10' } } }));

    await contactsService.createContact(
      contactData({ custom_attributes: nest(7), avatar: avatarFile() }),
    );
    const formData = postMock.mock.calls[0][1] as FormData;
    expect(formData.get('custom_attributes[k][k][k][k][k][k][k]')).toBe('leaf');

    await expect(
      contactsService.createContact(contactData({ custom_attributes: nest(8), avatar: avatarFile() })),
    ).rejects.toThrow(/max depth exceeded/);
  });

  it('raises a clear error on cyclic data instead of hanging the tab', async () => {
    const cyclic: Record<string, unknown> = { city: 'Recife' };
    cyclic.self = cyclic;

    await expect(
      contactsService.createContact(
        contactData({ name: 'Joao', custom_attributes: cyclic, avatar: avatarFile() }),
      ),
    ).rejects.toThrow(/max depth exceeded/);
  });

  it('accepts the flat shape if the backend stops nesting', async () => {
    postMock.mockResolvedValue(apiResponse({ data: { id: 'c-3', name: 'Caio' } }));

    const contact = await contactsService.createContact(contactData({ name: 'Caio' }));

    expect(contact.id).toBe('c-3');
  });
});
