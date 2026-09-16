import { useCallback, useState } from 'react';
import { Badge, Card, CardContent, CardHeader, Switch, Label, Input, Button } from '@evoapi/design-system';
import { Settings, Brain, Zap, BookOpen, X, Plus } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

import CollapsibleHeader from './CollapsibleHeader';
import { useKnowledgeBases } from '@/hooks/useKnowledgeBases';

interface AdvancedSettingsData {
  load_memory: boolean;
  preload_memory: boolean;
  planner: boolean;
  load_knowledge: boolean;
  knowledge_tags: string[];
}

interface AdvancedSettingsSectionProps {
  data: AdvancedSettingsData;
  isOpen: boolean;
  onToggle: () => void;
  onAdvancedSettingsChange: (data: AdvancedSettingsData) => void;
  isReadOnly?: boolean;
  /**
   * The currently attached knowledge base id (Phase 1 CRUD resource), if any.
   * This is intentionally separate from `data`/`onAdvancedSettingsChange`:
   * attachment is a relationship to a knowledge base resource, not an agent
   * config field, so it is persisted via the dedicated attach/detach endpoint
   * (`POST`/`DELETE /api/v1/ai_agents/:id/knowledge_base`) rather than being
   * bundled into the agent's saved config payload.
   */
  knowledgeBaseId?: string;
  onKnowledgeBaseChange?: (knowledgeBaseId: string) => void;
}

