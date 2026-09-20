import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProfileSection from './ProfileSection';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({ can: () => true, isReady: true, loading: false }),
}));

vi.mock('@/contexts/GlobalConfigContext', () => ({
  useGlobalConfig: () => ({ openaiConfigured: false }),
}));

vi.mock('@/services/integrations/openaiService', () => ({
  openaiService: { processEvent: vi.fn() },
}));

vi.mock('@/components/agents/wizard/PromptGeneratorModal', () => ({
  default: () => null,
}));

vi.mock('./TaskSection', () => ({
  default: () => <div data-testid="task-section" />,
}));

const formData = { name: 'Agente', description: '', role: '', goal: '', instruction: '' };

const renderProfile = (agentType: string, onTaskConfigChange?: () => void) =>
  render(
    <ProfileSection
      formData={formData}
      onFormDataChange={vi.fn()}
      agentType={agentType}
      taskConfigData={{ tasks: [] }}
      onTaskConfigChange={onTaskConfigChange}
      editingAgentId="agent-1"
    />
  );

describe('ProfileSection', () => {
  it('renders the task sub-block for task agents', () => {
    renderProfile('task', vi.fn());
    expect(screen.getByTestId('task-section')).toBeTruthy();
  });

  it.each(['llm', 'a2a', 'external', 'sequential', 'parallel', 'loop'])(
    'does not render the task sub-block for %s agents',
    agentType => {
      renderProfile(agentType, vi.fn());
      expect(screen.queryByTestId('task-section')).toBeNull();
    }
  );

  it('does not render the task sub-block when no task handler is wired', () => {
    renderProfile('task');
    expect(screen.queryByTestId('task-section')).toBeNull();
  });
});
