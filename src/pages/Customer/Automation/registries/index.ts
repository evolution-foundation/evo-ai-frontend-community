import { z } from 'zod';
import type { AutomationEventType, AutomationActionType } from '@/types/automation';
import { actionRegistry } from './actionRegistry';

export * from './conditionTypeRegistry';
export * from './conditionAttributeRegistry';
export * from './actionRegistry';

// Authoritative trigger list for the CRM automation engine (snake_case, its
// own domain — distinct from evo-flow's EvoFlow::EVENT_NAMES). This stays the
// source of truth for the option set AND the Zod enum below; it is NOT replaced
// by the events manifest (EVO-1263 Open Risk: events like conversation_opened /
// pipeline_stage_updated have no canonical evo-flow equivalent and dropping
// them would break real automations). DISPLAY labels for the events that DO
// have a canonical equivalent are sourced from the manifest in
// components/automation/EventSelector.tsx (getEventLabel + resolveLegacyEventName).
const automationEventNames = [
  'conversation_created',
  'conversation_updated',
  'conversation_opened',
  'message_created',
  'pipeline_stage_updated',
  'contact_created',
  'contact_updated',
] as const satisfies readonly AutomationEventType[];

const valuesArraySchema = z.array(z.union([z.string(), z.number()]));

// attribute_changed uses a structured payload: { from: [...], to: [...] }.
// Other operators keep the flat array shape.
export const fromToValuesSchema = z.object({
  from: valuesArraySchema,
  to: valuesArraySchema,
});

const valuesUnionSchema = z.union([valuesArraySchema, fromToValuesSchema]);

// Single base schema with a superRefine that branches the shape of `values`
// by `filter_operator`. Using z.union of two full object schemas (previous
// approach) made Zod accumulate errors from both branches on a single
// failure, producing confusing messages like "Expected object" alongside the
// real cause. With superRefine the user gets ONE coherent message.
const conditionSchema = z
  .object({
    attribute_key: z.string().min(1),
    filter_operator: z.string().min(1),
    query_operator: z.enum(['AND', 'OR', 'and', 'or']).optional(),
    values: valuesUnionSchema,
    custom_attribute_type: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const isAttributeChanged = data.filter_operator === 'attribute_changed';
    const isFromToShape =
      data.values !== null &&
      typeof data.values === 'object' &&
      !Array.isArray(data.values);

    if (isAttributeChanged && !isFromToShape) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['values'],
        message: 'attribute_changed_requires_from_to',
      });
    } else if (!isAttributeChanged && isFromToShape) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['values'],
        message: 'values_must_be_array_for_this_operator',
      });
    }
  });

const actionUnionSchema = z.discriminatedUnion('action_name', [
  z.object({ action_name: z.literal('send_message'), action_params: actionRegistry.send_message.schema }),
  z.object({ action_name: z.literal('send_canned_response'), action_params: actionRegistry.send_canned_response.schema }),
  z.object({ action_name: z.literal('send_template'), action_params: actionRegistry.send_template.schema }),
  z.object({ action_name: z.literal('add_label'), action_params: actionRegistry.add_label.schema }),
  z.object({ action_name: z.literal('remove_label'), action_params: actionRegistry.remove_label.schema }),
  z.object({ action_name: z.literal('send_email_to_team'), action_params: actionRegistry.send_email_to_team.schema }),
  z.object({ action_name: z.literal('assign_team'), action_params: actionRegistry.assign_team.schema }),
  z.object({ action_name: z.literal('assign_agent'), action_params: actionRegistry.assign_agent.schema }),
  z.object({ action_name: z.literal('send_webhook_event'), action_params: actionRegistry.send_webhook_event.schema }),
  z.object({ action_name: z.literal('mute_conversation'), action_params: actionRegistry.mute_conversation.schema }),
  z.object({ action_name: z.literal('send_attachment'), action_params: actionRegistry.send_attachment.schema }),
  z.object({ action_name: z.literal('change_status'), action_params: actionRegistry.change_status.schema }),
  z.object({ action_name: z.literal('resolve_conversation'), action_params: actionRegistry.resolve_conversation.schema }),
  z.object({ action_name: z.literal('snooze_conversation'), action_params: actionRegistry.snooze_conversation.schema }),
  z.object({ action_name: z.literal('change_priority'), action_params: actionRegistry.change_priority.schema }),
  z.object({ action_name: z.literal('send_email_transcript'), action_params: actionRegistry.send_email_transcript.schema }),
  z.object({ action_name: z.literal('assign_to_pipeline'), action_params: actionRegistry.assign_to_pipeline.schema }),
  z.object({ action_name: z.literal('update_pipeline_stage'), action_params: actionRegistry.update_pipeline_stage.schema }),
  z.object({ action_name: z.literal('create_pipeline_task'), action_params: actionRegistry.create_pipeline_task.schema }),
  z.object({ action_name: z.literal('update_custom_attribute'), action_params: actionRegistry.update_custom_attribute.schema }),
]);

export const automationRuleSchema = z.object({
  name: z.string().min(1, 'name_required'),
  description: z.string().optional(),
  event_name: z.enum(automationEventNames),
  active: z.boolean(),
  mode: z.literal('simple'),
  conditions: z.array(conditionSchema),
  actions: z.array(actionUnionSchema).min(1, 'actions_required'),
});

export type AutomationRuleFormData = z.infer<typeof automationRuleSchema>;

export const ALL_PHASE_1_EVENTS = automationEventNames;

export function getDefaultActionForName(actionName: AutomationActionType) {
  const descriptor = actionRegistry[actionName];
  return { action_name: actionName, action_params: descriptor.defaultParams };
}
