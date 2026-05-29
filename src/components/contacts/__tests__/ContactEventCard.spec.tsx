import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ContactEvent } from '@/types/contacts';
import { ContactEventCard } from '../ContactEventCard';
import { slugifyEventName } from '@/lib/slugifyEventName';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    // Render the i18n key + the defaultValue if any so XSS-safety tests can
    // assert against the raw event_name without intermediate translation.
    t: (key: string, opts?: { defaultValue?: string; name?: string; label?: string; count?: number; cap?: number }) => {
      if (opts && 'defaultValue' in opts && opts.defaultValue !== undefined) return opts.defaultValue;
      if (opts && opts.name !== undefined) return `${key}|${opts.name}`;
      if (opts && opts.label !== undefined) return `${key}|${opts.label}`;
      return key;
    },
    currentLanguage: 'en',
  }),
}));

function makeEvent(overrides: Partial<ContactEvent> = {}): ContactEvent {
  return {
    id: 'evt-1',
    eventType: 'track',
    eventName: 'message_created',
    occurredAt: '2026-05-01T12:00:00Z',
    properties: {},
    ...overrides,
  };
}

describe('slugifyEventName', () => {
  it('replaces dots, colons and spaces with underscores', () => {
    expect(slugifyEventName('pipeline.stage_changed')).toBe('pipeline_stage_changed');
    expect(slugifyEventName('evo_flow:message.delivered')).toBe('evo_flow_message_delivered');
    expect(slugifyEventName('Message Sent')).toBe('message_sent');
  });
});

describe('ContactEventCard', () => {
  it('renders no enrichment badges when enriched is undefined', () => {
    render(<ContactEventCard event={makeEvent({ enriched: undefined })} />);
    expect(screen.queryByText(/events\.card\.enriched\./)).not.toBeInTheDocument();
  });

  it('renders one badge for a single enriched field', () => {
    render(<ContactEventCard event={makeEvent({ enriched: { channel_label: 'WhatsApp' } })} />);
    expect(screen.getByText(/events\.card\.enriched\.channel\|WhatsApp/)).toBeInTheDocument();
    expect(screen.queryByText(/events\.card\.enriched\.campaign/)).not.toBeInTheDocument();
    expect(screen.queryByText(/events\.card\.enriched\.agent/)).not.toBeInTheDocument();
  });

  it('renders three badges when all enriched fields are present', () => {
    render(
      <ContactEventCard
        event={makeEvent({
          enriched: {
            campaign_name: 'Spring Sale',
            channel_label: 'WhatsApp',
            agent_name: 'Alice',
          },
        })}
      />,
    );
    expect(screen.getByText(/channel\|WhatsApp/)).toBeInTheDocument();
    expect(screen.getByText(/campaign\|Spring Sale/)).toBeInTheDocument();
    expect(screen.getByText(/agent\|Alice/)).toBeInTheDocument();
  });

  it('renders event_name with dots through the defaultValue path (no nested-key crash)', () => {
    render(<ContactEventCard event={makeEvent({ eventName: 'pipeline.stage_changed' })} />);
    expect(screen.getByText('pipeline.stage_changed')).toBeInTheDocument();
  });

  it('escapes event_name containing HTML — no live <script> in the DOM', () => {
    const payload = '<script>alert(1)</script>';
    const { container } = render(<ContactEventCard event={makeEvent({ eventName: payload })} />);
    expect(container.querySelector('script')).toBeNull();
    // React escapes — the text node should contain the literal characters.
    expect(container.innerHTML).toContain('&lt;script&gt;');
  });

  it('toggles aria-expanded on the details button', async () => {
    const user = userEvent.setup();
    render(<ContactEventCard event={makeEvent()} />);
    const button = screen.getByRole('button', { name: /events\.card\.(expand|collapse)/ });
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('hides properties until expanded, then shows redacted JSON', async () => {
    const user = userEvent.setup();
    render(
      <ContactEventCard
        event={makeEvent({
          properties: {
            password: 'leak-me',
            email: 'a@b.com',
            user: { Password: 'nested-leak', name: 'Bob' },
            tokens: ['t1', 't2'],
          },
        })}
      />,
    );

    expect(screen.queryByText(/leak-me/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /events\.card\.expand/ }));
    const pre = await screen.findByText((_, node) => node?.tagName.toLowerCase() === 'pre');
    const text = pre.textContent ?? '';

    expect(text).not.toContain('leak-me');
    expect(text).not.toContain('nested-leak');
    expect(text).toContain('a@b.com');
    expect(text).toContain('Bob');
    expect(text).toContain('"***"');
    // tokens array is redacted as a single value (not per-element)
    expect(text).not.toContain('t1');
  });

  it('exposes aria-controls linking the button to the expanded properties region', async () => {
    const user = userEvent.setup();
    render(<ContactEventCard event={makeEvent({ properties: { foo: 'bar' } })} />);
    const button = screen.getByRole('button', { name: /events\.card\.expand/ });
    const controls = button.getAttribute('aria-controls');
    expect(controls).toBeTruthy();

    await user.click(button);
    // The id lives on the wrapper region (it can hold properties, traits and the
    // empty-state message), with the <pre> nested inside it.
    const region = document.getElementById(controls!);
    expect(region).not.toBeNull();
    const pre = await screen.findByText((_, node) => node?.tagName.toLowerCase() === 'pre');
    expect(region!.contains(pre)).toBe(true);
    expect(within(region!).getByText(/foo/)).toBeInTheDocument();
  });
});
