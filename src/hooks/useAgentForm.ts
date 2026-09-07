import { useTranslation as useUiTranslation } from 'react-i18next';
import { useAgentForm as useAgentFormContext } from '@/contexts/AgentFormContext';
import { AgentCreate } from '@/types/agents';

// Hook principal que combina o contexto com funcionalidades adicionais
export const useAgentForm = () => {
  const { t: tUi } = useUiTranslation();
  const context = useAgentFormContext();

  if (!context) {
    throw new Error('useAgentForm deve ser usado dentro de um AgentFormProvider');
  }

  // Funcionalidades adicionais específicas do formulário
  const onChange = (newData: Partial<AgentCreate>) => {
    context.dispatch({ type: 'SET_DATA', payload: newData });
  };

  const handleFieldChange = (field: keyof AgentCreate, value: unknown) => {
    context.updateField(field, value);
  };

  const handleConfigChange = (field: string, value: unknown) => {
    context.updateConfig(field, value);
  };

  // Validação específica de cada step
  const validateCurrentStep = (): boolean => {
    const { currentStep, data } = context.state;

    switch (currentStep) {
      case 0: // BasicInfo
        if (!data.name?.trim()) {
          context.setError('name', tUi("api:validation.nameRequired"));
          return false;
        }
        if (!data.description?.trim()) {
          context.setError('description', tUi("aiAgents:validation.descriptionRequired"));
          return false;
        }
        if (!data.type) {
          context.setError('type', tUi("interface:useagentform.agentTypeIsRequired"));
          return false;
        }
        if (data.type === 'llm' && !data.model?.trim()) {
          context.setError('model', tUi("interface:useagentform.aModelIsRequiredForLlmAgents"));
          return false;
        }
        break;

      case 1: // Configuration
        // Validações específicas de configuração
        if (data.type === 'llm' && !data.model?.trim()) {
          context.setError('model', tUi("interface:useagentform.aModelIsRequiredForLlmAgents"));
          return false;
        }
        break;

      case 2: // SubAgents
        // SubAgents é opcional, então sempre válido
        break;
    }

    return true;
  };

  // Submissão do formulário
  const submitForm = async (): Promise<boolean> => {
    if (!context.state.isValid) {
      return false;
    }

    try {
      context.setSubmitting(true);
      return true;
    } catch (error) {
      console.error('Erro ao submeter formulário:', error);
      return false;
    } finally {
      context.setSubmitting(false);
    }
  };

  // Funções de navegação com validação
  const goToNextStep = (): boolean => {
    if (!validateCurrentStep()) {
      return false;
    }

    if (context.canProceedToNextStep()) {
      context.nextStep();
      return true;
    }

    return false;
  };

  const goToPrevStep = (): void => {
    context.prevStep();
  };

  // Getter para dados do formulário
  const getFormData = (): Partial<AgentCreate> => {
    return context.state.data;
  };

  // Getter para erros
  const getErrors = (): Record<string, string> => {
    return context.state.errors;
  };

  // Getter para status
  const getFormStatus = () => {
    return {
      isDirty: context.state.isDirty,
      isValid: context.state.isValid,
      isSubmitting: context.state.isSubmitting,
      currentStep: context.state.currentStep,
      totalSteps: context.state.totalSteps,
    };
  };

  return {
    // Estado
    ...context.state,

    // Métodos do contexto
    ...context,

    // Métodos adicionais
    onChange,
    handleFieldChange,
    handleConfigChange,
    validateCurrentStep,
    submitForm,
    goToNextStep,
    goToPrevStep,
    getFormData,
    getErrors,
    getFormStatus,
  };
};
