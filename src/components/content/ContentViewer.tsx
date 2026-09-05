import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { BaseHeader } from '@/components/base';
import { EditorContentType, normalizeEditorUrl } from '@/utils/editorMenus';
import { resolveRenderableSrcDoc } from '@/utils/reactContentRenderer';
import { useAuthStore } from '@/store/authStore';
import { useCallback, useRef } from 'react';

export interface ContentViewerProps {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle: string;
  contentType: EditorContentType;
  url?: string;
  html?: string;
  fileName?: string;
  fileData?: string;
}

/**
 * Renderiza o conteúdo de uma folha (link/HTML/arquivo) — mesmo comportamento
 * em todo lugar que tem esse tipo de conteúdo (Editor, Dashboard, Sites):
 * - link: embed em iframe + botão nova aba
 * - html: renderiza o código em iframe isolado (detecta componente React e
 *   empacota com React + Babel + Tailwind via CDN quando aplicável)
 * - arquivo: renderiza o arquivo carregado (.html/.htm em iframe; demais como texto)
 */
export function ContentViewer({
  backHref,
  backLabel,
  title,
  subtitle,
  contentType,
  url,
  html,
  fileName,
  fileData,
}: ContentViewerProps) {
  const isHtmlDoc =
    contentType === 'html' || (contentType === 'file' && /\.html?$/i.test(fileName ?? ''));

  if (contentType === 'link') {
    const normalized = normalizeEditorUrl(url ?? '#');
    return (
      <div className="flex flex-col h-full bg-background p-6 space-y-4">
        <BaseHeader
          title={title || 'Link'}
          subtitle={subtitle}
          secondaryActions={[
            {
              label: 'Abrir em nova aba',
              icon: <ExternalLink className="w-4 h-4 mr-2" />,
              onClick: () => window.open(normalized, '_blank', 'noreferrer'),
              variant: 'outline',
            },
          ]}
        />
        <div className="flex-1 rounded-lg border border-border bg-card overflow-hidden min-h-0">
          <iframe src={normalized} title={title || 'Link'} className="w-full h-full border-0" />
        </div>
      </div>
    );
  }

  const currentUser = useAuthStore((s) => s.currentUser);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        {
          type: 'evo-user-data',
          user: currentUser
            ? {
                id: currentUser.id,
                name: currentUser.name,
                email: currentUser.email,
                avatar_url: currentUser.avatar_url,
                created_at: currentUser.created_at,
              }
            : null,
        },
        '*',
      );
    } catch {
      // iframe cross-origin — ignore
    }
  }, [currentUser]);

  let srcDoc = '';
  if (isHtmlDoc) {
    const rawDoc = contentType === 'html' ? html ?? '' : fileData ?? '';
    srcDoc = resolveRenderableSrcDoc(rawDoc);
  } else {
    // .txt / .md / .json / .svg — renderiza como texto formatado
    srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;
      padding:16px;color:#222;background:#fff;white-space:pre-wrap;word-break:break-word}
    </style></head><body>${(fileData ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</body></html>`;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card">
        <Button variant="ghost" size="icon" asChild title={backLabel}>
          <Link to={backHref}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {subtitle}
            {fileName ? ` · ${fileName}` : ''}
          </p>
        </div>
      </div>
      <iframe
        ref={iframeRef}
        title={title || 'Conteúdo'}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-popups allow-forms"
        className="flex-1 w-full border-0 bg-white"
        onLoad={handleIframeLoad}
      />
    </div>
  );
}
