import { getFormattingLocale } from '@/lib/formattingLocale';
import { useLanguage } from '@/hooks/useLanguage';
import { Badge, Card, CardContent, Button } from '@evoapi/design-system';
import { TestTube, Edit, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { CustomMcpServer } from '@/types/ai';

interface CustomMCPServerCardProps {
  server: CustomMcpServer;
  onEdit: (server: CustomMcpServer) => void;
  onDelete: (server: CustomMcpServer) => void;
  onTest: (server: CustomMcpServer) => void;
  onClick: (server: CustomMcpServer) => void;
  isTestLoading?: boolean;
}

export default function CustomMCPServerCard({
  server,
  onEdit,
  onDelete,
  onTest,
  onClick,
  isTestLoading = false
}: CustomMCPServerCardProps) {
  const { t } = useLanguage('customMcpServers');

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
      <CardContent className="p-4">
        <div onClick={() => onClick(server)}>
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TestTube className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm truncate mb-1">{server.name || t('card.noName')}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/30">
                    {t('card.custom')}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-3">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {server.description || t('card.noDescription')}
            </p>
          </div>

          {/* URL */}
          <div className="mb-3">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              <span className="truncate">{server.url}</span>
            </div>
          </div>

          {/* Tools Count */}
          <div className="flex items-center gap-2 mb-3">
            <TestTube className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-muted-foreground">
              {server.tools?.length || 0} {t('card.tools')}
            </span>
          </div>

          {/* Config Info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <span>{t('card.timeout', { timeout: server.timeout })}</span>
            <span>{t('card.retries', { count: server.retry_count })}</span>
          </div>

          {/* Tags */}
          {server.tags && server.tags.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-1">
                {server.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {server.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    {t('card.moreTools', { count: server.tags.length - 3 })}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Created Date */}
          <div className="text-xs text-muted-foreground mb-3">
            {t('card.createdAt', { date: new Date(server.created_at).toLocaleDateString(getFormattingLocale()) })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onTest(server);
            }}
            disabled={isTestLoading}
            className="flex-1 gap-1"
          >
            {isTestLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <TestTube className="h-3 w-3" />
            )}
            {t('actions.test')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(server);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(server);
            }}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
