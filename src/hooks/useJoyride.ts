import { useTranslation as useUiTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { useJoyride as useJoyrideLib, EVENTS, STATUS } from 'react-joyride';
import type { Step } from 'react-joyride';
import { JoyrideTooltip } from '@/tours/JoyrideTooltip';
import { useAuthStore } from '@/store/authStore';

interface UseJoyrideOptions {
  tourKey: string;
  steps: Step[];
  autoStart?: boolean;
}

export function useJoyride({ tourKey, steps, autoStart = true }: UseJoyrideOptions) {
  const { t: tUi } = useUiTranslation();
  const tours = useAuthStore(state => state.tours);
  const markTourCompleted = useAuthStore(state => state.markTourCompleted);
  const markTourSkipped = useAuthStore(state => state.markTourSkipped);
  const resetTourInStore = useAuthStore(state => state.resetTour);

  const { Tour, controls, on } = useJoyrideLib({
    steps,
    continuous: true,
    scrollToFirstStep: true,
    tooltipComponent: JoyrideTooltip,
    floatingOptions: {
      strategy: 'fixed',
      shiftOptions: {
        boundary: 'clippingAncestors',
        rootBoundary: 'viewport',
        padding: 20,
      },
      flipOptions: {
        boundary: 'clippingAncestors',
        rootBoundary: 'viewport',
        padding: 20,
      },
    },
    options: {
      skipBeacon: true,
      zIndex: 10000,
      arrowColor: '#252836',
      scrollOffset: 80,
      skipScroll: false,
    },
    locale: {
      back: tUi("tours:back"),
      close: tUi("tours:close"),
      last: tUi("tours:finish"),
      next: tUi("tours:next"),
      open: tUi("interface:usejoyride.openTour"),
      skip: tUi("aiAgents:actions.skip"),
    },
  });

  // Mark completed only when the user finishes all steps.
  // Clicking "x" (status = skipped) just interrupts without persisting completion.
  useEffect(() => {
    const unsubscribe = on(EVENTS.TOUR_END, (data: any) => {
      if (data?.status === STATUS.FINISHED) {
        markTourCompleted(tourKey);
      } else if (data?.status === STATUS.SKIPPED) {
        markTourSkipped(tourKey);
      }
    });
    return unsubscribe;
  }, [on, tourKey, markTourCompleted, markTourSkipped]);

  // Auto-start on first visit (only after welcome modal has been dismissed and user chose guided tour)
  useEffect(() => {
    if (!autoStart) return;

    const welcomeSeen = tours['onboarding:welcome'];
    if (!welcomeSeen) return;

    // Only auto-start tours if the user opted into the guided tour
    if (tours['onboarding:preference'] !== 'completed') return;

    const seen = tours[tourKey];
    if (!seen) {
      const timer = setTimeout(() => controls.start(), 600);
      return () => clearTimeout(timer);
    }
  }, [tourKey, autoStart, controls, tours]);

  const resetTour = () => {
    resetTourInStore(tourKey);
    controls.reset(true);
  };

  return {
    Tour,
    controls,
    resetTour,
    isCompleted: tours[tourKey] === 'completed',
  };
}
