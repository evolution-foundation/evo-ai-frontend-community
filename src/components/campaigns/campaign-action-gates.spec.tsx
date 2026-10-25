import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CampaignsTable from './CampaignsTable';
import CampaignsHeader from './CampaignsHeader';
import { Campaign, CampaignStatus } from '@/types/campaigns';

// Each action must show only with the key the CRM checks before proxying it.
const granted = new Set<string>();

vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({
    can: (resource: string, action: string) => granted.has(`${resource}.${action}`),
    isReady: true,
    loading: false,
  }),
}));

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

const ALL_KEYS = [
  'read', 'create', 'update', 'delete', 'schedule', 'execute', 'pause', 'resume', 'stop',
  'duplicate', 'bulk_action',
].map(action => `campaigns.${action}`);

const grant = (...keys: string[]) => keys.forEach(key => granted.add(key));

const noop = vi.fn();

const campaignWith = (status: CampaignStatus) =>
  ({ id: 'c1', title: 'Black Friday', status, created_at: '2026-10-01T12:00:00Z' }) as Campaign;

const renderTable = (status: CampaignStatus) =>
  render(
    <CampaignsTable
      campaigns={[campaignWith(status)]}
      selectedCampaigns={[]}
      onSelectionChange={noop}
      onCampaignClick={noop}
      onEditCampaign={noop}
      onDeleteCampaign={noop}
      onStartCampaign={noop}
      onPauseCampaign={noop}
      onStopCampaign={noop}
      onDuplicateCampaign={noop}
      onViewStats={noop}
    />,
  );

const openRowMenu = () =>
  userEvent.click(document.querySelector('[data-slot="dropdown-menu-trigger"]') as HTMLElement);

const renderHeader = () =>
  render(
    <CampaignsHeader
      totalCount={1}
      selectedCount={1}
      searchValue=""
      onSearchChange={noop}
      onNewCampaign={noop}
      onFilter={noop}
      onBulkPause={noop}
      onBulkResume={noop}
      onBulkDelete={noop}
      onBulkDuplicate={noop}
      onClearSelection={noop}
    />,
  );

beforeEach(() => granted.clear());

describe('CampaignsTable — per-campaign actions', () => {
  it.each([
    [CampaignStatus.DRAFT, 'campaigns.execute', 'card.actions.start'],
    [CampaignStatus.STOPPED, 'campaigns.execute', 'card.actions.resume'],
    [CampaignStatus.PAUSED, 'campaigns.resume', 'card.actions.resume'],
    [CampaignStatus.SENDING, 'campaigns.pause', 'card.actions.pause'],
    [CampaignStatus.SENDING, 'campaigns.stop', 'card.actions.cancel'],
  ])('status %s needs %s for "%s"', (status, key, title) => {
    const { unmount } = renderTable(status);
    expect(screen.queryByTitle(title)).toBeNull();
    unmount();

    grant(key);
    renderTable(status);
    expect(screen.getByTitle(title)).toBeTruthy();
  });

  it('play on a paused campaign needs resume, not execute', () => {
    grant('campaigns.execute');
    renderTable(CampaignStatus.PAUSED);
    expect(screen.queryByTitle('card.actions.resume')).toBeNull();
  });

  it('play on a draft needs execute, not resume', () => {
    grant('campaigns.resume');
    renderTable(CampaignStatus.DRAFT);
    expect(screen.queryByTitle('card.actions.start')).toBeNull();
  });

  it('keeps the row menu empty of campaign actions without their keys', async () => {
    renderTable(CampaignStatus.SENDING);
    await openRowMenu();
    expect(screen.getByText('card.actions.viewStats')).toBeTruthy();
    expect(screen.queryByText('card.actions.pause')).toBeNull();
    expect(screen.queryByText('card.actions.cancel')).toBeNull();
    expect(screen.queryByText('card.actions.duplicate')).toBeNull();
  });

  it('shows duplicate in the row menu with campaigns.duplicate', async () => {
    grant('campaigns.duplicate');
    renderTable(CampaignStatus.DRAFT);
    await openRowMenu();
    expect(screen.getByText('card.actions.duplicate')).toBeTruthy();
    expect(screen.queryByText('card.actions.start')).toBeNull();
  });

  it('shows every action with every key', async () => {
    grant(...ALL_KEYS);
    renderTable(CampaignStatus.SENDING);
    expect(screen.getByTitle('card.actions.pause')).toBeTruthy();
    expect(screen.getByTitle('card.actions.cancel')).toBeTruthy();
    await openRowMenu();
    for (const label of ['card.actions.pause', 'card.actions.cancel', 'card.actions.duplicate']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });
});

describe('CampaignsHeader — bulk actions', () => {
  it.each([
    ['campaigns.pause', 'header.bulkPause'],
    ['campaigns.resume', 'header.bulkResume'],
    ['campaigns.delete', 'header.bulkDelete'],
    ['campaigns.duplicate', 'header.bulkDuplicate'],
  ])('needs campaigns.bulk_action and %s for %s', (key, label) => {
    grant(key);
    const { unmount } = renderHeader();
    expect(screen.queryByText(label)).toBeNull();
    unmount();

    granted.clear();
    grant('campaigns.bulk_action');
    const second = renderHeader();
    expect(screen.queryByText(label)).toBeNull();
    second.unmount();

    grant(key);
    renderHeader();
    expect(screen.getByText(label)).toBeTruthy();
  });

  it('ignores the old update/create keys', () => {
    grant('campaigns.bulk_action', 'campaigns.update', 'campaigns.create');
    renderHeader();
    for (const label of ['header.bulkPause', 'header.bulkResume', 'header.bulkDuplicate']) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  it('shows every bulk action with every key', () => {
    grant(...ALL_KEYS);
    renderHeader();
    for (const label of ['header.bulkPause', 'header.bulkResume', 'header.bulkDuplicate', 'header.bulkDelete']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });
});
