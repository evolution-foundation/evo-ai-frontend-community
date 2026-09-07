import { useTranslation as useUiTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef } from 'react';
import type { Step } from 'react-joyride';
import { useJoyride } from '@/hooks/useJoyride';
import { useTranslation } from '@/hooks/useTranslation';
import { tourRegistry } from './tourRegistry';

const ROUTE = '/agents/list';

export function AgentsTour() {
  const { t } = useTranslation('tours');
  const { Tour, controls } = useJoyride({
    tourKey: 'agents',
    steps: useMemo<Step[]>(
      () => [
        {
          target: '[data-tour="agents-header"]',
          title: t('agents.step1.title'),
          content: t('agents.step1.content'),
          placement: 'bottom',
          skipBeacon: true,
          skipScroll: false,
          scrollOffset: 80,
        },
        {
          target: '[data-tour="agents-new-button"]',
          title: t('agents.step2.title'),
          content: t('agents.step2.content'),
          placement: 'bottom',
          skipBeacon: true,
          skipScroll: false,
          scrollOffset: 80,
        },
        {
          target: '[data-tour="agents-api-keys"]',
          title: t('agents.step3.title'),
          content: t('agents.step3.content'),
          placement: 'bottom',
          skipBeacon: true,
          skipScroll: false,
          scrollOffset: 80,
        },
        {
          target: '[data-tour="agents-view-toggle"]',
          title: t('agents.step4.title'),
          content: t('agents.step4.content'),
          placement: 'bottom',
          skipBeacon: true,
          skipScroll: false,
          scrollOffset: 80,
        },
        {
          target: '[data-tour="agents-list"]',
          title: t('agents.step5.title'),
          content: t('agents.step5.content'),
          placement: 'top',
          skipBeacon: true,
          skipScroll: false,
          scrollOffset: 80,
        },
      ],
      [t],
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

// ---------------------------------------------------------------------------
// Custom Tools Tour
// ---------------------------------------------------------------------------
const CUSTOM_TOOLS_ROUTE = '/agents/custom-tools';

export function AgentsCustomToolsTour() {
  const { t: tUi } = useUiTranslation();
  const { Tour, controls } = useJoyride({
    tourKey: 'agents-custom-tools',
    steps: useMemo<Step[]>(
      () => [
        {
          target: '[data-tour="agents-custom-tools-page"]',
          title: tUi("customTools:title"),
          content: tUi("interface:agentstour.createAndManageCustomToolsForYourAiAgentsTo"),
          placement: 'auto',
          disableBeacon: true,
          disableScrolling: true,
        },
        {
          target: '[data-tour="agents-custom-tools-header"]',
          title: tUi("tours:settingsTeams.step2.title"),
          content: tUi("interface:agentstour.searchExistingToolsApplyFiltersOrCreateAToolBy"),
          placement: 'auto',
          disableBeacon: true,
          disableScrolling: true,
        },
        {
          target: '[data-tour="agents-custom-tools-view-toggle"]',
          title: tUi("tours:agents.step4.title"),
          content: tUi("interface:agentstour.switchBetweenCardAndTableViews"),
          placement: 'auto',
          disableBeacon: true,
          disableScrolling: true,
        },
        {
          target: '[data-tour="agents-custom-tools-content"]',
          title: tUi("interface:agentstour.customToolsList"),
          content: tUi("interface:agentstour.eachCardShowsTheToolSNameDescriptionAndStatus"),
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
    tourRegistry.register(CUSTOM_TOOLS_ROUTE, () => controlsRef.current.reset(true));
    return () => tourRegistry.unregister(CUSTOM_TOOLS_ROUTE);
  }, []);

  return <>{Tour}</>;
}

// ---------------------------------------------------------------------------
// Custom MCP Servers Tour
// ---------------------------------------------------------------------------
const CUSTOM_MCPS_ROUTE = '/agents/custom-mcp-servers';

export function AgentsCustomMCPsTour() {
  const { t: tUi } = useUiTranslation();
  const { Tour, controls } = useJoyride({
    tourKey: 'agents-custom-mcps',
    steps: useMemo<Step[]>(
      () => [
        {
          target: '[data-tour="agents-custom-mcps-page"]',
          title: tUi("customMcpServers:title"),
          content: tUi("interface:agentstour.configureCustomMcpServersToGiveYourAiAgentsAccess"),
          placement: 'auto',
          disableBeacon: true,
          disableScrolling: true,
        },
        {
          target: '[data-tour="agents-custom-mcps-header"]',
          title: tUi("tours:settingsTeams.step2.title"),
          content: tUi("interface:agentstour.searchForExistingMcpServersFilterThemOrAddOne"),
          placement: 'auto',
          disableBeacon: true,
          disableScrolling: true,
        },
        {
          target: '[data-tour="agents-custom-mcps-view-toggle"]',
          title: tUi("tours:agents.step4.title"),
          content: tUi("interface:agentstour.switchBetweenCardAndTableViewsToSuitYourPreference"),
          placement: 'auto',
          disableBeacon: true,
          disableScrolling: true,
        },
        {
          target: '[data-tour="agents-custom-mcps-content"]',
          title: tUi("interface:agentstour.mcpServersList"),
          content: tUi("interface:agentstour.eachServerShowsItsNameConnectionUrlAndStatusUse"),
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
    tourRegistry.register(CUSTOM_MCPS_ROUTE, () => controlsRef.current.reset(true));
    return () => tourRegistry.unregister(CUSTOM_MCPS_ROUTE);
  }, []);

  return <>{Tour}</>;
}
