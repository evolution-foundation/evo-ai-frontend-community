import { useTranslation as useUiTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { AgentCreate } from '@/types/agents';

interface ValidationRule {
  field: string;
  message: string;
  validate: (data: Partial<AgentCreate>) => boolean;
}

export const useAgentValidation = (data: Partial<AgentCreate>) => {
  const { t: tUi } = useUiTranslation();
  // Regras de validação
  const validationRules: ValidationRule[] = useMemo(
    () => [
      {
        field: 'name',
        message: tUi("api:validation.nameRequired"),
        validate: data => !!data.name?.trim(),
      },
      {
        field: 'description',
        message: tUi("aiAgents:validation.descriptionRequired"),
        validate: data => !!data.description?.trim(),
      },
      {
        field: 'type',
        message: tUi("interface:useagentvalidation.agentTypeIsRequired"),
        validate: data => !!data.type,
      },
      {
        field: 'model',
        message: tUi("interface:useagentvalidation.aModelIsRequiredForLlmAgents"),
        validate: data => data.type !== 'llm' || !!data.model?.trim(),
      },
      {
        field: 'client_id',
        message: tUi("interface:useagentvalidation.clientIdIsRequired"),
        validate: data => !!data.client_id,
      },
    ],
    [tUi],
  );

  // Validação específica por tipo de agente
  const typeSpecificValidation = useMemo(() => {
    const rules: Record<string, ValidationRule[]> = {
      llm: [
        {
          field: 'model',
          message: tUi("interface:useagentvalidation.aModelIsRequiredForLlmAgents"),
          validate: data => !!data.model?.trim(),
        },
      ],
      a2a: [
        {
          field: 'instruction',
          message: tUi("interface:useagentvalidation.instructionsAreRecommendedForA2aAgents"),
          validate: data => !!data.instruction?.trim(),
        },
      ],
      sequential: [
        {
          field: 'config.sub_agents',
          message: tUi("interface:useagentvalidation.atLeastOneSubAgentIsRequired"),
          validate: data => !!data.config?.sub_agents && data.config.sub_agents.length > 0,
        },
      ],
      parallel: [
        {
          field: 'config.sub_agents',
          message: tUi("interface:useagentvalidation.atLeastOneSubAgentIsRequired"),
          validate: data => !!data.config?.sub_agents && data.config.sub_agents.length > 0,
        },
      ],
      loop: [
        {
          field: 'config.sub_agents',
          message: tUi("interface:useagentvalidation.atLeastOneSubAgentIsRequired"),
          validate: data => !!data.config?.sub_agents && data.config.sub_agents.length > 0,
        },
        {
          field: 'config.max_iterations',
          message: tUi("interface:useagentvalidation.maximumIterationsMustBeGreaterThan0"),
          validate: data => !data.config?.max_iterations || data.config.max_iterations > 0,
        },
      ],
      workflow: [
        {
          field: 'config.workflow',
          message: tUi("interface:useagentvalidation.workflowConfigurationIsRequired"),
          validate: data => !!data.config?.workflow,
        },
      ],
      task: [
        {
          field: 'config.tasks',
          message: tUi("interface:useagentvalidation.atLeastOneTaskMustBeConfigured"),
          validate: data => !!data.config?.tasks && data.config.tasks.length > 0,
        },
      ],
    };

    return data.type ? rules[data.type] || [] : [];
  }, [data.type, tUi]);

  // Executar validações
  const errors = useMemo(() => {
    const allRules = [...validationRules, ...typeSpecificValidation];
    const validationErrors: Record<string, string> = {};

    allRules.forEach(rule => {
      if (!rule.validate(data)) {
        validationErrors[rule.field] = rule.message;
      }
    });

    return validationErrors;
  }, [data, validationRules, typeSpecificValidation]);

  // Validações por step
  const validateStep = (step: number): Record<string, string> => {
    const stepErrors: Record<string, string> = {};

    switch (step) {
      case 0: // BasicInfo
        ['name', 'description', 'type', 'model'].forEach(field => {
          if (errors[field]) {
            stepErrors[field] = errors[field];
          }
        });
        break;

      case 1: // Configuration
        // Validações específicas de configuração baseadas no tipo
        Object.keys(errors).forEach(field => {
          if (field.startsWith('config.') || field === 'model') {
            stepErrors[field] = errors[field];
          }
        });
        break;

      case 2: // SubAgents
        ['config.sub_agents', 'config.agent_tools'].forEach(field => {
          if (errors[field]) {
            stepErrors[field] = errors[field];
          }
        });
        break;
    }

    return stepErrors;
  };

  // Validar se step pode ser finalizado
  const canCompleteStep = (step: number): boolean => {
    const stepErrors = validateStep(step);
    return Object.keys(stepErrors).length === 0;
  };

  // Validar se formulário inteiro é válido
  const isFormValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  // Validar campo específico
  const validateField = (field: string): string | null => {
    return errors[field] || null;
  };

  // Validar se dados mínimos estão presentes
  const hasMinimumData = useMemo(() => {
    return !!(data.name?.trim() && data.description?.trim() && data.type);
  }, [data.name, data.description, data.type]);

  return {
    errors,
    isFormValid,
    hasMinimumData,
    validateStep,
    canCompleteStep,
    validateField,
    validationRules,
    typeSpecificValidation,
  };
};
