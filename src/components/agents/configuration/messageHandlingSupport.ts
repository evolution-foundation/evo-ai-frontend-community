import { Agent } from '@/types/agents';
import { LLMConfigData } from '@/components/ai_agents/Forms/LLMConfigForm';
import { isExternalAgent, supportsMessageHandling } from '@/utils/agents';
import { ExternalConfigData } from './types';

/** Whether there is anything to render; gates the "message handling" card. */
export const hasMessageHandlingContent = (
  agent: Agent,
  llmConfigData: LLMConfigData | null,
  externalConfigData?: ExternalConfigData | null
): boolean => {
  if (agent.type === 'a2a' || agent.type === 'task') return true;
  if (isExternalAgent(agent.type)) return Boolean(externalConfigData?.advanced_config);
  return supportsMessageHandling(agent.type) && Boolean(llmConfigData?.advanced_config);
};
