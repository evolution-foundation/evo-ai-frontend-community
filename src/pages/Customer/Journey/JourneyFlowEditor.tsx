import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@evoapi/design-system';
import { toast } from 'sonner';
import { journeyService } from '@/services';
import type { Journey } from '@/types/automation';
import { useLanguage } from '@/hooks/useLanguage';
import { BaseFlowEditor, type NodeType, type NodeCategory } from '@/components/base';
import { EnvironmentManager, type JourneyVariable } from '@/components/journey/environment-manager';
import { JourneyEditorHeader } from '@/components/journey/shared/JourneyEditorHeader';
import { SessionsViewer } from '@/components/journey/SessionsViewer';
import ErrorBoundary from '@/components/ErrorBoundary';

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
} from 'lucide-react';

function JourneyFlowEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage('journey');

  const [journey, setJourney] = useState<Journey | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [journeyVariables, setJourneyVariables] = useState<JourneyVariable[]>([]);
  const [showSessionsViewer, setShowSessionsViewer] = useState(false);

  const currentFlowDataRef = useRef<{ nodes: any[]; edges: any[]; variables?: string[] } | null>(
    null,
  );
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const initialEdges: never[] = [];

  // Definir categorias para o NodePanel
  const nodePanelCategories: NodeCategory[] = [
    {
      value: 'actions',
      label: t('flowEditor.categories.actions.label'),
      icon: MoveRight,
      description: t('flowEditor.categories.actions.description'),
    },
    {
      value: 'communication',
      label: t('flowEditor.categories.communication.label'),
      icon: Send,
      description: t('flowEditor.categories.communication.description'),
    },
    {
      value: 'labels',
      label: t('flowEditor.categories.labels.label'),
      icon: Tag,
      description: t('flowEditor.categories.labels.description'),
    },
    {
      value: 'contact',
      label: t('flowEditor.categories.contact.label'),
      icon: UserCog,
      description: t('flowEditor.categories.contact.description'),
    },
    {
      value: 'conversation',
      label: t('flowEditor.categories.conversation.labels'),
      icon: MessageSquare,
      description: t('flowEditor.categories.conversation.description'),
    },
  ];

  // Definir tipos de nodes para o NodePanel
  const nodePanelNodeTypes: Record<string, NodeType[]> = {
    actions: [
      {
        id: 'wait-node',
        name: t('flowEditor.nodes.wait.name'),
        icon: ClockIcon,
        color: 'text-blue-400',
        category: 'actions',
        description: t('flowEditor.nodes.wait.description'),
      },
      {
        id: 'scheduled-action-node',
        name: t('flowEditor.nodes.scheduledAction.name'),
        icon: Clock,
        color: 'text-orange-400',
        category: 'actions',
        description: t('flowEditor.nodes.scheduledAction.description'),
      },
      {
        id: 'conditional-node',
        name: t('flowEditor.nodes.conditional.name'),
        icon: GitBranch,
        color: 'text-yellow-400',
        category: 'actions',
        description: t('flowEditor.nodes.conditional.description'),
      },
      {
        id: 'split-node',
        name: t('flowEditor.nodes.split.name'),
        icon: Split,
        color: 'text-indigo-400',
        category: 'actions',
        description: t('flowEditor.nodes.split.description'),
      },
      {
        id: 'exit-journey-node',
        name: t('flowEditor.nodes.exitJourney.name'),
        icon: LogOut,
        color: 'text-red-400',
        category: 'actions',
        description: t('flowEditor.nodes.exitJourney.description'),
      },
      {
        id: 'transfer-journey-node',
        name: t('flowEditor.nodes.transferJourney.name'),
        icon: ArrowRight,
        color: 'text-orange-400',
        category: 'actions',
        description: t('flowEditor.nodes.transferJourney.description'),
      },
      {
        id: 'set-variable-node',
        name: t('flowEditor.nodes.setVariable.name'),
        icon: Variable,
        color: 'text-purple-400',
        category: 'actions',
        description: t('flowEditor.nodes.setVariable.description'),
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
      },
      {
        id: 'send-webhook-node',
        name: t('flowEditor.nodes.sendWebhook.name'),
        icon: Send,
        color: 'text-purple-400',
        category: 'communication',
        description: t('flowEditor.nodes.sendWebhook.description'),
      },
      {
        id: 'send-email-team-node',
        name: t('flowEditor.nodes.sendEmailTeam.name'),
        icon: Mail,
        color: 'text-emerald-400',
        category: 'communication',
        description: t('flowEditor.nodes.sendEmailTeam.description'),
      },
      {
        id: 'send-transcript-node',
        name: t('flowEditor.nodes.sendTranscript.name'),
        icon: FileText,
        color: 'text-teal-400',
        category: 'communication',
        description: t('flowEditor.nodes.sendTranscript.description'),
      },
    ],
    labels: [
      {
        id: 'add-label-node',
        name: t('flowEditor.nodes.addLabel.name'),
        icon: Tag,
        color: 'text-green-400',
        category: 'labels',
        description: t('flowEditor.nodes.addLabel.description'),
      },
      {
        id: 'remove-label-node',
        name: t('flowEditor.nodes.removeLabel.name'),
        icon: Trash2,
        color: 'text-red-400',
        category: 'labels',
        description: t('flowEditor.nodes.removeLabel.description'),
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
      },
      {
        id: 'update-custom-attribute-node',
        name: t('flowEditor.nodes.updateCustomAttribute.name'),
        icon: Settings,
        color: 'text-pink-400',
        category: 'contact',
        description: t('flowEditor.nodes.updateCustomAttribute.description'),
      },
      {
        id: 'assign-agent-node',
        name: t('flowEditor.nodes.assignAgent.name'),
        icon: UserCog,
        color: 'text-violet-400',
        category: 'contact',
        description: t('flowEditor.nodes.assignAgent.description'),
      },
      {
        id: 'assign-team-node',
        name: t('flowEditor.nodes.assignTeam.name'),
        icon: Users,
        color: 'text-sky-400',
        category: 'contact',
        description: t('flowEditor.nodes.assignTeam.description'),
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
      },
      {
        id: 'defer-conversation-node',
        name: t('flowEditor.nodes.deferConversation.name'),
        icon: ClockIcon,
        color: 'text-yellow-400',
        category: 'conversation',
        description: t('flowEditor.nodes.deferConversation.description'),
      },
      {
        id: 'resolve-conversation-node',
        name: t('flowEditor.nodes.resolveConversation.name'),
        icon: CheckCircle,
        color: 'text-green-400',
        category: 'conversation',
        description: t('flowEditor.nodes.resolveConversation.description'),
      },
      {
        id: 'change-priority-node',
        name: t('flowEditor.nodes.changePriority.name'),
        icon: AlertTriangle,
        color: 'text-indigo-400',
        category: 'conversation',
        description: t('flowEditor.nodes.changePriority.description'),
      },
    ],
  };

  // Cores para o MiniMap
  const miniMapNodeColors = useMemo(
    () => ({
      'journey-trigger-node': '#10b981', // verde para trigger
      'wait-node': '#3b82f6', // azul para wait
      'scheduled-action-node': '#fb923c', // orange para scheduled action
      'conditional-node': '#eab308', // amarelo para condicional
      'split-node': '#6366f1', // indigo para split
      'exit-journey-node': '#ef4444', // vermelho para sair da jornada
      'send-webhook-node': '#a855f7', // purple para webhook
      'add-label-node': '#10b981', // verde para adicionar etiqueta
      'remove-label-node': '#ef4444', // vermelho para remover etiqueta
      'update-contact-node': '#06b6d4', // cyan para atualizar contato
      'update-custom-attribute-node': '#ec4899', // pink para atributo personalizado
      'transfer-journey-node': '#fb923c', // orange para transferir jornada
      'send-message-node': '#3b82f6', // blue para enviar mensagem
      'set-variable-node': '#a855f7', // purple para definir variável
      'assign-agent-node': '#8b5cf6', // violet para atribuir agente
      'assign-team-node': '#0ea5e9', // sky para atribuir equipe
      'send-email-team-node': '#10b981', // emerald para enviar email equipe
      'send-transcript-node': '#14b8a6', // teal para enviar transcrição
      'mute-conversation-node': '#64748b', // gray para silenciar conversa
      'defer-conversation-node': '#eab308', // yellow para adiar conversa
      'resolve-conversation-node': '#10b981', // green para resolver conversa
      'change-priority-node': '#6366f1', // indigo para alterar prioridade
      default: '#64748b', // cinza para outros
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
        onVariablesChange: handleVariablesChange, // Callback para sincronizar variáveis
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
      const response = await journeyService.getJourney(id);
      setJourney(response);

      // Ensure flowData has proper array structure
      const flowData = response.flowData || {};
      currentFlowDataRef.current = {
        nodes: Array.isArray(flowData.nodes) ? flowData.nodes : [],
        edges: Array.isArray(flowData.edges) ? flowData.edges : [],
      };

      // Variáveis agora são carregadas via API dedicada (useJourneyVariables)

      setLastSaved(new Date());
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

  const handleVariablesChange = useCallback(
    (variables: JourneyVariable[]) => {
      setJourneyVariables(variables);
      setHasUnsavedChanges(true);
    },
    [id],
  );

  const saveChanges = useCallback(async () => {
    if (!journey || !journey.id || !hasUnsavedChanges || isSaving) return;

    setIsSaving(true);
    try {
      const flowData = currentFlowDataRef.current || { nodes: [], edges: [], variables: [] };

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
        ...journey,
        flowData: flowData,
        flowTriggers,
      };

      await journeyService.updateJourney(journey.id, updatedJourney);
      setJourney(updatedJourney);
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      toast.success(t('flowEditor.saveSuccess'));
    } catch (error) {
      console.error('Erro ao salvar jornada:', error);
      toast.error(t('flowEditor.saveError'));
    } finally {
      setIsSaving(false);
    }
  }, [journey, hasUnsavedChanges, isSaving, journeyVariables]);

  // Auto-save quando variáveis mudarem (com delay)
  useEffect(() => {
    if (journeyVariables.length > 0 && hasUnsavedChanges) {
      const timeoutId = setTimeout(() => {
        saveChanges();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [journeyVariables, hasUnsavedChanges, saveChanges]);

  // Handle flow data changes
  const handleFlowDataChange = useCallback((flowData: any) => {
    const hasChanges = JSON.stringify(currentFlowDataRef.current) !== JSON.stringify(flowData);
    currentFlowDataRef.current = flowData;
    if (hasChanges) {
      setHasUnsavedChanges(true);
    }
  }, []);

  // Auto-save every 10 seconds
  useEffect(() => {
    if (hasUnsavedChanges) {
      autoSaveIntervalRef.current = setInterval(() => {
        saveChanges();
      }, 10000);
    } else {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    }

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [hasUnsavedChanges, saveChanges]);

  const handleBack = () => {
    navigate('/journeys');
  };

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

  // Preparar dados do flow para o BaseFlowEditor
  const flowData = {
    nodes:
      Array.isArray(journey.flowData?.nodes) && journey.flowData.nodes.length > 0
        ? journey.flowData.nodes
        : initialNodes,
    edges: Array.isArray(journey.flowData?.edges) ? journey.flowData.edges : initialEdges,
  };

  return (
    <div className="h-screen flex flex-col">
      <JourneyEditorHeader
        onBack={handleBack}
        backLabel={t('flowEditor.back')}
        backShortcutHint={t('flowEditor.backShortcutHint')}
        title={t('flowEditor.title', { name: journey.name })}
        subtitle={journey.description || undefined}
        onViewSessions={() => setShowSessionsViewer(true)}
        viewSessionsLabel={t('flowEditor.viewSessions')}
        environmentSlot={<EnvironmentManager journeyId={id} />}
        onSave={saveChanges}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        lastSaved={lastSaved}
        saveLabel={t('flowEditor.save')}
        savingLabel={t('flowEditor.saving')}
        savedLabel={t('flowEditor.saved')}
        lastSavedFormatter={(date) =>
          t('flowEditor.lastSaved', { time: date.toLocaleTimeString() })
        }
        unsavedChangesHint={t('flowEditor.autoSaveInfo')}
        moreActionsLabel={t('flowEditor.moreActions')}
      />
      <BaseFlowEditor
        flowData={flowData}
        isLoading={loading}
        isSaving={isSaving}
        onSave={saveChanges}
        onFlowDataChange={handleFlowDataChange}
        autoSave={true}
        autoSaveInterval={10000}
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
