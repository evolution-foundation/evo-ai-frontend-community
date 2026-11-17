import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import DealDetailPage from './DealDetailPage';

function Where() {
  const location = useLocation();
  return <div data-testid="where">{location.pathname + location.search}</div>;
}

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/pipelines/:pipelineId/deals/:dealId" element={<DealDetailPage />} />
        <Route path="/pipelines/:pipelineId" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

describe('DealDetailPage (deep link legado)', () => {
  it('redireciona para o kanban com o negócio aberto como modal na aba pedida', () => {
    renderAt('/pipelines/p1/deals/d1?tab=deal');
    expect(screen.getByTestId('where')).toHaveTextContent('/pipelines/p1?deal=d1&tab=deal');
  });
  it('usa Atividades quando a aba é desconhecida ou ausente', () => {
    renderAt('/pipelines/p1/deals/d1?tab=nada');
    expect(screen.getByTestId('where')).toHaveTextContent('/pipelines/p1?deal=d1&tab=activities');
  });
});
