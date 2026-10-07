import { CUSTOM_TOOL_FILTER_TYPES, FilterType } from '@/types/core';
import { CustomTool } from '@/types/ai';

/**
 * Known tags accumulate across loads: narrowing the list must not hide the tag you picked.
 * Trimmed and deduped case-insensitively: the backend trims the value it receives and
 * compares it case-insensitively.
 */
export const mergeTagOptions = (known: string[], tools: CustomTool[]): string[] => {
  const merged = new Map(known.map(tag => [tag.toLowerCase(), tag]));
  tools.forEach(tool =>
    tool.tags?.forEach(raw => {
      const tag = raw.trim();
      if (tag && !merged.has(tag.toLowerCase())) merged.set(tag.toLowerCase(), tag);
    }),
  );
  return [...merged.values()].sort((a, b) => a.localeCompare(b));
};

export const buildCustomToolFilterTypes = (tagOptions: string[]): FilterType[] =>
  CUSTOM_TOOL_FILTER_TYPES.map(filterType =>
    filterType.attributeKey === 'tags' ? { ...filterType, suggestions: tagOptions } : filterType,
  );
