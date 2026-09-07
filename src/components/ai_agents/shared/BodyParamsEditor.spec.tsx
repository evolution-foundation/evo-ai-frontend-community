import i18n from '@/i18n/config';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BodyParamsEditor from './BodyParamsEditor';
import { coerceBodyParam, normalizeBodyParams } from './bodyParamSchema';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('coerceBodyParam', () => {
  it('keeps a valid schema object', () => {
    expect(
      coerceBodyParam({ type: 'number', required: false, description: 'age' }),
    ).toEqual({ type: 'number', required: false, description: 'age' });
  });

  it('repairs a legacy string into a required string schema', () => {
    expect(coerceBodyParam('{query}')).toEqual({
      type: 'string',
      required: true,
      description: '',
    });
  });

  it('falls back on an unknown type', () => {
    expect(coerceBodyParam({ type: 'weird' })).toEqual({
      type: 'string',
      required: true,
      description: '',
    });
  });
});

describe('normalizeBodyParams', () => {
  it('coerces every entry and handles nullish input', () => {
    expect(normalizeBodyParams(undefined)).toEqual({});
    expect(
      normalizeBodyParams({
        a: '{x}',
        b: { type: 'boolean', required: false, description: 'flag' },
      }),
    ).toEqual({
      a: { type: 'string', required: true, description: '' },
      b: { type: 'boolean', required: false, description: 'flag' },
    });
  });
});

describe('BodyParamsEditor', () => {
  it('serializes a new row to the object schema shape', () => {
    const onChange = vi.fn();
    render(
      <BodyParamsEditor value={{}} onChange={onChange} label="Body" />,
    );
    fireEvent.click(screen.getByText(i18n.t('customTools:form.fields.bodyParams.addParam')));
    const nameInput = screen.getByLabelText('Body name');
    fireEvent.change(nameInput, { target: { value: 'queryText' } });

    const last = onChange.mock.calls.at(-1)![0];
    expect(last).toEqual({
      queryText: { type: 'string', required: true, description: '' },
    });
  });

  it('reads an existing schema back into rows', () => {
    render(
      <BodyParamsEditor
        value={{
          queryText: { type: 'string', required: true, description: 'the query' },
        }}
        onChange={vi.fn()}
        label="Body"
      />,
    );
    expect((screen.getByLabelText('Body name') as HTMLInputElement).value).toBe(
      'queryText',
    );
    expect(
      (screen.getByLabelText('Body description') as HTMLInputElement).value,
    ).toBe('the query');
  });

  it('flags a filled row whose name is blank instead of dropping it silently', () => {
    const onChange = vi.fn();
    render(<BodyParamsEditor value={{}} onChange={onChange} label="Body" />);
    fireEvent.click(screen.getByText(i18n.t('customTools:form.fields.bodyParams.addParam')));
    fireEvent.change(screen.getByLabelText('Body description'), {
      target: { value: 'the search query' },
    });

    expect(onChange.mock.calls.at(-1)![0]).toEqual({});
    expect(screen.getByText(i18n.t('customTools:keyValueEditor.errors.emptyKey'))).toBeTruthy();
  });

  it('leaves an untouched new row alone', () => {
    render(<BodyParamsEditor value={{}} onChange={vi.fn()} label="Body" />);
    fireEvent.click(screen.getByText(i18n.t('customTools:form.fields.bodyParams.addParam')));

    expect(screen.queryByText(i18n.t('customTools:keyValueEditor.errors.emptyKey'))).toBeNull();
  });

  it('coerces a legacy string value on load', () => {
    render(
      <BodyParamsEditor
        value={{ queryText: '{query}' }}
        onChange={vi.fn()}
        label="Body"
      />,
    );
    expect((screen.getByLabelText('Body name') as HTMLInputElement).value).toBe(
      'queryText',
    );
    expect(
      (screen.getByLabelText('Body description') as HTMLInputElement).value,
    ).toBe('');
  });
});
