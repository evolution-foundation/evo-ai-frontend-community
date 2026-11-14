import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';
export interface RuleInput {
  name: string;
  active: boolean;
  pipeline_id: string;
  pipeline_stage_id: string;
  owner_id: string | null;
  label_ids: string[];
  title_template: string;
  conditions: {
    version: 1;
    operator: 'any';
    ctwa: { enabled: boolean; inbox_id: string; instance_name: string };
    domain: { enabled: boolean; host: string };
  };
}
export interface Rule extends RuleInput {
  id: string;
  revision: number;
  activated_at: string | null;
  has_intake_token: boolean;
}
export interface Run {
  id: string;
  status: string;
  source: string;
  reason_code: string | null;
  executed_at: string;
  contact_id: string;
  deal_id: string | null;
}
export interface Page<T> {
  data: T[];
  meta: { pagination: { page: number; total_pages: number; total_count: number } };
}
export interface TestEvent {
  source: string;
  inbox_id?: string;
  instance_name?: string;
  page_url?: string;
  ctwa_clid?: string;
  occurred_at: string;
  contact_created_at: string;
  conversation_created_at?: string;
}
export interface TestResult {
  matched: boolean;
  reasons: string[];
  dry_run: boolean;
  action: { pipeline_id: string; pipeline_stage_id: string; title: string } | null;
}
const root = '/lead_automation_rules';
const normalize = (rule: Rule): Rule => ({
  ...rule,
  conditions: {
    ...rule.conditions,
    ctwa: rule.conditions.ctwa || { enabled: false, inbox_id: '', instance_name: '' },
    domain: rule.conditions.domain || { enabled: false, host: '' },
  },
});
export const leadAutomations = {
  async list(page = 1): Promise<Page<Rule>> {
    const res = (await api.get(root, { params: { page } })).data as Page<Rule>;
    return { ...res, data: res.data.map(normalize) };
  },
  async save(input: RuleInput, rule?: Rule): Promise<Rule> {
    return extractData<Rule>(
      rule
        ? await api.patch(`${root}/${rule.id}`, { ...input, revision: rule.revision })
        : await api.post(root, { ...input, active: false }),
    );
  },
  async remove(rule: Rule): Promise<void> {
    await api.delete(`${root}/${rule.id}`, { data: { revision: rule.revision } });
  },
  async activation(rule: Rule): Promise<Rule> {
    return extractData<Rule>(
      await api.patch(`${root}/${rule.id}/activation`, {
        active: !rule.active,
        revision: rule.revision,
      }),
    );
  },
  async test(id: string, event: TestEvent): Promise<TestResult> {
    return extractData<TestResult>(await api.post(`${root}/${id}/test`, { event }));
  },
  async runs(id: string, page = 1, status = ''): Promise<Page<Run>> {
    return (await api.get(`${root}/${id}/runs`, { params: { page, status } })).data;
  },
  async token(rule: Rule): Promise<Rule & { token: string }> {
    return extractData<Rule & { token: string }>(
      await api.post(`${root}/${rule.id}/rotate_token`, { revision: rule.revision }),
    );
  },
};
