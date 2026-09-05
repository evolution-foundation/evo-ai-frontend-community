import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { pipelinesService } from '@/services/pipelines';

/**
 * Alvo estável para o item "Tarefas" de Meu Espaço: resolve o pipeline padrão
 * (ou o primeiro disponível, se nenhum estiver marcado como padrão) e
 * redireciona para o Kanban dele — sem precisar guardar um pipeline_id fixo
 * no item de menu.
 */
export default function DefaultPipelineRedirect() {
  const { t } = useLanguage('pipelines');
  const [pipelineId, setPipelineId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    pipelinesService
      .getPipelines({ per_page: 100, sort: 'name', order: 'asc' })
      .then(response => {
        if (cancelled) return;
        const pipelines = response.data || [];
        const target = pipelines.find(p => p.is_default) || pipelines[0];
        if (target) {
          setPipelineId(target.id);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error(t('messages.loadError'));
          setNotFound(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (pipelineId) return <Navigate to={`/pipelines/${pipelineId}`} replace />;
  if (notFound) return <Navigate to="/pipelines" replace />;
  return null;
}
