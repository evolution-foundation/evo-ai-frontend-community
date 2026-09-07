import { getFormattingLocale } from '@/lib/formattingLocale';
import { useTranslation as useUiTranslation } from 'react-i18next';
import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback } from '@evoapi/design-system/avatar';

interface PostData {
  id?: string;
  message?: string;
  story?: string;
  created_time?: string;
  permalink_url?: string;
  type?: string;
  from?: {
    id?: string;
    name?: string;
  };
  attachments?: {
    data?: Array<{
      media?: {
        image?: {
          src?: string;
        };
      };
      subattachments?: {
        data?: Array<{
          media?: {
            image?: {
              src?: string;
            };
          };
        }>;
      };
      type?: string;
    }>;
  };
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
}

interface PostPreviewProps {
  postData: PostData;
}

const PostPreview: React.FC<PostPreviewProps> = ({ postData }) => {
  const { t: tUi } = useUiTranslation();
  if (!postData || Object.keys(postData).length === 0) {
    return null;
  }

  // Extrair primeira imagem dos attachments
  const getPostImage = () => {
    if (!postData.attachments?.data || postData.attachments.data.length === 0) {
      return null;
    }

    const firstAttachment = postData.attachments.data[0];

    // Tentar pegar imagem direta
    if (firstAttachment.media?.image?.src) {
      return firstAttachment.media.image.src;
    }

    // Tentar pegar de subattachments
    if (firstAttachment.subattachments?.data && firstAttachment.subattachments.data.length > 0) {
      const firstSubAttachment = firstAttachment.subattachments.data[0];
      if (firstSubAttachment.media?.image?.src) {
        return firstSubAttachment.media.image.src;
      }
    }

    return null;
  };

  const postImage = getPostImage();
  const postText = postData.message || postData.story || '';
  const postUrl = postData.permalink_url;
  const postAuthor = postData.from?.name || 'Facebook Page';

  // Formatar data
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(getFormattingLocale(), {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="mb-4 border-b border-border pb-4">
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        {/* Header do Post */}
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                {postAuthor[0]?.toUpperCase() || 'F'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{postAuthor}</div>
              {postData.created_time && (
                <div className="text-xs text-muted-foreground">{formatDate(postData.created_time)}</div>
              )}
            </div>
            {postUrl && (
              <a
                href={postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={tUi("interface:postpreview.openPostOnFacebook")}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        {/* Texto do Post */}
        {postText && (
          <div className="p-3 text-sm text-foreground whitespace-pre-wrap break-words">
            {postText}
          </div>
        )}

        {/* Imagem do Post */}
        {postImage && (
          <div className="relative w-full bg-muted">
            <img
              src={postImage}
              alt={tUi("interface:postpreview.postImage")}
              className="w-full h-auto object-contain max-h-96"
              loading="lazy"
              onError={(e) => {
                // Se a imagem falhar ao carregar, esconder o container
                const target = e.target as HTMLImageElement;
                if (target.parentElement) {
                  target.parentElement.style.display = 'none';
                }
              }}
            />
          </div>
        )}

        {/* Footer com estatísticas */}
        {((postData.likes_count ?? 0) > 0 || (postData.comments_count ?? 0) > 0 || (postData.shares_count ?? 0) > 0) && (
          <div className="px-3 py-2 border-t border-border bg-muted/30">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {(postData.likes_count ?? 0) > 0 && (
                <span>
                  {tUi("chat:post.likes", { count: postData.likes_count })}
                </span>
              )}
              {(postData.comments_count ?? 0) > 0 && (
                <span>
                  {tUi("chat:post.comments", { count: postData.comments_count })}
                </span>
              )}
              {(postData.shares_count ?? 0) > 0 && (
                <span>
                  {tUi("chat:post.shares", { count: postData.shares_count })}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostPreview;

