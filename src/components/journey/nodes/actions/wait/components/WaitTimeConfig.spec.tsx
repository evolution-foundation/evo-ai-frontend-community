import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WaitTimeConfig } from './WaitTimeConfig';
import type { WaitNodeData } from '../WaitNode';
import i18n from '@/i18n/config';

vi.mock('@/hooks/useJourneyVariables', () => ({
  useJourneyVariables: () => ({
    variables: [],
    loading: false,
    error: null,
    fetchVariables: vi.fn(),
    updateVariables: vi.fn(),
    addVariable: vi.fn(),
    updateVariable: vi.fn(),
    deleteVariable: vi.fn(),
  }),
}));

const j = (key: string) => i18n.t(`journey:${key}`);

describe('WaitTimeConfig — Label pareado com o controle', () => {
  it('pairs the duration and time-unit labels with their controls', () => {
    const data = { duration: 5, timeUnit: 'hours' } as WaitNodeData;
    render(<WaitTimeConfig data={data} onChange={vi.fn()} journeyId="journey-1" />);

    const duration = screen.getByLabelText(j('panels.waitComponents.time.durationLabel'));
    expect(duration.tagName).toBe('INPUT');
    expect((duration as HTMLInputElement).value).toBe('5');

    const unit = screen.getByLabelText(j('panels.waitComponents.time.timeUnitLabel'));
    expect(unit.getAttribute('role')).toBe('combobox');
  });
});