const AdvancedSettingsSection = ({
  data,
  isOpen,
  onToggle,
  onAdvancedSettingsChange,
  isReadOnly = false,
  knowledgeBaseId,
  onKnowledgeBaseChange,
}: AdvancedSettingsSectionProps) => {
  const { t } = useLanguage('aiAgents');
  const [knowledgeTagInput, setKnowledgeTagInput] = useState('');
  const { knowledgeBases, loading: loadingKnowledgeBases } = useKnowledgeBases();

  const handleAdvancedConfigChange = useCallback(
    (field: keyof AdvancedSettingsData, value: boolean | string[]) => {
      onAdvancedSettingsChange({
        ...data,
        [field]: value,
      });
    },
    [data, onAdvancedSettingsChange],
  );

  const handleAddKnowledgeTag = useCallback(() => {
    const trimmedTag = knowledgeTagInput.trim();
    if (trimmedTag && !data.knowledge_tags.includes(trimmedTag)) {
      handleAdvancedConfigChange('knowledge_tags', [...data.knowledge_tags, trimmedTag]);
      setKnowledgeTagInput('');
    }
  }, [knowledgeTagInput, data.knowledge_tags, handleAdvancedConfigChange]);

  const handleRemoveKnowledgeTag = useCallback(
    (tagToRemove: string) => {
      const updatedTags = data.knowledge_tags.filter(tag => tag !== tagToRemove);
      handleAdvancedConfigChange('knowledge_tags', updatedTags);
    },
    [data.knowledge_tags, handleAdvancedConfigChange],
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddKnowledgeTag();
      }
    },
    [handleAddKnowledgeTag],
  );

  return (
    <Card>
      <CardHeader>
        <CollapsibleHeader
          title={t('advancedBot.title')}
          description={t('advancedBot.description')}
          icon={<Settings className="h-5 w-5 text-indigo-500" />}
          count={[data.load_memory, data.planner, data.load_knowledge].filter(Boolean).length}
          isOpen={isOpen}
          onToggle={onToggle}
        />
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-6">
          {/* Load Memory */}
          <div className="flex items-start justify-between p-4 bg-muted/30 rounded-lg border">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-5 w-5 text-blue-500" />
                <Label htmlFor="load-memory" className="font-medium">
                  {t('memory.loadMemory')}
                </Label>
                <Badge variant={data.load_memory ? 'default' : 'outline'} className="text-xs">
                  {data.load_memory ? t('advancedBot.active') : t('advancedBot.inactive')}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {t('memory.loadMemoryDescription')}
              </p>
              <div className="flex items-center gap-3">
                <Switch
                  id="load-memory"
                  checked={data.load_memory}
                  onCheckedChange={checked => {
                    // Fazer todas as mudanças de uma vez para evitar conflitos de estado
                    const newData = {
                      ...data,
                      load_memory: checked,
                      // Auto-habilitar preload quando memory é habilitado
                      // Auto-desabilitar preload quando memory é desabilitado
                      preload_memory: checked ? data.preload_memory || true : false,
                    };
                    onAdvancedSettingsChange(newData);
                  }}
                  disabled={isReadOnly}
                />
                <span className="text-sm text-muted-foreground">
                  {data.load_memory ? t('advancedBot.enabled') : t('advancedBot.disabled')}
                </span>
              </div>

              {/* Preload Memory */}
              {data.load_memory && (
                <div className="mt-4 p-3 bg-muted/50 rounded-md border border-dashed">
                  <div className="flex items-center gap-2 mb-1">
                    <Switch
                      id="preload-memory"
                      checked={data.preload_memory}
                      onCheckedChange={checked =>
                        handleAdvancedConfigChange('preload_memory', checked)
                      }
                      disabled={isReadOnly}
                    />
                    <Label htmlFor="preload-memory" className="text-sm font-medium">
                      {t('memory.preloadMemory')}
                    </Label>
                    <Badge variant="outline" className="text-xs">
                      {t('advancedBot.optimization')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('memory.preloadMemoryDescription')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Planner */}
          <div className="flex items-start justify-between p-4 bg-muted/30 rounded-lg border">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <Label htmlFor="planner" className="font-medium">
                  {t('planner.title')}
                </Label>
                <Badge variant={data.planner ? 'default' : 'outline'} className="text-xs">
                  {data.planner ? t('advancedBot.active') : t('advancedBot.inactive')}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{t('planner.description')}</p>
              <div className="flex items-center gap-3">
                <Switch
                  id="planner"
                  checked={data.planner}
                  onCheckedChange={checked => handleAdvancedConfigChange('planner', checked)}
                  disabled={isReadOnly}
                />
                <span className="text-sm text-muted-foreground">
                  {data.planner ? t('advancedBot.enabled') : t('advancedBot.disabled')}
                </span>
              </div>
            </div>
          </div>

          {/* Load Knowledge */}
          <div className="flex items-start justify-between p-4 bg-muted/30 rounded-lg border">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-5 w-5 text-green-500" />
                <Label htmlFor="load-knowledge" className="font-medium">
                  {t('knowledge.loadKnowledge')}
                </Label>
                <Badge variant={data.load_knowledge ? 'default' : 'outline'} className="text-xs">
                  {data.load_knowledge ? t('advancedBot.active') : t('advancedBot.inactive')}
                </Badge>
                <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">
                  RAG
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {t('knowledge.loadKnowledgeDescription')}
              </p>
              <div className="flex items-center gap-3">
                <Switch
                  id="load-knowledge"
                  checked={data.load_knowledge}
                  onCheckedChange={checked => handleAdvancedConfigChange('load_knowledge', checked)}
                  disabled={isReadOnly}
                />
                <span className="text-sm text-muted-foreground">
                  {data.load_knowledge ? t('advancedBot.enabled') : t('advancedBot.disabled')}
                </span>
              </div>

              {data.load_knowledge && (
                <div className="mt-4 p-3 bg-muted/50 rounded-md border border-dashed">
                  <Label htmlFor="knowledge-base-select" className="text-sm font-medium mb-2 block">
                    {t('knowledge.selectKnowledgeBase')}
                  </Label>
                  <select
                    id="knowledge-base-select"
                    value={knowledgeBaseId ?? ''}
                    onChange={e => onKnowledgeBaseChange?.(e.target.value)}
                    disabled={isReadOnly || loadingKnowledgeBases || !onKnowledgeBaseChange}
                    className="mb-3 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">{t('knowledge.selectKnowledgeBasePlaceholder')}</option>
                    {knowledgeBases.map(kb => (
                      <option key={kb.id} value={kb.id}>
                        {kb.name}
                      </option>
                    ))}
                  </select>

                  <Label className="text-sm font-medium mb-2 block">
                    {t('knowledge.knowledgeTags')}
                  </Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    {t('knowledge.knowledgeTagsDescription')}
                  </p>

                  {data.knowledge_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {data.knowledge_tags.map(tag => (
                        <div
                          key={tag}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-xs"
                        >
                          <span>{tag}</span>
                          {!isReadOnly && (
                            <button
                              onClick={() => handleRemoveKnowledgeTag(tag)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {!isReadOnly && (
                    <div className="flex gap-2">
                      <Input
                        value={knowledgeTagInput}
                        onChange={e => setKnowledgeTagInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={t('knowledge.tagPlaceholder')}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddKnowledgeTag}
                        disabled={!knowledgeTagInput.trim()}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AdvancedSettingsSection;
