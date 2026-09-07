import { getFormattingLocale } from '@/lib/formattingLocale';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  Badge,
  Button,
  Separator,
} from '@evoapi/design-system';
import { Wand, Edit, Globe, Settings, Calendar, FileText, Tags, Loader2 } from 'lucide-react';
import { CustomTool } from '@/types/ai';

interface CustomToolDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool?: CustomTool | null;
  onEdit?: (tool: CustomTool) => void;
  onTest?: (tool: CustomTool) => void;
  isTestLoading?: boolean;
}

export default function CustomToolDetails({
  open,
  onOpenChange,
  tool,
  onEdit,
  onTest,
  isTestLoading = false,
}: CustomToolDetailsProps) {
  const { t } = useLanguage('customTools');

  if (!tool) return null;

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand className="h-5 w-5" />
            {tool.name}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t('details.sections.basicInfo')}</h3>
                <div className="flex gap-2">
                  {onTest && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onTest(tool)}
                      disabled={isTestLoading}
                      className="gap-2"
                    >
                      {isTestLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wand className="h-4 w-4" />
                      )}
                      {t('details.actions.test')}
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(tool)}
                      className="gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      {t('details.actions.edit')}
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('details.fields.name')}</label>
                  <p className="text-sm mt-1">{tool.name}</p>
                </div>
              </div>

              {tool.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('details.fields.description')}</label>
                  <p className="text-sm mt-1">{tool.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('details.fields.method')}</label>
                  <div className="mt-1">
                    <Badge variant="outline" className={`text-xs ${getMethodColor(tool.method)}`}>
                      {tool.method}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('details.fields.createdAt')}</label>
                  <p className="text-sm mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(tool.created_at).toLocaleDateString(getFormattingLocale())}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('details.fields.endpoint')}</label>
                <p className="text-sm mt-1 flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {tool.endpoint}
                </p>
              </div>
            </div>

            <Separator />

            {/* Tags */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Tags className="h-5 w-5" />
                {t('details.sections.tags')} ({tool.tags?.length || 0})
              </h3>

              {tool.tags && tool.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tool.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-muted/30 rounded-lg border border-dashed text-center">
                  <Tags className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t('details.empty.tags')}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Examples */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('details.sections.examples')} ({tool.examples?.length || 0})
              </h3>

              {tool.examples && tool.examples.length > 0 ? (
                <div className="space-y-3">
                  {tool.examples.map((example, index) => (
                    <div key={index} className="p-3 border rounded-lg bg-muted/30">
                      <pre className="text-sm whitespace-pre-wrap break-words">{example}</pre>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-muted/30 rounded-lg border border-dashed text-center">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t('details.empty.examples')}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Headers */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {t('details.sections.headers')}
              </h3>

              {tool.headers && Object.keys(tool.headers).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(tool.headers).map(([key, value]) => {
                    const valueStr = String(value);
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded"
                      >
                        <span className="text-sm font-medium">{key}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {valueStr.length > 50 ? `${valueStr.substring(0, 50)}...` : valueStr}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-muted/30 rounded-lg border border-dashed text-center">
                  <Settings className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{t('details.empty.headers')}</p>
                </div>
              )}
            </div>

            {/* Input/Output Modes */}
            {((tool.input_modes && tool.input_modes.length > 0) ||
              (tool.output_modes && tool.output_modes.length > 0)) && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    {t('details.sections.inputOutput')}
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {t('details.fields.inputModes')}
                      </label>
                      <div className="mt-2">
                        {tool.input_modes && tool.input_modes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {tool.input_modes.map((mode, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {mode}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">{t('details.fields.notSpecified')}</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {t('details.fields.outputModes')}
                      </label>
                      <div className="mt-2">
                        {tool.output_modes && tool.output_modes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {tool.output_modes.map((mode, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {mode}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">{t('details.fields.notSpecified')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
