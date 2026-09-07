import { useTranslation as useUiTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef } from 'react';
import type { Step } from 'react-joyride';
import { useJoyride } from '@/hooks/useJoyride';
import { tourRegistry } from './tourRegistry';

const ROUTE = '/contacts/scheduled-actions';

export function ScheduledActionsTour() {
  const { t: tUi } = useUiTranslation();
  const { Tour, controls } = useJoyride({
    tourKey: 'scheduled-actions',
    steps: useMemo<Step[]>(
      () => [
        {
          target: '[data-tour="scheduled-actions-page"]',
          title: tUi("contacts:scheduledActions.label"),
          content: tUi("interface:scheduledactionstour.viewAndManageActionsScheduledToRunAutomaticallyForContacts"),
          placement: 'auto',
          disableBeacon: true,
          disableScrolling: true,
        },
        {
          target: '[data-tour="scheduled-actions-search"]',
          title: tUi("interface:scheduledactionstour.searchActions"),
          content: tUi("interface:scheduledactionstour.searchScheduledActionsByContactNameActionTypeOrAnother"),
          placement: 'auto',
          disableBeacon: true,
          disableScrolling: true,
        },
        {
          target: '[data-tour="scheduled-actions-new-button"]',
          title: tUi("contacts:scheduledActions.title"),
          content: tUi("interface:scheduledactionstour.createAScheduledActionChooseAContactActionTypeAnd"),
          placement: 'auto',
          disableBeacon: true,
          disableScrolling: true,
        },
        {
          target: '[data-tour="scheduled-actions-content"]',
          title: tUi("interface:scheduledactionstour.actionsList"),
          content: tUi("interface:scheduledactionstour.viewEachActionSStatusScheduledCompletedOrCancelledAnd"),
          placement: 'auto',
          disableBeacon: true,
          disableScrolling: true,
        },
      ],
      [tUi],
    ),
  });
  const controlsRef = useRef(controls);
  controlsRef.current = controls;

  useEffect(() => {
    tourRegistry.register(ROUTE, () => controlsRef.current.reset(true));
    return () => tourRegistry.unregister(ROUTE);
  }, []);

  return <>{Tour}</>;
}
