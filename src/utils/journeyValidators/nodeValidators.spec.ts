import { describe, it, expect } from 'vitest';
import { validateNodeConfig } from './nodeValidators';

describe('validateNodeConfig (EVO-1744)', () => {
  it('errors when send-message has no inbox', () => {
    const issues = validateNodeConfig('send-message-node', { message: 'hi' });
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].params?.fields).toContain('inboxId');
  });

  it('passes a configured send-message (free text)', () => {
    expect(
      validateNodeConfig('send-message-node', { inboxId: 'i', message: 'hi' }),
    ).toEqual([]);
  });

  it('requires templateName in template mode', () => {
    const issues = validateNodeConfig('send-message-node', {
      inboxId: 'i',
      messageMode: 'template',
    });
    expect(issues[0].params?.fields).toContain('templateName');
  });

  it('errors when a conditional node has no paths (its only gate)', () => {
    expect(validateNodeConfig('conditional-node', {})).toHaveLength(1);
    expect(validateNodeConfig('conditional-node', { paths: [{}] })).toEqual([]);
  });

  it('treats blank strings as missing', () => {
    expect(validateNodeConfig('add-label-node', { labelId: '   ' })).toHaveLength(1);
    expect(validateNodeConfig('add-label-node', { labelId: 'l1' })).toEqual([]);
  });

  it('returns no issues for an unregistered / config-free node type', () => {
    expect(validateNodeConfig('mute-conversation-node', {})).toEqual([]);
    expect(validateNodeConfig('exit-journey-node', {})).toEqual([]);
    expect(validateNodeConfig(undefined, undefined)).toEqual([]);
  });

  it('requires both ids for move-to-pipeline-stage', () => {
    const issues = validateNodeConfig('move-to-pipeline-stage-node', {
      pipeline_id: 'p1',
    });
    expect(issues[0].params?.fields).toBe('stage_id');
  });

  // EVO-1905: validate attributeName (the attribute_key the executor reads),
  // not the UI-only attributeId.
  it('requires attributeName, not attributeId, for update-custom-attribute', () => {
    // attributeId present but attributeName missing must still fail.
    const onlyId = validateNodeConfig('update-custom-attribute-node', {
      attributeId: 'a1',
      newValue: 'x',
    });
    expect(onlyId).toHaveLength(1);
    expect(onlyId[0].params?.fields).toBe('attributeName');

    // attributeName + newValue is enough; attributeId is irrelevant.
    expect(
      validateNodeConfig('update-custom-attribute-node', {
        attributeName: 'plan',
        newValue: 'pro',
      }),
    ).toEqual([]);
  });
});
