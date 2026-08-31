import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeamsTable from '@/components/teams/TeamsTable';
import MacrosTable from '@/components/macros/MacrosTable';
import MacrosHeader from '@/components/macros/MacrosHeader';
import PipelinesHeader from '@/components/pipelines/PipelinesHeader';
import CannedResponsesTable from '@/components/cannedResponses/CannedResponsesTable';
import PipelinesTable from '@/components/pipelines/PipelinesTable';
import AgentActionsDropdown from '@/components/agents/AgentActionsDropdown';
import AgentHeader from '@/components/ai_agents/Header/AgentHeader';
import IntegrationCard from '@/components/integrations/base/IntegrationCard';
import ProfileSection from '@/pages/Customer/Agents/Agent/sections/ProfileSection';
import Step5_Instructions from '@/pages/Customer/Agents/Agent/wizard/Step5_Instructions';
import BasicSettingsForm from '@/components/channels/settings/BasicSettingsForm';
import { Team } from '@/types/users';
import { Macro } from '@/types/automation';
import { CannedResponse } from '@/types/knowledge';
import { Pipeline } from '@/types/analytics';
import { Agent } from '@/types/agents';
import { Integration } from '@/types/integrations';

// Write controls must not render for a user whose can() denies the matching
// resource.action; they must render when it grants (positive control against
// a vacuous pass).
let allowed = false;

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({
    can: () => allowed,
    isReady: true,
    loading: false,
  }),
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

vi.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({ formatDateTime: () => '2026-01-01' }),
}));

// The AI-action gates (ProfileSection / Step5) require the provider configured
// AND the integrations.execute grant; keep the provider on so the permission is
// the only variable under test.
vi.mock('@/contexts/GlobalConfigContext', () => ({
  useGlobalConfig: () => ({ openaiConfigured: true }),
}));

vi.mock('@/services/integrations/openaiService', () => ({
  openaiService: { processEvent: vi.fn() },
}));

vi.mock('@/components/agents/wizard/PromptGeneratorModal', () => ({
  default: () => null,
}));

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  allowed = false;
});

const noop = () => {};

const team = { id: 1, name: 'Support', members: [] } as unknown as Team;
const macro = {
  id: 1,
  name: 'Close ticket',
  visibility: 'global',
  actions: [],
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
} as unknown as Macro;
const cannedResponse = {
  id: 1,
  short_code: 'hi',
  content: 'Hello',
  created_at: '2026-01-01',
} as unknown as CannedResponse;
const pipeline = {
  id: '1',
  name: 'Sales',
  description: 'desc',
  is_default: false,
  is_active: true,
  pipeline_type: 'sales',
  item_count: 0,
  stages: [],
  conversations_count: 0,
  created_at: '2026-01-01',
} as unknown as Pipeline;
const agent = { id: 'a1', name: 'Bot' } as unknown as Agent;
const integration = {
  id: 'slack',
  name: 'Slack',
  description: 'Slack integration',
  enabled: false,
} as unknown as Integration;

const renderTeamsTable = () =>
  render(
    <TeamsTable
      teams={[team]}
      selectedTeams={[]}
      onSelectionChange={noop}
      onTeamClick={noop}
      onManageUsers={noop}
      onEditTeam={noop}
      onDeleteTeam={noop}
      onCreateTeam={noop}
    />,
  );

const renderMacrosTable = () =>
  render(
    <MacrosTable
      macros={[macro]}
      selectedMacros={[]}
      onSelectionChange={noop}
      onMacroClick={noop}
      onEditMacro={noop}
      onDeleteMacro={noop}
      onCreateMacro={noop}
      canEditMacro={() => allowed}
      canDeleteMacro={() => allowed}
    />,
  );

