import { Activity, Filter, Hash, Mail, MessageSquare, Percent, Tag, User, Users, type LucideIcon } from 'lucide-react';
import type { NodeBorderColor } from '@/components/base/BaseFlowNode';
import type { SegmentNodeUnion } from '@/types/analytics/segments';

export interface SegmentNodeMeta {
  /** The DSL `type` discriminant emitted onto the canvas / definition. */
  type: string;
  /** i18n key (under the `segments` namespace) for the palette label. */
  labelKey: string;
  /** i18n key (under the `segments` namespace) for the palette description. */
  descriptionKey: string;
  icon: LucideIcon;
  color: NodeBorderColor;
  /** Palette category bucket. */
  category: 'identity' | 'behavior' | 'messages';
}

// The 8 palette node types (AC6). "Channel" defaults to WhatsApp and can be
// switched to Web/SMS in the inspector. Everyone is the entry-only marker.
// label/description are i18n keys (segments namespace) resolved at render time —
// see canvas.nodes.* in the locale files.
export const SEGMENT_NODE_META: SegmentNodeMeta[] = [
  { type: 'Everyone', labelKey: 'canvas.nodes.Everyone.label', descriptionKey: 'canvas.nodes.Everyone.description', icon: Users, color: 'emerald', category: 'identity' },
  { type: 'UserProperty', labelKey: 'canvas.nodes.UserProperty.label', descriptionKey: 'canvas.nodes.UserProperty.description', icon: User, color: 'indigo', category: 'identity' },
  { type: 'CustomAttribute', labelKey: 'canvas.nodes.CustomAttribute.label', descriptionKey: 'canvas.nodes.CustomAttribute.description', icon: Hash, color: 'cyan', category: 'identity' },
  { type: 'Label', labelKey: 'canvas.nodes.Label.label', descriptionKey: 'canvas.nodes.Label.description', icon: Tag, color: 'purple', category: 'identity' },
  { type: 'Performed', labelKey: 'canvas.nodes.Performed.label', descriptionKey: 'canvas.nodes.Performed.description', icon: Activity, color: 'blue', category: 'behavior' },
  { type: 'RandomBucket', labelKey: 'canvas.nodes.RandomBucket.label', descriptionKey: 'canvas.nodes.RandomBucket.description', icon: Percent, color: 'amber', category: 'behavior' },
  { type: 'Email', labelKey: 'canvas.nodes.Email.label', descriptionKey: 'canvas.nodes.Email.description', icon: Mail, color: 'rose', category: 'messages' },
  { type: 'WhatsApp', labelKey: 'canvas.nodes.WhatsApp.label', descriptionKey: 'canvas.nodes.WhatsApp.description', icon: MessageSquare, color: 'teal', category: 'messages' },
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
      // No i18n key for unknown types — consumers fall back to the raw type.
      labelKey: '',
      descriptionKey: '',
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
