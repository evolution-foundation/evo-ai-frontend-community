import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CustomAttributesForm from './CustomAttributesForm';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const mockGetCustomAttributes = vi.fn();
vi.mock('@/services/customAttributes/customAttributesService', () => ({
  customAttributesService: {
    getCustomAttributes: (...args: unknown[]) => mockGetCustomAttributes(...args),
  },
}));

// CRM-166: a 403 on the definitions endpoint was swallowed and rendered as "no
// attributes". The paired empty-catalog cases keep the failure assertions honest —
// a panel rendered unconditionally would satisfy them too.
describe('CustomAttributesForm — load failure is not "no attributes" (CRM-166)', () => {
  const definition = {
    id: 'def-1',
    attribute_display_name: 'Plano contratado',
    attribute_key: 'plano_contratado',
    attribute_display_type: 'text',
    attribute_model: 'contact_attribute',
    attribute_description: null,
  };

  const definitions = (data: unknown[]) => ({ data, meta: {} });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('editable mode (contact sidebar)', () => {
    const renderEditable = () =>
      render(
        <CustomAttributesForm
          attributeModel="contact_attribute"
          attributes={{ plano_contratado: 'Pro' }}
          mode="editable"
          onUpdateAttributes={vi.fn()}
        />,
      );

    it('reports the failure instead of the empty state when the definitions do not load', async () => {
      mockGetCustomAttributes.mockRejectedValue(new Error('Request failed with status code 403'));

      renderEditable();

      await waitFor(() => {
        expect(screen.getByTestId('custom-attributes-load-failed')).toBeInTheDocument();
      });
      expect(
        screen.queryByText('contactSidebar.customAttributes.noAttributes'),
      ).not.toBeInTheDocument();
    });

    it('asks for the three loadFailed keys', async () => {
      mockGetCustomAttributes.mockRejectedValue(new Error('Request failed with status code 403'));

      renderEditable();

      const panel = await screen.findByTestId('custom-attributes-load-failed');
      expect(within(panel).getByText('customAttributes.loadFailed.title')).toBeInTheDocument();
      expect(within(panel).getByText('customAttributes.loadFailed.description')).toBeInTheDocument();
      expect(
        within(panel).getByRole('button', { name: 'customAttributes.loadFailed.retry' }),
      ).toBeInTheDocument();
    });

    it('still reports a genuinely empty catalog as the empty state', async () => {
      mockGetCustomAttributes.mockResolvedValue(definitions([]));

      renderEditable();

      await waitFor(() => {
        expect(
          screen.getByText('contactSidebar.customAttributes.noAttributes'),
        ).toBeInTheDocument();
      });
      expect(screen.queryByTestId('custom-attributes-load-failed')).not.toBeInTheDocument();
    });

    it('retries the load and renders the attributes once the request succeeds', async () => {
      mockGetCustomAttributes
        .mockRejectedValueOnce(new Error('Request failed with status code 403'))
        .mockResolvedValueOnce(definitions([definition]));

      renderEditable();

      await waitFor(() => {
        expect(screen.getByTestId('custom-attributes-load-failed')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: 'customAttributes.loadFailed.retry' }));

      await waitFor(() => {
        expect(screen.getByText('Plano contratado')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('custom-attributes-load-failed')).not.toBeInTheDocument();
      expect(mockGetCustomAttributes).toHaveBeenCalledTimes(2);
    });
  });

  describe('form mode (contact edit form)', () => {
    const renderForm = (attributes: Record<string, unknown> = {}) =>
      render(
        <CustomAttributesForm
          attributeModel="contact_attribute"
          attributes={attributes}
          mode="form"
          onAttributesChange={vi.fn()}
        />,
      );

    it('reports the failure instead of the "no attributes registered" empty state', async () => {
      mockGetCustomAttributes.mockRejectedValue(new Error('Request failed with status code 403'));

      renderForm();

      await waitFor(() => {
        expect(screen.getByTestId('custom-attributes-load-failed')).toBeInTheDocument();
      });
      expect(screen.queryByText('empty.title')).not.toBeInTheDocument();
    });

    it('asks for the three loadFailed keys', async () => {
      mockGetCustomAttributes.mockRejectedValue(new Error('Request failed with status code 403'));

      renderForm();

      const panel = await screen.findByTestId('custom-attributes-load-failed');
      expect(within(panel).getByText('customAttributes.loadFailed.title')).toBeInTheDocument();
      expect(within(panel).getByText('customAttributes.loadFailed.description')).toBeInTheDocument();
      expect(
        within(panel).getByRole('button', { name: 'customAttributes.loadFailed.retry' }),
      ).toBeInTheDocument();
    });

    it('still shows the empty state when the catalog really is empty', async () => {
      mockGetCustomAttributes.mockResolvedValue(definitions([]));

      renderForm();

      await waitFor(() => {
        expect(screen.getByText('empty.title')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('custom-attributes-load-failed')).not.toBeInTheDocument();
    });

    // The edit form kept working through the bug because values with no definition
    // fall through to the ad-hoc section, which the failure panel must not replace.
    it('keeps rendering the ad-hoc values while the definitions are unavailable', async () => {
      mockGetCustomAttributes.mockRejectedValue(new Error('Request failed with status code 403'));

      renderForm({ plano_contratado: 'Pro' });

      await waitFor(() => {
        expect(screen.getByTestId('custom-attributes-load-failed')).toBeInTheDocument();
      });
      expect(screen.getByText('plano_contratado')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Pro')).toBeInTheDocument();
    });

    // Every control here renders inside ContactForm's <form>, and the design-system
    // Button sets no `type` — the HTML default is submit. Reached via the empty state,
    // the one path where the definitions loaded fine, so it is not a failure-mode case.
    it('does not submit the surrounding form when opening the add-attribute form', async () => {
      mockGetCustomAttributes.mockResolvedValue(definitions([]));
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

      render(
        <form onSubmit={onSubmit}>
          <CustomAttributesForm
            attributeModel="contact_attribute"
            attributes={{}}
            mode="form"
            onAttributesChange={vi.fn()}
          />
        </form>,
      );

      await userEvent.click(await screen.findByRole('button', { name: /actions.addAttribute/ }));

      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByText('sections.newAttribute')).toBeInTheDocument();
    });

    // Needs the surrounding <form>: rendered standalone the component satisfies every
    // case above even while the retry is submitting ContactForm instead of refetching.
    it('does not submit the surrounding form when retrying', async () => {
      mockGetCustomAttributes.mockRejectedValue(new Error('Request failed with status code 403'));
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

      render(
        <form onSubmit={onSubmit}>
          <CustomAttributesForm
            attributeModel="contact_attribute"
            attributes={{}}
            mode="form"
            onAttributesChange={vi.fn()}
          />
        </form>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('custom-attributes-load-failed')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: 'customAttributes.loadFailed.retry' }));

      expect(onSubmit).not.toHaveBeenCalled();
      expect(mockGetCustomAttributes).toHaveBeenCalledTimes(2);
    });

    // The remaining ad-hoc controls, same reason as the two cases above: each is a
    // design-system Button inside ContactForm's <form>. Remove is icon-only, so it is
    // located by having no accessible name.
    it('does not submit the surrounding form from the remove, cancel or add controls', async () => {
      mockGetCustomAttributes.mockResolvedValue(definitions([]));
      const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

      render(
        <form onSubmit={onSubmit}>
          <CustomAttributesForm
            attributeModel="contact_attribute"
            attributes={{ plano_contratado: 'Pro' }}
            mode="form"
            onAttributesChange={vi.fn()}
          />
        </form>,
      );

      await screen.findByText('plano_contratado');
      const remove = screen.getAllByRole('button').find(button => button.textContent === '');
      await userEvent.click(remove as HTMLElement);

      await userEvent.click(screen.getByRole('button', { name: /actions.addAttribute/ }));
      await userEvent.click(screen.getByRole('button', { name: /actions.cancel/ }));

      await userEvent.click(screen.getByRole('button', { name: /actions.addAttribute/ }));
      await userEvent.type(screen.getByPlaceholderText('fields.attributeKey.placeholder'), 'plano');
      const values = screen.getAllByPlaceholderText('fields.attributeValue.placeholder');
      await userEvent.type(values[values.length - 1], 'Pro');
      await userEvent.click(screen.getByRole('button', { name: /^actions.add$/ }));

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  // The design-system Button sets no `type`, so the HTML default (submit) applies and
  // no `<form>` in the test tree is needed to catch a regression. Asserted per mode
  // because each renders a disjoint set of controls.
  describe('every button opts out of submit', () => {
    it('form mode, ad-hoc section and add form', async () => {
      mockGetCustomAttributes.mockResolvedValue(definitions([]));

      render(
        <CustomAttributesForm
          attributeModel="contact_attribute"
          attributes={{ plano_contratado: 'Pro' }}
          mode="form"
          onAttributesChange={vi.fn()}
        />,
      );

      await userEvent.click(await screen.findByRole('button', { name: /actions.addAttribute/ }));

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(2);
      buttons.forEach(button => expect(button).toHaveAttribute('type', 'button'));
    });

    it('editable mode, including the inline edit controls', async () => {
      mockGetCustomAttributes.mockResolvedValue(definitions([definition]));

      render(
        <CustomAttributesForm
          attributeModel="contact_attribute"
          attributes={{ plano_contratado: 'Pro' }}
          mode="editable"
          onUpdateAttributes={vi.fn()}
        />,
      );

      await screen.findByText('Plano contratado');
      await userEvent.click(screen.getAllByRole('button')[0]);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(1);
      buttons.forEach(button => expect(button).toHaveAttribute('type', 'button'));
    });
  });
});
