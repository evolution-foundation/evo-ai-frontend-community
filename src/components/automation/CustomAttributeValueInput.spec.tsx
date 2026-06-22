import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CustomAttributeValueInput from './CustomAttributeValueInput';
import { actionRegistry } from '@/pages/Customer/Automation/registries/actionRegistry';
import type { CustomAttributeDefinition } from '@/types/settings';

class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverPolyfill as never);

const attr = (overrides: Partial<CustomAttributeDefinition>): CustomAttributeDefinition => ({
  id: '1',
  attribute_display_name: 'Attr',
  attribute_display_type: 'text',
  attribute_key: 'attr',
  attribute_model: 'contact_attribute',
  created_at: '',
  updated_at: '',
  ...overrides,
});

describe('CustomAttributeValueInput', () => {
  it('renders a text input for text attributes', () => {
    const { container } = render(
      <CustomAttributeValueInput attribute={attr({ attribute_display_type: 'text' })} value="hi" onChange={() => {}} />,
    );
    const input = container.querySelector('input');
    expect(input?.type).toBe('text');
    expect(input?.value).toBe('hi');
  });

  it('renders a number input for numeric attributes', () => {
    const { container } = render(
      <CustomAttributeValueInput attribute={attr({ attribute_display_type: 'currency' })} value="" onChange={() => {}} />,
    );
    expect(container.querySelector('input')?.type).toBe('number');
  });

  it('renders a date input for date attributes', () => {
    const { container } = render(
      <CustomAttributeValueInput attribute={attr({ attribute_display_type: 'date' })} value="" onChange={() => {}} />,
    );
    expect(container.querySelector('input')?.type).toBe('date');
  });

  it('renders a checkbox and emits string booleans', () => {
    const onChange = vi.fn();
    render(
      <CustomAttributeValueInput
        attribute={attr({ attribute_display_type: 'checkbox' })}
        value="false"
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith('true');
  });
});

describe('update_custom_attribute action schema', () => {
  const schema = actionRegistry.update_custom_attribute.schema;

  it('accepts a key + model with an empty value (empty = set empty)', () => {
    expect(
      schema.safeParse([
        { custom_attribute_key: 'cpf', custom_attribute_model: 'contact_attribute', custom_attribute_value: '' },
      ]).success,
    ).toBe(true);
  });

  it('rejects an empty attribute key', () => {
    expect(
      schema.safeParse([
        { custom_attribute_key: '', custom_attribute_model: 'contact_attribute', custom_attribute_value: 'x' },
      ]).success,
    ).toBe(false);
  });
});
