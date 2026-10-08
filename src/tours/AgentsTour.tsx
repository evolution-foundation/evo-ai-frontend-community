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
  const { Tour, controls } = useJoyride({
    tourKey: 'agents-custom-tools',
    steps: useMemo<Step[]>(
      () => [
        {
          target: '[data-tour="agents-custom-tools-page"]',
          title: 'Custom Tools',
          content: 'Crie e gerencie ferramentas personalizadas que seus Agentes de IA podem utilizar durante o atendimento.',
          placement: 'auto',
          disableBeacon: true,
          disableScrolling: true,
        },
        {
          target: '[data-tour="agents-custom-tools-header"]',
          title: 'Barra de Ferramentas',
          content: 'Busque tools existentes, aplique filtros ou crie uma nova tool clicando em "Nova Tool".',
          placement: 'auto',
          disableBeacon: true,
          disableScrolling: true,
        },
        {
          target: '[data-tour="agents-custom-tools-content"]',
          title: 'Lista de Custom Tools',
          content: 'Cada linha exibe nome, método, endpoint e tags da tool. Use o botão Testar e o menu ⋯ para editar ou excluir. Ferramentas testadas garantem que o Agente as use corretamente.',
          placement: 'auto',
          disableBeacon: true,
          disableScrolling: true,
        },
      ],
      [],
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
  const { Tour, controls } = useJoyride({
    tourKey: 'agents-custom-mcps',
    steps: useMemo<Step[]>(
      () => [
        {
          target: '[data-tour="agents-custom-mcps-page"]',
          title: 'Custom MCP Servers',
          content: 'Configure servidores MCP personalizados para expandir as capacidades dos seus Agentes de IA com contextos e ferramentas externas.',
          placement: 'auto',
          disableBeacon: true,
          disableScrolling: true,
        },
        {
          target: '[data-tour="agents-custom-mcps-header"]',
          title: 'Barra de Ferramentas',
          content: 'Busque servidores MCP existentes, filtre por critérios ou adicione um novo servidor clicando em "Novo Servidor".',
          placement: 'auto',
          disableBeacon: true,
          disableScrolling: true,
        },
        {
          target: '[data-tour="agents-custom-mcps-content"]',
          title: 'Lista de Servidores MCP',
          content: 'Cada servidor exibe nome, URL de conexão e status. Use as ações para editar, testar a conexão ou excluir o servidor.',
          placement: 'auto',
          disableBeacon: true,
          disableScrolling: true,
        },
      ],
      [],
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
