type TriggerNode = {
  id: string;
  type?: string;
  data: Record<string, unknown>;
};

// Builds the flowTriggers payload persisted alongside the journey and consumed
// by the evo-flow runtime trigger matchers. Any node field the runtime honors
// (e.g. labelAction / segmentAction — EVO-1763) MUST be mirrored into metadata
// here; dropping one silently disables that runtime filter.
export function buildFlowTriggers(nodes: unknown) {
  const list = Array.isArray(nodes) ? (nodes as TriggerNode[]) : [];
  return list
    .filter(node => node.type === 'journey-trigger-node')
    .map(triggerNode => {
      const data = triggerNode.data;
      const triggerType = (data.triggerType as string) || undefined;
      return {
        id: triggerNode.id,
        type: triggerType || 'Manual',
        name: `${triggerType || 'manual'} trigger`,
        enabled: true,
        conditions: {
          eventName: data.eventName,
          segmentId: data.segmentId,
          labelId: data.labelId,
          attributeName: data.customAttributeName,
          webhookUrl: data.webhookUrl,
        },
        metadata: {
          triggerType: data.triggerType,
          eventName: data.eventName,
          eventProperties: data.eventProperties,
          contactFields: data.contactFields,
          labelId: data.labelId,
          labelName: data.labelName,
          labelAction: data.labelAction,
          segmentId: data.segmentId,
          segmentName: data.segmentName,
          segmentAction: data.segmentAction,
          customAttributeName: data.customAttributeName,
          customAttributeDisplayName: data.customAttributeDisplayName,
          customAttributeOperator: data.customAttributeOperator,
          customAttributeValue: data.customAttributeValue,
          scheduleType: data.scheduleType,
          scheduleDate: data.scheduleDate,
          scheduleTime: data.scheduleTime,
          recurringPattern: data.recurringPattern,
          recurringDays: data.recurringDays,
          recurringTime: data.recurringTime,
          recurringInterval: data.recurringInterval,
          webhookUrl: data.webhookUrl,
          webhookSecret: data.webhookSecret,
          webhookMethod: data.webhookMethod,
          expectedHeaders: data.expectedHeaders,
          pipelineId: data.pipelineId,
          pipelineName: data.pipelineName,
          fromStageId: data.fromStageId,
          fromStageName: data.fromStageName,
          toStageId: data.toStageId,
          toStageName: data.toStageName,
        },
      };
    });
}
