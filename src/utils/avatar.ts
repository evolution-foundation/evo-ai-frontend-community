// 12-color palette shared across all pipeline components for contact avatars.
const AVATAR_COLORS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B',
  '#EF4444', '#EC4899', '#06B6D4', '#84CC16',
  '#F97316', '#6366F1', '#14B8A6', '#A855F7',
];

export function getContactColor(name?: string): string {
  if (!name) return '#6B7280';
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}
