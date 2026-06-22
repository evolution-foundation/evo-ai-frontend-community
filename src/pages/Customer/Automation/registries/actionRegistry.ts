import { z } from 'zod';
import type { AutomationActionType } from '@/types/automation';

const idValueSchema = z.union([z.string(), z.number()]);

const sendMessageSchema = z.tuple([z.string().min(1)]);

const labelListSchema = z.array(idValueSchema).min(1);

// Team/agent/inbox/user ids are UUID strings in this app (not Chatwoot-legacy
// integers). Accept string|number so real selections validate; number kept for
// robustness/legacy.
const entityIdSchema = z.union([z.string().min(1), z.number()]);

const sendEmailToTeamSchema = z.tuple([
  z.object({
    team_ids: z.array(entityIdSchema).min(1),
    message: z.string().min(1),
  }),
]);

// Team/agent ids are UUID strings in this app — the Chatwoot-legacy integer
// assumption (number|null) silently rejected every real selection, leaving the
// rule invalid (button never enabled / submit blocked). `null` is the unassign
// sentinel the select emits when cleared; number is kept for legacy/robustness.
const assignTargetSchema = z.tuple([z.union([z.string().min(1), z.number(), z.null()])]);

const assignTeamSchema = assignTargetSchema;

const assignAgentSchema = assignTargetSchema;

const sendWebhookEventSchema = z.tuple([z.string().url()]);

const sendAttachmentSchema = z.tuple([
  z.object({
    attachment_ids: z.array(idValueSchema).min(1),
    inbox_id: entityIdSchema.optional(),
  }),
]);

const changeStatusSchema = z.tuple([z.string().min(1)]);

const noParamsSchema = z.tuple([]);

const changePrioritySchema = z.tuple([z.union([z.string(), z.null()])]);

const sendEmailTranscriptSchema = z.tuple([z.string().email()]);

const requiredIdSchema = z.union([
  z.string().min(1),
  z.number().refine((n) => Number.isFinite(n), { message: 'invalid_id' }),
]);

const assignToPipelineSchema = z.tuple([requiredIdSchema]);

const updatePipelineStageSchema = z.tuple([requiredIdSchema]);

const createPipelineTaskSchema = z.tuple([
  z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    task_type: z.string().optional(),
    priority: z.string().optional(),
    assigned_to_id: entityIdSchema.optional(),
    due_in: z.string().optional(),
  }),
]);

const sendCannedResponseSchema = z.tuple([
  z.union([
    requiredIdSchema,
    z.object({ canned_response_id: requiredIdSchema }),
  ]),
]);

const sendTemplateSchema = z.tuple([
  z.object({
    template_id: z.string().min(1).optional(),
    name: z.string().min(1),
    language: z.string().optional(),
    namespace: z.string().optional(),
    processed_params: z.record(z.string()).optional(),
    components: z.array(z.any()).optional(),
  }),
]);

// Custom attribute is unique per (key, model); carry the model so the backend
// disambiguates the lookup and the write target. Value is a string (empty = set
// empty), cast at read/query time — consistent with the journey/CRM contract.
const updateCustomAttributeSchema = z.tuple([
  z.object({
    custom_attribute_key: z.string().min(1),
    custom_attribute_model: z.string().min(1),
    custom_attribute_value: z.string(),
  }),
]);

export interface ActionDescriptor {
  actionName: AutomationActionType;
  schema: z.ZodTypeAny;
  defaultParams: unknown;
  i18nKey: string;
}

