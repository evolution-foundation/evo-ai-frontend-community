import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Heart, MessageCircle, Users, Image as ImageIcon, X, Send, Plus, Upload, Calendar, RotateCcw, Phone, Youtube } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Badge, Card, CardContent } from '@evoapi/design-system';
import { BaseHeader } from '@/components/base';
import { gestorPostsService } from '@/services/marketing/gestorPostsService';
import type {
  SocialChannelOption,
  InstagramAccountInfo,
  InstagramMedia,
  InstagramComment,
  PublicationPlatform,
  PublicationContentType,
  ScheduledPostItem,
  ScheduledPostStatus,
  WhatsappStatusChannelOption,
  WhatsappStatusType,
  YoutubePrivacyStatus,
} from '@/types/marketing/gestorPosts';

const CONTENT_TYPE_LABELS: Record<PublicationContentType, string> = {
  feed: 'Feed',
  stories: 'Stories',
  reels: 'Reels',
};

const WHATSAPP_STATUS_TYPE_LABELS: Record<WhatsappStatusType, string> = {
  text: 'Texto',
  image: 'Imagem',
  video: 'Vídeo',
  audio: 'Áudio',
};

const YOUTUBE_PRIVACY_LABELS: Record<YoutubePrivacyStatus, string> = {
  public: 'Público',
  unlisted: 'Não listado',
  private: 'Privado',
};

const SCHEDULED_STATUS_LABELS: Record<ScheduledPostStatus, string> = {
  scheduled: 'Agendado',
  executing: 'Publicando',
  completed: 'Publicado',
  failed: 'Falhou',
  cancelled: 'Cancelado',
};

