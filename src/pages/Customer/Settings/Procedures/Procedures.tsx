import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import {
  Archive,
  BookOpenCheck,
  CheckSquare,
  Copy,
  Edit,
  ExternalLink,
  File,
  FileText,
  Globe2,
  Image,
  Link,
  Loader2,
  Plus,
  Search,
  Send,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { Button } from '@evoapi/design-system';

import { usePermissions } from '@/contexts/PermissionsContext';
import { proceduresService } from '@/services/procedures';
import type {
  Procedure,
  ProcedureAttachment,
  ProcedureBlock,
  ProcedureBlockType,
  ProcedureFormData,
  ProcedureTarget,
  ProcedureTargetType,
  ProcedureUsageMode,
  ProcedureVisibility,
  ProcedureVisibilityScope,
} from '@/types/procedures';
import {
  getAttachmentName,
  getAttachmentPreviewUrl,
  getAttachmentUrl,
  isImageAttachment,
} from '@/utils/procedureAttachments';

type VisibilityDraft = {
  all: boolean;
  publicLink: boolean;
  teamIds: string;
  inboxIds: string;
};

type TargetsDraft = Record<ProcedureTargetType, string>;

type ProcedureDraft = {
  title: string;
  description: string;
  category: string;
  tags: string;
  usageMode: ProcedureUsageMode;
  blocks: ProcedureBlock[];
  visibility: VisibilityDraft;
  targets: TargetsDraft;
  attachments: File[];
  removeAttachmentIds: string[];
};

type ImagePreview = {
  url: string;
  previewUrl?: string;
  title: string;
};

const emptyTargets = (): TargetsDraft => ({
  label: '',
  product: '',
  inbox: '',
  pipeline_stage: '',
});

const newBlock = (type: ProcedureBlockType): ProcedureBlock => ({
  id:
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : String(Date.now()),
  type,
  text: type === 'heading' ? 'Novo titulo' : '',
  label: type === 'button' ? 'Abrir link' : '',
  url: ['image', 'video', 'file', 'link', 'button'].includes(type) ? '' : undefined,
  checked: type === 'checklist' ? false : undefined,
  level: type === 'heading' ? 2 : undefined,
});

const emptyDraft = (): ProcedureDraft => ({
  title: '',
  description: '',
  category: '',
  tags: '',
  usageMode: 'internal',
  blocks: [newBlock('heading'), newBlock('paragraph'), newBlock('checklist')],
  visibility: {
    all: true,
    publicLink: false,
    teamIds: '',
    inboxIds: '',
  },
  targets: emptyTargets(),
  attachments: [],
  removeAttachmentIds: [],
});

const splitIds = (value: string) =>
  value
    .split(/[\n,;]/)
    .map(item => item.trim())
    .filter(Boolean);

const labelsByUsageMode: Record<ProcedureUsageMode, string> = {
  internal: 'Interno',
  customer: 'Cliente',
  both: 'Interno e cliente',
};

const labelsByScope: Record<ProcedureVisibilityScope, string> = {
  all: 'Todos',
  team: 'Time',
  inbox: 'Canal',
  public_link: 'Link publico',
};

const labelsByBlock: Record<ProcedureBlockType, string> = {
  heading: 'Titulo',
  paragraph: 'Texto',
  checklist: 'Checklist',
  image: 'Imagem',
  video: 'Video',
  file: 'Arquivo',
  link: 'Link',
  button: 'Botao',
};

const blockButtons: Array<{ type: ProcedureBlockType; icon: typeof FileText }> = [
  { type: 'heading', icon: FileText },
  { type: 'paragraph', icon: FileText },
  { type: 'checklist', icon: CheckSquare },
  { type: 'image', icon: Image },
  { type: 'video', icon: Video },
  { type: 'file', icon: File },
  { type: 'link', icon: Link },
  { type: 'button', icon: Send },
];

function getPublicProcedureUrl(procedure: Procedure) {
  if (!procedure.public_token) return '';

  return `${window.location.origin}/procedures/public/${procedure.public_token}`;
}

function hasPublicLinkVisibility(procedure: Procedure) {
  return procedure.visibility.some(item => item.scope_type === 'public_link');
}

function draftFromProcedure(procedure: Procedure): ProcedureDraft {
  const visibility: VisibilityDraft = {
    all: procedure.visibility.some(item => item.scope_type === 'all'),
    publicLink: procedure.visibility.some(item => item.scope_type === 'public_link'),
    teamIds: procedure.visibility
      .filter(item => item.scope_type === 'team')
      .map(item => item.scope_id)
      .filter(Boolean)
      .join('\n'),
    inboxIds: procedure.visibility
      .filter(item => item.scope_type === 'inbox')
      .map(item => item.scope_id)
      .filter(Boolean)
      .join('\n'),
  };

  const targets = emptyTargets();
  procedure.targets.forEach(target => {
    targets[target.target_type] = [targets[target.target_type], target.target_id]
      .filter(Boolean)
      .join('\n');
  });

  return {
    title: procedure.title,
    description: procedure.description || '',
    category: procedure.category || '',
    tags: procedure.tags.join(', '),
    usageMode: procedure.usage_mode,
    blocks: procedure.content_blocks.length ? procedure.content_blocks : [newBlock('paragraph')],
    visibility,
    targets,
    attachments: [],
    removeAttachmentIds: [],
  };
}

function toPayload(draft: ProcedureDraft): ProcedureFormData {
  const visibility: ProcedureVisibility[] = [];

  if (draft.visibility.all) visibility.push({ scope_type: 'all', scope_id: null });
  if (draft.visibility.publicLink) visibility.push({ scope_type: 'public_link', scope_id: null });
  splitIds(draft.visibility.teamIds).forEach(scopeId =>
    visibility.push({ scope_type: 'team', scope_id: scopeId }),
  );
  splitIds(draft.visibility.inboxIds).forEach(scopeId =>
    visibility.push({ scope_type: 'inbox', scope_id: scopeId }),
  );

  const targets: ProcedureTarget[] = [];
  Object.entries(draft.targets).forEach(([targetType, value]) => {
    splitIds(value).forEach(targetId =>
      targets.push({ target_type: targetType as ProcedureTargetType, target_id: targetId }),
    );
  });

  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    category: draft.category.trim(),
    tags: splitIds(draft.tags),
    usage_mode: draft.usageMode,
    content_blocks: draft.blocks,
    visibility,
    targets,
    attachments: draft.attachments,
    removeAttachmentIds: draft.removeAttachmentIds,
  };
}

