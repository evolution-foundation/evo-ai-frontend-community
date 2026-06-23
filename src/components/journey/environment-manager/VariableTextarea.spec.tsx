import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VariableTextarea } from './VariableTextarea';
import '@/i18n/config';

// The picker only needs an (empty) variable list; avoid the real fetch.
vi.mock('@/hooks/useJourneyVariables', () => ({
  useJourneyVariables: () => ({ variables: [], loading: false, error: null }),
}));

const INSERT_VARIABLE_NAME =
  /insert variable|inserir variável|insertar variable|insérer une variable|inserisci variabile/i;

describe('VariableTextarea — accessibility', () => {
  it('gives the variable picker button an accessible name (EVO-1855)', () => {
    render(<VariableTextarea journeyId="j1" />);
    expect(screen.getByRole('button', { name: INSERT_VARIABLE_NAME })).toBeInTheDocument();
  });

  it('honors an explicit variableButtonTooltip as the accessible name', () => {
    render(<VariableTextarea journeyId="j1" variableButtonTooltip="Pick a token" />);
    expect(screen.getByRole('button', { name: 'Pick a token' })).toBeInTheDocument();
  });
});
