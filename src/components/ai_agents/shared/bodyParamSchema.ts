import type { BodyParamSchema, BodyParamType } from '@/types/ai';

export const BODY_PARAM_TYPES: BodyParamType[] = [
  'string',
  'number',
  'boolean',
  'object',
  'array',
];

const isBodyParamType = (v: unknown): v is BodyParamType =>
  typeof v === 'string' && (BODY_PARAM_TYPES as string[]).includes(v);

/** Coerce a stored body param into the {type, required, description} schema.
 * Legacy tools saved each param as a plain string (e.g. "{query}"), which the
 * engine could not read and which crashed tool creation. Loading an old tool
 * repairs it into the schema shape. */
export const coerceBodyParam = (raw: unknown): BodyParamSchema => {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    return {
      type: isBodyParamType(obj.type) ? obj.type : 'string',
      required: typeof obj.required === 'boolean' ? obj.required : true,
      description: typeof obj.description === 'string' ? obj.description : '',
    };
  }
  return { type: 'string', required: true, description: '' };
};

export const normalizeBodyParams = (
  value: Record<string, unknown> | undefined | null,
): Record<string, BodyParamSchema> => {
  const out: Record<string, BodyParamSchema> = {};
  for (const [key, raw] of Object.entries(value || {})) {
    out[key] = coerceBodyParam(raw);
  }
  return out;
};