function ImagePreviewModal({ image, onClose }: { image: ImagePreview; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={image.title}
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-slate-950 shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <p className="truncate text-sm font-medium text-white">{image.title}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
            aria-label="Fechar imagem"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 bg-black p-3">
          <img
            src={image.url}
            alt={image.title}
            className="mx-auto max-h-[82vh] w-auto max-w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}

function renderBlock(block: ProcedureBlock, openImagePreview: (image: ImagePreview) => void) {
  if (block.type === 'heading') {
    return (
      <h3 className="text-lg font-semibold text-gray-950">{block.text || 'Titulo sem texto'}</h3>
    );
  }

  if (block.type === 'checklist') {
    return (
      <div className="flex items-start gap-2 text-sm text-gray-700">
        <CheckSquare className="mt-0.5 h-4 w-4 text-emerald-600" />
        <span>{block.text || 'Item do checklist'}</span>
      </div>
    );
  }

  if (block.type === 'image' && block.url) {
    const title = block.label || block.text || 'Imagem do procedimento';
    return (
      <button
        type="button"
        onClick={() => openImagePreview({ url: block.url || '', title })}
        className="block max-w-3xl text-left"
      >
        <img
          src={block.url}
          alt={title}
          className="max-h-[420px] w-full rounded-md border border-gray-200 object-contain"
        />
      </button>
    );
  }

  if (block.type === 'video' && block.url) {
    return (
      <video
        src={block.url}
        controls
        className="max-h-[420px] w-full rounded-md border border-gray-200 bg-black"
      />
    );
  }

  if (['file', 'link', 'button'].includes(block.type) && block.url) {
    return (
      <a
        href={block.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <File className="h-4 w-4 text-gray-500" />
        {block.label || block.text || block.url}
      </a>
    );
  }

  if (['image', 'video', 'file', 'link', 'button'].includes(block.type)) {
    return (
      <div className="rounded border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700">
        <span className="font-medium">{labelsByBlock[block.type]}:</span>{' '}
        {block.label || block.text || block.url || 'Sem referencia'}
      </div>
    );
  }

  return <p className="text-sm leading-6 text-gray-700">{block.text || 'Texto do procedimento'}</p>;
}

function renderAttachment(
  attachment: ProcedureAttachment,
  openImagePreview: (image: ImagePreview) => void,
) {
  const url = getAttachmentUrl(attachment);
  const previewUrl = getAttachmentPreviewUrl(attachment);
  const name = getAttachmentName(attachment);

  if (isImageAttachment(attachment) && url) {
    return (
      <button
        key={attachment.id}
        type="button"
        onClick={() => openImagePreview({ url, previewUrl, title: name })}
        className="group block overflow-hidden rounded-md border border-gray-200 bg-white text-left hover:border-blue-300 hover:shadow-sm"
      >
        <div className="aspect-video bg-gray-50">
          <img
            src={previewUrl}
            alt={name}
            loading="lazy"
            onError={event => {
              if (event.currentTarget.src !== url) event.currentTarget.src = url;
            }}
            className="h-full w-full object-contain transition-transform group-hover:scale-[1.01]"
          />
        </div>
        <div className="flex items-center gap-2 border-t border-gray-200 px-3 py-2 text-sm text-gray-700">
          <Image className="h-4 w-4 text-blue-500" />
          <span className="truncate">{name}</span>
        </div>
      </button>
    );
  }

  return (
    <a
      key={attachment.id}
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
    >
      <File className="h-4 w-4 text-gray-500" />
      <span className="truncate">{name}</span>
    </a>
  );
}

export default function Procedures() {
  const { can, isReady } = usePermissions();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const [draft, setDraft] = useState<ProcedureDraft>(() => emptyDraft());
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadProcedures = useCallback(async () => {
    if (!isReady || !can('procedures', 'read')) return;

    setLoading(true);
    try {
      const response = await proceduresService.getProcedures(searchQuery || undefined, 100);
      setProcedures(response.data);
      setSelectedId(current => current || response.data[0]?.id || null);
    } catch (error) {
      console.error('Error loading procedures:', error);
      toast.error('Nao foi possivel carregar os procedimentos.');
    } finally {
      setLoading(false);
    }
  }, [can, isReady, searchQuery]);

  useEffect(() => {
    loadProcedures();
  }, [loadProcedures]);

  const filteredProcedures = useMemo(() => procedures, [procedures]);

  const selectedProcedure = useMemo(
    () =>
      filteredProcedures.find(procedure => procedure.id === selectedId) ||
      filteredProcedures[0] ||
      null,
    [filteredProcedures, selectedId],
  );

  const openCreateDialog = () => {
    if (!can('procedures', 'create') || !can('procedures', 'manage_visibility')) {
      toast.error('Seu perfil nao pode criar procedimentos.');
      return;
    }

    setEditingProcedure(null);
    setDraft(emptyDraft());
    setDialogOpen(true);
  };

  const openEditDialog = (procedure: Procedure) => {
    if (!can('procedures', 'update')) {
      toast.error('Seu perfil nao pode editar procedimentos.');
      return;
    }

    setEditingProcedure(procedure);
    setDraft(draftFromProcedure(procedure));
    setDialogOpen(true);
  };

  const updateBlock = (id: string, updates: Partial<ProcedureBlock>) => {
    setDraft(current => ({
      ...current,
      blocks: current.blocks.map(block => (block.id === id ? { ...block, ...updates } : block)),
    }));
  };

  const removeBlock = (id: string) => {
    setDraft(current => ({
      ...current,
      blocks: current.blocks.filter(block => block.id !== id),
    }));
  };

  const addBlock = (type: ProcedureBlockType) => {
    setDraft(current => ({ ...current, blocks: [...current.blocks, newBlock(type)] }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setDraft(current => ({ ...current, attachments: [...current.attachments, ...files] }));
    event.target.value = '';
  };

  const replaceProcedureInState = (procedure: Procedure) => {
    setProcedures(current =>
      current.map(item => (item.id === procedure.id ? procedure : item)),
    );
    setSelectedId(procedure.id);
  };

  const resolvePublicLinkProcedure = async (procedure: Procedure) => {
    let currentProcedure = procedure;

    if (!currentProcedure.public_token) {
      try {
        currentProcedure = await proceduresService.getProcedure(procedure.id);
        replaceProcedureInState(currentProcedure);
      } catch (error) {
        console.error('Error loading public procedure token:', error);
      }
    }

    if (!currentProcedure.public_token && currentProcedure.status === 'published') {
      try {
        currentProcedure = await proceduresService.publishProcedure(procedure.id);
        replaceProcedureInState(currentProcedure);
      } catch (error) {
        console.error('Error generating public procedure token:', error);
        toast.error('Nao foi possivel gerar o link publico.');
        return null;
      }
    }

    return currentProcedure.public_token ? currentProcedure : null;
  };

  const copyPublicLink = async (procedure: Procedure) => {
    const procedureWithToken = await resolvePublicLinkProcedure(procedure);
    const publicUrl = procedureWithToken ? getPublicProcedureUrl(procedureWithToken) : '';

    if (!publicUrl) {
      toast.error('Publique o procedimento para gerar o link publico.');
      return;
    }

    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Link publico copiado.');
    } catch (error) {
      console.error('Error copying public procedure link:', error);
      toast.error('Nao foi possivel copiar o link.');
    }
  };

  const markAttachmentForRemoval = (attachmentId: string) => {
    setDraft(current => ({
      ...current,
      removeAttachmentIds: current.removeAttachmentIds.includes(attachmentId)
        ? current.removeAttachmentIds.filter(id => id !== attachmentId)
        : [...current.removeAttachmentIds, attachmentId],
    }));
  };

  const saveProcedure = async () => {
    if (!draft.title.trim()) {
      toast.error('Informe o titulo do procedimento.');
      return;
    }

    setSaving(true);
    try {
      const payload = toPayload(draft);
      let saved: Procedure;
      if (editingProcedure) {
        const updatePayload: Partial<ProcedureFormData> = { ...payload };
        const hasPublicVisibility = updatePayload.visibility?.some(
          item => item.scope_type === 'public_link',
        );
        if (
          !can('procedures', 'manage_visibility') ||
          (hasPublicVisibility && !can('procedures', 'share'))
        ) {
          delete updatePayload.visibility;
        }
        saved = await proceduresService.updateProcedure(editingProcedure.id, updatePayload);
      } else {
        saved = await proceduresService.createProcedure(payload);
      }

      toast.success(editingProcedure ? 'Procedimento atualizado.' : 'Procedimento criado.');
      setDialogOpen(false);
      setEditingProcedure(null);
      setSelectedId(saved.id);
      await loadProcedures();
    } catch (error) {
      console.error('Error saving procedure:', error);
      toast.error('Nao foi possivel salvar o procedimento.');
    } finally {
      setSaving(false);
    }
  };

  const publishProcedure = async (procedure: Procedure) => {
    if (!can('procedures', 'publish')) {
      toast.error('Seu perfil nao pode publicar procedimentos.');
      return;
    }

    setSaving(true);
    try {
      const saved = await proceduresService.publishProcedure(procedure.id);
      toast.success('Procedimento publicado.');
      setSelectedId(saved.id);
      await loadProcedures();
    } catch (error) {
      console.error('Error publishing procedure:', error);
      toast.error('Nao foi possivel publicar o procedimento.');
    } finally {
      setSaving(false);
    }
  };

  const archiveProcedure = async (procedure: Procedure) => {
    if (!can('procedures', 'update')) {
      toast.error('Seu perfil nao pode arquivar procedimentos.');
      return;
    }

    setSaving(true);
    try {
      await proceduresService.archiveProcedure(procedure.id);
      toast.success('Procedimento arquivado.');
      setSelectedId(null);
      await loadProcedures();
    } catch (error) {
      console.error('Error archiving procedure:', error);
      toast.error('Nao foi possivel arquivar o procedimento.');
    } finally {
      setSaving(false);
    }
  };

  const deleteProcedure = async (procedure: Procedure) => {
    if (!can('procedures', 'delete')) {
      toast.error('Seu perfil nao pode remover procedimentos.');
      return;
    }

    setSaving(true);
    try {
      await proceduresService.deleteProcedure(procedure.id);
      toast.success('Procedimento removido da lista ativa.');
      setSelectedId(null);
      await loadProcedures();
    } catch (error) {
      console.error('Error deleting procedure:', error);
      toast.error('Nao foi possivel remover o procedimento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-gray-50 p-4"
      data-tour="settings-procedures-page"
    >
      <div className="mb-4 flex flex-col gap-3 border-b border-gray-200 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase text-blue-700">
            <BookOpenCheck className="h-4 w-4" />
            Base de atendimento
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-gray-950">Procedimentos</h1>
          <p className="mt-1 text-sm text-gray-600">
            Cadastre passo a passo com midias, escopos de visibilidade e uso interno ou para
            cliente.
          </p>
        </div>

        {isReady && can('procedures', 'create') && can('procedures', 'manage_visibility') && (
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Novo procedimento
          </Button>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[420px_minmax(0,1fr)]">
        <section className="flex min-h-0 flex-col border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Buscar por titulo, categoria, tag ou conteudo"
                className="h-9 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {loading ? (
              <div className="flex h-48 items-center justify-center text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando procedimentos...
              </div>
            ) : filteredProcedures.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center px-8 text-center text-sm text-gray-500">
                <BookOpenCheck className="mb-3 h-8 w-8 text-gray-300" />
                Nenhum procedimento encontrado.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredProcedures.map(procedure => (
                  <button
                    key={procedure.id}
                    type="button"
                    onClick={() => setSelectedId(procedure.id)}
                    className={`w-full px-4 py-3 text-left transition ${
                      selectedProcedure?.id === procedure.id
                        ? 'bg-blue-50'
                        : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-950">
                          {procedure.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-600">
                          {procedure.description || 'Sem descricao'}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          procedure.status === 'published'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {procedure.status === 'published' ? 'Publicado' : 'Rascunho'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {procedure.category && (
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                          {procedure.category}
                        </span>
                      )}
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                        {labelsByUsageMode[procedure.usage_mode]}
                      </span>
                      {procedure.visibility.slice(0, 3).map(visibility => (
                        <span
                          key={`${visibility.scope_type}-${visibility.scope_id || 'global'}`}
                          className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                        >
                          {labelsByScope[visibility.scope_type]}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="min-h-0 overflow-auto border border-gray-200 bg-white">
          {selectedProcedure ? (
            <div className="mx-auto max-w-4xl p-6">
              <div className="flex flex-col gap-3 border-b border-gray-200 pb-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                      {labelsByUsageMode[selectedProcedure.usage_mode]}
                    </span>
                    {hasPublicLinkVisibility(selectedProcedure) && (
                      <span className="inline-flex items-center rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                        <Globe2 className="mr-1 h-3 w-3" />
                        Link publico ativo
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-gray-950">
                    {selectedProcedure.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {selectedProcedure.description || 'Sem descricao cadastrada.'}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {can('procedures', 'update') && (
                    <Button variant="outline" onClick={() => openEditDialog(selectedProcedure)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  )}
                  {selectedProcedure.status !== 'published' && can('procedures', 'publish') && (
                    <Button onClick={() => publishProcedure(selectedProcedure)} disabled={saving}>
                      <Globe2 className="mr-2 h-4 w-4" />
                      Publicar
                    </Button>
                  )}
                  {hasPublicLinkVisibility(selectedProcedure) && can('procedures', 'share') && (
                    <Button
                      variant="outline"
                      onClick={() => copyPublicLink(selectedProcedure)}
                      disabled={saving || selectedProcedure.status !== 'published'}
                      title={
                        selectedProcedure.public_token
                          ? getPublicProcedureUrl(selectedProcedure)
                          : 'Publique o procedimento para gerar o link publico'
                      }
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      {selectedProcedure.public_token ? 'Copiar link' : 'Gerar link'}
                    </Button>
                  )}
                  {can('procedures', 'update') && (
                    <Button
                      variant="outline"
                      onClick={() => archiveProcedure(selectedProcedure)}
                      disabled={saving}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Arquivar
                    </Button>
                  )}
                  {can('procedures', 'delete') && (
                    <Button
                      variant="destructive"
                      onClick={() => deleteProcedure(selectedProcedure)}
                      disabled={saving}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover
                    </Button>
                  )}
                </div>
              </div>

              {hasPublicLinkVisibility(selectedProcedure) && (
                <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-emerald-700">Link publico</p>
                  {selectedProcedure.public_token ? (
                    <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
                      <code className="min-w-0 flex-1 truncate rounded border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-900">
                        {getPublicProcedureUrl(selectedProcedure)}
                      </code>
                      <a
                        href={getPublicProcedureUrl(selectedProcedure)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-md border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Abrir
                      </a>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-emerald-800">
                      {selectedProcedure.status === 'published'
                        ? 'Clique em Gerar link para criar o link de compartilhamento.'
                        : 'Publique o procedimento para gerar o link de compartilhamento.'}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="border border-gray-200 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">Categoria</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedProcedure.category || 'Sem categoria'}
                  </p>
                </div>
                <div className="border border-gray-200 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">Tags</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedProcedure.tags.join(', ') || 'Sem tags'}
                  </p>
                </div>
                <div className="border border-gray-200 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">Visibilidade</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedProcedure.visibility
                      .map(item => labelsByScope[item.scope_type])
                      .join(', ') || 'Todos'}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {selectedProcedure.content_blocks.map(block => (
                  <div key={block.id} className="border-l-2 border-blue-200 pl-4">
                    {renderBlock(block, setImagePreview)}
                  </div>
                ))}
              </div>

              {selectedProcedure.attachments.length > 0 && (
                <div className="mt-8 border-t border-gray-200 pt-5">
                  <h3 className="text-sm font-semibold text-gray-950">Anexos</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {selectedProcedure.attachments.map(attachment =>
                      renderAttachment(attachment, setImagePreview),
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center text-sm text-gray-500">
              <BookOpenCheck className="mb-3 h-10 w-10 text-gray-300" />
              Selecione ou crie um procedimento.
            </div>
          )}
        </section>
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="flex max-h-[94vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {editingProcedure ? 'Editar procedimento' : 'Novo procedimento'}
                </h2>
                <p className="mt-1 max-w-3xl text-sm text-slate-300">
                  Defina conteudo, anexos, permissao de uso e onde o passo a passo fica disponivel.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="rounded-md p-2 text-slate-400 hover:bg-slate-900 hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="min-w-0 space-y-5">
                  <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.6fr)]">
                    <label className="space-y-1 text-sm font-medium text-slate-300">
                      Titulo
                      <input
                        value={draft.title}
                        onChange={event =>
                          setDraft(current => ({ ...current, title: event.target.value }))
                        }
                        className="h-11 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </label>
                    <label className="space-y-1 text-sm font-medium text-slate-300">
                      Categoria
                      <input
                        value={draft.category}
                        onChange={event =>
                          setDraft(current => ({ ...current, category: event.target.value }))
                        }
                        placeholder="Ex: Financeiro, suporte, implantacao"
                        className="h-11 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </label>
                  </div>

                  <label className="space-y-1 text-sm font-medium text-slate-300">
                    Descricao
                    <textarea
                      value={draft.description}
                      onChange={event =>
                        setDraft(current => ({ ...current, description: event.target.value }))
                      }
                      rows={3}
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                    <label className="space-y-1 text-sm font-medium text-slate-300">
                      Tags
                      <input
                        value={draft.tags}
                        onChange={event =>
                          setDraft(current => ({ ...current, tags: event.target.value }))
                        }
                        placeholder="separe por virgula"
                        className="h-11 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </label>
                    <label className="space-y-1 text-sm font-medium text-slate-300">
                      Uso permitido
                      <select
                        value={draft.usageMode}
                        onChange={event =>
                          setDraft(current => ({
                            ...current,
                            usageMode: event.target.value as ProcedureUsageMode,
                          }))
                        }
                        className="h-11 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="internal">Somente interno</option>
                        <option value="customer">Enviar ao cliente</option>
                        <option value="both">Interno e cliente</option>
                      </select>
                    </label>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/40">
                    <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                      <p className="text-sm font-semibold text-white">Blocos do passo a passo</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-wrap">
                        {blockButtons.map(({ type, icon: Icon }) => (
                          <Button
                            key={type}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addBlock(type)}
                          >
                            <Icon className="mr-1 h-3.5 w-3.5" />
                            {labelsByBlock[type]}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 p-4">
                      {draft.blocks.map((block, index) => (
                        <div
                          key={block.id}
                          className="rounded-lg border border-slate-800 bg-slate-950 p-4"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold uppercase text-slate-400">
                              {index + 1}. {labelsByBlock[block.type]}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeBlock(block.id)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                              aria-label="Remover bloco"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>

                          {['image', 'video', 'file', 'link', 'button'].includes(block.type) && (
                            <div className="mb-2 grid gap-2 md:grid-cols-2">
                              <input
                                value={block.label || ''}
                                onChange={event =>
                                  updateBlock(block.id, { label: event.target.value })
                                }
                                placeholder="Rotulo"
                                className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                              />
                              <input
                                value={block.url || ''}
                                onChange={event =>
                                  updateBlock(block.id, { url: event.target.value })
                                }
                                placeholder="URL"
                                className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                              />
                            </div>
                          )}

                          <textarea
                            value={block.text || ''}
                            onChange={event => updateBlock(block.id, { text: event.target.value })}
                            rows={block.type === 'paragraph' ? 4 : 2}
                            placeholder="Conteudo do bloco"
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <aside className="min-w-0 space-y-4">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                    <p className="text-sm font-semibold text-white">Visibilidade</p>
                    <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={draft.visibility.all}
                        onChange={event =>
                          setDraft(current => ({
                            ...current,
                            visibility: { ...current.visibility, all: event.target.checked },
                          }))
                        }
                      />
                      Todos os atendentes
                    </label>
                    <label className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={draft.visibility.publicLink}
                        onChange={event =>
                          setDraft(current => ({
                            ...current,
                            visibility: { ...current.visibility, publicLink: event.target.checked },
                          }))
                        }
                      />
                      Gerar link publico
                    </label>
                    <label className="mt-3 block text-sm font-medium text-slate-300">
                      IDs de times
                      <textarea
                        value={draft.visibility.teamIds}
                        onChange={event =>
                          setDraft(current => ({
                            ...current,
                            visibility: { ...current.visibility, teamIds: event.target.value },
                          }))
                        }
                        rows={3}
                        placeholder="Um UUID por linha"
                        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </label>
                    <label className="mt-3 block text-sm font-medium text-slate-300">
                      IDs de canais/inboxes
                      <textarea
                        value={draft.visibility.inboxIds}
                        onChange={event =>
                          setDraft(current => ({
                            ...current,
                            visibility: { ...current.visibility, inboxIds: event.target.value },
                          }))
                        }
                        rows={3}
                        placeholder="Um UUID por linha"
                        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </label>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                    <p className="text-sm font-semibold text-white">Sugestoes automaticas</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Cadastre IDs para preparar sugestao por etiqueta, produto, inbox ou etapa.
                    </p>
                    {Object.keys(draft.targets).map(targetType => (
                      <label
                        key={targetType}
                        className="mt-3 block text-sm font-medium text-slate-300"
                      >
                        {targetType}
                        <textarea
                          value={draft.targets[targetType as ProcedureTargetType]}
                          onChange={event =>
                            setDraft(current => ({
                              ...current,
                              targets: { ...current.targets, [targetType]: event.target.value },
                            }))
                          }
                          rows={2}
                          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
                    <p className="text-sm font-semibold text-white">Anexos</p>
                    <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-700 px-3 py-5 text-sm text-slate-300 hover:bg-slate-900">
                      <Upload className="h-4 w-4" />
                      Adicionar arquivos
                      <input type="file" multiple className="hidden" onChange={handleFileChange} />
                    </label>
                    {draft.attachments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {draft.attachments.map(file => (
                          <div
                            key={`${file.name}-${file.size}`}
                            className="flex items-center justify-between gap-2 text-xs text-slate-300"
                          >
                            <span className="truncate">{file.name}</span>
                            <span>{Math.ceil(file.size / 1024)} KB</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {editingProcedure?.attachments.length ? (
                      <div className="mt-3 space-y-2">
                        {editingProcedure.attachments.map(attachment => {
                          const removing = draft.removeAttachmentIds.includes(attachment.id);
                          return (
                            <button
                              key={attachment.id}
                              type="button"
                              onClick={() => markAttachmentForRemoval(attachment.id)}
                              className={`flex w-full items-center justify-between gap-2 rounded border px-2 py-1 text-left text-xs ${
                                removing
                                  ? 'border-red-500/40 bg-red-500/10 text-red-300'
                                  : 'border-slate-700 text-slate-300'
                              }`}
                            >
                              <span className="truncate">
                                {attachment.file_name ||
                                  attachment.fallback_title ||
                                  attachment.file_type}
                              </span>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </aside>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-800 px-6 py-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={saveProcedure} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar procedimento
              </Button>
            </div>
          </div>
        </div>
      )}

      {imagePreview && (
        <ImagePreviewModal image={imagePreview} onClose={() => setImagePreview(null)} />
      )}
    </div>
  );
}
