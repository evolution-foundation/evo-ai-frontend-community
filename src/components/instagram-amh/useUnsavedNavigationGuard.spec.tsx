import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Link, useLocation } from 'react-router-dom';
import { useUnsavedNavigationGuard } from './useUnsavedNavigationGuard';
function Harness() {
  useUnsavedNavigationGuard(true);
  const location = useLocation();
  return (
    <>
      <span>{location.pathname}</span>
      <Link to="/other">Sair</Link>
    </>
  );
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('keeps edits on cancelled in-app navigation and allows an explicitly confirmed exit', () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  render(
    <MemoryRouter initialEntries={['/amh']}>
      <Harness />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByText('Sair'));
  expect(confirm).toHaveBeenCalledOnce();
  expect(screen.getByText('/amh')).toBeInTheDocument();
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByText('Sair'));
  expect(screen.getByText('/other')).toBeInTheDocument();
});
