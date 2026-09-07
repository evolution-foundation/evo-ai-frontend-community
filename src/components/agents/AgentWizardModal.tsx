import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Dialog, DialogContent } from '@evoapi/design-system';
import { X } from 'lucide-react';
import { createAgent, listApiKeys } from '@/services/agents';
import integrationService from '@/services/agents/integrationService';
import { ApiKey, AgentCreate } from '@/types/agents';
import { toast } from 'sonner';
import { extractBackendErrorMessage } from '@/utils/agentUtils';

// Wizard components - novo fluxo
import WizardProgress from '@/pages/Customer/Agents/Agent/wizard/WizardProgress';
import Step1_Name from '@/pages/Customer/Agents/Agent/wizard/Step1_Name';
import Step2_Type from '@/pages/Customer/Agents/Agent/wizard/Step2_Type';
import WizardStep3_SubAgents from '@/pages/Customer/Agents/Agent/wizard/WizardStep3_SubAgents';
import WizardStep3_TaskConfig from '@/pages/Customer/Agents/Agent/wizard/WizardStep3_TaskConfig';
import Step4_RoleGoal from '@/pages/Customer/Agents/Agent/wizard/Step4_RoleGoal';
import Step5_Instructions from '@/pages/Customer/Agents/Agent/wizard/Step5_Instructions';
import Step6_ApiKeyModel from '@/pages/Customer/Agents/Agent/wizard/Step6_ApiKeyModel';
import WizardStep4_Success from '@/pages/Customer/Agents/Agent/wizard/WizardStep4_Success';
import { ProviderSelector } from '@/components/agents/ProviderSelector';
import ExternalAgentConfig, { ExternalAgentConfigData } from '@/components/agents/ExternalAgentConfig';

// Types
interface WizardData {
  // Step 1: Nome
  name: string;
  description: string;

  // Step 2: Tipo
  type: string;

  // Step 3: Sub-agentes (sequential, parallel, loop)
  sub_agents: string[];

  // Step 3: Task config (task type only)
  tasks: { agent_id: string; description: string; expected_output: string; enabled_tools: string[] }[];

  // Step 4: Role e Goal (LLM only)
  role: string;
  goal: string;

  // Step 5: Instructions (LLM only)
  instruction: string;

  // Step 6: API Key e Model (LLM only)
  api_key_id: string;
  model: string;

  // External agent config
  provider?: string;
  externalConfig?: ExternalAgentConfigData;
}

interface AgentWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgentCreated?: () => void;
  embedded?: boolean;
}

