import { describe, it, expect } from 'vitest';
import { isBalancedExpression } from './templateVariables';

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
