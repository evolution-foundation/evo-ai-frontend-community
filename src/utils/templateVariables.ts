import type {
  MessageTemplate,
  MessageTemplateComponent,
  MessageTemplateVariable,
  TemplateFormData,
} from '@/types/channels/inbox';

const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

const normalizeVariable = (
  variable: MessageTemplateVariable | string,
  fallbackIndex = 0,
): MessageTemplateVariable => {
  if (typeof variable === 'string') {
    return {
      name: variable,
      label: variable,
      type: 'text',
      required: true,
      position: Number.isFinite(Number(variable)) ? Number(variable) : fallbackIndex + 1,
    };
  }

  return {
    type: 'text',
    required: true,
    label: variable.name,
    position: fallbackIndex + 1,
    ...variable,
  };
};

const extractFromText = (
  text: string | undefined,
  component?: MessageTemplateVariable['component'],
): MessageTemplateVariable[] => {
  if (!text) return [];

  return Array.from(text.matchAll(VARIABLE_PATTERN), (match, index) => ({
    name: match[1],
    label: match[1],
    type: 'text' as const,
    required: true,
    position: Number.isFinite(Number(match[1])) ? Number(match[1]) : index + 1,
    component,
  }));
};

const componentList = (
  components?: MessageTemplate['components'],
): MessageTemplateComponent[] => {
  if (!components) return [];
  return Array.isArray(components) ? components : Object.values(components);
};

export const normalizeTemplateVariables = (
  variables?: Array<MessageTemplateVariable | string>,
): MessageTemplateVariable[] => {
  const seen = new Set<string>();

  return (variables ?? [])
    .map(normalizeVariable)
    .filter(variable => {
      if (!variable.name || seen.has(variable.name)) return false;
      seen.add(variable.name);
      return true;
    });
};

export const extractTemplateVariables = (
  template: Pick<MessageTemplate, 'content' | 'components' | 'variables'>,
): MessageTemplateVariable[] => {
  const declared = normalizeTemplateVariables(template.variables);
  const extracted = [
    ...componentList(template.components).flatMap(component =>
      extractFromText(component.text, component.type === 'FOOTER' ? undefined : component.type),
    ),
    ...extractFromText(template.content),
  ];

  const byName = new Map<string, MessageTemplateVariable>();
  extracted.forEach(variable => byName.set(variable.name, variable));
  declared.forEach(variable => byName.set(variable.name, { ...byName.get(variable.name), ...variable }));

  return Array.from(byName.values()).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
};

const formTemplateShape = (
  formData: TemplateFormData,
): Pick<MessageTemplate, 'content' | 'components'> => ({
  content: [formData.headerText, formData.bodyText, formData.footerText, formData.content]
    .filter(Boolean)
    .join('\n\n'),
  components: [
    ...(formData.headerText ? [{ type: 'HEADER' as const, text: formData.headerText }] : []),
    ...(formData.bodyText ? [{ type: 'BODY' as const, text: formData.bodyText }] : []),
  ],
});

/**
 * Variables to PERSIST when saving: text-detected names enriched with the user's
 * declared metadata (label/example/source). Used by the backend-payload builder.
 */
export const extractTemplateFormVariables = (formData: TemplateFormData): MessageTemplateVariable[] =>
  extractTemplateVariables({ ...formTemplateShape(formData), variables: formData.variables });

/**
 * Variables to DISPLAY while editing: driven ONLY by what is currently in the
 * text. The declared list is intentionally omitted so that renaming a `{{token}}`
 * character-by-character does not accumulate stale rows. The form layer reconciles
 * this with the declared list by name, re-attaching any label/example/source the
 * user has already typed for a still-present token (EVO-1971).
 */
export const detectTemplateFormVariables = (formData: TemplateFormData): MessageTemplateVariable[] =>
  extractTemplateVariables(formTemplateShape(formData));

export const buildInitialVariableParams = (
  variables: MessageTemplateVariable[],
): Record<string, string> =>
  variables.reduce<Record<string, string>>((acc, variable) => {
    acc[variable.name] = variable.default_value ?? variable.example ?? '';
    return acc;
  }, {});

// EVO-1267: basic syntax gate for custom variable expressions — every '('
// needs its ')' and every '{' its '}' (so "{{contact.name}" can never be
// saved). Resolution semantics stay server-side; this only blocks Save on
// obviously broken input.
export const isBalancedExpression = (expression: string): boolean => {
  let parens = 0;
  let braces = 0;

  for (const char of expression) {
    if (char === '(') parens += 1;
    else if (char === ')') parens -= 1;
    else if (char === '{') braces += 1;
    else if (char === '}') braces -= 1;
    if (parens < 0 || braces < 0) return false;
  }

  return parens === 0 && braces === 0;
};
