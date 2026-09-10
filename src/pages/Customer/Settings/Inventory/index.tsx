import { lazy } from 'react';

const InventoryPage = lazy(() => import('./InventoryPage'));

export const inventoryRoutes = [
  {
    path: '/inventory',
    element: <InventoryPage />,
    resource: 'products',
    action: 'read',
  },
];
