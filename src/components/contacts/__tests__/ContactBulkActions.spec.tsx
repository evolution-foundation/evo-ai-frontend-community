import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContactBulkLabelsModal from '../ContactBulkLabelsModal';
import ContactBulkAttributeModal from '../ContactBulkAttributeModal';
import ContactsHeader from '../ContactsHeader';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

const mockGetCustomAttributes = vi.fn();
vi.mock('@/services/customAttributes/customAttributesService', () => ({
  customAttributesService: {
    getCustomAttributes: (...args: unknown[]) => mockGetCustomAttributes(...args),
  },
}));

let granted: string[] = [];
vi.mock('@/contexts/PermissionsContext', () => ({
  usePermissions: () => ({
    can: (resource: string, action: string) => granted.includes(`${resource}.${action}`),
    isReady: true,
    loading: false,
  }),
}));

describe('ContactBulkLabelsModal', () => {
  it('sends the chosen labels with the add action by default', () => {
    const onConfirm = vi.fn();
    render(
      <ContactBulkLabelsModal
        open
        onOpenChange={vi.fn()}
        selectedCount={2}
        availableLabels={['vip', 'lead']}
        onConfirm={onConfirm}
        loading={false}
      />,
    );

    const apply = screen.getByRole('button', { name: 'dialog.bulkLabels.apply' });
    expect(apply).toBeDisabled();

    fireEvent.click(screen.getByLabelText('lead'));
    fireEvent.click(apply);

    expect(onConfirm).toHaveBeenCalledWith('add_labels', ['lead']);
  });

  it('sends the remove action when it is chosen', () => {
    const onConfirm = vi.fn();
    render(
      <ContactBulkLabelsModal
        open
        onOpenChange={vi.fn()}
        selectedCount={2}
        availableLabels={['vip', 'lead']}
        onConfirm={onConfirm}
        loading={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'dialog.bulkLabels.remove' }));
    fireEvent.click(screen.getByLabelText('vip'));
    fireEvent.click(screen.getByLabelText('lead'));
    fireEvent.click(screen.getByRole('button', { name: 'dialog.bulkLabels.apply' }));

    expect(onConfirm).toHaveBeenCalledWith('remove_labels', ['vip', 'lead']);
  });
});

describe('ContactBulkAttributeModal', () => {
  const renderModal = (onConfirm = vi.fn()) => {
    render(
      <ContactBulkAttributeModal open onOpenChange={vi.fn()} selectedCount={3} onConfirm={onConfirm} loading={false} />,
    );
    return onConfirm;
  };

  beforeEach(() => {
    mockGetCustomAttributes.mockResolvedValue({
      data: [
        { attribute_key: 'vip', attribute_display_name: 'VIP', attribute_display_type: 'checkbox' },
        { attribute_key: 'tier', attribute_display_name: 'Tier', attribute_display_type: 'list', attribute_values: ['gold', 'silver'] },
      ],
    });
  });

  it('writes a defined checkbox attribute as a boolean', async () => {
    const onConfirm = renderModal();
    await waitFor(() => expect(mockGetCustomAttributes).toHaveBeenCalledWith('contact_attribute'));

    fireEvent.change(screen.getByLabelText('dialog.bulkAttribute.key'), { target: { value: 'vip' } });
    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'dialog.bulkAttribute.apply' }));

    expect(onConfirm).toHaveBeenCalledWith('vip', true);
  });

  it('offers only the values of a defined list attribute', async () => {
    const onConfirm = renderModal();
    fireEvent.change(screen.getByLabelText('dialog.bulkAttribute.key'), { target: { value: 'tier' } });

    await waitFor(() => expect(screen.getByLabelText('dialog.bulkAttribute.value').tagName).toBe('SELECT'));
    const select = screen.getByLabelText('dialog.bulkAttribute.value');
    expect(Array.from((select as HTMLSelectElement).options).map(option => option.value)).toEqual(['', 'gold', 'silver']);
    fireEvent.change(select, { target: { value: 'silver' } });
    fireEvent.click(screen.getByRole('button', { name: 'dialog.bulkAttribute.apply' }));

    expect(onConfirm).toHaveBeenCalledWith('tier', 'silver');
  });

  it('needs a key and a value, and sends them trimmed', () => {
    const onConfirm = vi.fn();
    render(
      <ContactBulkAttributeModal open onOpenChange={vi.fn()} selectedCount={3} onConfirm={onConfirm} loading={false} />,
    );

    const apply = screen.getByRole('button', { name: 'dialog.bulkAttribute.apply' });
    fireEvent.change(screen.getByLabelText('dialog.bulkAttribute.key'), { target: { value: ' plan ' } });
    expect(apply).toBeDisabled();

    fireEvent.change(screen.getByLabelText('dialog.bulkAttribute.value'), { target: { value: ' gold ' } });
    fireEvent.click(apply);

    expect(onConfirm).toHaveBeenCalledWith('plan', 'gold');
  });
});

describe('ContactsHeader bulk actions', () => {
  const renderHeader = () =>
    render(
      <ContactsHeader
        totalCount={5}
        selectedCount={2}
        searchValue=""
        onSearchChange={vi.fn()}
        onNewContact={vi.fn()}
        onImport={vi.fn()}
        onExport={vi.fn()}
        onFilter={vi.fn()}
        onBulkDelete={vi.fn()}
        onBulkLabels={vi.fn()}
        onBulkAttribute={vi.fn()}
        onMergeContacts={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    );

  beforeEach(() => {
    granted = [];
  });

  it('offers labels and attribute to whoever can update contacts', () => {
    granted = ['contacts.update'];
    renderHeader();

    expect(screen.getByRole('button', { name: /header\.bulkLabels/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /header\.bulkAttribute/ })).toBeInTheDocument();
  });

  it('hides them without contacts.update', () => {
    granted = ['contacts.read', 'contacts.delete'];
    renderHeader();

    expect(screen.queryByRole('button', { name: /header\.bulkLabels/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /header\.bulkAttribute/ })).not.toBeInTheDocument();
  });
});
