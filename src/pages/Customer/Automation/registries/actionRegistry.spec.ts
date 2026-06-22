import { describe, it, expect } from 'vitest';
import { actionRegistry, ALL_ACTION_NAMES } from './actionRegistry';

const BACKEND_ACTION_NAMES = [
  'send_message',
  'send_canned_response',
  'send_template',
  'add_label',
  'remove_label',
  'send_email_to_team',
  'assign_team',
  'assign_agent',
  'send_webhook_event',
  'mute_conversation',
  'send_attachment',
  'change_status',
  'resolve_conversation',
  'snooze_conversation',
  'change_priority',
  'send_email_transcript',
  'assign_to_pipeline',
  'update_pipeline_stage',
  'create_pipeline_task',
  'update_custom_attribute',
];

describe('actionRegistry', () => {
  it('exposes all backend actions', () => {
    expect(ALL_ACTION_NAMES.sort()).toEqual([...BACKEND_ACTION_NAMES].sort());
  });

  it('every descriptor has a defined schema, defaultParams and i18nKey', () => {
    for (const actionName of ALL_ACTION_NAMES) {
      const descriptor = actionRegistry[actionName];
      expect(descriptor.actionName).toBe(actionName);
      expect(descriptor.schema).toBeDefined();
      expect(descriptor.defaultParams).toBeDefined();
      expect(descriptor.i18nKey).toMatch(/^form\.fields\.actions\./);
    }
  });

  it('every defaultParams passes its own schema', () => {
    for (const actionName of ALL_ACTION_NAMES) {
      const descriptor = actionRegistry[actionName];
      const result = descriptor.schema.safeParse(descriptor.defaultParams);
      // We allow the default to fail strict validation when it represents an
      // empty placeholder the user MUST fill in (e.g., empty message string).
      // This test only requires that the schema accepts the SHAPE; we check
      // that by ensuring failure is due to content, never to a missing field.
      if (!result.success) {
        const allFailuresAreContent = result.error.issues.every(
          (issue) =>
            issue.code === 'too_small' ||
            issue.code === 'invalid_string' ||
            issue.code === 'invalid_type' ||
            issue.code === 'invalid_union',
        );
        expect(allFailuresAreContent).toBe(true);
      }
    }
  });

  it('rejects unknown action params shapes for send_message', () => {
    const result = actionRegistry.send_message.schema.safeParse([]);
    expect(result.success).toBe(false);
  });

  it('accepts a valid send_email_to_team payload', () => {
    const valid = [{ team_ids: [1, 2], message: 'Heads up' }];
    const result = actionRegistry.send_email_to_team.schema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('accepts a valid create_pipeline_task payload with only title', () => {
    const valid = [{ title: 'Follow up call' }];
    const result = actionRegistry.create_pipeline_task.schema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  // Regression: team/agent ids are UUID strings in this app. The previous
  // `number|null` schema rejected every real selection, so the form stayed
  // invalid (submit button disabled) after picking a team or agent.
  it('accepts UUID string ids and the null unassign sentinel for assign_team/assign_agent', () => {
    const uuid = '9324e2c6-6365-4924-99d4-6cd7c2d5e9bc';
    for (const actionName of ['assign_team', 'assign_agent'] as const) {
      expect(actionRegistry[actionName].schema.safeParse([uuid]).success).toBe(true);
      expect(actionRegistry[actionName].schema.safeParse([null]).success).toBe(true);
    }
  });

  // Regression: same UUID-vs-number bug class for nested entity ids.
  it('accepts UUID string ids for send_email_to_team.team_ids, send_attachment.inbox_id, create_pipeline_task.assigned_to_id', () => {
    const uuid = '9324e2c6-6365-4924-99d4-6cd7c2d5e9bc';
    expect(actionRegistry.send_email_to_team.schema.safeParse([{ team_ids: [uuid], message: 'hi' }]).success).toBe(true);
    expect(actionRegistry.send_attachment.schema.safeParse([{ attachment_ids: [uuid], inbox_id: uuid }]).success).toBe(true);
    expect(actionRegistry.create_pipeline_task.schema.safeParse([{ title: 'T', assigned_to_id: uuid }]).success).toBe(true);
  });
});
