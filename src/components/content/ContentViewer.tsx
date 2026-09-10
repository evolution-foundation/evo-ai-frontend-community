import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { BaseHeader } from '@/components/base';
import { EditorContentType, normalizeEditorUrl } from '@/utils/editorMenus';
import { resolveRenderableSrcDoc } from '@/utils/reactContentRenderer';
import { useAuthStore } from '@/store/authStore';
import { getDashboardToolsToken } from '@/services/dashboardTools/dashboardToolsService';
import { useCallback, useEffect, useRef, useState } from 'react';

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

  // Todos os hooks abaixo são chamados incondicionalmente, mesmo pra
  // contentType === 'link' (que nem os usa) — um `return` condicional ANTES
  // dos hooks (como este componente tinha antes) viola as Regras dos Hooks:
  // ao navegar entre um nó 'link' e um nó 'html'/'file' sem remount (só
  // trocando o :nodeId da mesma rota), o React reaproveita a mesma instância
  // e quebra com "Rendered more/fewer hooks than during the previous
  // render" — a causa mais provável de o app travar ao navegar pelos
  // conteúdos do editor.
  const currentUser = useAuthStore((s) => s.currentUser);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [dashboardToolsToken, setDashboardToolsToken] = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Buscado uma vez (autenticado pela sessão real) e repassado pro iframe via
  // postMessage — o HTML da ferramenta nunca mais carrega com esse token já
  // embutido no código-fonte servido ao navegador.
  useEffect(() => {
    if (contentType !== 'html') return;
    let cancelled = false;
    getDashboardToolsToken()
      .then((token) => {
        if (!cancelled) setDashboardToolsToken(token);
      })
      .catch(() => {
        // Ferramenta que não chama a API do CRM não precisa do token — falha
        // silenciosa aqui não deve travar a renderização do conteúdo.
      });
    return () => {
      cancelled = true;
    };
  }, [contentType]);

  const postToIframe = useCallback(() => {
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
          dashboardApiToken: dashboardToolsToken,
        },
        '*',
      );
    } catch {
      // iframe cross-origin — ignore
    }
  }, [currentUser, dashboardToolsToken]);

  const handleIframeLoad = useCallback(() => {
    setIframeLoaded(true);
    postToIframe();
  }, [postToIframe]);

  // O fetch do token é assíncrono e costuma terminar DEPOIS do iframe já ter
  // carregado (o srcDoc é síncrono) — reenvia assim que o token chegar, sem
  // esperar um segundo onLoad que nunca vai acontecer.
  useEffect(() => {
    if (iframeLoaded) postToIframe();
  }, [iframeLoaded, postToIframe]);

  let srcDoc = '';
  if (isHtmlDoc) {
    const rawDoc = contentType === 'html' ? html ?? '' : fileData ?? '';
    srcDoc = resolveRenderableSrcDoc(rawDoc);
  } else if (contentType !== 'link') {
    // .txt / .md / .json / .svg — renderiza como texto formatado
    srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;
      padding:16px;color:#222;background:#fff;white-space:pre-wrap;word-break:break-word}
    </style></head><body>${(fileData ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</body></html>`;
  }

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