describe('write-control render gates', () => {
  it('TeamsTable renders no row-actions menu without teams write permissions', () => {
    renderTeamsTable();

    // Every row action is write-gated, so BaseTable drops the whole menu.
    expect(document.querySelector('[data-slot="dropdown-menu-trigger"]')).toBeNull();
  });

  it('TeamsTable renders the row-actions menu when permissions grant', () => {
    allowed = true;
    renderTeamsTable();

    expect(document.querySelector('[data-slot="dropdown-menu-trigger"]')).not.toBeNull();
  });

  it('MacrosTable keeps the read action but hides edit/delete without permission', async () => {
    renderMacrosTable();

    const trigger = document.querySelector('[data-slot="dropdown-menu-trigger"]');
    expect(trigger).not.toBeNull();
    await userEvent.click(trigger as HTMLElement);

    expect(screen.getByText('table.actions.view')).toBeTruthy();
    expect(screen.queryByText('table.actions.edit')).toBeNull();
    expect(screen.queryByText('table.actions.delete')).toBeNull();
  });

  it('MacrosTable renders edit/delete when permissions grant', async () => {
    allowed = true;
    renderMacrosTable();

    const trigger = document.querySelector('[data-slot="dropdown-menu-trigger"]');
    await userEvent.click(trigger as HTMLElement);

    expect(screen.getByText('table.actions.edit')).toBeTruthy();
    expect(screen.getByText('table.actions.delete')).toBeTruthy();
  });

  it('CannedResponsesTable renders no row actions without write permissions', () => {
    render(
      <CannedResponsesTable
        cannedResponses={[cannedResponse]}
        selectedCannedResponses={[]}
        loading={false}
        onSelectionChange={noop}
        onEditCannedResponse={noop}
        onDeleteCannedResponse={noop}
        onCreateCannedResponse={noop}
        sortBy="short_code"
        sortOrder="asc"
        onSort={noop}
      />,
    );

    expect(document.querySelector('[data-slot="dropdown-menu-trigger"]')).toBeNull();
  });

  it('MacrosHeader hides the create and bulk-delete controls without permission', () => {
    render(
      <MacrosHeader
        totalCount={1}
        selectedCount={1}
        searchValue=""
        onSearchChange={noop}
        onNewMacro={noop}
        onBulkDelete={noop}
        onFilter={noop}
        onClearSelection={noop}
        activeFilters={[]}
      />,
    );

    expect(screen.queryByText('header.newMacro')).toBeNull();
    expect(screen.queryByText('header.bulkDelete')).toBeNull();
  });

  it('PipelinesHeader shows the create button only with pipelines.create', () => {
    const { unmount } = render(
      <PipelinesHeader totalCount={0} searchValue="" onSearchChange={noop} onNewPipeline={noop} />,
    );
    expect(screen.queryByText('pipelinesHeader.newPipeline')).toBeNull();
    unmount();

    allowed = true;
    render(
      <PipelinesHeader totalCount={0} searchValue="" onSearchChange={noop} onNewPipeline={noop} />,
    );
    expect(screen.getByText('pipelinesHeader.newPipeline')).toBeTruthy();
  });

  const renderPipelinesTable = () =>
    render(
      <PipelinesTable
        pipelines={[pipeline]}
        loading={false}
        onView={noop}
        onEdit={noop}
        onDelete={noop}
        onDuplicate={noop}
        onToggleStatus={noop}
        onSetAsDefault={noop}
        sortBy="name"
        sortOrder="asc"
        onSort={noop}
      />,
    );

  it('PipelinesTable hides the edit row-action without pipelines.update', async () => {
    renderPipelinesTable();
    await userEvent.click(document.querySelector('[data-slot="dropdown-menu-trigger"]') as HTMLElement);
    expect(screen.getByText('pipelinesTable.actions.view')).toBeTruthy();
    expect(screen.queryByText('pipelinesTable.actions.edit')).toBeNull();
  });

  it('PipelinesTable shows the edit row-action with pipelines.update', async () => {
    allowed = true;
    renderPipelinesTable();
    await userEvent.click(document.querySelector('[data-slot="dropdown-menu-trigger"]') as HTMLElement);
    expect(screen.getByText('pipelinesTable.actions.edit')).toBeTruthy();
  });

  const renderAgentActions = () =>
    render(
      <AgentActionsDropdown
        agent={agent}
        trigger={<button type="button">open</button>}
        onEdit={noop}
        onDelete={noop}
      />,
    );

  it('AgentActionsDropdown hides edit/delete without ai_agents write permissions', async () => {
    renderAgentActions();
    await userEvent.click(screen.getByText('open'));
    expect(screen.getByText('dropdown.copyId')).toBeTruthy();
    expect(screen.queryByText('dropdown.edit')).toBeNull();
    expect(screen.queryByText('dropdown.delete')).toBeNull();
  });

  it('AgentActionsDropdown shows edit/delete with ai_agents write permissions', async () => {
    allowed = true;
    renderAgentActions();
    await userEvent.click(screen.getByText('open'));
    expect(screen.getByText('dropdown.edit')).toBeTruthy();
    expect(screen.getByText('dropdown.delete')).toBeTruthy();
  });

  const renderAgentHeader = () =>
    render(
      <AgentHeader
        mode="edit"
        agentName="Bot"
        isDirty={false}
        isSaving={false}
        onBack={noop}
        onSave={noop}
        onCancel={noop}
      />,
    );

  it('AgentHeader hides the save button without ai_agents.update', () => {
    // The save label renders twice (responsive show/hide spans).
    const { unmount } = renderAgentHeader();
    expect(screen.queryAllByText('actions.save')).toHaveLength(0);
    unmount();

    allowed = true;
    renderAgentHeader();
    expect(screen.getAllByText('actions.save').length).toBeGreaterThan(0);
  });

  it('IntegrationCard disables the connect toggle when integrations.update is denied', () => {
    const { unmount } = render(
      <IntegrationCard integration={integration} onConfigure={noop} onToggle={undefined} />,
    );
    expect(screen.getByText('actions.connect').closest('button')).toBeDisabled();
    unmount();

    render(<IntegrationCard integration={integration} onConfigure={noop} onToggle={noop} />);
    expect(screen.getByText('actions.connect').closest('button')).not.toBeDisabled();
  });

  const renderProfileSection = () =>
    render(
      <ProfileSection
        formData={{ name: 'A', description: '', role: '', goal: '', instruction: 'behave well' }}
        onFormDataChange={noop}
        agentType="llm"
      />,
    );

  it('ProfileSection hides the AI actions without integrations.execute', () => {
    const { unmount } = renderProfileSection();
    expect(screen.queryByText('wizard.step5.generateWithAI')).toBeNull();
    unmount();

    allowed = true;
    renderProfileSection();
    expect(screen.getByText('wizard.step5.generateWithAI')).toBeTruthy();
  });

  const renderStep5 = () =>
    render(
      <Step5_Instructions
        data={{ instruction: 'a sufficiently long instruction' }}
        onChange={noop}
        onNext={noop}
        onBack={noop}
      />,
    );

  it('Step5_Instructions disables the AI actions without integrations.execute', () => {
    const { unmount } = renderStep5();
    expect(screen.getByText('wizard.step5.generateWithAI').closest('button')).toBeDisabled();
    unmount();

    allowed = true;
    renderStep5();
    expect(screen.getByText('wizard.step5.generateWithAI').closest('button')).not.toBeDisabled();
  });

  // ChannelSettings gates the avatar upload/remove through canManageAvatar
  // (= can('inboxes','update')). BasicSettingsForm is the presentational sink,
  // so the render gate is exercised here via the prop directly.
  const renderBasicSettings = (canManageAvatar: boolean) =>
    render(
      <BasicSettingsForm
        formData={{
          name: 'inbox',
          avatar_url: 'https://example.com/a.png',
          greeting_enabled: false,
          greeting_message: '',
        }}
        inboxHook={{
          isAPIInbox: false,
          isAWebWidgetInbox: false,
          isAWhatsAppChannel: false,
          whatsAppAPIProviderName: '',
        }}
        onFormChange={noop}
        onAvatarUpload={noop}
        onAvatarDelete={noop}
        canManageAvatar={canManageAvatar}
      />,
    );

  it('BasicSettingsForm hides the avatar upload/remove controls without inboxes.update', () => {
    const { unmount } = renderBasicSettings(false);
    expect(screen.queryByText('settings.basicSettings.avatar.upload')).toBeNull();
    expect(screen.queryByText('settings.basicSettings.avatar.remove')).toBeNull();
    unmount();

    renderBasicSettings(true);
    expect(screen.getByText('settings.basicSettings.avatar.upload')).toBeTruthy();
    expect(screen.getByText('settings.basicSettings.avatar.remove')).toBeTruthy();
  });
});
