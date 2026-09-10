import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Globe,
  Settings,
  User,
  Tag,
  Zap,
  Variable,
  Folder,
  Layout,
  LayoutTemplate,
  ArrowLeft,
  ChevronRight,
  Sliders,
  Save,
  X,
  Loader2,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Users,
  ExternalLink,
} from 'lucide-react';
import { Button, Label } from '@evoapi/design-system';
import { toast } from 'sonner';
import { adminConfigService } from '@/services/admin/adminConfigService';
import {
  gtmService,
  GtmAccount,
  GtmContainer,
  GtmWorkspaceData,
  GtmResource,
  GtmResourceKind,
  GtmParameter,
  GtmPermission,
} from '@/services/marketing/gtmService';

type Screen = 'accounts' | 'workspace';
type WorkspaceTab = 'overview' | 'tags' | 'triggers' | 'variables' | 'folders' | 'templates';
type ResourceType = 'Tag' | 'Acionador' | 'Variável' | 'Modelo' | 'Pasta';

const RESOURCE_KIND_BY_TYPE: Record<Exclude<ResourceType, 'Modelo'>, GtmResourceKind> = {
  Tag: 'tags',
  Acionador: 'triggers',
  Variável: 'variables',
  Pasta: 'folders',
};

interface EditingItem extends GtmResource {
  resourceType: ResourceType;
}

interface TrackingForm {
  MKT_COMPANY_NAME: string;
  MKT_GOOGLE_EMAIL: string;
  MKT_SITE_URL: string;
  MKT_SITE_TYPE: string;
  MKT_SITE_TYPE_OTHER: string;
  MKT_PIXEL_META: string;
  MKT_TOKEN_META_SECRET: string;
  MKT_PIXEL_TIKTOK: string;
  MKT_TOKEN_TIKTOK_SECRET: string;
  MKT_PIXEL_PINTEREST: string;
  MKT_PIXEL_LINKEDIN: string;
  MKT_GA4_ID: string;
  MKT_GADS_ID: string;
  MKT_GADS_VIEWCONTENT: string;
  MKT_GADS_CART: string;
  MKT_GADS_CHECKOUT: string;
  MKT_GADS_PURCHASE: string;
  MKT_URL_SERVER_META: string;
  MKT_URL_SERVER_TIKTOK: string;
  MKT_GOOGLE_SHEETS_URL: string;
}

const EMPTY_FORM: TrackingForm = {
  MKT_COMPANY_NAME: '',
  MKT_GOOGLE_EMAIL: '',
  MKT_SITE_URL: '',
  MKT_SITE_TYPE: 'wordpress',
  MKT_SITE_TYPE_OTHER: '',
  MKT_PIXEL_META: '',
  MKT_TOKEN_META_SECRET: '',
  MKT_PIXEL_TIKTOK: '',
  MKT_TOKEN_TIKTOK_SECRET: '',
  MKT_PIXEL_PINTEREST: '',
  MKT_PIXEL_LINKEDIN: '',
  MKT_GA4_ID: '',
  MKT_GADS_ID: '',
  MKT_GADS_VIEWCONTENT: '',
  MKT_GADS_CART: '',
  MKT_GADS_CHECKOUT: '',
  MKT_GADS_PURCHASE: '',
  MKT_URL_SERVER_META: '',
  MKT_URL_SERVER_TIKTOK: '',
  MKT_GOOGLE_SHEETS_URL: '',
};

const SECRET_FIELDS: (keyof TrackingForm)[] = ['MKT_TOKEN_META_SECRET', 'MKT_TOKEN_TIKTOK_SECRET'];

function isMasked(value: unknown): boolean {
  return typeof value === 'string' && value.includes('••••');
}

function resourceIcon(type: ResourceType) {
  if (type === 'Tag') return Tag;
  if (type === 'Acionador') return Zap;
  if (type === 'Variável') return Variable;
  if (type === 'Pasta') return Folder;
  return LayoutTemplate;
}

