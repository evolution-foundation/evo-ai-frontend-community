import { beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('@/services/core/apiAuth', () => ({ default: api }));
import service from './usersService';
const user = { id: 'synthetic', name: 'Pessoa sintética' };
beforeEach(() => vi.clearAllMocks());
describe('N4 invitation contract', () => {
  it('extracts data.user and omits both blank password fields', async () => {
    api.post.mockResolvedValue({ data: { data: { user } } });
    expect(await service.createUser({ name: 'Pessoa', email: 'synthetic@example.invalid', availability: 'offline', password: '', confirmPassword: '' })).toEqual(user);
    expect(api.post.mock.calls[0][1]).not.toHaveProperty('password');
    expect(api.post.mock.calls[0][1]).not.toHaveProperty('confirmPassword');
  });
  it('extracts multipart create and preserves explicit password', async () => {
    api.post.mockResolvedValue({ data: { data: { user } } });
    expect(await service.createUser({ name: 'Pessoa', email: 'synthetic@example.invalid', availability: 'offline', avatar: new File([''], 'avatar.png'), password: 'Strong#123', confirmPassword: 'Strong#123' })).toEqual(user);
    const body = api.post.mock.calls[0][1] as FormData;
    expect(body.get('password')).toBe('Strong#123');
    expect(body.has('confirmPassword')).toBe(false);
  });
  it('reads capability and queues a member request without email or token', async () => {
    api.get.mockResolvedValue({ data: { data: { user_invitations_enabled: false } } });
    expect(await service.invitationCapabilities()).toBe(false);
    api.post.mockResolvedValue({ data: { data: { request_id: 'request-1', next_resend_at: '2026-11-16T12:00:00Z' } } });
    expect(await service.resendInvite('user-1')).toHaveProperty('request_id', 'request-1');
    expect(api.post).toHaveBeenCalledWith('/users/user-1/resend_invite', {});
  });
  it('preserves partial bulk results', async () => {
    const result = { count: 1, invited_users: [user], failed_invitations: [{ email: 'synthetic@example.invalid', code: 'USER_NOT_CREATED', error: 'Could not create user' }] };
    api.post.mockResolvedValue({ data: { data: result } });
    expect(await service.bulkInvite({ emails: ['synthetic@example.invalid'] })).toEqual(result);
  });
});
