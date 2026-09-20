/** Shared types for the agent configuration components. */

export interface AdvancedMessageConfig {
  message_wait_time: number;
  message_signature: string;
  enable_text_segmentation: boolean;
  max_characters_per_segment: number;
  min_segment_size: number;
  character_delay_ms: number;
}

export interface ExternalConfigData {
  provider?: string;
  advanced_config?: AdvancedMessageConfig;
}

export interface BehaviorSettings {
  transferToHuman: boolean;
  useEmojis: boolean;
  allowReminders: boolean;
  allowPipelineManipulation: boolean;
  allowContactEdit: boolean;
  allowManageLabels: boolean;
  allowProductSales: boolean;
  timezone: string;
  sendAsReply: boolean;
}
