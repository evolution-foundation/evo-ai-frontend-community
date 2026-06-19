import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { chatPagesService, ChatPageConfig } from '@/services/public/chatPagesService';

/**
 * Página pública de chat (B14.03) — resolve o slug, obtém o website_token e
 * monta o widget de site EXISTENTE via iframe (`/widget?website_token=...`),
 * sem recriar a UI do widget. Aplica a aparência (logo/cor/título) da config.
 */
const PublicChatPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const [config, setConfig] = useState<ChatPageConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!slug) return;
      setIsLoading(true);
      try {
        const result = await chatPagesService.getPage(slug);
        setConfig(result);
        if (result.title) document.title = result.title;
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 404) setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (notFound || !config) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-lg bg-card rounded-lg shadow-md border border-border p-8 text-center">
          <p className="text-lg font-medium text-foreground">Página de chat não encontrada</p>
          <p className="text-sm text-muted-foreground mt-2">O link pode estar incorreto ou indisponível.</p>
        </div>
      </div>
    );
  }

  const accent = config.appearance?.primary_color;
  const widgetUrl = `/widget?website_token=${encodeURIComponent(config.website_token)}`;

  return (
    <div className="flex flex-col h-screen bg-background">
      <header
        className="flex items-center gap-3 px-4 py-3 border-b border-border"
        style={accent ? { backgroundColor: accent } : undefined}
      >
        {config.appearance?.logo_url && (
          <img src={config.appearance.logo_url} alt={config.title || 'logo'} className="h-8 object-contain" />
        )}
        {config.title && (
          <h1 className={`text-base font-semibold ${accent ? 'text-white' : 'text-foreground'}`}>
            {config.title}
          </h1>
        )}
      </header>

      <main className="flex-1 min-h-0">
        <iframe
          src={widgetUrl}
          title={config.title || 'chat'}
          className="w-full h-full border-0"
          allow="microphone; camera; clipboard-write"
        />
      </main>
    </div>
  );
};

export default PublicChatPage;
