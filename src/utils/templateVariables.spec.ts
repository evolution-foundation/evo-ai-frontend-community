import { describe, it, expect } from 'vitest';
import {
  isBalancedExpression,
  detectTemplateFormVariables,
  extractTemplateFormVariables,
} from './templateVariables';
import type { TemplateFormData } from '@/types/channels/inbox';

// EVO-1267 AC3: basic syntax gate for custom variable expressions.
describe('isBalancedExpression', () => {
  it('accepts plain text and balanced placeholders', () => {
    expect(isBalancedExpression('hello')).toBe(true);
    expect(isBalancedExpression('{{contact.name}}')).toBe(true);
    expect(isBalancedExpression('{{contact.name}} ({{pipeline.pipeline_stage.name}})')).toBe(true);
  });

  it('rejects unbalanced braces', () => {
    expect(isBalancedExpression('{{contact.name}')).toBe(false);
    expect(isBalancedExpression('{{contact.name')).toBe(false);
    expect(isBalancedExpression('contact.name}}')).toBe(false);
  });

  it('rejects unbalanced parentheses', () => {
    expect(isBalancedExpression('({{contact.name}}')).toBe(false);
    expect(isBalancedExpression('{{contact.name}})')).toBe(false);
  });

  it('rejects closers appearing before openers', () => {
    expect(isBalancedExpression(')(')).toBe(false);
    expect(isBalancedExpression('}{')).toBe(false);
  });
});

// EVO-1971: the two form-variable helpers diverge on purpose — `detect` is
// text-only (drives the live UI without accumulating stale rows) while `extract`
// re-attaches the declared metadata that the backend persists.
describe('template form variable helpers', () => {
  const form = (over: Partial<TemplateFormData>): TemplateFormData => ({
    name: 't',
    content: '',
    language: 'pt_BR',
    headerFormat: 'NONE',
    headerText: '',
    bodyText: '',
    footerText: '',
    buttons: [],
    ...over,
  });

  it('detectTemplateFormVariables is driven only by the current text', () => {
    const fd = form({
      bodyText: 'Oi {{nome}} de {{cidade}}',
      // A declared-but-no-longer-present variable must NOT resurface.
      variables: [{ name: 'antigo', example: 'x' }],
    });
    expect(detectTemplateFormVariables(fd).map(v => v.name)).toEqual(['nome', 'cidade']);
  });

  it('extractTemplateFormVariables preserves declared label/example/source for live tokens', () => {
    const fd = form({
      bodyText: 'Oi {{nome}}',
      variables: [{ name: 'nome', label: 'Nome', example: 'Maria', source: 'contact.name' }],
    });
    const nome = extractTemplateFormVariables(fd).find(v => v.name === 'nome');
    expect(nome).toMatchObject({ label: 'Nome', example: 'Maria', source: 'contact.name' });
  });
});
