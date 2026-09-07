import { getFormattingLocale } from '@/lib/formattingLocale';
import { useLanguage } from '@/hooks/useLanguage';
import { Badge, Card, CardContent, Button } from '@evoapi/design-system';
import { Wand, Edit, Trash2, Globe, Loader2 } from 'lucide-react';
import { CustomTool } from '@/types/ai';

interface CustomToolCardProps {
  tool: CustomTool;
  onEdit: (tool: CustomTool) => void;
  onDelete: (tool: CustomTool) => void;
  onTest: (tool: CustomTool) => void;
  onClick: (tool: CustomTool) => void;
  isTestLoading?: boolean;
}

export default function CustomToolCard({
  tool,
  onEdit,
  onDelete,
  onTest,
  onClick,
  isTestLoading = false
}: CustomToolCardProps) {
  const { t } = useLanguage('customTools');

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'POST':
        return 'bg-green-500/10 text-green-600 border-green-500/30';
      case 'PUT':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
      case 'DELETE':
        return 'bg-red-500/10 text-red-600 border-red-500/30';
      case 'PATCH':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/30';
    }
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
      <CardContent className="p-4">
        <div onClick={() => onClick(tool)}>
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Wand className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm truncate mb-1">{tool.name}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${getMethodColor(tool.method)}`}>
                    {tool.method}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-3">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {tool.description || t('card.noDescription')}
            </p>
          </div>

          {/* Endpoint */}
          <div className="mb-3">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Globe className="h-3 w-3" />
              <span className="truncate">{tool.endpoint}</span>
            </div>
          </div>

          {/* Tags */}
          {tool.tags && tool.tags.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-1">
                {tool.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {tool.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{tool.tags.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Examples Count */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <span>{t('card.examples', { count: tool.examples?.length || 0 })}</span>
            <span>{t('card.createdAt')} {new Date(tool.created_at).toLocaleDateString(getFormattingLocale())}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onTest(tool);
            }}
            disabled={isTestLoading}
            className="flex-1 gap-1"
          >
            {isTestLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Wand className="h-3 w-3" />
            )}
            {t('card.actions.test')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(tool);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(tool);
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
