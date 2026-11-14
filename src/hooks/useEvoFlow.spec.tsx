import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useEvoFlow } from './useEvoFlow';
import { getCustomerMenuItems } from '@/components/layout/config/menuItems';
const state = vi.hoisted(() => ({ setupLoading: false, evoFlowPublicUrl: null as string | null }));
vi.mock('@/contexts/GlobalConfigContext', () => ({ useGlobalConfig: () => state, fetchGlobalConfig: vi.fn() }));
describe('optional Flow', () => {
  it('hides journeys without a configured service', () => {
    state.setupLoading = false; state.evoFlowPublicUrl = null;
    const { result } = renderHook(useEvoFlow);
    expect(result.current.configured).toBe(false);
    expect(getCustomerMenuItems(k => k, result.current.configured).some(i => i.href === '/journeys')).toBe(false);
  });
  it('keeps configured journeys available after loading', () => {
    state.evoFlowPublicUrl = 'https://flow.example.test'; state.setupLoading = true;
    const { result, rerender } = renderHook(useEvoFlow);
    expect(result.current).toEqual({ loading: true, configured: false });
    state.setupLoading = false; rerender();
    expect(result.current.configured).toBe(true);
    expect(getCustomerMenuItems(k => k, result.current.configured).some(i => i.href === '/journeys')).toBe(true);
  });
});
