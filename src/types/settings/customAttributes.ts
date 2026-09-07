import i18n from '@/i18n/config';
import type { PaginatedResponse, StandardResponse, PaginationMeta } from '@/types/core';

// Attribute Model Types
export type AttributeModel = 
  | 'conversation_attribute' 
  | 'contact_attribute' 
  | 'pipeline_attribute'
  | 'pipeline_stage_attribute'
  | 'pipeline_item_attribute';

export const AttributeModel = {
  CONVERSATION_ATTRIBUTE: 'conversation_attribute' as const,
  CONTACT_ATTRIBUTE: 'contact_attribute' as const,
  PIPELINE_ATTRIBUTE: 'pipeline_attribute' as const,
  PIPELINE_STAGE_ATTRIBUTE: 'pipeline_stage_attribute' as const,
  PIPELINE_ITEM_ATTRIBUTE: 'pipeline_item_attribute' as const,
};

// Attribute Display Types
export type AttributeDisplayType = 'text' | 'number' | 'currency' | 'percent' | 'link' | 'date' | 'list' | 'checkbox' | 'datetime';
export const AttributeDisplayType = {
  TEXT: 'text' as const,
  NUMBER: 'number' as const,
  CURRENCY: 'currency' as const,
  PERCENT: 'percent' as const,
  LINK: 'link' as const,
  DATE: 'date' as const,
  DATETIME: 'datetime' as const,
  LIST: 'list' as const,
  CHECKBOX: 'checkbox' as const,
};

// Attribute Scope Types for Pipeline Hierarchy
export type AttributeScope = 
  | 'pipeline'      // Specific to pipeline only
  | 'stages'        // Shared with all stages (value defined by stage)
  | 'stage'         // Specific to stage only
  | 'items'         // Shared with all items (value defined by item)
  | 'item';         // Specific to item only

// Base Custom Attribute Definition Interface
export interface CustomAttributeDefinition {
  id: string;
  attribute_display_name: string;
  attribute_display_type: AttributeDisplayType;
  attribute_description?: string;
  attribute_key: string;
  regex_pattern?: string;
  regex_cue?: string;
  attribute_values?: string[];
  attribute_model: AttributeModel;
  default_value?: number;
  created_at: string;
  updated_at: string;
}

export interface PipelineAttributeDefinition extends CustomAttributeDefinition {
  attribute_scope?: AttributeScope; // Scope for pipeline hierarchy (pipeline, stage, item)
}

// Form Data for Creating/Updating Custom Attributes
export interface CustomAttributeFormData {
  attribute_display_name: string;
  attribute_description?: string;
  attribute_display_type: AttributeDisplayType;
  attribute_key: string;
  attribute_model: AttributeModel;
  attribute_scope?: AttributeScope; // Scope for pipeline hierarchy
  pipeline_type?: PipelineType; // Temporary field for UI selection, converted to attribute_model on submit
  regex_pattern?: string;
  regex_cue?: string;
  attribute_values?: string[];
}

export interface PipelineCustomAttributeFormData extends CustomAttributeFormData {
  attribute_scope?: AttributeScope; // Scope for pipeline hierarchy (pipeline, stage, item)
}

// Context for pipeline hierarchy (used to determine which attributes to show)
export interface PipelineAttributeContext {
  pipelineId?: string;
  stageId?: string;
  itemId?: string;
}

// API Response Types
export interface CustomAttributesResponse extends PaginatedResponse<CustomAttributeDefinition> {}

export interface CustomAttributeResponse extends StandardResponse<CustomAttributeDefinition> {}

export interface CustomAttributeDeleteResponse extends StandardResponse<{ message: string }> {}

// State Management
export interface CustomAttributesState {
  attributes: CustomAttributeDefinition[];
  selectedAttributeIds: string[];
  activeTab: AttributeModel;
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
  sortBy: 'attribute_display_name' | 'created_at';
  sortOrder: 'asc' | 'desc';
}

// Attribute Model Options for UI
export const ATTRIBUTE_MODEL_OPTIONS = [
  {
    value: 'conversation_attribute' as AttributeModel,
    get label() { return i18n.t("aiAgents:chat.conversations"); },
    get description() { return i18n.t("interface:customattributes.attributesAppliedToConversations"); }
  },
  {
    value: 'contact_attribute' as AttributeModel,
    get label() { return i18n.t("contacts:title"); },
    get description() { return i18n.t("interface:customattributes.attributesAppliedToContacts"); }
  },
  {
    value: 'pipeline_attribute' as AttributeModel,
    label: 'Pipeline',
    get description() { return i18n.t("interface:customattributes.attributesAppliedToPipelinesStagesOrItems"); }
  }
];

// Pipeline Type Options (shown when attribute_model is pipeline_attribute)
export type PipelineType = 'pipeline' | 'pipeline_stage' | 'pipeline_item';

