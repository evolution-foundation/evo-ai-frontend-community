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
import {
  TestTube,
  Edit,
  Settings,
  Calendar,
  Clock,
  RotateCcw,
  Tags,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { CustomMcpServer } from '@/types/ai';

interface CustomMCPServerDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server?: CustomMcpServer | null;
  onEdit?: (server: CustomMcpServer) => void;
  onTest?: (server: CustomMcpServer) => void;
  isTestLoading?: boolean;
}

export default function CustomMCPServerDetails({
  open,
  onOpenChange,
  server,
  onEdit,
  onTest,
  isTestLoading = false,
}: CustomMCPServerDetailsProps) {
  const { t } = useLanguage('customMcpServers');

  if (!server) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            {server.name}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t("form.sections.basicInfo")}</h3>
                <div className="flex gap-2">
                  {onTest && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onTest(server)}
                      disabled={isTestLoading}
                      className="gap-2"
                    >
                      {isTestLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                      {t('actions.test')}
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(server)}
                      className="gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      {t('actions.edit')}
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('details.labels.name')}</label>
                  <p className="text-sm mt-1">{server.name}</p>
                </div>
              </div>

              {server.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('details.labels.description')}</label>
                  <p className="text-sm mt-1">{server.description}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">{t('details.labels.url')}</label>
                <p className="text-sm mt-1 flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  {server.url}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('details.labels.timeout')}</label>
                  <p className="text-sm mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {server.timeout}s
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('details.labels.retries')}</label>
                  <p className="text-sm mt-1 flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" />
                    {server.retry_count}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">{t('details.labels.createdAt')}</label>
                  <p className="text-sm mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(server.created_at).toLocaleDateString(getFormattingLocale())}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Tools */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                {t("form.sections.tools")} ({server.tools?.length || 0})
              </h3>

              {server.tools && server.tools.length > 0 ? (
                <div className="space-y-3">
                  {server.tools.map((tool: any, index: any) => (
                    <div key={tool.id || index} className="p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-1">{tool.name}</h4>
                          {tool.description && (
                            <p className="text-xs text-muted-foreground mb-2">{tool.description}</p>
                          )}

                          {/* Tool details */}
                          <div className="space-y-2">
                            {tool.inputModes && tool.inputModes.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">
                                  {t('details.tools.inputModes')}:
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {tool.inputModes.map((mode: any, idx: any) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {mode}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {tool.outputModes && tool.outputModes.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">
                                  {t('details.tools.outputModes')}:
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {tool.outputModes.map((mode: any, idx: any) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {mode}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {tool.tags && tool.tags.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">{t('details.tools.tags')}:</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {tool.tags.map((tag: any, idx: any) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <TestTube className="h-4 w-4 text-emerald-400 mt-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-muted/30 rounded-lg border border-dashed text-center">
                  <TestTube className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('details.tools.noTools')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('details.tools.testPrompt')}
                  </p>
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

              {server.headers && Object.keys(server.headers).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(server.headers).map(([key, value]) => {
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
                  <p className="text-sm text-muted-foreground">{t('details.headers.noHeaders')}</p>
                </div>
              )}
            </div>

            {/* Tags */}
            {server.tags && server.tags.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Tags className="h-5 w-5" />
                    {t('details.sections.tags')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {server.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-sm">
                        {tag}
                      </Badge>
                    ))}
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
