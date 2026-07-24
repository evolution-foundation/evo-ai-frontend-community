import type { CustomMcpServer } from '@/types/ai';

/**
 * EVO-1739: the shape the MCP wizard edits and the rules that make it savable. Kept out
 * of the modal so the step form and the advanced (raw JSON) mode share one definition.
 */
export interface WizardData {
  // Step 1 — Identity
  name: string;
  description: string;
  tags: string[];
  // Step 2 — Connection
  url: string;
  headers: Record<string, unknown>;
  // Step 3 — Advanced
  timeout: number;
  retry_count: number;
}

export const initialWizardData: WizardData = {
  name: '',
  description: '',
  tags: [],
  url: '',
  headers: {},
  timeout: 30,
  retry_count: 3,
};

export const serverToWizardData = (server: CustomMcpServer): WizardData => ({
  name: server.name || '',
  description: server.description || '',
  tags: server.tags || [],
  url: server.url || '',
  headers: (server.headers as Record<string, unknown>) || {},
  timeout: server.timeout ?? 30,
  retry_count: server.retry_count ?? 3,
});

/** Same bounds the Step 3 number inputs enforce — advanced mode must not be a way around them. */
export const TIMEOUT_MIN = 1;
export const TIMEOUT_MAX = 300;
export const RETRY_MIN = 0;
export const RETRY_MAX = 10;

type Translate = (key: string, options?: Record<string, unknown>) => string;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isInteger = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

/**
 * Turn the raw JSON from advanced mode into WizardData. An absent key falls back to the
 * default, so deleting one clears the field; a wrong-typed or out-of-range one is a
 * reported issue, never a silent revert.
 */
export const parseWizardConfig = (
  parsed: Record<string, unknown>,
  t: Translate,
): { data: WizardData; issues: string[] } => {
  const issues: string[] = [];
  const next: WizardData = { ...initialWizardData };

  // name — required, same as Step 1.
  if (parsed.name === undefined) {
    issues.push(t('wizard.advanced.errors.nameRequired'));
  } else if (typeof parsed.name !== 'string') {
    issues.push(t('wizard.advanced.errors.nameType'));
  } else if (!parsed.name.trim()) {
    issues.push(t('wizard.advanced.errors.nameRequired'));
  } else {
    next.name = parsed.name;
  }

  if (parsed.description === undefined) {
    next.description = '';
  } else if (typeof parsed.description !== 'string') {
    issues.push(t('wizard.advanced.errors.descriptionType'));
  } else {
    next.description = parsed.description;
  }

  // url — required and parseable, same as Step 2.
  if (parsed.url === undefined || (typeof parsed.url === 'string' && !parsed.url.trim())) {
    issues.push(t('wizard.advanced.errors.urlRequired'));
  } else if (typeof parsed.url !== 'string') {
    issues.push(t('wizard.advanced.errors.urlType'));
  } else {
    try {
      new URL(parsed.url);
      next.url = parsed.url;
    } catch {
      issues.push(t('wizard.advanced.errors.urlInvalid'));
    }
  }

  // headers — the API binds these into a string map, so a non-string is a 400 on submit.
  if (parsed.headers === undefined) {
    next.headers = {};
  } else if (!isPlainObject(parsed.headers)) {
    issues.push(t('wizard.advanced.errors.headersType'));
  } else {
    const badKeys = Object.entries(parsed.headers)
      .filter(([, v]) => typeof v !== 'string')
      .map(([k]) => k);
    if (badKeys.length > 0) {
      issues.push(t('wizard.advanced.errors.headerValueType', { keys: badKeys.join(', ') }));
    } else {
      next.headers = parsed.headers;
    }
  }

  // timeout / retry_count — same bounds as the Step 3 inputs.
  if (parsed.timeout === undefined) {
    next.timeout = initialWizardData.timeout;
  } else if (
    !isInteger(parsed.timeout) ||
    parsed.timeout < TIMEOUT_MIN ||
    parsed.timeout > TIMEOUT_MAX
  ) {
    issues.push(t('wizard.advanced.errors.timeoutRange', { min: TIMEOUT_MIN, max: TIMEOUT_MAX }));
  } else {
    next.timeout = parsed.timeout;
  }

  if (parsed.retry_count === undefined) {
    next.retry_count = initialWizardData.retry_count;
  } else if (
    !isInteger(parsed.retry_count) ||
    parsed.retry_count < RETRY_MIN ||
    parsed.retry_count > RETRY_MAX
  ) {
    issues.push(t('wizard.advanced.errors.retryRange', { min: RETRY_MIN, max: RETRY_MAX }));
  } else {
    next.retry_count = parsed.retry_count;
  }

  // tags — a string array; coercing would smuggle in [object Object].
  if (parsed.tags === undefined) {
    next.tags = [];
  } else if (!Array.isArray(parsed.tags) || parsed.tags.some(tag => typeof tag !== 'string')) {
    issues.push(t('wizard.advanced.errors.tagsType'));
  } else {
    next.tags = parsed.tags as string[];
  }

  return { data: next, issues };
};
