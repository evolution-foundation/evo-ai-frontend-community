import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { isDealTab } from './deal/dealContext';

/**
 * Deep link legado `/pipelines/:pipelineId/deals/:dealId`: o negócio agora abre como modal
 * sobre o kanban (`/pipelines/:pipelineId?deal=<id>&tab=<aba>`), mantendo a URL compartilhável.
 */
export default function DealDetailPage() {
  const { pipelineId, dealId } = useParams<{ pipelineId: string; dealId: string }>();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  const query = new URLSearchParams({ deal: dealId || '' });
  query.set('tab', isDealTab(tab) ? tab : 'activities');
  return <Navigate replace to={`/pipelines/${pipelineId}?${query.toString()}`} />;
}
