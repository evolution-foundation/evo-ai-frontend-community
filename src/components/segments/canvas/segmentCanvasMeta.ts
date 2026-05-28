import { Activity, Filter, Hash, Mail, MessageSquare, Percent, Tag, User, Users, type LucideIcon } from 'lucide-react';
import type { NodeBorderColor } from '@/components/base/BaseFlowNode';
import type { SegmentNodeUnion } from '@/types/analytics/segments';

export interface SegmentNodeMeta {
  /** The DSL `type` discriminant emitted onto the canvas / definition. */
  type: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: NodeBorderColor;
  /** Palette category bucket. */
  category: 'identity' | 'behavior' | 'messages';
}

// The 8 palette node types (AC6). "Channel" defaults to WhatsApp and can be
// switched to Web/SMS in the inspector. Everyone is the entry-only marker.
export const SEGMENT_NODE_META: SegmentNodeMeta[] = [
  { type: 'Everyone', label: 'Everyone', description: 'All contacts in the account', icon: Users, color: 'emerald', category: 'identity' },
  { type: 'UserProperty', label: 'User property', description: 'Filter by a contact property', icon: User, color: 'indigo', category: 'identity' },
  { type: 'CustomAttribute', label: 'Custom attribute', description: 'Filter by a custom attribute', icon: Hash, color: 'cyan', category: 'identity' },
  { type: 'Label', label: 'Label', description: 'Has / lacks a label', icon: Tag, color: 'purple', category: 'identity' },
  { type: 'Performed', label: 'Performed event', description: 'Did a tracked event', icon: Activity, color: 'blue', category: 'behavior' },
  { type: 'RandomBucket', label: 'Random bucket', description: 'A random % of contacts', icon: Percent, color: 'amber', category: 'behavior' },
  { type: 'Email', label: 'Email', description: 'Email interaction', icon: Mail, color: 'rose', category: 'messages' },
  { type: 'WhatsApp', label: 'Channel', description: 'Reached on a channel (WhatsApp/Web/SMS)', icon: MessageSquare, color: 'teal', category: 'messages' },
];

const BY_TYPE: Record<string, SegmentNodeMeta> = SEGMENT_NODE_META.reduce(
  (acc, m) => {
    acc[m.type] = m;
    return acc;
  },
  {} as Record<string, SegmentNodeMeta>,
);

// Channel resolves to 3 DSL types that share the Channel meta/tile.
BY_TYPE.Web = { ...BY_TYPE.WhatsApp, type: 'Web' };
BY_TYPE.SMS = { ...BY_TYPE.WhatsApp, type: 'SMS' };

export function metaForType(type: string): SegmentNodeMeta {
  return (
    BY_TYPE[type] ?? {
      type,
      label: type,
      description: '',
      icon: Filter,
      color: 'slate',
      category: 'identity',
    }
  );
}

/** A freshly-dropped node of a given type, before the inspector fills it in. */
export function minimalSegmentNode(id: string, type: string): SegmentNodeUnion {
  switch (type) {
    case 'Performed':
      return { id, type: 'Performed', event: '' };
    case 'UserProperty':
      return { id, type: 'UserProperty', path: '', operator: { type: 'Equals', value: '' } };
    case 'CustomAttribute':
      return { id, type: 'CustomAttribute', attributeName: '', operator: { type: 'Equals', value: '' } };
    case 'Label':
      return { id, type: 'Label', labelId: '', condition: 'has' };
    case 'RandomBucket':
      return { id, type: 'RandomBucket', percent: 0.5 };
    case 'Email':
      return { id, type: 'Email' };
    case 'WhatsApp':
    case 'Web':
    case 'SMS':
      return { id, type } as SegmentNodeUnion;
    default:
      return { id, type } as SegmentNodeUnion;
  }
}