const AgentWizardModal = ({ open, onOpenChange, onAgentCreated, embedded = false }: AgentWizardModalProps) => {
  const { t: tUi } = useUiTranslation();
  const { t } = useLanguage('aiAgents');

  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);

  // Wizard data
  const [wizardData, setWizardData] = useState<WizardData>({
    name: '',
    description: '',
    type: '',
    sub_agents: [],
    tasks: [],
    role: '',
    goal: '',
    instruction: '',
    api_key_id: '',
    model: '',
    provider: undefined,
    externalConfig: undefined,
  });

  // Reset wizard quando fechar
  useEffect(() => {
    if (!open) {
      // Delay para não mostrar reset durante animação de fechar
      const timeout = setTimeout(() => {
        setCurrentStep(1);
        setCreatedAgentId(null);
        setWizardData({
          name: '',
          description: '',
          type: '',
          sub_agents: [],
          tasks: [],
          role: '',
          goal: '',
          instruction: '',
          api_key_id: '',
          model: '',
          provider: undefined,
          externalConfig: undefined,
        });
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  // Carregar API Keys
  const loadApiKeys = useCallback(async () => {
    try {
      const apiKeysData = await listApiKeys();
      setApiKeys(apiKeysData);
    } catch (error) {
      console.error(t('messages.apiKeysError'), error);
    }
  }, [t]);

  useEffect(() => {
    if (open) {
      loadApiKeys();
    }
  }, [open, loadApiKeys]);

  useEffect(() => {
    if (open && contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [open, currentStep]);

  // Determinar passos baseado no tipo
  const getSteps = () => {
    const steps = [
      { id: 1, label: t('wizard.progress.name') },
      { id: 2, label: t('wizard.progress.type') },
    ];

    const typesWithSubAgents = ['sequential', 'parallel', 'loop'];

    if (wizardData.type === 'llm') {
      // Fluxo LLM: Nome → Tipo → Role/Goal → Instructions → API/Model → Sucesso
      steps.push(
        { id: 3, label: t('wizard.progress.role') },
        { id: 4, label: t('wizard.progress.instructions') },
        { id: 5, label: t('wizard.progress.model') },
        { id: 6, label: t('wizard.progress.completed') }
      );
    } else if (wizardData.type === 'task') {
      // Fluxo Task: Nome → Tipo → Task Config → Sucesso
      steps.push(
        { id: 3, label: t('wizard.progress.taskConfig') },
        { id: 4, label: t('wizard.progress.completed') }
      );
    } else if (wizardData.type === 'external') {
      // Fluxo External: Nome → Tipo → Provider → Configuração → Sucesso
      steps.push(
        { id: 3, label: t('wizard.progress.provider') },
        { id: 4, label: t('wizard.progress.configuration') },
        { id: 5, label: t('wizard.progress.completed') }
      );
    } else if (typesWithSubAgents.includes(wizardData.type)) {
      // Fluxo com sub-agentes: Nome → Tipo → Sub-agentes → Sucesso
      steps.push(
        { id: 3, label: t('wizard.progress.subAgents') },
        { id: 4, label: t('wizard.progress.completed') }
      );
    } else {
      // Outros tipos: Nome → Tipo → Sucesso
      steps.push({ id: 3, label: t('wizard.progress.completed') });
    }

    return steps;
  };

  const steps = getSteps();
  const totalSteps = steps.length;
  const typesWithSubAgents = ['sequential', 'parallel', 'loop'];

  const getCurrentStepHeader = () => {
    if (currentStep === 1) {
      return {
        title: t('wizard.step1.title'),
        subtitle: t('wizard.step1.subtitle'),
      };
    }

    if (currentStep === 2) {
      return {
        title: t('wizard.step2.title'),
        subtitle: t('wizard.step2.subtitle'),
      };
    }

    if (currentStep === 3) {
      if (wizardData.type === 'llm') {
        return {
          title: t('wizard.step4.title'),
          subtitle: t('wizard.step4.subtitle'),
        };
      }

      if (wizardData.type === 'task') {
        return {
          title: t('wizard.step3.taskConfig.title'),
          subtitle: t('wizard.step3.taskConfig.subtitle'),
        };
      }

      if (typesWithSubAgents.includes(wizardData.type)) {
        const titleByType: Record<string, string> = {
          sequential: t('wizard.step3.titles.sequential'),
          parallel: t('wizard.step3.titles.parallel'),
          loop: t('wizard.step3.titles.loop'),
        };
        const subtitleByType: Record<string, string> = {
          sequential: t('wizard.step3.descriptions.sequential'),
          parallel: t('wizard.step3.descriptions.parallel'),
          loop: t('wizard.step3.descriptions.loop'),
        };

        return {
          title: titleByType[wizardData.type] || t('wizard.step3.titles.default'),
          subtitle: subtitleByType[wizardData.type] || t('wizard.step3.descriptions.default'),
        };
      }
    }

    if (currentStep === 4 && wizardData.type === 'llm') {
      return {
        title: t('wizard.step5.title'),
        subtitle: t('wizard.step5.subtitle'),
      };
    }

    if (currentStep === 5 && wizardData.type === 'llm') {
      return {
        title: t('wizard.step6.title'),
        subtitle: t('wizard.step6.subtitle'),
      };
    }

    return {
      title: t('wizard.success.title'),
      subtitle: `${t('wizard.success.agentReady', { name: wizardData.name })}\n${t('wizard.success.whatNext')}`,
    };
  };

  const currentStepHeader = getCurrentStepHeader();

  // Handlers de navegação
  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Último step antes do sucesso: criar agente
      handleCreateAgent();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Criar agente
  const handleCreateAgent = async () => {
    const toastId = toast.loading(t('loading.creating'));

    try {
      setIsCreating(true);

      // Montar dados do agente
      const agentData: AgentCreate = {
        name: wizardData.name,
        description: wizardData.description || '',
        type: wizardData.type,
      };

      // Configuração específica para LLM
      if (wizardData.type === 'llm') {
        Object.assign(agentData, {
          model: wizardData.model,
          api_key_id: wizardData.api_key_id,
          instruction: wizardData.instruction,
          role: wizardData.role || '',
          goal: wizardData.goal || '',
        });

        agentData.config = {
          output_key: '',
          message_wait_time: 5,
          message_signature: '',
          enable_text_segmentation: false,
          max_characters_per_segment: 300,
          min_segment_size: 50,
          character_delay_ms: 0.05,
          sub_agents: wizardData.sub_agents,
          tools: [],
          agent_tools: [],
          custom_tools: {
            http_tools: [],
          },
          mcp_servers: [],
          custom_mcp_server_ids: [],
          custom_mcp_servers: [],
          load_memory: false,
          preload_memory: false,
          planner: false,
          load_knowledge: false,
          knowledge_tags: [],
          output_schema: {},
        };
      } else if (wizardData.type === 'task') {
        // Task-specific config
        agentData.config = {
          output_key: '',
          tasks: wizardData.tasks as unknown as Record<string, unknown>[],
          sub_agents: [],
          tools: [],
          agent_tools: [],
          custom_tools: {
            http_tools: [],
          },
          mcp_servers: [],
          custom_mcp_server_ids: [],
          custom_mcp_servers: [],
          load_memory: false,
          preload_memory: false,
          planner: false,
          load_knowledge: false,
          knowledge_tags: [],
          output_schema: {},
        };
      } else if (wizardData.type === 'external') {
        // External agent config
        if (!wizardData.provider) {
          toast.error(t('messages.providerRequired'), { id: toastId });
          setIsCreating(false);
          return;
        }
        agentData.config = {
          provider: wizardData.provider,
          output_key: '',
          sub_agents: [],
        };
      } else {
        // Sequential, parallel, loop types
        agentData.config = {
          output_key: '',
          sub_agents: wizardData.sub_agents,
          tools: [],
          agent_tools: [],
          custom_tools: {
            http_tools: [],
          },
          mcp_servers: [],
          custom_mcp_server_ids: [],
          custom_mcp_servers: [],
          load_memory: false,
          preload_memory: false,
          planner: false,
          load_knowledge: false,
          knowledge_tags: [],
          output_schema: {},
        };
      }

      const createdAgent = await createAgent(agentData);
      setCreatedAgentId(createdAgent.id);

      // Se for external agent, criar integração com configuração
      if (wizardData.type === 'external' && wizardData.provider && wizardData.externalConfig) {
        try {
          // Construir config baseado no provider
          const config: Record<string, any> = {};
          const extConfig = wizardData.externalConfig;

          if (wizardData.provider === 'flowise') {
            config.apiUrl = extConfig.flowise_apiUrl;
            config.apiKey = extConfig.flowise_apiKey;
          } else if (wizardData.provider === 'n8n') {
            config.webhookUrl = extConfig.n8n_webhookUrl;
            config.basicAuthUser = extConfig.n8n_basicAuthUser;
            config.basicAuthPass = extConfig.n8n_basicAuthPass;
          } else if (wizardData.provider === 'dify') {
            config.apiUrl = extConfig.dify_apiUrl;
            config.apiKey = extConfig.dify_apiKey;
            config.botType = extConfig.dify_botType || 'chatBot';
          } else if (wizardData.provider === 'openai') {
            config.apiKey = extConfig.openai_apiKey;
            config.botType = extConfig.openai_botType || 'assistant';
            config.assistantId = extConfig.openai_assistantId;
            config.model = extConfig.openai_model;
            config.maxTokens = extConfig.openai_maxTokens || 500;
          } else if (wizardData.provider === 'typebot') {
            config.url = extConfig.typebot_url;
            config.typebot = extConfig.typebot_typebot;
            config.apiVersion = extConfig.typebot_apiVersion || 'latest';
          }

          await integrationService.upsertIntegration(createdAgent.id, {
            provider: wizardData.provider,
            config,
          });
        } catch (error) {
          console.error('Error creating integration:', error);
          toast.error(t('messages.providerConfigError'), { id: toastId });
          // Não falhar a criação do agente se a integração falhar
        }
      }

      toast.success(t('messages.createSuccess'), { id: toastId });

      // Ir para tela de sucesso
      setCurrentStep(totalSteps);

      // Notificar criação
      if (onAgentCreated) {
        onAgentCreated();
      }
    } catch (error: unknown) {
      console.error(t('messages.createError'), error);

      const errorMessage = extractBackendErrorMessage(error);

      toast.error(t('messages.saveError'), {
        id: toastId,
        description: errorMessage,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleFinish = () => {
    onOpenChange(false);
  };

  // Renderizar step atual
  const renderCurrentStep = () => {
    // Step 1: Nome
    if (currentStep === 1) {
      return (
        <Step1_Name
          data={{ name: wizardData.name, description: wizardData.description }}
          onChange={(data) => setWizardData({ ...wizardData, ...data })}
          onNext={handleNext}
        />
      );
    }

    // Step 2: Tipo
    if (currentStep === 2) {
      return (
        <Step2_Type
          data={{ type: wizardData.type }}
          onChange={(data) => setWizardData({ ...wizardData, ...data })}
          onNext={handleNext}
          onBack={handleBack}
        />
      );
    }

    // Step 3: Depende do tipo
    if (currentStep === 3) {
      // Para LLM: Role e Goal
      if (wizardData.type === 'llm') {
        return (
          <Step4_RoleGoal
            data={{ role: wizardData.role, goal: wizardData.goal }}
            onChange={(data) => setWizardData({ ...wizardData, ...data })}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      }

      // Para External: Provider Selection
      if (wizardData.type === 'external') {
        return (
          <div className="space-y-6">
            <ProviderSelector
              value={wizardData.provider as any}
              onChange={(provider) => {
                setWizardData({
                  ...wizardData,
                  provider,
                  externalConfig: {
                    ...wizardData.externalConfig,
                    provider,
                  } as ExternalAgentConfigData
                });
              }}
            />
            <div className="flex justify-between">
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('wizardActions.back')}
              </button>
              <button
                onClick={handleNext}
                disabled={!wizardData.provider}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('wizardActions.next')}
              </button>
            </div>
          </div>
        );
      }

      // Para Task: Task Config
      if (wizardData.type === 'task') {
        return (
          <WizardStep3_TaskConfig
            data={{ tasks: wizardData.tasks }}
            onChange={(data) => setWizardData({ ...wizardData, tasks: data.tasks })}
            onNext={handleNext}
            onBack={handleBack}
            folderId={undefined}
          />
        );
      }

      // Para tipos com sub-agentes
      if (typesWithSubAgents.includes(wizardData.type)) {
        return (
          <WizardStep3_SubAgents
            data={{ sub_agents: wizardData.sub_agents }}
            onChange={(data) => setWizardData({ ...wizardData, sub_agents: data.sub_agents })}
            onNext={handleNext}
            onBack={handleBack}
            agentType={wizardData.type}
          />
        );
      }

      // Outros tipos: Sucesso
      if (createdAgentId) {
        return (
          <WizardStep4_Success
            agentId={createdAgentId}
            agentName={wizardData.name}
            onFinish={handleFinish}
          />
        );
      }
    }

    // Step 4: Depende do tipo
    if (currentStep === 4) {
      // Para LLM: Instructions
      if (wizardData.type === 'llm') {
        return (
          <Step5_Instructions
            data={{ instruction: wizardData.instruction }}
            onChange={(data) => setWizardData({ ...wizardData, ...data })}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      }

      // Para External: Configuração do Provider
      if (wizardData.type === 'external') {
        if (!wizardData.provider) {
          // Se não tem provider selecionado, voltar para step anterior
          handleBack();
          return null;
        }

        const externalConfigData: ExternalAgentConfigData = wizardData.externalConfig || {
          provider: wizardData.provider as any,
        };

        return (
          <div className="space-y-6">
            <ExternalAgentConfig
              mode="create"
              data={externalConfigData}
              onChange={(data) => setWizardData({ ...wizardData, externalConfig: data })}
              onValidationChange={() => {
                // Validação será verificada no handleNext
              }}
            />
            <div className="flex justify-between pt-4 border-t">
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('edit.configuration.sections.externalIntegration.wizard.back')}
              </button>
              <button
                onClick={handleNext}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                {t('edit.configuration.sections.externalIntegration.wizard.createAgent')}
              </button>
            </div>
          </div>
        );
      }

      // Para Task ou tipos com sub-agentes: Sucesso
      if (
        (wizardData.type === 'task' ||
          typesWithSubAgents.includes(wizardData.type)) &&
        createdAgentId
      ) {
        return (
          <WizardStep4_Success
            agentId={createdAgentId}
            agentName={wizardData.name}
            onFinish={handleFinish}
          />
        );
      }
    }

    // Step 5: Para LLM - API Key e Model
    if (currentStep === 5 && wizardData.type === 'llm') {
      return (
        <Step6_ApiKeyModel
          data={{
            api_key_id: wizardData.api_key_id,
            model: wizardData.model,
          }}
          onChange={(data) => setWizardData({ ...wizardData, ...data })}
          onNext={handleNext}
          onBack={handleBack}
          apiKeys={apiKeys}
          onApiKeysReload={loadApiKeys}
        />
      );
    }

    // Step 5: Para External - Sucesso
    if (currentStep === 5 && wizardData.type === 'external' && createdAgentId) {
      return (
        <WizardStep4_Success
          agentId={createdAgentId}
          agentName={wizardData.name}
          onFinish={handleFinish}
        />
      );
    }

    // Step 6: Para LLM - Sucesso
    if (currentStep === 6 && wizardData.type === 'llm' && createdAgentId) {
      return (
        <WizardStep4_Success
          agentId={createdAgentId}
          agentName={wizardData.name}
          onFinish={handleFinish}
        />
      );
    }

    return null;
  };

  const wizardContent = (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-end px-3 pt-3 pb-0 flex-shrink-0">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={tUi("interface:agentwizardmodal.closeWizard")}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="border-b bg-transparent p-3 pt-1.5 flex-shrink-0">
          <div className="text-center">
            <h2 className="text-2xl font-semibold leading-tight">{currentStepHeader.title}</h2>
            {currentStepHeader.subtitle ? (
              <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{currentStepHeader.subtitle}</p>
            ) : null}
          </div>
        </div>

        {/* Progress */}
        {currentStep < totalSteps && (
          <div className="py-2 px-4 flex-shrink-0 bg-transparent">
            <WizardProgress currentStep={currentStep} totalSteps={totalSteps} steps={steps} />
          </div>
        )}

        {/* Content - Scrollable apenas quando necessário */}
        <div ref={contentRef} className="flex-1 overflow-y-auto px-3 min-h-0">
          {isCreating ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-lg font-medium">{tUi("aiAgents:messages.creating")}</p>
              </div>
            </div>
          ) : (
            renderCurrentStep()
          )}
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="w-full h-full min-h-0 bg-background overflow-hidden">
        {wizardContent}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[72vw] !max-w-[72vw] h-[94vh] max-h-[94vh] overflow-hidden p-0 sm:!max-w-[72vw]">
        {wizardContent}
      </DialogContent>
    </Dialog>
  );
};

export default AgentWizardModal;
