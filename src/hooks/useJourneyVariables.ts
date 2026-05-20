import { useState, useEffect, useCallback } from 'react';
import { journeyService } from '../services/journeys/journeyService';

export interface JourneyVariable {
  id: string;
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date';
  defaultValue?: string;
  description?: string;
}

interface UseJourneyVariablesReturn {
  variables: JourneyVariable[];
  loading: boolean;
  error: string | null;
  fetchVariables: () => Promise<void>;
  updateVariables: (variables: JourneyVariable[]) => Promise<void>;
  addVariable: (variable: Omit<JourneyVariable, 'id'>) => Promise<JourneyVariable>;
  updateVariable: (id: string, updates: Partial<JourneyVariable>) => Promise<void>;
  deleteVariable: (id: string) => Promise<void>;
}

export function useJourneyVariables(journeyId?: string): UseJourneyVariablesReturn {
  const [variables, setVariables] = useState<JourneyVariable[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVariables = useCallback(async () => {
    if (!journeyId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await journeyService.getJourneyVariables(journeyId);
      setVariables(response.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('❌ Erro ao buscar variáveis:', err);
    } finally {
      setLoading(false);
    }
  }, [journeyId]);

  const updateVariables = useCallback(
    async (newVariables: JourneyVariable[]) => {
      if (!journeyId) {
        console.warn('⚠️ updateVariables called without journeyId or accountId');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await journeyService.updateJourneyVariables(journeyId, newVariables);
        setVariables(response.data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        console.error('❌ Erro ao salvar variáveis:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [journeyId],
  );

  const addVariable = useCallback(
    async (variableData: Omit<JourneyVariable, 'id'>): Promise<JourneyVariable> => {
      const newVariable: JourneyVariable = {
        ...variableData,
        id: `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      const updatedVariables = [...variables, newVariable];

      try {
        await updateVariables(updatedVariables);
        return newVariable;
      } catch (error) {
        console.error('❌ Failed to add variable:', error);
        throw error;
      }
    },
    [variables, updateVariables],
  );

  const updateVariable = useCallback(
    async (id: string, updates: Partial<JourneyVariable>) => {
      const updatedVariables = variables.map(v => (v.id === id ? { ...v, ...updates } : v));
      await updateVariables(updatedVariables);
    },
    [variables, updateVariables],
  );

  const deleteVariable = useCallback(
    async (id: string) => {
      const updatedVariables = variables.filter(v => v.id !== id);
      await updateVariables(updatedVariables);
    },
    [variables, updateVariables],
  );

  useEffect(() => {
    if (journeyId) {
      fetchVariables();
    }
  }, [journeyId, fetchVariables]);

  return {
    variables,
    loading,
    error,
    fetchVariables,
    updateVariables,
    addVariable,
    updateVariable,
    deleteVariable,
  };
}
