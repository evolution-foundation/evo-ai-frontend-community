import type { StandardResponse, PaginatedResponse, PaginationMeta } from '@/types/core';

// Segment Definition Types
export interface SegmentDefinition {
  entryNode: SegmentEntryNode;
  nodes: SegmentNodeUnion[];
}

export interface SegmentEntryNode {
  id: string;
  type: 'And' | 'Or' | 'Everyone';
  children?: string[]; // IDs of other nodes
}

// Base node interface
export interface SegmentNode {
  id: string;
  type: string;
}

// Operator structures
export interface OperatorObject {
  type: string;
  value?: any;
}

export interface PropertyFilter {
  path: string;
  operator: OperatorObject;
}

// Node type definitions
export interface UserPropertyNode extends SegmentNode {
  type: 'UserProperty';
  path: string;
  operator: OperatorObject;
}

export interface PerformedNode extends SegmentNode {
  type: 'Performed';
  event: string;
  times?: number;
  timesOperator?: 'GreaterThanOrEqual' | 'LessThan' | 'Equals';
  properties?: PropertyFilter[];
  withinSeconds?: number;
}

export interface LastPerformedNode extends SegmentNode {
  type: 'LastPerformed';
  event: string;
  whereProperties?: PropertyFilter[];
  withinSeconds?: number;
}

export interface EmailNode extends SegmentNode {
  type: 'Email';
  event?: string;
  templateId?: string;
}

export interface RandomBucketNode extends SegmentNode {
  type: 'RandomBucket';
  percent: number;
}

export interface ManualNode extends SegmentNode {
  type: 'Manual';
  version?: number;
}

export interface LabelNode extends SegmentNode {
  type: 'Label';
  labelId: string;
  condition: 'has' | 'not_has';
}

export interface CustomAttributeNode extends SegmentNode {
  type: 'CustomAttribute';
  attributeName: string;
  operator: OperatorObject;
}

// Union of all node types
export type SegmentNodeUnion =
  | UserPropertyNode
  | PerformedNode
  | LastPerformedNode
  | EmailNode
  | RandomBucketNode
  | ManualNode
  | LabelNode
  | CustomAttributeNode;

// Default segment definition
export const DEFAULT_SEGMENT_DEFINITION: SegmentDefinition = {
  nodes: [],
  entryNode: {
    id: 'entry',
    type: 'Everyone',
  },
};

// Helper function to check if definition is valid
export function isSegmentDefinition(definition: any): definition is SegmentDefinition {
  return definition && typeof definition === 'object' && 'nodes' in definition && 'entryNode' in definition;
}

export interface Segment {
  id: string;
  accountId: string;
  name: string;
  definition: SegmentDefinition;
  status: 'running' | 'paused' | 'completed';
  computedCount: number;
  contactsCount: number;
  lastComputedAt?: string;
  definitionUpdatedAt: string;
  created_at: string;
  updated_at: string;
}

export interface SegmentFormData {
  name: string;
  definition: SegmentDefinition;
  status?: 'running' | 'paused' | 'completed';
}

export interface SegmentsResponse extends PaginatedResponse<Segment> {}

export interface SegmentResponse extends StandardResponse<Segment> {}

export interface SegmentDeleteResponse extends StandardResponse<{ message: string }> {}

export interface SegmentsState {
  segments: Segment[];
  selectedSegmentIds: string[];
  meta: {
    pagination: PaginationMeta;
  };
  loading: {
    list: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    bulk: boolean;
  };
  searchQuery: string;
  sortBy: 'name' | 'created_at';
  sortOrder: 'asc' | 'desc';
}