export const PIPELINE_TYPE_OPTIONS = [
  {
    value: 'pipeline' as PipelineType,
    label: 'Pipeline',
    get description() { return i18n.t("interface:customattributes.attributesAppliedToThePipelineItself"); }
  },
  {
    value: 'pipeline_stage' as PipelineType,
    get label() { return i18n.t("customAttributes:table.columns.model.pipeline_stage_attribute"); },
    get description() { return i18n.t("interface:customattributes.attributesAppliedToPipelineStages"); }
  },
  {
    value: 'pipeline_item' as PipelineType,
    get label() { return i18n.t("pipelines:pipelineCard.stats.items"); },
    get description() { return i18n.t("interface:customattributes.attributesAppliedToPipelineItemsDealsLeads"); }
  }
];

// Helper function to map PipelineType to AttributeModel
export function pipelineTypeToAttributeModel(type: PipelineType): AttributeModel {
  switch (type) {
    case 'pipeline':
      return 'pipeline_attribute';
    case 'pipeline_stage':
      return 'pipeline_stage_attribute';
    case 'pipeline_item':
      return 'pipeline_item_attribute';
  }
}

// Helper function to map AttributeModel to PipelineType
export function attributeModelToPipelineType(model: AttributeModel): PipelineType | null {
  switch (model) {
    case 'pipeline_attribute':
      return 'pipeline';
    case 'pipeline_stage_attribute':
      return 'pipeline_stage';
    case 'pipeline_item_attribute':
      return 'pipeline_item';
    default:
      return null;
  }
}

// Attribute Type Options for UI
export const ATTRIBUTE_TYPE_OPTIONS = [
  {
    value: 'text' as AttributeDisplayType,
    labelKey: 'attributeTypeOptions.text.label',
    descriptionKey: 'attributeTypeOptions.text.description',
    defaultLabel: 'Text',
    defaultDescription: 'Simple text field'
  },
  {
    value: 'number' as AttributeDisplayType,
    labelKey: 'attributeTypeOptions.number.label',
    descriptionKey: 'attributeTypeOptions.number.description',
    defaultLabel: 'Number',
    defaultDescription: 'Numeric field'
  },
  {
    value: 'currency' as AttributeDisplayType,
    labelKey: 'attributeTypeOptions.currency.label',
    descriptionKey: 'attributeTypeOptions.currency.description',
    defaultLabel: 'Currency',
    defaultDescription: 'Monetary value'
  },
  {
    value: 'percent' as AttributeDisplayType,
    labelKey: 'attributeTypeOptions.percent.label',
    descriptionKey: 'attributeTypeOptions.percent.description',
    defaultLabel: 'Percentage',
    defaultDescription: 'Percentage value'
  },
  {
    value: 'link' as AttributeDisplayType,
    labelKey: 'attributeTypeOptions.link.label',
    descriptionKey: 'attributeTypeOptions.link.description',
    defaultLabel: 'Link',
    defaultDescription: 'URL or link'
  },
  {
    value: 'date' as AttributeDisplayType,
    labelKey: 'attributeTypeOptions.date.label',
    descriptionKey: 'attributeTypeOptions.date.description',
    defaultLabel: 'Date',
    defaultDescription: 'Date field'
  },
  {
    value: 'datetime' as AttributeDisplayType,
    labelKey: 'attributeTypeOptions.datetime.label',
    descriptionKey: 'attributeTypeOptions.datetime.description',
    defaultLabel: 'Date and Time',
    defaultDescription: 'Date and time field'
  },
  {
    value: 'list' as AttributeDisplayType,
    labelKey: 'attributeTypeOptions.list.label',
    descriptionKey: 'attributeTypeOptions.list.description',
    defaultLabel: 'List',
    defaultDescription: 'Selection from predefined options'
  },
  {
    value: 'checkbox' as AttributeDisplayType,
    labelKey: 'attributeTypeOptions.checkbox.label',
    descriptionKey: 'attributeTypeOptions.checkbox.description',
    defaultLabel: 'Checkbox',
    defaultDescription: 'True or false'
  }
];

// Tab Configuration
export const ATTRIBUTE_TABS = [
  {
    key: 'conversation_attribute' as AttributeModel,
    get name() { return i18n.t("aiAgents:chat.conversations"); },
    get description() { return i18n.t("interface:customattributes.customAttributesForConversations"); }
  },
  {
    key: 'contact_attribute' as AttributeModel,
    get name() { return i18n.t("contacts:title"); },
    get description() { return i18n.t("interface:customattributes.customAttributesForContacts"); }
  },
  {
    key: 'pipeline_attribute' as AttributeModel,
    name: 'Pipeline',
    get description() { return i18n.t("interface:customattributes.customAttributesForPipelinesStagesAndItems"); }
  }
];