function toDatetimeLocalMin() {
  const d = new Date(Date.now() + 5 * 60 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatNumber(n?: number) {
  return new Intl.NumberFormat('pt-BR').format(n || 0);
}

function insightValue(media: InstagramMedia, name: string): number | null {
  const insight = media.insights?.data?.find((i) => i.name === name);
  return insight?.values?.[0]?.value ?? null;
}

export default function GestorPostsPage() {
  const [channels, setChannels] = useState<SocialChannelOption[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<SocialChannelOption | null>(null);
  const [loadingChannels, setLoadingChannels] = useState(true);

  const [accountInfo, setAccountInfo] = useState<InstagramAccountInfo | null>(null);
  const [media, setMedia] = useState<InstagramMedia[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);

  const [selectedMedia, setSelectedMedia] = useState<InstagramMedia | null>(null);
  const [comments, setComments] = useState<InstagramComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [sendingReply, setSendingReply] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCaption, setNewCaption] = useState('');
  const [newContentType, setNewContentType] = useState<PublicationContentType>('feed');
  const [newPlatforms, setNewPlatforms] = useState<PublicationPlatform[]>(['instagram']);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newPreviewUrl, setNewPreviewUrl] = useState<string | null>(null);
  const [newIsCarousel, setNewIsCarousel] = useState(false);
  const [carouselFiles, setCarouselFiles] = useState<File[]>([]);
  const [carouselPreviewUrls, setCarouselPreviewUrls] = useState<string[]>([]);
  const [carouselProgress, setCarouselProgress] = useState<string | null>(null);
  const [newIsScheduled, setNewIsScheduled] = useState(false);
  const [newScheduledFor, setNewScheduledFor] = useState('');
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const carouselInputRef = useRef<HTMLInputElement>(null);

  const [showScheduledModal, setShowScheduledModal] = useState(false);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPostItem[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [scheduledActionId, setScheduledActionId] = useState<string | null>(null);

  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [whatsappChannels, setWhatsappChannels] = useState<WhatsappStatusChannelOption[]>([]);
  const [loadingWhatsappChannels, setLoadingWhatsappChannels] = useState(false);
  const [whatsappChannelId, setWhatsappChannelId] = useState('');
  const [whatsappType, setWhatsappType] = useState<WhatsappStatusType>('text');
  const [whatsappText, setWhatsappText] = useState('');
  const [whatsappCaption, setWhatsappCaption] = useState('');
  const [whatsappFile, setWhatsappFile] = useState<File | null>(null);
  const [whatsappPreviewUrl, setWhatsappPreviewUrl] = useState<string | null>(null);
  const [sendingWhatsappStatus, setSendingWhatsappStatus] = useState(false);
  const whatsappFileInputRef = useRef<HTMLInputElement>(null);

  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [youtubeConnected, setYoutubeConnected] = useState<boolean | null>(null);
  const [loadingYoutubeConnected, setLoadingYoutubeConnected] = useState(false);
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubeDescription, setYoutubeDescription] = useState('');
  const [youtubePrivacy, setYoutubePrivacy] = useState<YoutubePrivacyStatus>('unlisted');
  const [youtubeFile, setYoutubeFile] = useState<File | null>(null);
  const [youtubePreviewUrl, setYoutubePreviewUrl] = useState<string | null>(null);
  const [sendingYoutubeUpload, setSendingYoutubeUpload] = useState(false);
  const youtubeFileInputRef = useRef<HTMLInputElement>(null);

  const availablePlatforms: PublicationPlatform[] =
    selectedChannel?.channel_type === 'Channel::FacebookPage' ? ['instagram', 'facebook'] : ['instagram'];

  const togglePlatform = (platform: PublicationPlatform) => {
    setNewPlatforms((prev) => (prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]));
  };

  const handleFileChange = (file: File | null) => {
    setNewFile(file);
    if (newPreviewUrl) URL.revokeObjectURL(newPreviewUrl);
    setNewPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const addCarouselFiles = (files: FileList | null) => {
    if (!files) return;
    const next = [...carouselFiles, ...Array.from(files)].slice(0, 10);
    setCarouselFiles(next);
    carouselPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    setCarouselPreviewUrls(next.map((f) => URL.createObjectURL(f)));
  };

  const removeCarouselFile = (index: number) => {
    const next = carouselFiles.filter((_, i) => i !== index);
    setCarouselFiles(next);
    carouselPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    setCarouselPreviewUrls(next.map((f) => URL.createObjectURL(f)));
  };

  const resetCreateForm = () => {
    setNewCaption('');
    setNewContentType('feed');
    setNewPlatforms(['instagram']);
    setNewIsCarousel(false);
    setCarouselFiles([]);
    carouselPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    setCarouselPreviewUrls([]);
    setCarouselProgress(null);
    setNewIsScheduled(false);
    setNewScheduledFor('');
    handleFileChange(null);
  };

  const loadScheduledPosts = useCallback(async () => {
    setLoadingScheduled(true);
    try {
      const data = await gestorPostsService.getScheduledPosts();
      setScheduledPosts(data);
    } catch {
      toast.error('Erro ao carregar posts agendados.');
    } finally {
      setLoadingScheduled(false);
    }
  }, []);

  const openScheduledModal = () => {
    setShowScheduledModal(true);
    loadScheduledPosts();
  };

  const handleCancelScheduled = async (id: string) => {
    setScheduledActionId(id);
    try {
      await gestorPostsService.cancelScheduledPost(id);
      toast.success('Agendamento cancelado.');
      loadScheduledPosts();
    } catch {
      toast.error('Erro ao cancelar agendamento.');
    } finally {
      setScheduledActionId(null);
    }
  };

  const handleRetryScheduled = async (id: string) => {
    setScheduledActionId(id);
    try {
      await gestorPostsService.retryScheduledPost(id);
      toast.success('Post reenviado para a fila de agendamento.');
      loadScheduledPosts();
    } catch {
      toast.error('Erro ao reenviar post agendado.');
    } finally {
      setScheduledActionId(null);
    }
  };

  const handleWhatsappFileChange = (file: File | null) => {
    setWhatsappFile(file);
    if (whatsappPreviewUrl) URL.revokeObjectURL(whatsappPreviewUrl);
    setWhatsappPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const resetWhatsappForm = () => {
    setWhatsappChannelId('');
    setWhatsappType('text');
    setWhatsappText('');
    setWhatsappCaption('');
    handleWhatsappFileChange(null);
  };

  const openWhatsappModal = async () => {
    setShowWhatsappModal(true);
    setLoadingWhatsappChannels(true);
    try {
      const data = await gestorPostsService.getWhatsappStatusChannels();
      setWhatsappChannels(data);
      if (data.length > 0) setWhatsappChannelId(data[0].channel_id);
    } catch {
      toast.error('Erro ao carregar canais de WhatsApp.');
    } finally {
      setLoadingWhatsappChannels(false);
    }
  };

  const handleSendWhatsappStatus = async () => {
    if (!whatsappChannelId) {
      toast.error('Selecione um canal de WhatsApp.');
      return;
    }
    if (whatsappType === 'text' && !whatsappText.trim()) {
      toast.error('Escreva o texto do status.');
      return;
    }
    if (whatsappType !== 'text' && !whatsappFile) {
      toast.error('Selecione um arquivo de mídia.');
      return;
    }
    setSendingWhatsappStatus(true);
    try {
      await gestorPostsService.createWhatsappStatus({
        channel_id: whatsappChannelId,
        type: whatsappType,
        content: whatsappType === 'text' ? whatsappText.trim() : undefined,
        media: whatsappType !== 'text' ? whatsappFile || undefined : undefined,
        caption: whatsappCaption.trim() || undefined,
      });
      toast.success('Status publicado no WhatsApp!');
      setShowWhatsappModal(false);
      resetWhatsappForm();
    } catch {
      toast.error('Erro ao publicar o status no WhatsApp.');
    } finally {
      setSendingWhatsappStatus(false);
    }
  };

  const handleYoutubeFileChange = (file: File | null) => {
    setYoutubeFile(file);
    if (youtubePreviewUrl) URL.revokeObjectURL(youtubePreviewUrl);
    setYoutubePreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const resetYoutubeForm = () => {
    setYoutubeTitle('');
    setYoutubeDescription('');
    setYoutubePrivacy('unlisted');
    handleYoutubeFileChange(null);
  };

  const openYoutubeModal = async () => {
    setShowYoutubeModal(true);
    setLoadingYoutubeConnected(true);
    try {
      const connected = await gestorPostsService.getYoutubeConnected();
      setYoutubeConnected(connected);
    } catch {
      setYoutubeConnected(false);
    } finally {
      setLoadingYoutubeConnected(false);
    }
  };

  const pollYoutubeUploadStatus = async (id: string) => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      try {
        const upload = await gestorPostsService.getYoutubeUpload(id);
        if (upload.status === 'published') {
          toast.success('Vídeo publicado no YouTube!');
          return;
        }
        if (upload.status === 'failed') {
          toast.error(`Falha ao publicar no YouTube: ${upload.error_message || 'erro desconhecido'}`);
          return;
        }
      } catch {
        return;
      }
    }
  };

  const handleSendYoutubeUpload = async () => {
    if (!youtubeTitle.trim()) {
      toast.error('Escreva um título para o vídeo.');
      return;
    }
    if (!youtubeFile) {
      toast.error('Selecione um arquivo de vídeo.');
      return;
    }
    setSendingYoutubeUpload(true);
    try {
      const upload = await gestorPostsService.createYoutubeUpload({
        title: youtubeTitle.trim(),
        description: youtubeDescription.trim(),
        privacy_status: youtubePrivacy,
        video: youtubeFile,
      });
      toast.success('Vídeo enviado! Publicando no YouTube em segundo plano...');
      setShowYoutubeModal(false);
      resetYoutubeForm();
      pollYoutubeUploadStatus(upload.id);
    } catch {
      toast.error('Erro ao enviar o vídeo.');
    } finally {
      setSendingYoutubeUpload(false);
    }
  };

  const pollPublicationStatus = async (id: string) => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      try {
        const publication = await gestorPostsService.getPublication(id);
        if (publication.status === 'published') {
          toast.success('Post publicado com sucesso!');
          loadGallery();
          return;
        }
        if (publication.status === 'failed') {
          toast.error(`Falha ao publicar: ${publication.error_message || 'erro desconhecido'}`);
          return;
        }
      } catch {
        return;
      }
    }
  };

  const pollCarouselStatus = async (id: string) => {
    for (let attempt = 0; attempt < 15; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      try {
        const batch = await gestorPostsService.getCarouselBatch(id);
        if (batch.status === 'published') {
          toast.success('Carrossel publicado com sucesso!');
          loadGallery();
          return;
        }
        if (batch.status === 'failed') {
          toast.error(`Falha ao publicar carrossel: ${batch.error_message || 'erro desconhecido'}`);
          return;
        }
      } catch {
        return;
      }
    }
  };

  const handleCreateCarouselPost = async () => {
    if (!selectedChannel) return;
    if (carouselFiles.length < 2) {
      toast.error('Selecione ao menos 2 imagens para o carrossel.');
      return;
    }
    if (newPlatforms.length === 0) {
      toast.error('Selecione ao menos uma plataforma.');
      return;
    }
    setCreating(true);
    try {
      const batch = await gestorPostsService.createCarouselBatch({
        caption: newCaption,
        platforms: newPlatforms,
        total_cards: carouselFiles.length,
        channel_type: selectedChannel.channel_type,
        channel_id: selectedChannel.channel_id,
      });

      for (let i = 0; i < carouselFiles.length; i += 1) {
        setCarouselProgress(`Enviando imagem ${i + 1} de ${carouselFiles.length}...`);
        await gestorPostsService.addCarouselCard(batch.id, carouselFiles[i]);
      }

      toast.success('Carrossel enviado! Publicando em segundo plano...');
      setShowCreateModal(false);
      resetCreateForm();
      pollCarouselStatus(batch.id);
    } catch {
      toast.error('Erro ao criar o carrossel.');
    } finally {
      setCreating(false);
      setCarouselProgress(null);
    }
  };

  const handleScheduleSinglePost = async () => {
    if (!selectedChannel || !newFile) return;
    if (!newScheduledFor) {
      toast.error('Escolha a data e hora do agendamento.');
      return;
    }
    setCreating(true);
    try {
      await gestorPostsService.createScheduledPost({
        caption: newCaption,
        platforms: newPlatforms,
        content_type: newContentType,
        media: newFile,
        channel_type: selectedChannel.channel_type,
        channel_id: selectedChannel.channel_id,
        scheduled_for: new Date(newScheduledFor).toISOString(),
      });
      toast.success('Post agendado com sucesso!');
      setShowCreateModal(false);
      resetCreateForm();
    } catch {
      toast.error('Erro ao agendar o post.');
    } finally {
      setCreating(false);
    }
  };

  const handleCreatePost = async () => {
    if (newIsCarousel) {
      await handleCreateCarouselPost();
      return;
    }
    if (!selectedChannel) return;
    if (!newFile) {
      toast.error('Selecione um arquivo de mídia.');
      return;
    }
    if (newPlatforms.length === 0) {
      toast.error('Selecione ao menos uma plataforma.');
      return;
    }
    if (newIsScheduled) {
      await handleScheduleSinglePost();
      return;
    }
    setCreating(true);
    try {
      const { id } = await gestorPostsService.createPublication({
        caption: newCaption,
        platforms: newPlatforms,
        content_type: newContentType,
        media: newFile,
        channel_type: selectedChannel.channel_type,
        channel_id: selectedChannel.channel_id,
      });
      toast.success('Post enviado! Publicando em segundo plano...');
      setShowCreateModal(false);
      resetCreateForm();
      pollPublicationStatus(id);
    } catch {
      toast.error('Erro ao criar o post.');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    gestorPostsService
      .getChannels()
      .then((data) => {
        setChannels(data);
        if (data.length > 0) setSelectedChannel(data[0]);
      })
      .catch(() => toast.error('Erro ao carregar contas conectadas.'))
      .finally(() => setLoadingChannels(false));
  }, []);

  const loadGallery = useCallback(async () => {
    if (!selectedChannel) return;
    setLoadingGallery(true);
    try {
      const [info, mediaList] = await Promise.all([
        gestorPostsService.getAccountInfo(selectedChannel),
        gestorPostsService.getMedia(selectedChannel, 25),
      ]);
      setAccountInfo(info);
      setMedia(mediaList);
    } catch {
      toast.error('Erro ao carregar a galeria do Instagram.');
    } finally {
      setLoadingGallery(false);
    }
  }, [selectedChannel]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const openMedia = async (item: InstagramMedia) => {
    setSelectedMedia(item);
    setComments([]);
    setLoadingComments(true);
    try {
      const data = await gestorPostsService.getComments(item.id, selectedChannel || undefined);
      setComments(data);
    } catch {
      toast.error('Erro ao carregar comentários.');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleReply = async (commentId: string) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      await gestorPostsService.replyComment(commentId, replyText.trim(), selectedChannel || undefined);
      toast.success('Resposta enviada!');
      setReplyText('');
      setReplyingTo(null);
      if (selectedMedia) {
        const data = await gestorPostsService.getComments(selectedMedia.id, selectedChannel || undefined);
        setComments(data);
      }
    } catch {
      toast.error('Erro ao enviar resposta.');
    } finally {
      setSendingReply(false);
    }
  };

  if (loadingChannels) {
    return (
      <div className="flex flex-col min-h-full bg-background p-6 items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="flex flex-col min-h-full bg-background p-6 space-y-6">
        <BaseHeader title="Gestor de Posts" subtitle="Galeria de criativos e métricas do Instagram." />
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma conta Instagram conectada ainda. Conecte uma página do Facebook com Instagram vinculado (ou uma
            conta Instagram direta) em Configurações &gt; Integrações.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-background p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <BaseHeader title="Gestor de Posts" subtitle="Galeria de criativos, métricas e comentários do Instagram." />
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" onClick={openYoutubeModal}>
            <Youtube className="w-4 h-4 mr-1.5" /> Vídeo (YouTube)
          </Button>
          <Button variant="outline" onClick={openWhatsappModal}>
            <Phone className="w-4 h-4 mr-1.5" /> Status do WhatsApp
          </Button>
          <Button variant="outline" onClick={openScheduledModal}>
            <Calendar className="w-4 h-4 mr-1.5" /> Posts Agendados
          </Button>
          <Button onClick={() => setShowCreateModal(true)} disabled={!selectedChannel}>
            <Plus className="w-4 h-4 mr-1.5" /> Criar Post
          </Button>
        </div>
      </div>

      {channels.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {channels.map((c) => (
            <button
              key={`${c.channel_type}-${c.channel_id}`}
              onClick={() => setSelectedChannel(c)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedChannel?.channel_id === c.channel_id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              @{c.username}
            </button>
          ))}
        </div>
      )}

      {loadingGallery ? (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-16">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando galeria...
        </div>
      ) : (
        <>
          {accountInfo && (
            <Card>
              <CardContent className="py-4 flex flex-wrap items-center gap-6">
                {accountInfo.profile_picture_url && (
                  <img src={accountInfo.profile_picture_url} alt="" className="w-14 h-14 rounded-full object-cover" />
                )}
                <div>
                  <p className="font-semibold text-foreground">@{accountInfo.username}</p>
                  {accountInfo.biography && <p className="text-xs text-muted-foreground max-w-md">{accountInfo.biography}</p>}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground ml-auto">
                  <span className="flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" /> {formatNumber(accountInfo.media_count)} posts
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {formatNumber(accountInfo.followers_count)} seguidores
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {media.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhum post encontrado.</CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {media.map((item) => (
                <button
                  key={item.id}
                  onClick={() => openMedia(item)}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-muted border border-border"
                >
                  <img
                    src={item.thumbnail_url || item.media_url}
                    alt={item.caption || ''}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                    <span className="text-white text-xs flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" /> {formatNumber(item.like_count)}
                    </span>
                    <span className="text-white text-xs flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" /> {formatNumber(item.comments_count)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* --- MODAL: DETALHE DO POST + COMENTÁRIOS --- */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedMedia(null)} />
          <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <h2 className="text-sm font-semibold text-gray-800">{selectedMedia.media_type}</h2>
              <button onClick={() => setSelectedMedia(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              <img
                src={selectedMedia.media_url || selectedMedia.thumbnail_url}
                alt=""
                className="w-full max-h-72 object-contain rounded-lg bg-black/5"
              />
              {selectedMedia.caption && <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedMedia.caption}</p>}

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  <Heart className="w-3 h-3 mr-1" /> {formatNumber(selectedMedia.like_count)}
                </Badge>
                <Badge variant="outline">
                  <MessageCircle className="w-3 h-3 mr-1" /> {formatNumber(selectedMedia.comments_count)}
                </Badge>
                {insightValue(selectedMedia, 'reach') != null && (
                  <Badge variant="outline">Alcance: {formatNumber(insightValue(selectedMedia, 'reach')!)}</Badge>
                )}
                {insightValue(selectedMedia, 'views') != null && (
                  <Badge variant="outline">Visualizações: {formatNumber(insightValue(selectedMedia, 'views')!)}</Badge>
                )}
                {insightValue(selectedMedia, 'saved') != null && (
                  <Badge variant="outline">Salvos: {formatNumber(insightValue(selectedMedia, 'saved')!)}</Badge>
                )}
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Comentários</p>
                {loadingComments ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhum comentário ainda.</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="text-sm border border-gray-100 rounded-lg p-3 space-y-2">
                      <p>
                        <span className="font-semibold text-gray-800">{c.username || c.from?.username}</span>{' '}
                        <span className="text-gray-600">{c.text}</span>
                      </p>
                      {replyingTo === c.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            className="flex-1 border-gray-300 rounded-md text-sm p-1.5 border"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Escreva uma resposta..."
                            autoFocus
                          />
                          <Button size="sm" disabled={sendingReply} onClick={() => handleReply(c.id)}>
                            {sendingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setReplyingTo(null)}>
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setReplyingTo(c.id);
                            setReplyText('');
                          }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Responder
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: CRIAR POST --- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (!creating) setShowCreateModal(false);
            }}
          />
          <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <h2 className="text-sm font-semibold text-gray-800">Criar Post</h2>
              <button
                onClick={() => {
                  if (!creating) setShowCreateModal(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newIsCarousel}
                  onChange={(e) => {
                    setNewIsCarousel(e.target.checked);
                    handleFileChange(null);
                  }}
                />
                Publicar como carrossel (2 a 10 imagens)
              </label>

              {newIsCarousel ? (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Imagens ({carouselFiles.length}/10)
                  </p>
                  <input
                    ref={carouselInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addCarouselFiles(e.target.files);
                      if (carouselInputRef.current) carouselInputRef.current.value = '';
                    }}
                  />
                  <div className="grid grid-cols-4 gap-2">
                    {carouselPreviewUrls.map((url, index) => (
                      <div key={url} className="relative aspect-square">
                        <img src={url} alt="" className="w-full h-full object-cover rounded-lg bg-black/5" />
                        <button
                          onClick={() => removeCarouselFile(index)}
                          className="absolute top-1 right-1 bg-white/90 rounded-full p-0.5 shadow"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {carouselFiles.length < 10 && (
                      <button
                        onClick={() => carouselInputRef.current?.click()}
                        className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
                      >
                        <Upload className="w-4 h-4" />
                        <span className="text-xs">Adicionar</span>
                      </button>
                    )}
                  </div>
                  {carouselProgress && <p className="text-xs text-muted-foreground mt-2">{carouselProgress}</p>}
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Mídia</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    />
                    {newPreviewUrl ? (
                      <div className="relative">
                        {newFile?.type.startsWith('video/') ? (
                          <video src={newPreviewUrl} controls className="w-full max-h-64 rounded-lg bg-black/5 object-contain" />
                        ) : (
                          <img src={newPreviewUrl} alt="" className="w-full max-h-64 rounded-lg bg-black/5 object-contain" />
                        )}
                        <button
                          onClick={() => handleFileChange(null)}
                          className="absolute top-2 right-2 bg-white/90 rounded-full p-1 shadow"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-gray-300 rounded-lg py-8 flex flex-col items-center gap-2 text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
                      >
                        <Upload className="w-6 h-6" />
                        <span className="text-sm">Selecionar imagem ou vídeo</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tipo</p>
                    <div className="flex gap-2">
                      {(Object.keys(CONTENT_TYPE_LABELS) as PublicationContentType[]).map((type) => (
                        <button
                          key={type}
                          onClick={() => setNewContentType(type)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            newContentType === type
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/70'
                          }`}
                        >
                          {CONTENT_TYPE_LABELS[type]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none mb-2">
                      <input
                        type="checkbox"
                        checked={newIsScheduled}
                        onChange={(e) => {
                          setNewIsScheduled(e.target.checked);
                          if (e.target.checked && !newScheduledFor) setNewScheduledFor(toDatetimeLocalMin());
                        }}
                      />
                      Agendar para depois
                    </label>
                    {newIsScheduled && (
                      <input
                        type="datetime-local"
                        className="w-full border border-gray-300 rounded-md text-sm p-2"
                        value={newScheduledFor}
                        min={toDatetimeLocalMin()}
                        onChange={(e) => setNewScheduledFor(e.target.value)}
                      />
                    )}
                  </div>
                </>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Plataformas</p>
                <div className="flex gap-2">
                  {availablePlatforms.map((platform) => (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                        newPlatforms.includes(platform)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/70'
                      }`}
                    >
                      {platform === 'instagram' ? 'Instagram' : 'Facebook'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Legenda</p>
                <textarea
                  className="w-full border border-gray-300 rounded-md text-sm p-2.5"
                  rows={3}
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  placeholder="Escreva a legenda do post..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <Button
                variant="outline"
                disabled={creating}
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
              >
                Cancelar
              </Button>
              <Button disabled={creating} onClick={handleCreatePost}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                {!newIsCarousel && newIsScheduled ? 'Agendar' : 'Publicar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: POSTS AGENDADOS --- */}
      {showScheduledModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowScheduledModal(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <h2 className="text-sm font-semibold text-gray-800">Posts Agendados</h2>
              <button onClick={() => setShowScheduledModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3">
              {loadingScheduled ? (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-8">
                  <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
                </div>
              ) : scheduledPosts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Nenhum post agendado ainda.</p>
              ) : (
                scheduledPosts.map((post) => (
                  <div key={post.id} className="border border-gray-100 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{SCHEDULED_STATUS_LABELS[post.status]}</Badge>
                        <Badge variant="outline" className="capitalize">
                          {CONTENT_TYPE_LABELS[post.content_type]}
                        </Badge>
                        {post.platforms.map((p) => (
                          <Badge key={p} variant="outline" className="capitalize">
                            {p}
                          </Badge>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {new Date(post.scheduled_for).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    {post.caption && <p className="text-sm text-gray-600 line-clamp-2">{post.caption}</p>}
                    {post.status === 'failed' && post.error_message && (
                      <p className="text-xs text-red-600">{post.error_message}</p>
                    )}
                    <div className="flex items-center gap-2">
                      {post.status === 'scheduled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={scheduledActionId === post.id}
                          onClick={() => handleCancelScheduled(post.id)}
                        >
                          <X className="w-3.5 h-3.5 mr-1" /> Cancelar
                        </Button>
                      )}
                      {post.status === 'failed' && post.retry_count < post.max_retries && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={scheduledActionId === post.id}
                          onClick={() => handleRetryScheduled(post.id)}
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Tentar novamente
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: STATUS DO WHATSAPP --- */}
      {showWhatsappModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (!sendingWhatsappStatus) setShowWhatsappModal(false);
            }}
          />
          <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <h2 className="text-sm font-semibold text-gray-800">Status do WhatsApp</h2>
              <button
                onClick={() => {
                  if (!sendingWhatsappStatus) setShowWhatsappModal(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingWhatsappChannels ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-8">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando canais...
              </div>
            ) : whatsappChannels.length === 0 ? (
              <div className="p-5 text-sm text-gray-400 text-center">
                Nenhum canal de WhatsApp com suporte a Status conectado.
              </div>
            ) : (
              <>
                <div className="overflow-y-auto p-5 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Canal</p>
                    <select
                      className="w-full border border-gray-300 rounded-md text-sm p-2"
                      value={whatsappChannelId}
                      onChange={(e) => setWhatsappChannelId(e.target.value)}
                    >
                      {whatsappChannels.map((c) => (
                        <option key={c.channel_id} value={c.channel_id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tipo</p>
                    <div className="flex gap-2">
                      {(Object.keys(WHATSAPP_STATUS_TYPE_LABELS) as WhatsappStatusType[]).map((type) => (
                        <button
                          key={type}
                          onClick={() => setWhatsappType(type)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            whatsappType === type
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/70'
                          }`}
                        >
                          {WHATSAPP_STATUS_TYPE_LABELS[type]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {whatsappType === 'text' ? (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Texto</p>
                      <textarea
                        className="w-full border border-gray-300 rounded-md text-sm p-2.5"
                        rows={3}
                        value={whatsappText}
                        onChange={(e) => setWhatsappText(e.target.value)}
                        placeholder="Escreva o texto do status..."
                      />
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Mídia</p>
                      <input
                        ref={whatsappFileInputRef}
                        type="file"
                        accept={
                          whatsappType === 'image' ? 'image/*' : whatsappType === 'video' ? 'video/*' : 'audio/*'
                        }
                        className="hidden"
                        onChange={(e) => handleWhatsappFileChange(e.target.files?.[0] || null)}
                      />
                      {whatsappFile ? (
                        <div className="relative">
                          {whatsappType === 'image' && whatsappPreviewUrl && (
                            <img src={whatsappPreviewUrl} alt="" className="w-full max-h-64 rounded-lg bg-black/5 object-contain" />
                          )}
                          {whatsappType === 'video' && whatsappPreviewUrl && (
                            <video src={whatsappPreviewUrl} controls className="w-full max-h-64 rounded-lg bg-black/5" />
                          )}
                          {whatsappType === 'audio' && whatsappPreviewUrl && (
                            <audio src={whatsappPreviewUrl} controls className="w-full" />
                          )}
                          <button
                            onClick={() => handleWhatsappFileChange(null)}
                            className="absolute top-2 right-2 bg-white/90 rounded-full p-1 shadow"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => whatsappFileInputRef.current?.click()}
                          className="w-full border-2 border-dashed border-gray-300 rounded-lg py-8 flex flex-col items-center gap-2 text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
                        >
                          <Upload className="w-6 h-6" />
                          <span className="text-sm">Selecionar {WHATSAPP_STATUS_TYPE_LABELS[whatsappType].toLowerCase()}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {whatsappType !== 'text' && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Legenda (opcional)</p>
                      <textarea
                        className="w-full border border-gray-300 rounded-md text-sm p-2.5"
                        rows={2}
                        value={whatsappCaption}
                        onChange={(e) => setWhatsappCaption(e.target.value)}
                        placeholder="Escreva uma legenda..."
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                  <Button
                    variant="outline"
                    disabled={sendingWhatsappStatus}
                    onClick={() => {
                      setShowWhatsappModal(false);
                      resetWhatsappForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button disabled={sendingWhatsappStatus} onClick={handleSendWhatsappStatus}>
                    {sendingWhatsappStatus ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                    Publicar
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL: VÍDEO PARA O YOUTUBE --- */}
      {showYoutubeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (!sendingYoutubeUpload) setShowYoutubeModal(false);
            }}
          />
          <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <h2 className="text-sm font-semibold text-gray-800">Enviar Vídeo para o YouTube</h2>
              <button
                onClick={() => {
                  if (!sendingYoutubeUpload) setShowYoutubeModal(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingYoutubeConnected ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-8">
                <Loader2 className="w-4 h-4 animate-spin" /> Verificando conexão...
              </div>
            ) : !youtubeConnected ? (
              <div className="p-5 text-sm text-gray-500 text-center space-y-2">
                <p>Nenhuma conta Google conectada com acesso ao YouTube.</p>
                <p>
                  Conecte em <span className="font-medium">Configurações &gt; Integrações &gt; Google</span>{' '}
                  (se já conectou antes, será preciso reconectar para autorizar o novo acesso).
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-y-auto p-5 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Vídeo</p>
                    <input
                      ref={youtubeFileInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => handleYoutubeFileChange(e.target.files?.[0] || null)}
                    />
                    {youtubeFile && youtubePreviewUrl ? (
                      <div className="relative">
                        <video src={youtubePreviewUrl} controls className="w-full max-h-64 rounded-lg bg-black/5" />
                        <button
                          onClick={() => handleYoutubeFileChange(null)}
                          className="absolute top-2 right-2 bg-white/90 rounded-full p-1 shadow"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => youtubeFileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-gray-300 rounded-lg py-8 flex flex-col items-center gap-2 text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors"
                      >
                        <Upload className="w-6 h-6" />
                        <span className="text-sm">Selecionar vídeo</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Título</p>
                    <input
                      className="w-full border border-gray-300 rounded-md text-sm p-2.5"
                      value={youtubeTitle}
                      onChange={(e) => setYoutubeTitle(e.target.value)}
                      placeholder="Título do vídeo"
                    />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Descrição</p>
                    <textarea
                      className="w-full border border-gray-300 rounded-md text-sm p-2.5"
                      rows={3}
                      value={youtubeDescription}
                      onChange={(e) => setYoutubeDescription(e.target.value)}
                      placeholder="Descrição do vídeo..."
                    />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Privacidade</p>
                    <div className="flex gap-2">
                      {(Object.keys(YOUTUBE_PRIVACY_LABELS) as YoutubePrivacyStatus[]).map((status) => (
                        <button
                          key={status}
                          onClick={() => setYoutubePrivacy(status)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            youtubePrivacy === status
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/70'
                          }`}
                        >
                          {YOUTUBE_PRIVACY_LABELS[status]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                  <Button
                    variant="outline"
                    disabled={sendingYoutubeUpload}
                    onClick={() => {
                      setShowYoutubeModal(false);
                      resetYoutubeForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button disabled={sendingYoutubeUpload} onClick={handleSendYoutubeUpload}>
                    {sendingYoutubeUpload ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                    Enviar
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
