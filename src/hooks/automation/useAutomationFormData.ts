import { useEffect, useState } from 'react';
import { automationService } from '@/services/automation/automationService';
import { pipelinesService } from '@/services/pipelines/pipelinesService';
import { cannedResponsesService } from '@/services/cannedResponses/cannedResponsesService';
import messageTemplatesService from '@/services/channels/messageTemplatesService';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';
import type { CustomAttributeDefinition } from '@/types/settings';

export interface MessageTemplateVariable {
  name: string;
  label?: string;
  type?: string;
  required?: boolean;
  default_value?: string;
  source?: string;
  example?: string;
  position?: number;
  component?: string;
}

export interface AutomationFormDataOption {
  id: string | number;
  name: string;
}

export interface MessageTemplateOption extends AutomationFormDataOption {
  channelId: string | number;
  channelName: string;
  templateName: string;
  language: string;
  namespace?: string;
  variables?: MessageTemplateVariable[];
}

export interface AutomationFormData {
  inboxes: AutomationFormDataOption[];
  agents: AutomationFormDataOption[];
  teams: AutomationFormDataOption[];
  labels: AutomationFormDataOption[];
  pipelines: AutomationFormDataOption[];
  pipelineStages: AutomationFormDataOption[];
  priorities: AutomationFormDataOption[];
  statuses: AutomationFormDataOption[];
  messageTypes: AutomationFormDataOption[];
  cannedResponses: AutomationFormDataOption[];
  messageTemplates: MessageTemplateOption[];
  customAttributes: CustomAttributeDefinition[];
}

const HARDCODED_PRIORITIES: AutomationFormDataOption[] = [
  { id: 'low', name: 'low' },
  { id: 'medium', name: 'medium' },
  { id: 'high', name: 'high' },
  { id: 'urgent', name: 'urgent' },
];

const HARDCODED_STATUSES: AutomationFormDataOption[] = [
  { id: 'open', name: 'open' },
  { id: 'resolved', name: 'resolved' },
  { id: 'snoozed', name: 'snoozed' },
  { id: 'pending', name: 'pending' },
];

const HARDCODED_MESSAGE_TYPES: AutomationFormDataOption[] = [
  { id: 0, name: 'incoming' },
  { id: 1, name: 'outgoing' },
  { id: 2, name: 'activity' },
  { id: 3, name: 'template' },
];

const toOption = (raw: { id: string | number; name?: string; title?: string }): AutomationFormDataOption => ({
  id: raw.id,
  name: raw.name ?? raw.title ?? String(raw.id),
});

export function useAutomationFormData(): {
  data: AutomationFormData;
  isLoading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<AutomationFormData>({
    inboxes: [],
    agents: [],
    teams: [],
    labels: [],
    pipelines: [],
    pipelineStages: [],
    priorities: HARDCODED_PRIORITIES,
    statuses: HARDCODED_STATUSES,
    messageTypes: HARDCODED_MESSAGE_TYPES,
    cannedResponses: [],
    messageTemplates: [],
    customAttributes: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [formDataResult, pipelinesResult, cannedResult, customAttrsResult] = await Promise.allSettled([
          automationService.getFormData(),
          pipelinesService.getPipelines().catch(() => null),
          cannedResponsesService.getCannedResponses().catch(() => null),
          customAttributesService.getCustomAttributes().catch(() => null),
        ]);

        if (cancelled) return;

        const formData =
          formDataResult.status === 'fulfilled'
            ? formDataResult.value
            : { inboxes: [], agents: [], teams: [], labels: [] };

        const pipelinesPayload =
          pipelinesResult.status === 'fulfilled' && pipelinesResult.value
            ? pipelinesResult.value
            : null;

        const pipelinesArray =
          (pipelinesPayload as { data?: { id: string; name: string }[] } | null)?.data ?? [];

        let allStages: AutomationFormDataOption[] = [];
        if (pipelinesArray.length > 0) {
          const stagesResults = await Promise.allSettled(
            pipelinesArray.map((p) => pipelinesService.getPipelineStages(p.id)),
          );
          allStages = stagesResults.flatMap((res, idx) => {
            if (res.status !== 'fulfilled' || !res.value) return [];
            const stages =
              (res.value as { data?: { id: string; name: string }[] }).data ?? [];
            const pipelineName = pipelinesArray[idx]?.name ?? '';
            return stages.map((s) => {
              const opt = toOption(s);
              return pipelineName ? { ...opt, name: `[${pipelineName}] ${opt.name}` } : opt;
            });
          });
        }

        const inboxesArray = (formData.inboxes ?? []) as { id: string | number; name: string }[];

        let allTemplates: MessageTemplateOption[] = [];
        if (inboxesArray.length > 0) {
          const templatesResults = await Promise.allSettled(
            inboxesArray.map((inbox) =>
              messageTemplatesService
                .getTemplates(String(inbox.id), { active: true, per_page: 200 })
                .catch(() => null),
            ),
          );
          allTemplates = templatesResults.flatMap((res, idx) => {
            if (res.status !== 'fulfilled' || !res.value) return [];
            const payload = res.value as { data?: { id?: string | number; name?: string; language?: string; namespace?: string; variables?: MessageTemplateVariable[] }[] };
            const list = payload.data ?? [];
            const channel = inboxesArray[idx];
            return list
              .filter((tpl) => tpl.id != null && tpl.name)
              .map((tpl) => ({
                id: String(tpl.id),
                name: `[${channel.name}] ${tpl.name}${tpl.language ? ` (${tpl.language})` : ''}`,
                channelId: channel.id,
                channelName: channel.name,
                templateName: tpl.name as string,
                language: tpl.language ?? '',
                namespace: tpl.namespace,
                variables: tpl.variables ?? [],
              }));
          });
        }

        if (cancelled) return;

        const cannedPayload =
          cannedResult.status === 'fulfilled' && cannedResult.value
            ? (cannedResult.value as { data?: { id: string | number; short_code?: string; content?: string }[] }).data ?? []
            : [];

        const customAttributes =
          customAttrsResult.status === 'fulfilled' && customAttrsResult.value
            ? (customAttrsResult.value as { data?: CustomAttributeDefinition[] }).data ?? []
            : [];

        setData({
          inboxes: inboxesArray.map(toOption),
          agents: (formData.agents ?? []).map(toOption),
          teams: (formData.teams ?? []).map(toOption),
          labels: (formData.labels ?? []).map(toOption),
          pipelines: pipelinesArray.map(toOption),
          pipelineStages: allStages,
          priorities: HARDCODED_PRIORITIES,
          statuses: HARDCODED_STATUSES,
          messageTypes: HARDCODED_MESSAGE_TYPES,
          cannedResponses: cannedPayload.map(c => ({
            id: c.id,
            name: c.short_code ? `/${c.short_code}` : (c.content ?? String(c.id)).slice(0, 60),
          })),
          messageTemplates: allTemplates,
          customAttributes,
        });
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, isLoading, error };
}
