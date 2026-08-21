import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'pt-BR' }),
}));

// Native <select>: Radix needs pointer machinery jsdom does not have.
vi.mock('@evoapi/design-system', () => ({
  Select: ({
    children,
    value,
    onValueChange,
    disabled,
  }: {
    children: ReactNode;
    value?: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <select
      data-testid="select"
      disabled={disabled}
      value={value || ''}
      onChange={e => onValueChange(e.target.value)}
    >
      <option value="" hidden />
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  // Text children only: the action-type items wrap their label in a <div>,
  // which is invalid inside <option>.
  SelectItem: ({
    value,
    children,
    disabled,
  }: {
    value: string;
    children: ReactNode;
    disabled?: boolean;
  }) => (
    <option value={value} disabled={disabled}>
      {typeof children === 'string' ? children : undefined}
    </option>
  ),
  Input: (props: Record<string, unknown>) => <input {...props} />,
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
  Button: ({ children, ...props }: { children?: ReactNode }) => (
    <button {...props}>{children}</button>
  ),
  Label: ({ children }: { children: ReactNode }) => <label>{children}</label>,
}));

import MacroActionRow from './MacroActionRow';
import type { MacroFormDataSource } from '@/services/macros';

const EMPTY_OPTIONS = { inboxes: [], agents: [], teams: [], labels: [], campaigns: [] };

// Only uuids starting with a hex digit 1-9 reproduce the bug: parseInt truncates
// those and `|| value` lets the number through. Leading 0 (falsy) and leading
// letter (NaN) passed by accident.
const TEAM_DIGIT = { id: '8f42e72a-1c3d-4b7a-9f11-2ab3cd4e5f60', name: 'Vendas' };
const TEAM_ZERO = { id: '0a12b3c4-5d6e-4f70-8192-a3b4c5d6e7f8', name: 'Suporte' };
const TEAM_LETTER = { id: 'ff11a2b3-c4d5-4e60-9182-73645adcbe90', name: 'Financeiro' };

function renderRow({
  actionName,
  actionParams = [],
  options = EMPTY_OPTIONS,
  optionsLoading = false,
  failedSources = [],
  onUpdate = vi.fn(),
}: {
  actionName: string;
  actionParams?: unknown[];
  options?: typeof EMPTY_OPTIONS;
  optionsLoading?: boolean;
  failedSources?: MacroFormDataSource[];
  onUpdate?: ReturnType<typeof vi.fn>;
}) {
  render(
    <MacroActionRow
      action={{ action_name: actionName, action_params: actionParams as never[] }}
      index={0}
      options={options}
      onUpdate={onUpdate}
      onRemove={vi.fn()}
      canRemove={false}
      errors={{}}
      disabled={false}
      optionsLoading={optionsLoading}
      failedSources={failedSources}
    />,
  );
  return onUpdate;
}

// First select is the action type; second is the action's config input.
function configSelect() {
  return screen.getAllByTestId('select')[1];
}

describe('MacroActionRow', () => {
  describe('assign_team (select)', () => {
    it('emits the whole uuid when it starts with a digit 1-9', () => {
      const onUpdate = renderRow({
        actionName: 'assign_team',
        options: { ...EMPTY_OPTIONS, teams: [TEAM_DIGIT] },
      });

      fireEvent.change(configSelect(), { target: { value: TEAM_DIGIT.id } });

      expect(onUpdate).toHaveBeenCalledWith(0, {
        action_name: 'assign_team',
        action_params: [TEAM_DIGIT.id],
      });
    });

    it.each([
      ['starting with 0', TEAM_ZERO],
      ['starting with a letter', TEAM_LETTER],
    ])('keeps emitting the whole uuid for a uuid %s', (_label, team) => {
      const onUpdate = renderRow({
        actionName: 'assign_team',
        options: { ...EMPTY_OPTIONS, teams: [team] },
      });

      fireEvent.change(configSelect(), { target: { value: team.id } });

      expect(onUpdate).toHaveBeenCalledWith(0, {
        action_name: 'assign_team',
        action_params: [team.id],
      });
    });

    it('says "no teams registered" when the list is empty and not loading', () => {
      renderRow({ actionName: 'assign_team' });

      expect(screen.getByText('actionRow.emptyTeams')).toBeTruthy();
      expect(screen.queryByText('actionRow.loadingOptions')).toBeNull();
    });

    it('says "loading options" while the form data is still being fetched', () => {
      renderRow({ actionName: 'assign_team', optionsLoading: true });

      expect(screen.getByText('actionRow.loadingOptions')).toBeTruthy();
      expect(screen.queryByText('actionRow.emptyTeams')).toBeNull();
    });

    // A source that answered 403/500 arrives here as an empty list too, and
    // calling that "no teams registered" is the same lie in a new place.
    it('says the options failed to load when /teams errored', () => {
      renderRow({ actionName: 'assign_team', failedSources: ['teams'] });

      expect(screen.getByText('actionRow.loadFailed')).toBeTruthy();
      expect(screen.queryByText('actionRow.emptyTeams')).toBeNull();
    });

    it('keeps the empty state when a different source is the one that failed', () => {
      renderRow({ actionName: 'assign_team', failedSources: ['labels'] });

      expect(screen.getByText('actionRow.emptyTeams')).toBeTruthy();
      expect(screen.queryByText('actionRow.loadFailed')).toBeNull();
    });
  });

  describe('assign_agent (select)', () => {
    const AGENT = { id: '7c9e1a2b-3d4f-4a56-b7c8-9d0e1f2a3b4c', name: 'Ana' };
    const WARNING = 'actionRow.assignAgentInboxWarning';
    const LOADED_AGENT = { ...EMPTY_OPTIONS, agents: [AGENT] };

    it('says "no agents registered" when the list is empty and not loading', () => {
      renderRow({ actionName: 'assign_agent' });

      expect(screen.getByText('actionRow.emptyAgents')).toBeTruthy();
    });

    it('warns that the assignment only lands on inboxes the agent belongs to', () => {
      renderRow({ actionName: 'assign_agent', options: LOADED_AGENT });

      expect(screen.getByText(WARNING)).toBeTruthy();
    });

    // The list stays complete on purpose, so the warning is the only thing
    // keeping the form from promising an assignment the execution rejects.
    it('warns without filtering the agent list', () => {
      renderRow({ actionName: 'assign_agent', options: LOADED_AGENT });

      expect(screen.getByRole('option', { name: AGENT.name })).toBeTruthy();
    });

    // Naming "this agent" while the select says "loading" / "none registered" /
    // "failed to load" describes a choice the user cannot have made yet. Each of
    // these three renders the warning if the guard is reduced to the action name.
    it.each([
      ['the list is still loading', { optionsLoading: true, options: LOADED_AGENT }],
      ['no agent is registered', { options: EMPTY_OPTIONS }],
      ['the agents source failed', { options: EMPTY_OPTIONS, failedSources: ['agents' as const] }],
    ])('does not warn while %s', (_label, extra) => {
      renderRow({ actionName: 'assign_agent', ...extra });

      expect(screen.queryByText(WARNING)).toBeNull();
    });

    it('points the select at the warning so a screen reader reaches it', () => {
      renderRow({ actionName: 'assign_agent', options: LOADED_AGENT });

      const warning = screen.getByText(WARNING);
      expect(warning.getAttribute('id')).toBeTruthy();
    });

    // change_status shares the `select` branch and carries no source, which is
    // where a refactor of the switch would most likely leak the warning.
    it.each([
      ['assign_team', { ...EMPTY_OPTIONS, teams: [TEAM_DIGIT] }],
      ['change_status', EMPTY_OPTIONS],
      ['change_priority', EMPTY_OPTIONS],
    ])('does not warn on %s', (actionName, options) => {
      renderRow({ actionName, options });

      expect(screen.queryByText(WARNING)).toBeNull();
    });
  });

  describe('add_label (multi_select)', () => {
    const LABEL_DIGIT = { id: '8f42e72a-1c3d-4b7a-9f11-2ab3cd4e5f60', title: 'urgente' };
    const LABEL_OTHER = { id: '9b31d05f-2e4a-4c88-8d77-1f2e3d4c5b6a', title: 'vip' };

    it('appends the whole uuid when it starts with a digit 1-9', () => {
      const onUpdate = renderRow({
        actionName: 'add_label',
        options: { ...EMPTY_OPTIONS, labels: [LABEL_DIGIT] },
      });

      fireEvent.change(configSelect(), { target: { value: LABEL_DIGIT.id } });

      expect(onUpdate).toHaveBeenCalledWith(0, {
        action_name: 'add_label',
        action_params: [LABEL_DIGIT.id],
      });
    });

    it('appends to the already selected uuids instead of replacing them', () => {
      const onUpdate = renderRow({
        actionName: 'add_label',
        actionParams: [LABEL_OTHER.id],
        options: { ...EMPTY_OPTIONS, labels: [LABEL_DIGIT, LABEL_OTHER] },
      });

      fireEvent.change(configSelect(), { target: { value: LABEL_DIGIT.id } });

      expect(onUpdate).toHaveBeenCalledWith(0, {
        action_name: 'add_label',
        action_params: [LABEL_OTHER.id, LABEL_DIGIT.id],
      });
    });

    it('does not add the same uuid twice', () => {
      const onUpdate = renderRow({
        actionName: 'add_label',
        actionParams: [LABEL_DIGIT.id],
        options: { ...EMPTY_OPTIONS, labels: [LABEL_DIGIT] },
      });

      fireEvent.change(configSelect(), { target: { value: LABEL_DIGIT.id } });

      expect(onUpdate).not.toHaveBeenCalled();
    });

    it('says "no labels registered" when the list is empty and not loading', () => {
      renderRow({ actionName: 'add_label' });

      expect(screen.getByText('actionRow.emptyLabels')).toBeTruthy();
    });

    it('says the options failed to load when /labels errored', () => {
      renderRow({ actionName: 'add_label', failedSources: ['labels'] });

      expect(screen.getByText('actionRow.loadFailed')).toBeTruthy();
      expect(screen.queryByText('actionRow.emptyLabels')).toBeNull();
    });
  });
});
