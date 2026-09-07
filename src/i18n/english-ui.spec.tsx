import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import i18n from './config';
import ConversationStatusButton from '@/components/chat/chat-header/ConversationStatusButton';
import { STATUS_META } from '@/components/chat/chat-header/statusMeta';
import { getStatusConfig, getStatusLabel } from '@/utils/chat/conversationStatus';
import { formatConversationTime, formatDetailedTime } from '@/utils/time/timeHelpers';
import { CampaignStatus, CampaignStatusLabels } from '@/types/campaigns/campaign';
import { USER_FILTER_TYPES } from '@/types/users/users-filters';
import { getEventLabel } from '@/lib/events-manifest';

afterEach(async () => {
  cleanup();
  vi.useRealTimers();
  await i18n.changeLanguage('en');
});

describe('English UI regression audit', () => {
  it('registers every English and Portuguese catalog in the runtime', () => {
    const catalogs = import.meta.glob('./locales/{en,pt-BR}/*.json', { eager: true });
    for (const path of Object.keys(catalogs)) {
      const [, , language, filename] = path.split('/');
      expect(i18n.hasResourceBundle(language, filename.replace('.json', '')), path).toBe(true);
    }
    expect(i18n.options.defaultNS).toBe('common');
  });

  it('translates every status menu action and updates an open menu on language changes', async () => {
    await i18n.changeLanguage('en');
    const open = vi.fn();
    render(<ConversationStatusButton status="resolved" onMarkAsOpen={open}
      onMarkAsResolved={vi.fn()} onMarkAsPending={vi.fn()} onMarkAsSnoozed={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Change conversation status' }));
    const labels = () => within(screen.getByRole('menu')).getAllByRole('menuitemradio').map(el => el.textContent);
    expect(labels()).toEqual(['Open conversation', 'Pending', 'Pause conversation', 'Complete']);
    await act(() => i18n.changeLanguage('pt-BR'));
    expect(labels()).toEqual(['Abrir atendimento', 'Pendente', 'Pausar conversa', 'Concluir']);
    await act(() => i18n.changeLanguage('en'));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Open conversation' }));
    expect(open).toHaveBeenCalledOnce();
  });

  it('resolves shared status and filter labels at access time instead of module initialization', async () => {
    await i18n.changeLanguage('en');
    expect(getStatusLabel('pending')).toBe('Pending');
    expect(getStatusConfig('open').description).not.toMatch(/Conversa/);
    expect(STATUS_META.open.label).toBe('Open Conversation');
    expect(CampaignStatusLabels[CampaignStatus.COMPLETED]).toBe('Completed');
    const busy = USER_FILTER_TYPES.find(f => f.attributeKey === 'availability_status')!.options!.find(o => o.value === 'busy')!;
    expect(busy.label).toBe('Busy');
    await i18n.changeLanguage('pt-BR');
    expect(getStatusLabel('pending')).toBe('Pendente');
    expect(STATUS_META.open.label).toBe('Atendimento em Aberto');
    expect(busy.label).toBe('Ocupado');
  });

  it('formats dates in the selected language', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-07T12:00:00Z'));
    const yesterday = new Date('2026-09-06T12:00:00Z').getTime() / 1000;
    await i18n.changeLanguage('en');
    expect(formatConversationTime(yesterday)).toBe('Yesterday');
    expect(formatDetailedTime(yesterday)).toContain('September');
    await i18n.changeLanguage('pt-BR');
    expect(formatConversationTime(yesterday)).toBe('Ontem');
    expect(formatDetailedTime(yesterday)).toContain('setembro');
  });

  it('preserves explicitly requested event-label locales', async () => {
    await i18n.changeLanguage('en');
    expect(getEventLabel('contact.created', 'pt-BR')).toBe('Contato criado');
    expect(getEventLabel('contact.created', 'en')).toBe('Contact created');
  });

  it('renders plural warnings and summaries without Portuguese fragments or unresolved variables', async () => {
    await i18n.changeLanguage('en');
    const warning = i18n.t('pipelines:deleteStage.warningMessage', { count: 2 });
    expect(warning).toContain('2 conversations');
    expect(warning).not.toMatch(/{{|elas|removida/);
    expect(i18n.t('journey:panels.waitComponents.hybrid.summaryText', { time: '2 hours', trigger: 'a reply' }))
      .toContain('2 hours or until a reply');
    expect(i18n.t('contacts:pipelines.morePipelines', { count: 1 })).toBe('1 more pipeline');
    expect(i18n.t('contacts:pipelines.morePipelines', { count: 2 })).toBe('2 more pipelines');
  });
});