export const actionRegistry: Record<AutomationActionType, ActionDescriptor> = {
  send_message: {
    actionName: 'send_message',
    schema: sendMessageSchema,
    defaultParams: [''],
    i18nKey: 'form.fields.actions.send_message',
  },
  send_canned_response: {
    actionName: 'send_canned_response',
    schema: sendCannedResponseSchema,
    defaultParams: [{ canned_response_id: '' }],
    i18nKey: 'form.fields.actions.send_canned_response',
  },
  send_template: {
    actionName: 'send_template',
    schema: sendTemplateSchema,
    defaultParams: [{ template_id: '', name: '', language: '' }],
    i18nKey: 'form.fields.actions.send_template',
  },
  add_label: {
    actionName: 'add_label',
    schema: labelListSchema,
    defaultParams: [],
    i18nKey: 'form.fields.actions.add_label',
  },
  remove_label: {
    actionName: 'remove_label',
    schema: labelListSchema,
    defaultParams: [],
    i18nKey: 'form.fields.actions.remove_label',
  },
  send_email_to_team: {
    actionName: 'send_email_to_team',
    schema: sendEmailToTeamSchema,
    defaultParams: [{ team_ids: [], message: '' }],
    i18nKey: 'form.fields.actions.send_email_to_team',
  },
  assign_team: {
    actionName: 'assign_team',
    schema: assignTeamSchema,
    defaultParams: [null],
    i18nKey: 'form.fields.actions.assign_team',
  },
  assign_agent: {
    actionName: 'assign_agent',
    schema: assignAgentSchema,
    defaultParams: [null],
    i18nKey: 'form.fields.actions.assign_agent',
  },
  send_webhook_event: {
    actionName: 'send_webhook_event',
    schema: sendWebhookEventSchema,
    defaultParams: [''],
    i18nKey: 'form.fields.actions.send_webhook_event',
  },
  mute_conversation: {
    actionName: 'mute_conversation',
    schema: noParamsSchema,
    defaultParams: [],
    i18nKey: 'form.fields.actions.mute_conversation',
  },
  send_attachment: {
    actionName: 'send_attachment',
    schema: sendAttachmentSchema,
    defaultParams: [{ attachment_ids: [] }],
    i18nKey: 'form.fields.actions.send_attachment',
  },
  change_status: {
    actionName: 'change_status',
    schema: changeStatusSchema,
    defaultParams: [''],
    i18nKey: 'form.fields.actions.change_status',
  },
  resolve_conversation: {
    actionName: 'resolve_conversation',
    schema: noParamsSchema,
    defaultParams: [],
    i18nKey: 'form.fields.actions.resolve_conversation',
  },
  snooze_conversation: {
    actionName: 'snooze_conversation',
    schema: noParamsSchema,
    defaultParams: [],
    i18nKey: 'form.fields.actions.snooze_conversation',
  },
  change_priority: {
    actionName: 'change_priority',
    schema: changePrioritySchema,
    defaultParams: [null],
    i18nKey: 'form.fields.actions.change_priority',
  },
  send_email_transcript: {
    actionName: 'send_email_transcript',
    schema: sendEmailTranscriptSchema,
    defaultParams: [''],
    i18nKey: 'form.fields.actions.send_email_transcript',
  },
  assign_to_pipeline: {
    actionName: 'assign_to_pipeline',
    schema: assignToPipelineSchema,
    defaultParams: [null],
    i18nKey: 'form.fields.actions.assign_to_pipeline',
  },
  update_pipeline_stage: {
    actionName: 'update_pipeline_stage',
    schema: updatePipelineStageSchema,
    defaultParams: [null],
    i18nKey: 'form.fields.actions.update_pipeline_stage',
  },
  create_pipeline_task: {
    actionName: 'create_pipeline_task',
    schema: createPipelineTaskSchema,
    defaultParams: [{ title: '' }],
    i18nKey: 'form.fields.actions.create_pipeline_task',
  },
  update_custom_attribute: {
    actionName: 'update_custom_attribute',
    schema: updateCustomAttributeSchema,
    defaultParams: [{ custom_attribute_key: '', custom_attribute_model: '', custom_attribute_value: '' }],
    i18nKey: 'form.fields.actions.update_custom_attribute',
  },
};

export function getActionDescriptor(
  actionName: AutomationActionType,
): ActionDescriptor | undefined {
  return actionRegistry[actionName];
}

export const ALL_ACTION_NAMES = Object.keys(actionRegistry) as AutomationActionType[];
