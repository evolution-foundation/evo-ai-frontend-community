import { Route, Routes } from 'react-router-dom';
import { inventoryRoutes } from '@/pages/Customer/Settings/Inventory';

export default function InventoryRoutes() {
  return (
    <Routes>
      {inventoryRoutes.map((r, i) => (
        <Route key={i} path={r.path} element={r.element} />
      ))}
    </Routes>
  );
}
