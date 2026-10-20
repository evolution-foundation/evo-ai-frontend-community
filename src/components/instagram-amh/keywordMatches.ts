import type { Parameters } from './contract';
export function keywordMatches(text: string, data: Parameters) {
  const normalize = (value: string) => {
    let result = data.ignoreAccents ? value.normalize('NFD').replace(/\p{M}/gu, '') : value;
    if (data.ignoreCase) result = result.toLowerCase();
    return result;
  };
  const value = normalize(text);
  return (
    data.keywords?.some(keyword => {
      const needle = normalize(keyword.trim());
      if (!needle) return false;
      if (data.mode === 'contains') return value.includes(needle);
      return new RegExp(
        `(?<![\\p{L}\\p{N}_])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}_])`,
        'u',
      ).test(value);
    }) || false
  );
}
