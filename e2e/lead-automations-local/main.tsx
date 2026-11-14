import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@/i18n/config';
import '@/styles/globals.css';
import { LeadAutomationsScreen } from '@/pages/Customer/Settings/LeadAutomations/LeadAutomations';
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LeadAutomationsScreen />
    </BrowserRouter>
  </React.StrictMode>,
);
