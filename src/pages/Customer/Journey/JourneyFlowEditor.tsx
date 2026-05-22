import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from '@evoapi/design-system';
import { toast } from 'sonner';
import { journeyService } from '@/services';
import type { Journey } from '@/types/automation';
import { useLanguage } from '@/hooks/useLanguage';
import { BaseFlowEditor, type NodeType, type NodeCategory } from '@/components/base';
import { EnvironmentManager } from '@/components/journey/environment-manager';
import { JourneyEditorHeader } from '@/components/journey/shared/JourneyEditorHeader';
import { SessionsViewer } from '@/components/journey/SessionsViewer';
import ErrorBoundary from '@/components/ErrorBoundary';
import { formatRelativeTime } from '@/lib/relativeTime';
import { useRelativeTime } from '@/lib/useRelativeTime';
import {
  useFlowEditorStore,
  registerAutosaveTrigger,
  normalizeNodesForPersist,
  type FlowSnapshot,
} from '@/store/flowEditor/useFlowEditorStore';
import { loadSnapshot } from '@/store/flowEditor/idbSnapshot';
import { loadLastSavedAt } from '@/store/flowEditor/lastSavedMark';
import { FlowFeedbackBanner } from '@/components/journey/_ui';

// Importar todos os nodes da jornada por categoria
import { JourneyTriggerNode } from '@/components/journey/nodes/trigger/JourneyTriggerNode';
import {
  WaitNode,
  ConditionalNode,
  ScheduledActionNode,
  SplitNode,
  ExitJourneyNode,
  SendWebhookNode,
  AddLabelNode,
  RemoveLabelNode,
  UpdateContactNode,
  UpdateCustomAttributeNode,
  TransferJourneyNode,
  SendMessageNode,
  SetVariableNode,
  AssignAgentNode,
  AssignTeamNode,
  AssignBotNode,
  SendEmailTeamNode,
  SendTranscriptNode,
  MuteConversationNode,
  DeferConversationNode,
  ResolveConversationNode,
  ChangePriorityNode,
} from '@/components/journey/nodes/actions/action-nodes';

// Importar todos os painéis da jornada por categoria
import { JourneyTriggerPanel } from '@/components/journey/nodes/trigger/JourneyTriggerPanel';
import {
  WaitPanel,
  ConditionalPanel,
  ScheduledActionPanel,
  SplitPanel,
  SendWebhookPanel,
  AddLabelPanel,
  RemoveLabelPanel,
  UpdateContactPanel,
  UpdateCustomAttributePanel,
  TransferJourneyPanel,
  SendMessagePanel,
  SetVariablePanel,
  AssignAgentPanel,
  AssignTeamPanel,
  AssignBotPanel,
  SendEmailTeamPanel,
  SendTranscriptPanel,
  MuteConversationPanel,
  DeferConversationPanel,
  ResolveConversationPanel,
  ChangePriorityPanel,
} from '@/components/journey/nodes/actions/action-nodes';

// Importar ícones para nodeTypes
import {
  Clock as ClockIcon,
  Send,
  GitBranch,
  Split,
  LogOut,
  Tag,
  Trash2,
  UserCog,
  Settings,
  MoveRight,
  ArrowRight,
  MessageSquare,
  Variable,
  Users,
  Mail,
  FileText,
  Volume2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Bot,
} from 'lucide-react';

/**
 * Map common save-failure error shapes to translation keys so the banner
 * shows a friendly message instead of "Request failed with status code 500".
 */
function friendlySaveErrorMessage(
  error: unknown,
  t: (key: string) => string,
): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status === undefined) return t('flowEditor.saveErrorMessages.network');
    if (status >= 500) return t('flowEditor.saveErrorMessages.server');
    if (status === 401 || status === 403) return t('flowEditor.saveErrorMessages.unauthorized');
    if (status === 422) return t('flowEditor.saveErrorMessages.validation');
  }
  if (error instanceof Error && error.message) return error.message;
  return t('flowEditor.saveError');
}

function JourneyFlowEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, currentLanguage } = useLanguage('journey');

  const [journey, setJourney] = useState<Journey | null>(null);
  const [loading, setLoading] = useState(true);
  const status = useFlowEditorStore((s) => s.status);
  const lastSavedAt = useFlowEditorStore((s) => s.lastSavedAt);
  const lastError = useFlowEditorStore((s) => s.lastError);
  const retryScheduled = useFlowEditorStore((s) => s.retryScheduled);
  const nextRetryDelayMs = useFlowEditorStore((s) => s.nextRetryDelayMs);
  const recoveryCandidate = useFlowEditorStore((s) => s.recoveryCandidate);
  const recoveryEpoch = useFlowEditorStore((s) => s.recoveryEpoch);
  const currentSnapshot = useFlowEditorStore((s) => s.currentSnapshot);

  const isSaving = status === 'saving';
  const hasUnsavedChanges = status !== 'idle';
  const relativeNow = useRelativeTime(lastSavedAt);
  const [showSessionsViewer, setShowSessionsViewer] = useState(false);

  // Node types mapping para Journey
  const nodeTypes = useMemo(
    () => ({
      'journey-trigger-node': JourneyTriggerNode,
      'wait-node': WaitNode,
      'conditional-node': ConditionalNode,
      'scheduled-action-node': ScheduledActionNode,
      'split-node': SplitNode,
      'exit-journey-node': ExitJourneyNode,
      'send-webhook-node': SendWebhookNode,
      'add-label-node': AddLabelNode,
      'remove-label-node': RemoveLabelNode,
      'update-contact-node': UpdateContactNode,
      'update-custom-attribute-node': UpdateCustomAttributeNode,
      'transfer-journey-node': TransferJourneyNode,
      'send-message-node': SendMessageNode,
      'set-variable-node': SetVariableNode,
      'assign-agent-node': AssignAgentNode,
      'assign-team-node': AssignTeamNode,
      'assign-bot-node': AssignBotNode,
      'send-email-team-node': SendEmailTeamNode,
      'send-transcript-node': SendTranscriptNode,
      'mute-conversation-node': MuteConversationNode,
      'defer-conversation-node': DeferConversationNode,
      'resolve-conversation-node': ResolveConversationNode,
      'change-priority-node': ChangePriorityNode,
    }),
    [],
  );

  // Initial nodes para Journey
  const initialNodes = useMemo(
    () => [
      {
        id: 'journey-trigger-node',
        type: 'journey-trigger-node',
        position: { x: -100, y: 100 },
        data: {
          label: t('flowEditor.nodes.trigger.label'),
          description: t('flowEditor.nodes.trigger.description'),
          triggerType: 'manual',
          conditions: [],
        },
      },
    ],
    [],
  );

  const initialEdges = useMemo<never[]>(() => [], []);

  // Definir categorias para o NodePanel
  const nodePanelCategories: NodeCategory[] = [
    {
      value: 'controlFlow',
      label: t('flowEditor.categories.controlFlow.label'),
      icon: MoveRight,
      description: t('flowEditor.categories.controlFlow.description'),
    },
    {
      value: 'communication',
      label: t('flowEditor.categories.communication.label'),
      icon: Send,
      description: t('flowEditor.categories.communication.description'),
    },
    {
      value: 'contact',
      label: t('flowEditor.categories.contact.label'),
      icon: UserCog,
      description: t('flowEditor.categories.contact.description'),
    },
    {
      value: 'conversation',
      label: t('flowEditor.categories.conversation.label'),
      icon: MessageSquare,
      description: t('flowEditor.categories.conversation.description'),
    },
  ];

  // Definir tipos de nodes para o NodePanel
  const nodePanelNodeTypes: Record<string, NodeType[]> = {
    controlFlow: [
      {
        id: 'wait-node',
        name: t('flowEditor.nodes.wait.name'),
        icon: ClockIcon,
        color: 'text-blue-400',
        category: 'controlFlow',
        description: t('flowEditor.nodes.wait.description'),
        searchKeywords: ['delay', 'pause', 'sleep', 'timer', 'hold'],
      },
      {
        id: 'scheduled-action-node',
        name: t('flowEditor.nodes.scheduledAction.name'),
        icon: Clock,
        color: 'text-orange-400',
        category: 'controlFlow',
        description: t('flowEditor.nodes.scheduledAction.description'),
        searchKeywords: ['schedule', 'defer', 'queue', 'later', 'cron', 'timer'],
      },
      {
        id: 'conditional-node',
        name: t('flowEditor.nodes.conditional.name'),
        icon: GitBranch,
        color: 'text-yellow-400',
        category: 'controlFlow',
        description: t('flowEditor.nodes.conditional.description'),
        searchKeywords: ['branch', 'if', 'condition', 'route', 'switch', 'decision'],
      },
      {
        id: 'split-node',
        name: t('flowEditor.nodes.split.name'),
        icon: Split,
        color: 'text-indigo-400',
        category: 'controlFlow',
        description: t('flowEditor.nodes.split.description'),
        searchKeywords: ['ab', 'a/b', 'test', 'distribute', 'random', 'variant', 'experiment'],
      },
      {
        id: 'exit-journey-node',
        name: t('flowEditor.nodes.exitJourney.name'),
        icon: LogOut,
        color: 'text-red-400',
        category: 'controlFlow',
        description: t('flowEditor.nodes.exitJourney.description'),
        searchKeywords: ['exit', 'leave', 'terminate', 'end', 'stop', 'finish'],
      },
      {
        id: 'transfer-journey-node',
        name: t('flowEditor.nodes.transferJourney.name'),
        icon: ArrowRight,
        color: 'text-orange-400',
        category: 'controlFlow',
        description: t('flowEditor.nodes.transferJourney.description'),
        searchKeywords: ['transfer', 'move', 'redirect', 'switch', 'jump', 'journey'],
      },
      {
        id: 'set-variable-node',
        name: t('flowEditor.nodes.setVariable.name'),
        icon: Variable,
        color: 'text-purple-400',
        category: 'controlFlow',
        description: t('flowEditor.nodes.setVariable.description'),
        searchKeywords: ['variable', 'store', 'save', 'assign', 'set', 'value'],
      },
    ],
    communication: [
      {
        id: 'send-message-node',
        name: t('flowEditor.nodes.sendMessage.name'),
        icon: MessageSquare,
        color: 'text-blue-400',
        category: 'communication',
        description: t('flowEditor.nodes.sendMessage.description'),
        searchKeywords: ['chat', 'text', 'reply', 'whatsapp', 'sms', 'communicate', 'send'],
      },
      {
        id: 'send-webhook-node',
        name: t('flowEditor.nodes.sendWebhook.name'),
        icon: Send,
        color: 'text-purple-400',
        category: 'communication',
        description: t('flowEditor.nodes.sendWebhook.description'),
        searchKeywords: ['http', 'api', 'request', 'post', 'integration', 'callback', 'rest'],
      },
      {
        id: 'send-email-team-node',
        name: t('flowEditor.nodes.sendEmailTeam.name'),
        icon: Mail,
        color: 'text-emerald-400',
        category: 'communication',
        description: t('flowEditor.nodes.sendEmailTeam.description'),
        searchKeywords: ['email', 'mail', 'team', 'notify', 'internal'],
      },
      {
        id: 'send-transcript-node',
        name: t('flowEditor.nodes.sendTranscript.name'),
        icon: FileText,
        color: 'text-teal-400',
        category: 'communication',
        description: t('flowEditor.nodes.sendTranscript.description'),
        searchKeywords: ['transcript', 'export', 'history', 'log', 'summary'],
      },
    ],
    contact: [
      {
        id: 'update-contact-node',
        name: t('flowEditor.nodes.updateContact.name'),
        icon: UserCog,
        color: 'text-cyan-400',
        category: 'contact',
        description: t('flowEditor.nodes.updateContact.description'),
        searchKeywords: ['edit', 'modify', 'change', 'profile', 'data'],
      },
      {
        id: 'update-custom-attribute-node',
        name: t('flowEditor.nodes.updateCustomAttribute.name'),
        icon: Settings,
        color: 'text-pink-400',
        category: 'contact',
        description: t('flowEditor.nodes.updateCustomAttribute.description'),
        searchKeywords: ['attribute', 'field', 'custom', 'metadata', 'property'],
      },
      {
        id: 'add-label-node',
        name: t('flowEditor.nodes.addLabel.name'),
        icon: Tag,
        color: 'text-green-400',
        category: 'contact',
        description: t('flowEditor.nodes.addLabel.description'),
        searchKeywords: ['tag', 'classify', 'mark', 'categorize', 'etiqueta'],
      },
      {
        id: 'remove-label-node',
        name: t('flowEditor.nodes.removeLabel.name'),
        icon: Trash2,
        color: 'text-red-400',
        category: 'contact',
        description: t('flowEditor.nodes.removeLabel.description'),
        searchKeywords: ['untag', 'unmark', 'delete', 'label', 'etiqueta'],
      },
      {
        id: 'assign-agent-node',
        name: t('flowEditor.nodes.assignAgent.name'),
        icon: UserCog,
        color: 'text-violet-400',
        category: 'contact',
        description: t('flowEditor.nodes.assignAgent.description'),
        searchKeywords: ['user', 'operator', 'handoff', 'agent', 'route'],
      },
      {
        id: 'assign-team-node',
        name: t('flowEditor.nodes.assignTeam.name'),
        icon: Users,
        color: 'text-sky-400',
        category: 'contact',
        description: t('flowEditor.nodes.assignTeam.description'),
        searchKeywords: ['team', 'group', 'queue', 'handoff', 'route'],
      },
      {
        id: 'assign-bot-node',
        name: t('flowEditor.nodes.assignBot.name'),
        icon: Bot,
        color: 'text-purple-400',
        category: 'contact',
        description: t('flowEditor.nodes.assignBot.description'),
        searchKeywords: ['bot', 'automation', 'ai', 'assistant', 'automate'],
      },
    ],
    conversation: [
      {
        id: 'mute-conversation-node',
        name: t('flowEditor.nodes.muteConversation.name'),
        icon: Volume2,
        color: 'text-gray-400',
        category: 'conversation',
        description: t('flowEditor.nodes.muteConversation.description'),
        searchKeywords: ['mute', 'silence', 'quiet', 'hide', 'suppress'],
      },
      {
        id: 'defer-conversation-node',
        name: t('flowEditor.nodes.deferConversation.name'),
        icon: ClockIcon,
        color: 'text-yellow-400',
        category: 'conversation',
        description: t('flowEditor.nodes.deferConversation.description'),
        searchKeywords: ['snooze', 'defer', 'postpone', 'delay', 'later'],
      },
      {
        id: 'resolve-conversation-node',
        name: t('flowEditor.nodes.resolveConversation.name'),
        icon: CheckCircle,
        color: 'text-green-400',
        category: 'conversation',
        description: t('flowEditor.nodes.resolveConversation.description'),
        searchKeywords: ['resolve', 'close', 'complete', 'finish', 'done'],
      },
      {
        id: 'change-priority-node',
        name: t('flowEditor.nodes.changePriority.name'),
        icon: AlertTriangle,
        color: 'text-indigo-400',
        category: 'conversation',
        description: t('flowEditor.nodes.changePriority.description'),
        searchKeywords: ['priority', 'urgent', 'importance', 'vip', 'escalate'],
      },
    ],
  };

  // Maps each node type to a flow-* design-system token (declared in
  // globals.css with light/dark variants by EVO-1253). Nodes without a
  // direct subtype match in the current taxonomy fall back to
  // action-pipeline (see EVO-1259 audit §G3 for the taxonomy gap).
  const miniMapNodeColors = useMemo(
    () => ({
      'journey-trigger-node': 'var(--color-flow-node-trigger-border)',
      'conditional-node': 'var(--color-flow-node-condition-border)',
      'wait-node': 'var(--color-flow-node-control-border)',
      'split-node': 'var(--color-flow-node-control-border)',
      'scheduled-action-node': 'var(--color-flow-node-control-border)',
      'set-variable-node': 'var(--color-flow-node-control-border)',
      'exit-journey-node': 'var(--color-flow-node-exit-border)',
      'transfer-journey-node': 'var(--color-flow-node-exit-border)',
      'send-message-node': 'var(--color-flow-node-action-message-border)',
      'send-transcript-node': 'var(--color-flow-node-action-message-border)',
      'send-email-team-node': 'var(--color-flow-node-action-message-border)',
      'send-webhook-node': 'var(--color-flow-node-action-webhook-border)',
      'add-label-node': 'var(--color-flow-node-action-label-border)',
      'remove-label-node': 'var(--color-flow-node-action-label-border)',
      'update-contact-node': 'var(--color-flow-node-action-pipeline-border)',
      'update-custom-attribute-node': 'var(--color-flow-node-action-pipeline-border)',
      'assign-agent-node': 'var(--color-flow-node-action-pipeline-border)',
      'assign-team-node': 'var(--color-flow-node-action-pipeline-border)',
      'assign-bot-node': 'var(--color-flow-node-action-pipeline-border)',
      'change-priority-node': 'var(--color-flow-node-action-pipeline-border)',
      'mute-conversation-node': 'var(--color-flow-node-action-pipeline-border)',
      'defer-conversation-node': 'var(--color-flow-node-action-pipeline-border)',
      'resolve-conversation-node': 'var(--color-flow-node-action-pipeline-border)',
      default: 'var(--color-muted-foreground)',
    }),
    [],
  );

  // Função para renderizar painéis de configuração
  const renderConfigPanel = useCallback(
    (
      nodeType: string,
      nodeData: any,
      nodeId: string,
      onUpdate: (nodeId: string, data: any) => void,
      onClose: () => void,
    ) => {
      if (!id) return null; // Early return if no journey ID

      const commonProps = {
        nodeId,
        data: nodeData,
        onUpdate,
        onClose,
        journeyId: id, // ID da jornada atual (now guaranteed to be string)
      };

      switch (nodeType) {
        case 'journey-trigger-node':
          return <JourneyTriggerPanel {...commonProps} />;
        case 'wait-node':
          return <WaitPanel {...commonProps} />;
        case 'scheduled-action-node':
          return <ScheduledActionPanel {...commonProps} />;
        case 'conditional-node':
          return <ConditionalPanel {...commonProps} />;
        case 'split-node':
          return <SplitPanel {...commonProps} />;
        case 'send-webhook-node':
          return <SendWebhookPanel {...commonProps} />;
        case 'add-label-node':
          return <AddLabelPanel {...commonProps} />;
        case 'remove-label-node':
          return <RemoveLabelPanel {...commonProps} />;
        case 'update-contact-node':
          return <UpdateContactPanel {...commonProps} />;
        case 'update-custom-attribute-node':
          return <UpdateCustomAttributePanel {...commonProps} />;
        case 'transfer-journey-node':
          return <TransferJourneyPanel {...commonProps} />;
        case 'send-message-node':
          return <SendMessagePanel {...commonProps} />;
        case 'set-variable-node':
          return <SetVariablePanel {...commonProps} />;
        case 'assign-agent-node':
          return <AssignAgentPanel {...commonProps} />;
        case 'assign-team-node':
          return <AssignTeamPanel {...commonProps} />;
        case 'assign-bot-node':
          return <AssignBotPanel {...commonProps} />;
        case 'send-email-team-node':
          return <SendEmailTeamPanel {...commonProps} />;
        case 'send-transcript-node':
          return <SendTranscriptPanel {...commonProps} />;
        case 'mute-conversation-node':
          return <MuteConversationPanel {...commonProps} />;
        case 'defer-conversation-node':
          return <DeferConversationPanel {...commonProps} />;
        case 'resolve-conversation-node':
          return <ResolveConversationPanel {...commonProps} />;
        case 'change-priority-node':
          return <ChangePriorityPanel {...commonProps} />;
        default:
          return null;
      }
    },
    [id],
  );

  const loadJourney = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [response, recovery] = await Promise.all([
        journeyService.getJourney(id),
        loadSnapshot(id),
      ]);
      setJourney(response);

      const flowData = response.flowData || {};
      const serverSnapshot: FlowSnapshot = {
        nodes: (Array.isArray(flowData.nodes) ? flowData.nodes : []) as never,
        edges: (Array.isArray(flowData.edges) ? flowData.edges : []) as never,
      };

      // Prefer a client-persisted save mark over response.updatedAt because
      // the server timestamp has come back stale/timezone-shifted in
      // practice, causing the header to read "Saved 2 hours ago" right
      // after a fresh save.
      const localMark = loadLastSavedAt(id);
      const serverMark = response.updatedAt ? new Date(response.updatedAt) : null;
      const lastSavedAt = localMark ?? serverMark ?? new Date();

      useFlowEditorStore.getState().hydrate({
        journeyId: id,
        server: serverSnapshot,
        lastSavedAt,
        recovery,
      });
    } catch (error) {
      console.error('Erro ao carregar jornada:', error);
      toast.error(t('flowEditor.loadError'));
      navigate('/journeys');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (id) {
      loadJourney();
    }
  }, [id, loadJourney]);

  const journeyRef = useRef<Journey | null>(null);
  useEffect(() => {
    journeyRef.current = journey;
  }, [journey]);

  const saveChanges = useCallback(async (opts?: { silent?: boolean }) => {
    const currentJourney = journeyRef.current;
    const store = useFlowEditorStore.getState();
    const snapshot = store.currentSnapshot;
    if (
      !currentJourney?.id ||
      !snapshot ||
      store.status === 'saving' ||
      store.status === 'idle'
    ) {
      return;
    }

    store.beginSave({ resetRetryBudget: !opts?.silent });
    try {
      const flowData = {
        nodes: normalizeNodesForPersist(snapshot.nodes),
        edges: snapshot.edges,
      };

      // Extrair triggers dos nodes
      const nodes = Array.isArray(flowData.nodes) ? flowData.nodes : [];
      const flowTriggers = nodes
        .filter((node: any) => node.type === 'journey-trigger-node')
        .map((triggerNode: any) => ({
          id: triggerNode.id,
          type: triggerNode.data.triggerType || 'Manual',
          name: `${triggerNode.data.triggerType || 'manual'} trigger`,
          enabled: true,
          conditions: {
            eventName: triggerNode.data.eventName,
            segmentId: triggerNode.data.segmentId,
            labelId: triggerNode.data.labelId,
            attributeName: triggerNode.data.customAttributeName,
            webhookUrl: triggerNode.data.webhookUrl,
          },
          metadata: {
            // Salvar todos os dados específicos no metadata
            triggerType: triggerNode.data.triggerType,
            eventName: triggerNode.data.eventName,
            eventProperties: triggerNode.data.eventProperties,
            contactFields: triggerNode.data.contactFields,
            labelId: triggerNode.data.labelId,
            labelName: triggerNode.data.labelName,
            labelAction: triggerNode.data.labelAction,
            customAttributeName: triggerNode.data.customAttributeName,
            customAttributeDisplayName: triggerNode.data.customAttributeDisplayName,
            customAttributeOperator: triggerNode.data.customAttributeOperator,
            customAttributeValue: triggerNode.data.customAttributeValue,
            scheduleType: triggerNode.data.scheduleType,
            scheduleDate: triggerNode.data.scheduleDate,
            scheduleTime: triggerNode.data.scheduleTime,
            recurringPattern: triggerNode.data.recurringPattern,
            recurringDays: triggerNode.data.recurringDays,
            recurringTime: triggerNode.data.recurringTime,
            recurringInterval: triggerNode.data.recurringInterval,
            webhookUrl: triggerNode.data.webhookUrl,
            webhookSecret: triggerNode.data.webhookSecret,
            webhookMethod: triggerNode.data.webhookMethod,
            expectedHeaders: triggerNode.data.expectedHeaders,
          },
        }));

      const updatedJourney = {
        ...currentJourney,
        flowData: flowData as Journey['flowData'],
        flowTriggers,
      } as Journey;

      await journeyService.updateJourney(currentJourney.id, updatedJourney);
      setJourney(updatedJourney);
      // Pass the snapshot we captured at beginSave time as the synced
      // baseline. If the user edited during the API roundtrip, the store
      // compares currentSnapshot against this and stays `dirty` so the
      // next autosave tick picks up the unsynced edits (atomic update
      // requirement of EVO-1258).
      useFlowEditorStore.getState().commitSave(new Date(), snapshot);
      if (!opts?.silent) {
        toast.success(t('flowEditor.saveSuccess'));
      }
    } catch (error) {
      console.error('Erro ao salvar jornada:', error);
      const message = friendlySaveErrorMessage(error, t);
      useFlowEditorStore.getState().failSave(message);
    }
  }, [t]);

  const handleFlowDataChange = useCallback((flowData: { nodes: unknown[]; edges: unknown[] }) => {
    useFlowEditorStore
      .getState()
      .setFlow(flowData.nodes as never[], flowData.edges as never[]);
  }, []);

  // Register the autosave trigger so the store-owned debounced timer can fire
  // saveChanges when the editor has been dirty for 5s without a new edit.
  // Autosaves run silently — the header status indicator is the only feedback,
  // because a toast every 5s of active editing was noise.
  useEffect(() => {
    return registerAutosaveTrigger(() => {
      void saveChanges({ silent: true });
    });
  }, [saveChanges]);

  // Tear the store down on unmount so a re-mount under a different journeyId
  // does not see stale state.
  useEffect(() => {
    return () => {
      useFlowEditorStore.getState().reset();
    };
  }, []);

  const [pendingLeaveTarget, setPendingLeaveTarget] = useState<string | null>(null);

  const requestNavigate = useCallback(
    (target: string) => {
      if (hasUnsavedChanges) {
        setPendingLeaveTarget(target);
      } else {
        navigate(target);
      }
    },
    [hasUnsavedChanges, navigate],
  );

  const handleBack = useCallback(() => {
    requestNavigate('/journeys');
  }, [requestNavigate]);

  const cancelLeave = useCallback(() => {
    setPendingLeaveTarget(null);
  }, []);

  const confirmLeave = useCallback(() => {
    if (pendingLeaveTarget) {
      navigate(pendingLeaveTarget);
      setPendingLeaveTarget(null);
    }
  }, [navigate, pendingLeaveTarget]);

  // Native browser dialog for refresh / close tab / address-bar navigation
  // while the editor has unsaved changes. Modern browsers ignore custom message
  // strings; setting `returnValue` is what triggers the prompt.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  // Preparar dados do flow para o BaseFlowEditor.
  // SOURCE OF TRUTH: store.currentSnapshot, NOT journey.flowData. The
  // store is updated by every edit AND by acceptRecovery, so reading
  // from it is the only way the canvas remount on recovery (key change
  // via recoveryEpoch) actually picks up the recovered nodes. Reading
  // from journey.flowData would seed the canvas with server data even
  // after the user accepted recovery, because journey is only refreshed
  // on save success.
  // Declared BEFORE the loading/!journey early returns so the hook
  // order stays stable across renders (rules-of-hooks). Before hydrate
  // the store snapshot is null, so we fall back to the initial nodes/edges.
  const flowData = useMemo(
    () => ({
      nodes:
        Array.isArray(currentSnapshot?.nodes) && currentSnapshot.nodes.length > 0
          ? currentSnapshot.nodes
          : initialNodes,
      edges: Array.isArray(currentSnapshot?.edges) ? currentSnapshot.edges : initialEdges,
    }),
    [currentSnapshot, initialNodes, initialEdges],
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sidebar-foreground/60">{t('flowEditor.loading')}</p>
        </div>
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-sidebar-foreground/60 mb-4">{t('flowEditor.notFound')}</p>
          <Button onClick={handleBack} variant="outline">
            {t('flowEditor.back')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <JourneyEditorHeader
        onBack={handleBack}
        backLabel={t('flowEditor.back')}
        title={t('flowEditor.title', { name: journey.name })}
        subtitle={journey.description || undefined}
        onViewSessions={() => setShowSessionsViewer(true)}
        viewSessionsLabel={t('flowEditor.viewSessions')}
        environmentSlot={<EnvironmentManager journeyId={id} />}
        onSave={saveChanges}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        lastSaved={lastSavedAt}
        saveLabel={t('flowEditor.save')}
        savingLabel={t('flowEditor.saving')}
        savedLabel={t('flowEditor.saved')}
        lastSavedFormatter={(date) =>
          t('flowEditor.lastSavedRelative', {
            relative: formatRelativeTime(date, relativeNow, {
              locale: currentLanguage,
              justNowLabel: t('flowEditor.lastSavedJustNow'),
            }),
          })
        }
        unsavedChangesHint={t('flowEditor.autoSaveInfo')}
      />

      {status === 'error' && lastError ? (
        <FlowFeedbackBanner variant="error" className="mx-4 mt-2">
          <p>
            {retryScheduled && nextRetryDelayMs !== null
              ? t('flowEditor.saveErrorBanner', {
                  reason: lastError,
                  seconds: Math.round(nextRetryDelayMs / 1000),
                })
              : t('flowEditor.saveErrorBannerNoRetry', { reason: lastError })}
          </p>
        </FlowFeedbackBanner>
      ) : null}

      <AlertDialog
        open={recoveryCandidate !== null}
        onOpenChange={(open) => {
          if (!open) useFlowEditorStore.getState().rejectRecovery();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('flowEditor.recoveryTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {recoveryCandidate
                ? t('flowEditor.recoveryBody', {
                    when: formatRelativeTime(recoveryCandidate.timestamp, relativeNow, {
                      locale: currentLanguage,
                      justNowLabel: t('flowEditor.lastSavedJustNow'),
                    }),
                  })
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => useFlowEditorStore.getState().rejectRecovery()}
            >
              {t('flowEditor.discard')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => useFlowEditorStore.getState().acceptRecovery()}
            >
              {t('flowEditor.recover')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingLeaveTarget !== null}
        onOpenChange={(open) => {
          if (!open) cancelLeave();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('flowEditor.unsavedChangesTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('flowEditor.unsavedChangesBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelLeave}>
              {t('flowEditor.stay')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeave}>
              {t('flowEditor.leaveAnyway')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <BaseFlowEditor
        key={`flow-canvas-${recoveryEpoch}`}
        flowData={flowData}
        isLoading={loading}
        isSaving={isSaving}
        onSave={saveChanges}
        onFlowDataChange={handleFlowDataChange}
        autoSave={false}
        showHeader={false}
        showToolbar={false}
        nodeTypes={nodeTypes}
        renderConfigPanel={renderConfigPanel}
        nodePanelNodeTypes={nodePanelNodeTypes}
        nodePanelCategories={nodePanelCategories}
        nodePanelTitle={t('flowEditor.nodePanel.title')}
        nodePanelSubtitle={t('flowEditor.nodePanel.subtitle')}
        showMiniMap={true}
        showControls={true}
        showBackground={true}
        backgroundVariant="dots"
        miniMapNodeColors={miniMapNodeColors}
        customHelperLines={true}
        configPanelSystem={true}
        className="h-full bg-sidebar"
        canvasWrapperClassName="flex-1"
      />

      {/* Footer com informações */}
      <div className="border-t border-sidebar-border bg-sidebar p-3 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-sidebar-foreground/60">
          <div className="flex items-center gap-4">
            <span>
              Status:{' '}
              {journey.isActive ? t('flowEditor.status.active') : t('flowEditor.status.inactive')}
            </span>
            <span>
              {journey.createdAt
                ? t('flowEditor.createdAt', {
                  date: new Date(journey.createdAt).toLocaleString('pt-BR'),
                })
                : t('flowEditor.invalidDate')}
            </span>
          </div>
        </div>
      </div>

      {/* Sessions Viewer Modal */}
      {showSessionsViewer && id && (
        <SessionsViewer
          journeyId={id}
          journeyName={journey.name}
          onClose={() => setShowSessionsViewer(false)}
        />
      )}
    </div>
  );
}

export default function JourneyFlowEditorPage() {
  return (
    <ErrorBoundary>
      <JourneyFlowEditor />
    </ErrorBoundary>
  );
}
