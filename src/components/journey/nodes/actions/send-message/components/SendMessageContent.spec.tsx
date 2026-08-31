import type { ChangeEventHandler } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { SendMessageContent } from './SendMessageContent';
import type { MessageTemplate } from '@/types/channels/inbox';

beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

vi.mock('@/components/journey/environment-manager', () => ({
  VariableTextarea: ({
    value,
    onChange,
    placeholder,
    id,
  }: {
    value?: string;
    onChange?: ChangeEventHandler<HTMLTextAreaElement>;
    placeholder?: string;
    id?: string;
  }) => <textarea id={id} value={value} onChange={onChange} placeholder={placeholder} />,
}));

const baseProps = {
  isTemplateMode: false,
  journeyId: 'journey-1',
  loading: false,
  inboxId: '1',
  templates: [] as MessageTemplate[],
  loadingTemplates: false,
  templateId: '',
  selectedTemplate: undefined,
  onTemplateChange: vi.fn(),
  getVariableMapping: vi.fn(),
  onVariableMappingChange: vi.fn(),
  onVariableSourceChange: vi.fn(),
  message: '',
  onMessageChange: vi.fn(),
  characterCount: 0,
  characterCountColor: 'text-muted-foreground',
};

describe('SendMessageContent — text mode', () => {
  it('renders the message field bound to the given value and forwards edits', async () => {
    const onMessageChange = vi.fn();
    const user = userEvent.setup();

    render(
      <SendMessageContent {...baseProps} message="hi" onMessageChange={onMessageChange} />,
    );

    const field = screen.getByLabelText('panels.sendMessage.message') as HTMLTextAreaElement;
    expect(field.value).toBe('hi');

    await user.type(field, '!');
    expect(onMessageChange).toHaveBeenCalled();
  });

  it('does not render template UI in text mode', () => {
    render(<SendMessageContent {...baseProps} />);
    expect(screen.queryByText('panels.sendMessage.template')).toBeNull();
  });
});

describe('SendMessageContent — template mode', () => {
  const template: MessageTemplate = {
    id: 't1',
    name: 'Welcome',
    language: 'en',
    content: 'Hello {{1}}',
    variables: [{ name: 'name', label: 'Name', required: true }],
  } as unknown as MessageTemplate;

  it('shows the required-variable mapping row for the selected template', () => {
    const getVariableMapping = vi.fn().mockReturnValue({ variable: 'name', source: 'fixed', value: '' });

    render(
      <SendMessageContent
        {...baseProps}
        isTemplateMode
        templates={[template]}
        templateId="t1"
        selectedTemplate={template}
        getVariableMapping={getVariableMapping}
      />,
    );

    expect(screen.getByText('Name')).toBeTruthy();
    expect(getVariableMapping).toHaveBeenCalledWith('name');
  });

  it('forwards a fixed-value edit for a template variable', async () => {
    const onVariableMappingChange = vi.fn();
    const user = userEvent.setup();

    render(
      <SendMessageContent
        {...baseProps}
        isTemplateMode
        templates={[template]}
        templateId="t1"
        selectedTemplate={template}
        getVariableMapping={() => ({ variable: 'name', source: 'fixed', value: '' })}
        onVariableMappingChange={onVariableMappingChange}
      />,
    );

    const fixedValueInput = screen.getByPlaceholderText('name');
    await user.type(fixedValueInput, 'x');

    expect(onVariableMappingChange).toHaveBeenCalledWith('name', { value: expect.any(String) });
  });
});
