import React from 'react';
import { ExternalLink } from 'lucide-react';

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/gi;

function LinkPreview({ url }: { url: string }) {
  let hostname = '';
  let pathname = '';
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname;
    pathname = parsed.pathname === '/' ? '' : parsed.pathname;
  } catch {
    return null;
  }

  const displayPath = pathname.length > 40 ? pathname.slice(0, 40) + '…' : pathname;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 mt-1 mb-1 p-2 rounded-md border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors no-underline max-w-sm"
    >
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 overflow-hidden">
        <p className="text-xs font-medium text-foreground truncate">{hostname}</p>
        {displayPath && (
          <p className="text-[11px] text-muted-foreground truncate">{displayPath}</p>
        )}
      </div>
    </a>
  );
}

// `email` is the only nested attribute MessageText reads — but `Message.content_attributes`
// is typed as `MessageContentAttributes` (an open `Record<string, unknown>` plus a few
// known fields). Accept the open shape so callers passing `message.content_attributes`
// type-check, and narrow internally when reading `email`.
interface MessageContentEmail {
  email?: {
    html_content?: {
      full?: string;
      reply?: string;
      quoted?: string;
    };
    text_content?: {
      full?: string;
      reply?: string;
      quoted?: string;
    };
  };
}

interface MessageTextProps {
  content: string;
  isPrivateNote?: boolean;
  contentType?: string;
  contentAttributes?: Record<string, unknown> & MessageContentEmail;
}

const MessageText: React.FC<MessageTextProps> = ({
  content,
  isPrivateNote = false,
  contentType,
  contentAttributes,
}) => {
  // 🔒 PROTEÇÃO: Garantir que content seja sempre string válida
  const safeContent = String(content || '');

  // Helper function to sanitize HTML and remove potentially dangerous tags
  const sanitizeEmailHTML = (html: string): string => {
    if (!html) return '';

    // Remove <script> tags and their content
    let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove <style> tags and their content (to prevent CSS contamination)
    sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove inline event handlers (onclick, onload, etc.)
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

    return sanitized;
  };

  // Render HTML for incoming email messages
  if (contentType === 'incoming_email' && contentAttributes?.email?.html_content?.full) {
    const sanitizedHTML = sanitizeEmailHTML(contentAttributes.email.html_content.full);

    return (
      <div
        className="email-html-content-wrapper"
        style={{
          isolation: 'isolate',
          contain: 'layout style paint',
          position: 'relative',
          maxWidth: '100%',
          overflow: 'auto',
          wordBreak: 'break-word',
          display: 'block',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="email-html-content"
          dangerouslySetInnerHTML={{
            __html: sanitizedHTML,
          }}
          style={{
            fontSize: '13px',
            lineHeight: '1.4',
            display: 'block',
            boxSizing: 'border-box',
          }}
        />
      </div>
    );
  }

  // Render HTML for outgoing email template messages (content is HTML from react-email-editor)
  // Check if content is HTML (starts with <!DOCTYPE, <html, or contains HTML tags)
  const isHtmlContent = safeContent.trim().startsWith('<!DOCTYPE') ||
                        safeContent.trim().startsWith('<!doctype') ||
                        safeContent.trim().startsWith('<html') ||
                        safeContent.trim().startsWith('<HTML') ||
                        (safeContent.includes('<') && safeContent.includes('</') && safeContent.length > 50);

  if (isHtmlContent && !isPrivateNote) {
    const sanitizedHTML = sanitizeEmailHTML(safeContent);
    return (
      <div
        className="email-html-content-wrapper"
        style={{
          isolation: 'isolate',
          contain: 'layout style paint',
          position: 'relative',
          maxWidth: '100%',
          overflow: 'auto',
          wordBreak: 'break-word',
          display: 'block',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="email-html-content"
          dangerouslySetInnerHTML={{
            __html: sanitizedHTML,
          }}
          style={{
            fontSize: '13px',
            lineHeight: '1.4',
            display: 'block',
            boxSizing: 'border-box',
          }}
        />
      </div>
    );
  }

  // Para mensagens com conteúdo HTML (notas privadas, mensagens de agente, etc.)
  // Renderizar HTML sanitizado para exibir corretamente tags como <p>, <b>, etc.
  if (safeContent.includes('<') && safeContent.includes('</')) {
    let sanitizedHTML = isPrivateNote ? safeContent : sanitizeEmailHTML(safeContent);
    if (isPrivateNote) {
      sanitizedHTML = sanitizedHTML.replace(/color\s*:[^;"']*;?/gi, '');
    }
    return (
      <div
        className="whitespace-pre-wrap break-words rich-content"
        style={isPrivateNote ? { color: 'inherit' } : undefined}
        dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
      />
    );
  }

  const parseMessageContent = (text: string) => {
    const safeText = String(text || '');
    const lines = safeText.split('\n');
    const detectedUrls: string[] = [];

    const elements = lines.map((line, lineIdx) => {
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;

      URL_REGEX.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = URL_REGEX.exec(line)) !== null) {
        const url = match[0];
        const start = match.index;

        if (start > lastIndex) {
          parts.push(line.slice(lastIndex, start));
        }

        if (!detectedUrls.includes(url)) {
          detectedUrls.push(url);
        }

        parts.push(
          <a
            key={`link-${lineIdx}-${start}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline break-all hover:text-blue-400"
          >
            {url}
          </a>
        );

        lastIndex = start + url.length;
      }

      if (lastIndex < line.length) {
        parts.push(line.slice(lastIndex));
      }

      return (
        <React.Fragment key={lineIdx}>
          {parts.length > 0 ? parts : line}
          {lineIdx < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });

    return { elements, detectedUrls };
  };

  const parsedContent = parseMessageContent(safeContent);

  return (
    <div className="whitespace-pre-wrap break-words">
      {parsedContent.elements}
      {parsedContent.detectedUrls.length > 0 && (
        <div className="mt-1">
          {parsedContent.detectedUrls.map((url) => (
            <LinkPreview key={url} url={url} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageText;