export default function GtmPage() {
  const [screen, setScreen] = useState<Screen>('accounts');
  const [notConnected, setNotConnected] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [accounts, setAccounts] = useState<GtmAccount[]>([]);
  const [containersByAccount, setContainersByAccount] = useState<Record<string, GtmContainer[]>>({});

  const [selectedAccount, setSelectedAccount] = useState<GtmAccount | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<GtmContainer | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [workspace, setWorkspace] = useState<GtmWorkspaceData | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('overview');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<TrackingForm>(EMPTY_FORM);
  const [secretModified, setSecretModified] = useState<Record<string, boolean>>({});
  const [secretConfigured, setSecretConfigured] = useState<Record<string, boolean>>({});
  const [savingForm, setSavingForm] = useState(false);

  // Criar contêiner
  const [containerModalOpen, setContainerModalOpen] = useState(false);
  const [containerForAccount, setContainerForAccount] = useState<GtmAccount | null>(null);
  const [containerName, setContainerName] = useState('');
  const [containerUsageContext, setContainerUsageContext] = useState<'web' | 'server'>('web');
  const [savingContainer, setSavingContainer] = useState(false);

  // Criar/editar recurso (tag/acionador/variável/pasta)
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [resourceModalKind, setResourceModalKind] = useState<GtmResourceKind>('tags');
  const [resourceModalEditing, setResourceModalEditing] = useState<EditingItem | null>(null);
  const [resourceName, setResourceName] = useState('');
  const [resourceTypeField, setResourceTypeField] = useState('');
  const [resourceNotes, setResourceNotes] = useState('');
  const [resourceParams, setResourceParams] = useState<GtmParameter[]>([]);
  const [resourceFiringTriggers, setResourceFiringTriggers] = useState<string[]>([]);
  const [savingResource, setSavingResource] = useState(false);

  // Importar contêiner
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);

  // Compartilhar acesso
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [permissions, setPermissions] = useState<GtmPermission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteAccountPermission, setInviteAccountPermission] = useState('user');
  const [inviteContainerPermission, setInviteContainerPermission] = useState('edit');
  const [inviting, setInviting] = useState(false);

  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    setNotConnected(false);
    try {
      const data = await gtmService.getAccounts();
      setAccounts(data);
      const entries = await Promise.all(
        data.map(async (acc) => {
          try {
            return [acc.accountId, await gtmService.getContainers(acc.accountId)] as const;
          } catch {
            return [acc.accountId, []] as const;
          }
        }),
      );
      setContainersByAccount(Object.fromEntries(entries));
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 422) {
        setNotConnected(true);
      } else {
        toast.error('Erro ao carregar contas do Google Tag Manager.');
      }
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const goToWorkspace = async (account: GtmAccount, container: GtmContainer) => {
    setSelectedAccount(account);
    setSelectedContainer(container);
    setWorkspaceTab('overview');
    setEditingItem(null);
    setExpandedFolders({});
    setScreen('workspace');
    setLoadingWorkspace(true);
    try {
      const data = await gtmService.getWorkspace(account.accountId, container.containerId);
      setWorkspace(data);
    } catch {
      toast.error('Erro ao carregar o workspace do contêiner.');
      setWorkspace(null);
    } finally {
      setLoadingWorkspace(false);
    }
  };

  const goToAccounts = () => {
    setScreen('accounts');
    setSelectedAccount(null);
    setSelectedContainer(null);
    setWorkspace(null);
    setEditingItem(null);
  };

  const switchTab = (tab: WorkspaceTab) => {
    setWorkspaceTab(tab);
    setEditingItem(null);
  };

  const toggleFolder = (folderId: string) => setExpandedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));

  const getItemsInFolder = (folderId: string | null) => {
    if (!workspace) return [];
    const matchFolder = (id?: string) => (folderId ? id === folderId : !id);
    const tags = workspace.tags.filter((t) => matchFolder(t.parentFolderId)).map((t) => ({ ...t, resourceType: 'Tag' as const }));
    const triggers = workspace.triggers
      .filter((t) => matchFolder(t.parentFolderId))
      .map((t) => ({ ...t, resourceType: 'Acionador' as const }));
    const variables = workspace.variables
      .filter((v) => matchFolder(v.parentFolderId))
      .map((v) => ({ ...v, resourceType: 'Variável' as const }));
    return [...tags, ...triggers, ...variables];
  };

  const folderName = (folderId?: string) => {
    if (!folderId || !workspace) return 'Sem pasta';
    return workspace.folders.find((f) => f.folderId === folderId)?.name || folderId;
  };

  const firingTriggerNames = (item: GtmResource) => {
    if (!workspace || !item.firingTriggerId?.length) return [];
    return item.firingTriggerId
      .map((id) => workspace.triggers.find((t) => t.triggerId === id)?.name)
      .filter((name): name is string => Boolean(name));
  };

  const reloadWorkspace = async () => {
    if (!selectedAccount || !selectedContainer) return;
    try {
      const data = await gtmService.getWorkspace(selectedAccount.accountId, selectedContainer.containerId);
      setWorkspace(data);
    } catch {
      toast.error('Erro ao recarregar o workspace.');
    }
  };

  // --- Criar contêiner --------------------------------------------------

  const openContainerModal = (account: GtmAccount) => {
    setContainerForAccount(account);
    setContainerName('');
    setContainerUsageContext('web');
    setContainerModalOpen(true);
  };

  const handleCreateContainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!containerForAccount || !containerName.trim()) {
      toast.error('Informe o nome do contêiner.');
      return;
    }
    setSavingContainer(true);
    try {
      await gtmService.createContainer(containerForAccount.accountId, containerName.trim(), containerUsageContext);
      toast.success('Contêiner criado com sucesso!');
      setContainerModalOpen(false);
      await loadAccounts();
    } catch {
      toast.error('Erro ao criar contêiner.');
    } finally {
      setSavingContainer(false);
    }
  };

  // --- Criar/editar/remover recurso --------------------------------------

  const openResourceModal = (kind: GtmResourceKind, item?: EditingItem) => {
    setResourceModalKind(kind);
    setResourceModalEditing(item || null);
    setResourceName(item?.name || '');
    setResourceTypeField(item?.type || '');
    setResourceNotes(item?.notes || '');
    setResourceParams(item?.parameter || []);
    setResourceFiringTriggers(item?.firingTriggerId || []);
    setResourceModalOpen(true);
    setEditingItem(null);
  };

  const addParamRow = () => setResourceParams((prev) => [...prev, { type: 'template', key: '', value: '' }]);
  const removeParamRow = (idx: number) => setResourceParams((prev) => prev.filter((_, i) => i !== idx));
  const updateParamRow = (idx: number, field: 'key' | 'value', value: string) =>
    setResourceParams((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !selectedContainer) return;
    if (!resourceName.trim() || (resourceModalKind !== 'folders' && !resourceTypeField.trim())) {
      toast.error(resourceModalKind === 'folders' ? 'Informe o nome da pasta.' : 'Informe nome e tipo.');
      return;
    }
    setSavingResource(true);
    try {
      const payload: Partial<GtmResource> =
        resourceModalKind === 'folders'
          ? {
              name: resourceName.trim(),
              notes: resourceNotes.trim() || undefined,
            }
          : {
              name: resourceName.trim(),
              type: resourceTypeField.trim(),
              notes: resourceNotes.trim() || undefined,
              parameter: resourceParams.filter((p) => p.key.trim()),
            };
      if (resourceModalKind === 'tags') {
        payload.firingTriggerId = resourceFiringTriggers;
      }
      if (resourceModalEditing) {
        const idField = { tags: 'tagId', triggers: 'triggerId', variables: 'variableId', folders: 'folderId' }[resourceModalKind] as
          | 'tagId'
          | 'triggerId'
          | 'variableId'
          | 'folderId';
        const resourceId = resourceModalEditing[idField];
        if (!resourceId) throw new Error('missing id');
        await gtmService.updateResource(selectedAccount.accountId, selectedContainer.containerId, resourceModalKind, resourceId, payload);
      } else {
        await gtmService.createResource(selectedAccount.accountId, selectedContainer.containerId, resourceModalKind, payload);
      }
      toast.success(resourceModalEditing ? 'Atualizado com sucesso!' : 'Criado com sucesso!');
      setResourceModalOpen(false);
      await reloadWorkspace();
    } catch {
      toast.error('Erro ao salvar. Confira o tipo e os parâmetros informados.');
    } finally {
      setSavingResource(false);
    }
  };

  const handleDeleteResource = async (kind: GtmResourceKind, item: EditingItem) => {
    if (!selectedAccount || !selectedContainer) return;
    const idField = { tags: 'tagId', triggers: 'triggerId', variables: 'variableId', folders: 'folderId' }[kind] as
      | 'tagId'
      | 'triggerId'
      | 'variableId'
      | 'folderId';
    const resourceId = item[idField];
    if (!resourceId) return;
    if (!confirm(`Remover "${item.name}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await gtmService.deleteResource(selectedAccount.accountId, selectedContainer.containerId, kind, resourceId);
      toast.success('Removido com sucesso!');
      setEditingItem(null);
      await reloadWorkspace();
    } catch {
      toast.error('Erro ao remover.');
    }
  };

  // --- Importar contêiner -------------------------------------------------

  const handleImportContainer = async () => {
    if (!selectedAccount || !selectedContainer || !importJson.trim()) {
      toast.error('Cole o JSON exportado do contêiner.');
      return;
    }
    setImporting(true);
    try {
      await gtmService.importContainer(selectedAccount.accountId, selectedContainer.containerId, importJson.trim());
      toast.success('Contêiner importado com sucesso!');
      setImportModalOpen(false);
      setImportJson('');
      await reloadWorkspace();
    } catch {
      toast.error('Erro ao importar. Confira se o JSON é uma versão de contêiner válida do GTM.');
    } finally {
      setImporting(false);
    }
  };

  // --- Compartilhar acesso -------------------------------------------------

  const openPermissionsModal = async () => {
    if (!selectedAccount) return;
    setPermissionsModalOpen(true);
    setLoadingPermissions(true);
    try {
      const data = await gtmService.getPermissions(selectedAccount.accountId);
      setPermissions(data);
    } catch {
      toast.error('Erro ao carregar permissões da conta.');
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount || !inviteEmail.trim()) {
      toast.error('Informe o e-mail da pessoa.');
      return;
    }
    setInviting(true);
    try {
      await gtmService.invitePermission(
        selectedAccount.accountId,
        inviteEmail.trim(),
        inviteAccountPermission,
        selectedContainer?.containerId,
        inviteContainerPermission,
      );
      toast.success('Acesso concedido com sucesso!');
      setInviteEmail('');
      const data = await gtmService.getPermissions(selectedAccount.accountId);
      setPermissions(data);
    } catch {
      toast.error('Erro ao conceder acesso.');
    } finally {
      setInviting(false);
    }
  };

  const handleRemovePermission = async (permission: GtmPermission) => {
    if (!selectedAccount) return;
    const id = permission.path?.split('/').pop() || permission.emailAddress;
    if (!confirm(`Remover o acesso de ${permission.emailAddress}?`)) return;
    try {
      await gtmService.removePermission(selectedAccount.accountId, id);
      toast.success('Acesso removido.');
      setPermissions((prev) => prev.filter((p) => p !== permission));
    } catch {
      toast.error('Erro ao remover acesso.');
    }
  };

  const loadTrackingConfig = useCallback(async () => {
    try {
      const config = await adminConfigService.getConfig('marketing_tracking');
      const nextForm: TrackingForm = { ...EMPTY_FORM };
      const configured: Record<string, boolean> = {};
      (Object.keys(EMPTY_FORM) as (keyof TrackingForm)[]).forEach((key) => {
        const raw = config[key];
        if (SECRET_FIELDS.includes(key)) {
          configured[key] = isMasked(raw);
          nextForm[key] = '';
        } else {
          nextForm[key] = typeof raw === 'string' ? raw : EMPTY_FORM[key];
        }
      });
      setForm(nextForm);
      setSecretConfigured(configured);
      setSecretModified({});
    } catch {
      toast.error('Erro ao carregar configuração de rastreamento.');
    }
  }, []);

  const openDrawer = () => {
    loadTrackingConfig();
    setDrawerOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingForm(true);
    try {
      const payload: Record<string, string | null> = {};
      (Object.keys(form) as (keyof TrackingForm)[]).forEach((key) => {
        if (SECRET_FIELDS.includes(key)) {
          if (secretModified[key]) payload[key] = form[key] || null;
        } else {
          payload[key] = form[key];
        }
      });
      await adminConfigService.saveConfig('marketing_tracking', payload);
      toast.success('Configurações salvas com sucesso!');
      setDrawerOpen(false);
    } catch {
      toast.error('Erro ao salvar configurações.');
    } finally {
      setSavingForm(false);
    }
  };

  const inputClass =
    'w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border';
  const labelClass = 'block text-xs font-medium text-gray-700 mb-1';

  if (notConnected) {
    return (
      <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 max-w-md text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <p className="text-sm text-gray-600">
            Nenhuma conta Google conectada ainda. Conecte em Configurações &gt; Integrações para ver os dados do Tag
            Manager.
          </p>
          <Link to="/settings/integrations/google_workspace">
            <Button>
              <Settings className="w-4 h-4 mr-2" /> Ir para Integrações
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex flex-col">
      {/* HEADER GLOBAL */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2 cursor-pointer" onClick={goToAccounts}>
            <div className="w-6 h-6 bg-blue-500 rounded-sm flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full" />
            </div>
            <span className="text-gray-600 text-lg sm:text-xl tracking-tight">Tag Manager</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full hidden sm:block">
              <Search size={20} />
            </button>
            <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
              M
            </div>
          </div>
        </div>

        {screen === 'workspace' && selectedAccount && selectedContainer && (
          <div className="flex flex-col border-t border-gray-100">
            <div className="flex items-center px-4 py-2 text-xs text-gray-600 bg-gray-50 border-b border-gray-200">
              <button onClick={goToAccounts} className="hover:text-blue-600 flex items-center gap-1 transition-colors shrink-0">
                <ArrowLeft size={12} /> Todas as contas
              </button>
              <span className="mx-1 shrink-0">›</span>
              <span className="font-medium truncate max-w-[160px]">{selectedAccount.name}</span>
              <span className="mx-1 shrink-0">›</span>
              <span className="font-medium truncate max-w-[160px]">{selectedContainer.name}</span>
              <span className="text-gray-400 ml-1 shrink-0">({selectedContainer.publicId})</span>
            </div>
          </div>
        )}
      </header>

      {/* --- TELA 1: LISTA DE CONTAS --- */}
      {screen === 'accounts' && (
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
            <h1 className="text-2xl text-gray-800 font-normal">Todas as contas</h1>
            <div className="flex gap-2">
              <a href="https://tagmanager.google.com/" target="_blank" rel="noreferrer">
                <Button variant="outline" title="Criar uma nova conta só é possível pelo site do Google Tag Manager">
                  <ExternalLink className="w-4 h-4 mr-2" /> Criar Conta
                </Button>
              </a>
              <Button variant="outline" onClick={openDrawer}>
                <Sliders className="w-4 h-4 mr-2" /> Configurar Variáveis
              </Button>
            </div>
          </div>

          {loadingAccounts ? (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-16">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando contas do Google Tag Manager...
            </div>
          ) : (
            <div className="space-y-6">
              {accounts.map((account) => (
                <div key={account.accountId} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <User className="text-gray-400" size={20} />
                      <span className="font-medium text-gray-800 text-base">{account.name}</span>
                    </div>
                    <button
                      onClick={() => openContainerModal(account)}
                      className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded transition-colors"
                    >
                      <Plus size={14} /> Criar Contêiner
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-500 bg-white">
                          <th className="px-4 py-3 font-medium w-1/2">Nome</th>
                          <th className="px-4 py-3 font-medium w-1/4">Tipo</th>
                          <th className="px-4 py-3 font-medium w-1/4">ID do contêiner</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(containersByAccount[account.accountId] || []).map((container) => (
                          <tr key={container.containerId} className="border-b border-gray-100 hover:bg-gray-50 group transition-colors">
                            <td className="px-4 py-3">
                              <button
                                onClick={() => goToWorkspace(account, container)}
                                className="text-blue-600 font-medium hover:underline text-left"
                              >
                                {container.name}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <Globe size={16} className="text-gray-400" /> {container.usageContext?.[0] || 'WEB'}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-600 font-mono text-xs">{container.publicId}</td>
                          </tr>
                        ))}
                        {(containersByAccount[account.accountId] || []).length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-4 py-4 text-center text-gray-400">
                              Nenhum contêiner nesta conta.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {accounts.length === 0 && (
                <div className="text-center text-gray-400 py-16 text-sm">Nenhuma conta encontrada nesta conta Google.</div>
              )}
            </div>
          )}
        </main>
      )}

      {/* --- TELA 2: ESPAÇO DE TRABALHO --- */}
      {screen === 'workspace' && (
        <div className="flex flex-1 overflow-hidden relative">
          <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col">
            <div className="py-2 flex-1 overflow-y-auto">
              <div className="px-4 py-2 mt-2 mb-4 space-y-2">
                <button
                  onClick={openDrawer}
                  className="w-full flex items-center justify-center gap-2 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800 border border-purple-200 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors shadow-sm"
                >
                  <Sliders size={18} /> Configurar Variáveis
                </button>
                <button
                  onClick={openPermissionsModal}
                  className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors shadow-sm"
                >
                  <Users size={18} /> Compartilhar Acesso
                </button>
                <button
                  onClick={() => setImportModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors shadow-sm"
                >
                  <Upload size={18} /> Importar Contêiner
                </button>
              </div>
              <div className="h-px bg-gray-100 mb-2" />
              <SidebarItem active={workspaceTab === 'overview'} onClick={() => switchTab('overview')} icon={<Layout />} label="Visão geral" />
              <SidebarItem active={workspaceTab === 'tags'} onClick={() => switchTab('tags')} icon={<Tag />} label="Tags" count={workspace?.tags.length} />
              <SidebarItem active={workspaceTab === 'triggers'} onClick={() => switchTab('triggers')} icon={<Zap />} label="Acionadores" count={workspace?.triggers.length} />
              <SidebarItem
                active={workspaceTab === 'variables'}
                onClick={() => switchTab('variables')}
                icon={<Variable />}
                label="Variáveis"
                count={workspace?.variables.length}
              />
              <SidebarItem active={workspaceTab === 'folders'} onClick={() => switchTab('folders')} icon={<Folder />} label="Pastas" count={workspace?.folders.length} />
              <SidebarItem
                active={workspaceTab === 'templates'}
                onClick={() => switchTab('templates')}
                icon={<LayoutTemplate />}
                label="Modelos"
                count={workspace?.templates.length}
              />
            </div>
          </aside>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 w-full relative">
            {loadingWorkspace && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-16">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando workspace...
              </div>
            )}

            {!loadingWorkspace && editingItem && (
              <div className="absolute inset-0 bg-[#f8f9fa] z-30 flex flex-col overflow-hidden shadow-2xl">
                <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between shadow-sm flex-shrink-0">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setEditingItem(null)} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors">
                      <X size={22} />
                    </button>
                    <div className="flex items-center gap-2">
                      <div className="bg-blue-100 p-1.5 rounded-full">
                        {(() => {
                          const Icon = resourceIcon(editingItem.resourceType);
                          return <Icon size={18} className="text-blue-700" />;
                        })()}
                      </div>
                      <span className="text-xl font-normal text-gray-800">{editingItem.name || 'Sem nome'}</span>
                    </div>
                  </div>
                  {editingItem.resourceType !== 'Modelo' && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openResourceModal(RESOURCE_KIND_BY_TYPE[editingItem.resourceType], editingItem)}
                      >
                        <Pencil className="w-4 h-4 mr-1.5" /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                        onClick={() => handleDeleteResource(RESOURCE_KIND_BY_TYPE[editingItem.resourceType], editingItem)}
                      >
                        <Trash2 className="w-4 h-4 mr-1.5" /> Remover
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center gap-6">
                  <div className="w-full max-w-3xl bg-white border border-gray-200 rounded-lg shadow-sm p-8 flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-16 h-16 rounded-full bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                      {(() => {
                        const Icon = resourceIcon(editingItem.resourceType);
                        return <Icon size={28} className="text-gray-400" />;
                      })()}
                    </div>
                    <div className="text-center sm:text-left">
                      <h3 className="text-lg font-normal text-gray-800">
                        Configuração {editingItem.resourceType === 'Tag' ? 'da tag' : editingItem.resourceType === 'Acionador' ? 'do acionador' : editingItem.resourceType === 'Variável' ? 'da variável' : 'do modelo'}
                      </h3>
                      <p className="text-gray-500 mt-2">
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono text-sm border border-gray-200">
                          Tipo: {editingItem.type}
                        </span>
                      </p>
                    </div>
                  </div>
                  {editingItem.resourceType === 'Tag' && (
                    <div className="w-full max-w-3xl bg-white border border-gray-200 rounded-lg shadow-sm p-8 flex flex-col sm:flex-row items-center gap-6">
                      <div className="w-16 h-16 rounded-full bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                        <Zap size={28} className="text-gray-400" />
                      </div>
                      <div className="text-center sm:text-left">
                        <h3 className="text-lg font-normal text-gray-800">Acionamento</h3>
                        <div className="flex flex-wrap gap-2 mt-2 justify-center sm:justify-start">
                          {firingTriggerNames(editingItem).length > 0 ? (
                            firingTriggerNames(editingItem).map((name, idx) => (
                              <span key={idx} className="flex items-center gap-1.5 text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full text-sm border border-gray-200">
                                <Zap size={12} className="text-blue-600" /> {name}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-400">Nenhum acionador vinculado.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="w-full max-w-3xl text-right text-sm text-gray-400 pt-4 pb-12">
                    Pasta: <span className="font-medium">{folderName(editingItem.parentFolderId)}</span>
                  </div>
                </div>
              </div>
            )}

            {!loadingWorkspace && !editingItem && workspace && (
              <>
                {workspaceTab === 'overview' && (
                  <div className="max-w-4xl space-y-6">
                    <h2 className="text-xl text-gray-800">Visão geral do contêiner</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                      <OverviewStat icon={Tag} label="Tags" value={workspace.tags.length} onClick={() => switchTab('tags')} />
                      <OverviewStat icon={Zap} label="Acionadores" value={workspace.triggers.length} onClick={() => switchTab('triggers')} />
                      <OverviewStat icon={Variable} label="Variáveis" value={workspace.variables.length} onClick={() => switchTab('variables')} />
                      <OverviewStat icon={Folder} label="Pastas" value={workspace.folders.length} onClick={() => switchTab('folders')} />
                      <OverviewStat icon={LayoutTemplate} label="Modelos" value={workspace.templates.length} onClick={() => switchTab('templates')} />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="p-4 border-b border-gray-200 bg-gray-50/50 rounded-t-lg">
                        <h3 className="font-medium text-gray-800">Detalhes do contêiner</h3>
                      </div>
                      <div className="p-4 space-y-3 text-sm">
                        <div>
                          <span className="block text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-1">ID DO CONTÊINER</span>
                          <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">{selectedContainer?.publicId}</span>
                        </div>
                        <div>
                          <span className="block text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-1">CONTEXTO</span>
                          <span className="flex items-center gap-1 text-gray-700">
                            <Globe size={14} className="text-gray-400" /> {selectedContainer?.usageContext?.[0] || 'Web'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(workspaceTab === 'tags' || workspaceTab === 'triggers' || workspaceTab === 'variables' || workspaceTab === 'templates') && (
                  <ResourceTable
                    items={
                      workspaceTab === 'tags'
                        ? workspace.tags
                        : workspaceTab === 'triggers'
                          ? workspace.triggers
                          : workspaceTab === 'variables'
                            ? workspace.variables
                            : workspace.templates
                    }
                    resourceType={
                      workspaceTab === 'tags' ? 'Tag' : workspaceTab === 'triggers' ? 'Acionador' : workspaceTab === 'variables' ? 'Variável' : 'Modelo'
                    }
                    folderName={folderName}
                    onSelect={setEditingItem}
                    onCreate={
                      workspaceTab === 'templates'
                        ? undefined
                        : () => openResourceModal(RESOURCE_KIND_BY_TYPE[workspaceTab === 'tags' ? 'Tag' : workspaceTab === 'triggers' ? 'Acionador' : 'Variável'])
                    }
                    onDelete={
                      workspaceTab === 'templates'
                        ? undefined
                        : (item) => handleDeleteResource(RESOURCE_KIND_BY_TYPE[item.resourceType as Exclude<ResourceType, 'Modelo'>], item)
                    }
                  />
                )}

                {workspaceTab === 'folders' && (
                  <div className="max-w-5xl space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-xl font-normal text-gray-800">Pastas</h2>
                      <Button size="sm" onClick={() => openResourceModal('folders')}>
                        <Plus className="w-4 h-4 mr-1" /> Nova Pasta
                      </Button>
                    </div>
                    {workspace.folders.map((folder) => {
                      const items = getItemsInFolder(folder.folderId || null);
                      const isExpanded = !!expandedFolders[folder.folderId || ''];
                      return (
                        <div key={folder.folderId} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden group">
                          <div className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                            <button
                              onClick={() => toggleFolder(folder.folderId || '')}
                              className="flex items-center gap-3 flex-1 text-left"
                            >
                              <ChevronRight size={18} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              <Folder size={18} className="text-gray-500" />
                              <span className="font-medium text-gray-800">{folder.name}</span>
                              <span className="text-gray-400 text-sm">({items.length})</span>
                            </button>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openResourceModal('folders', { ...folder, resourceType: 'Pasta' })}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteResource('folders', { ...folder, resourceType: 'Pasta' })}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="border-t border-gray-100 overflow-x-auto">
                              <FolderItemsTable items={items} onSelect={setEditingItem} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden opacity-90">
                      <button
                        onClick={() => toggleFolder('unfiled')}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                      >
                        <ChevronRight size={18} className={`text-gray-400 transition-transform ${expandedFolders.unfiled ? 'rotate-90' : ''}`} />
                        <Folder size={18} className="text-gray-400" />
                        <span className="font-medium text-gray-600">Itens não arquivados ({getItemsInFolder(null).length})</span>
                      </button>
                      {expandedFolders.unfiled && (
                        <div className="border-t border-gray-100 overflow-x-auto">
                          <FolderItemsTable items={getItemsInFolder(null)} onSelect={setEditingItem} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      )}

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50 sticky top-0">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-600" /> Configuração Global
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <form onSubmit={handleSaveForm} className="p-5 space-y-6">
              <section className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Informações da Empresa</h3>
                <div>
                  <Label className={labelClass}>Nome da Empresa</Label>
                  <input
                    className={inputClass}
                    value={form.MKT_COMPANY_NAME}
                    onChange={(e) => setForm({ ...form, MKT_COMPANY_NAME: e.target.value })}
                    placeholder="Ex: Anúncio Certo"
                  />
                </div>
                <div>
                  <Label className={labelClass}>E-mail Google (conta conectada)</Label>
                  <input
                    type="email"
                    className={inputClass}
                    value={form.MKT_GOOGLE_EMAIL}
                    onChange={(e) => setForm({ ...form, MKT_GOOGLE_EMAIL: e.target.value })}
                    placeholder="voce@gmail.com"
                  />
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Informações do Site</h3>
                <div>
                  <Label className={labelClass}>URL do Site</Label>
                  <input
                    className={inputClass}
                    value={form.MKT_SITE_URL}
                    onChange={(e) => setForm({ ...form, MKT_SITE_URL: e.target.value })}
                    placeholder="https://www.seusite.com.br"
                  />
                </div>
                <div>
                  <Label className={labelClass}>Tipo de Site</Label>
                  <select className={inputClass} value={form.MKT_SITE_TYPE} onChange={(e) => setForm({ ...form, MKT_SITE_TYPE: e.target.value })}>
                    <option value="wordpress">WordPress</option>
                    <option value="nuvemshop">Nuvemshop</option>
                    <option value="outros">Outros...</option>
                  </select>
                </div>
                {form.MKT_SITE_TYPE === 'outros' && (
                  <div>
                    <Label className={labelClass}>Especifique o tipo</Label>
                    <input
                      className={inputClass}
                      value={form.MKT_SITE_TYPE_OTHER}
                      onChange={(e) => setForm({ ...form, MKT_SITE_TYPE_OTHER: e.target.value })}
                      placeholder="Ex: Shopify, Vtex, Customizado..."
                    />
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">IDs de Rastreamento</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={labelClass}>ID Pixel Meta</Label>
                    <input className={inputClass} value={form.MKT_PIXEL_META} onChange={(e) => setForm({ ...form, MKT_PIXEL_META: e.target.value })} />
                  </div>
                  <SecretField
                    label="Token Meta (CAPI)"
                    value={form.MKT_TOKEN_META_SECRET}
                    configured={secretConfigured.MKT_TOKEN_META_SECRET}
                    onChange={(v) => {
                      setForm({ ...form, MKT_TOKEN_META_SECRET: v });
                      setSecretModified({ ...secretModified, MKT_TOKEN_META_SECRET: v.length > 0 });
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={labelClass}>ID Pixel TikTok</Label>
                    <input className={inputClass} value={form.MKT_PIXEL_TIKTOK} onChange={(e) => setForm({ ...form, MKT_PIXEL_TIKTOK: e.target.value })} />
                  </div>
                  <SecretField
                    label="Token TikTok"
                    value={form.MKT_TOKEN_TIKTOK_SECRET}
                    configured={secretConfigured.MKT_TOKEN_TIKTOK_SECRET}
                    onChange={(v) => {
                      setForm({ ...form, MKT_TOKEN_TIKTOK_SECRET: v });
                      setSecretModified({ ...secretModified, MKT_TOKEN_TIKTOK_SECRET: v.length > 0 });
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={labelClass}>Pinterest Tag</Label>
                    <input className={inputClass} value={form.MKT_PIXEL_PINTEREST} onChange={(e) => setForm({ ...form, MKT_PIXEL_PINTEREST: e.target.value })} />
                  </div>
                  <div>
                    <Label className={labelClass}>LinkedIn Insight</Label>
                    <input className={inputClass} value={form.MKT_PIXEL_LINKEDIN} onChange={(e) => setForm({ ...form, MKT_PIXEL_LINKEDIN: e.target.value })} />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Google</h3>
                <div>
                  <Label className={labelClass}>GA4 Measurement ID (G-XXXXXXX)</Label>
                  <input className={inputClass} value={form.MKT_GA4_ID} onChange={(e) => setForm({ ...form, MKT_GA4_ID: e.target.value })} placeholder="G-" />
                </div>
                <div>
                  <Label className={labelClass}>Google Ads AW ID (AW-XXXXXXX)</Label>
                  <input className={inputClass} value={form.MKT_GADS_ID} onChange={(e) => setForm({ ...form, MKT_GADS_ID: e.target.value })} placeholder="AW-" />
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-500">Rótulos de Conversão GAds</p>
                  {(
                    [
                      ['MKT_GADS_VIEWCONTENT', 'Ver Conteúdo'],
                      ['MKT_GADS_CART', 'Adicionar ao Carrinho'],
                      ['MKT_GADS_CHECKOUT', 'Iniciar Checkout'],
                      ['MKT_GADS_PURCHASE', 'Compra'],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>
                      <Label className="text-[10px] uppercase text-gray-500">{label}</Label>
                      <input className={inputClass} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Transporte URL (Server-Side)</h3>
                <div>
                  <Label className={labelClass}>URL Server Meta (CAPI)</Label>
                  <input
                    className={inputClass}
                    value={form.MKT_URL_SERVER_META}
                    onChange={(e) => setForm({ ...form, MKT_URL_SERVER_META: e.target.value })}
                    placeholder="https://meta.seusite.com.br"
                  />
                </div>
                <div>
                  <Label className={labelClass}>URL Server TikTok</Label>
                  <input className={inputClass} value={form.MKT_URL_SERVER_TIKTOK} onChange={(e) => setForm({ ...form, MKT_URL_SERVER_TIKTOK: e.target.value })} />
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Integrações Adicionais</h3>
                <div>
                  <Label className={labelClass}>URL Planilha Google</Label>
                  <input
                    className={inputClass}
                    value={form.MKT_GOOGLE_SHEETS_URL}
                    onChange={(e) => setForm({ ...form, MKT_GOOGLE_SHEETS_URL: e.target.value })}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                  />
                </div>
              </section>

              <Button type="submit" disabled={savingForm} className="w-full">
                {savingForm ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Salvar e Aplicar
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CRIAR CONTÊINER --- */}
      {containerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setContainerModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-base font-semibold text-gray-800">Criar contêiner</h2>
              <button onClick={() => setContainerModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateContainer} className="p-5 space-y-4">
              <p className="text-xs text-gray-500">
                Conta: <span className="font-medium text-gray-700">{containerForAccount?.name}</span>
              </p>
              <div>
                <Label className={labelClass}>Nome do contêiner</Label>
                <input
                  className={inputClass}
                  value={containerName}
                  onChange={(e) => setContainerName(e.target.value)}
                  placeholder="Ex: www.meusite.com.br"
                  autoFocus
                />
              </div>
              <div>
                <Label className={labelClass}>Tipo</Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setContainerUsageContext('web')}
                    className={`flex-1 border rounded-md px-3 py-2 text-sm flex items-center justify-center gap-2 transition-colors ${
                      containerUsageContext === 'web' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600'
                    }`}
                  >
                    <Globe size={16} /> Web
                  </button>
                  <button
                    type="button"
                    onClick={() => setContainerUsageContext('server')}
                    className={`flex-1 border rounded-md px-3 py-2 text-sm flex items-center justify-center gap-2 transition-colors ${
                      containerUsageContext === 'server' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600'
                    }`}
                  >
                    <Layout size={16} /> Servidor
                  </button>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setContainerModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={savingContainer}>
                  {savingContainer && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Criar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CRIAR/EDITAR RECURSO (tag/acionador/variável/pasta) --- */}
      {resourceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setResourceModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <h2 className="text-base font-semibold text-gray-800">
                {resourceModalEditing ? 'Editar' : 'Nova'}{' '}
                {resourceModalKind === 'tags' ? 'tag' : resourceModalKind === 'triggers' ? 'acionador' : resourceModalKind === 'variables' ? 'variável' : 'pasta'}
              </h2>
              <button onClick={() => setResourceModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveResource} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <Label className={labelClass}>Nome</Label>
                <input className={inputClass} value={resourceName} onChange={(e) => setResourceName(e.target.value)} autoFocus />
              </div>
              {resourceModalKind !== 'folders' && (
                <div>
                  <Label className={labelClass}>Tipo (conforme a API do GTM, ex: html, gaawe, ua, aev...)</Label>
                  <input
                    className={inputClass}
                    value={resourceTypeField}
                    onChange={(e) => setResourceTypeField(e.target.value)}
                    placeholder={resourceModalKind === 'tags' ? 'html' : resourceModalKind === 'triggers' ? 'click' : 'v'}
                  />
                </div>
              )}
              <div>
                <Label className={labelClass}>Notas</Label>
                <textarea
                  className={inputClass}
                  rows={2}
                  value={resourceNotes}
                  onChange={(e) => setResourceNotes(e.target.value)}
                />
              </div>

              {resourceModalKind !== 'folders' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className={labelClass}>Parâmetros</Label>
                    <button type="button" onClick={addParamRow} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <Plus size={12} /> Adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {resourceParams.map((param, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          className={inputClass}
                          placeholder="chave"
                          value={param.key}
                          onChange={(e) => updateParamRow(idx, 'key', e.target.value)}
                        />
                        <input
                          className={inputClass}
                          placeholder="valor"
                          value={param.value || ''}
                          onChange={(e) => updateParamRow(idx, 'value', e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => removeParamRow(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {resourceParams.length === 0 && <p className="text-xs text-gray-400">Nenhum parâmetro.</p>}
                  </div>
                </div>
              )}

              {resourceModalKind === 'tags' && workspace && workspace.triggers.length > 0 && (
                <div>
                  <Label className={labelClass}>Acionamento</Label>
                  <div className="border border-gray-200 rounded-md max-h-40 overflow-y-auto divide-y divide-gray-100">
                    {workspace.triggers.map((trigger) => (
                      <label key={trigger.triggerId} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!trigger.triggerId && resourceFiringTriggers.includes(trigger.triggerId)}
                          onChange={(e) => {
                            const id = trigger.triggerId || '';
                            setResourceFiringTriggers((prev) => (e.target.checked ? [...prev, id] : prev.filter((t) => t !== id)));
                          }}
                        />
                        {trigger.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setResourceModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={savingResource}>
                  {savingResource && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: IMPORTAR CONTÊINER --- */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setImportModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Upload className="w-4 h-4" /> Importar contêiner
              </h2>
              <button onClick={() => setImportModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500">
                Selecione o arquivo <span className="font-mono">.json</span> exportado de um contêiner do GTM (Admin &gt; Exportar
                contêiner), ou cole o conteúdo abaixo. O conteúdo será mesclado ao workspace atual.
              </p>
              <div>
                <input
                  type="file"
                  accept=".json,application/json"
                  className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setImportJson(String(reader.result || ''));
                    reader.onerror = () => toast.error('Não foi possível ler o arquivo selecionado.');
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />
              </div>
              <textarea
                className={`${inputClass} font-mono text-xs`}
                rows={10}
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='{"exportFormatVersion": 2, "containerVersion": {...}}'
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setImportModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={handleImportContainer} disabled={importing}>
                  {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Importar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: COMPARTILHAR ACESSO --- */}
      {permissionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPermissionsModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Users className="w-4 h-4" /> Compartilhar acesso
              </h2>
              <button onClick={() => setPermissionsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-5">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pessoas com acesso</p>
                {loadingPermissions ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
                  </div>
                ) : permissions.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">Ninguém além de você tem acesso a esta conta.</p>
                ) : (
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-md">
                    {permissions.map((perm, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium text-gray-700">{perm.emailAddress}</p>
                          <p className="text-xs text-gray-400">{perm.accountAccess?.permission || 'user'}</p>
                        </div>
                        <button
                          onClick={() => handleRemovePermission(perm)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleInvite} className="space-y-3 border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Convidar pessoa</p>
                <div>
                  <Label className={labelClass}>E-mail</Label>
                  <input
                    type="email"
                    className={inputClass}
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="pessoa@exemplo.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className={labelClass}>Permissão na conta</Label>
                    <select className={inputClass} value={inviteAccountPermission} onChange={(e) => setInviteAccountPermission(e.target.value)}>
                      <option value="user">Usuário</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  {selectedContainer && (
                    <div>
                      <Label className={labelClass}>Permissão no contêiner</Label>
                      <select className={inputClass} value={inviteContainerPermission} onChange={(e) => setInviteContainerPermission(e.target.value)}>
                        <option value="read">Leitura</option>
                        <option value="edit">Editar</option>
                        <option value="approve">Aprovar</option>
                        <option value="publish">Publicar</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={inviting}>
                    {inviting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Conceder acesso
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactElement;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-[90%] flex items-center justify-between px-4 py-3 my-1 text-sm rounded-r-full transition-colors ${
        active ? 'bg-[#e8f0fe] text-[#1967d2] font-medium' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <div className="flex items-center gap-4">
        {React.cloneElement(icon, { size: 20, className: active ? 'text-[#1967d2]' : 'text-gray-500' } as { size: number; className: string })}
        {label}
      </div>
      {count !== undefined && count > 0 && <span className="text-xs text-gray-500 font-medium">{count}</span>}
    </button>
  );
}

function OverviewStat({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: typeof Tag;
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-gray-200 bg-white p-4 flex flex-col items-center gap-2 text-center hover:shadow-md hover:border-blue-200 transition-all"
    >
      <Icon className="w-5 h-5 text-blue-600" />
      <span className="text-2xl font-bold text-gray-800">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </button>
  );
}

function ResourceTable({
  items,
  resourceType,
  folderName,
  onSelect,
  onCreate,
  onDelete,
}: {
  items: GtmResource[];
  resourceType: ResourceType;
  folderName: (folderId?: string) => string;
  onSelect: (item: EditingItem) => void;
  onCreate?: () => void;
  onDelete?: (item: EditingItem) => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm max-w-5xl">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-medium text-gray-800 text-lg">
          {resourceType === 'Tag' ? 'Tags' : resourceType === 'Acionador' ? 'Acionadores' : resourceType === 'Variável' ? 'Variáveis' : 'Modelos'}
        </h3>
        {onCreate && (
          <Button size="sm" onClick={onCreate}>
            <Plus className="w-4 h-4 mr-1" /> Nova
          </Button>
        )}
      </div>
      <div className="overflow-x-auto min-h-[200px]">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Pasta</th>
              {onDelete && <th className="px-4 py-3 font-medium w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  Nenhum item.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 group transition-colors cursor-pointer" onClick={() => onSelect({ ...item, resourceType })}>
                  <td className="px-4 py-3">
                    <span className="text-blue-600 group-hover:underline font-medium">{item.name || item.type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    <span className="bg-white border border-gray-200 px-2 py-0.5 rounded shadow-sm">{item.type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{folderName(item.parentFolderId)}</td>
                  {onDelete && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete({ ...item, resourceType });
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FolderItemsTable({
  items,
  onSelect,
}: {
  items: (GtmResource & { resourceType: ResourceType })[];
  onSelect: (item: EditingItem) => void;
}) {
  return (
    <table className="w-full text-left text-sm whitespace-nowrap">
      <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-[11px] uppercase tracking-wider font-semibold">
        <tr>
          <th className="px-6 py-2">Nome</th>
          <th className="px-6 py-2">Recurso</th>
          <th className="px-6 py-2">Tipo</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {items.length === 0 ? (
          <tr>
            <td colSpan={3} className="px-6 py-6 text-center text-gray-400">
              Nenhum item nesta pasta.
            </td>
          </tr>
        ) : (
          items.map((item, idx) => {
            const Icon = resourceIcon(item.resourceType);
            return (
              <tr key={idx} className="hover:bg-white group cursor-pointer transition-colors" onClick={() => onSelect(item)}>
                <td className="px-6 py-2.5">
                  <div className="text-blue-600 group-hover:underline font-medium flex items-center gap-2">
                    <Icon size={14} className="text-gray-400" /> {item.name || item.type}
                  </div>
                </td>
                <td className="px-6 py-2.5 text-gray-600 text-xs">{item.resourceType}</td>
                <td className="px-6 py-2.5 text-gray-500 font-mono text-xs">
                  <span className="bg-white border border-gray-200 px-2 py-0.5 rounded shadow-sm">{item.type}</span>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

function SecretField({
  label,
  value,
  configured,
  onChange,
}: {
  label: string;
  value: string;
  configured?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs font-medium text-gray-700">{label}</Label>
        {configured && !value && <span className="text-[10px] text-green-600">Configurado</span>}
      </div>
      <input
        type="password"
        autoComplete="off"
        className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={configured ? '••••••••' : ''}
      />
    </div>
  );
}
