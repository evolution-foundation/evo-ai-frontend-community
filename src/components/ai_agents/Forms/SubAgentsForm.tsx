import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  ScrollArea,
} from '@evoapi/design-system';
import { Search, X, Users, Plus, Check, Loader2 } from 'lucide-react';
import { listAgents } from '@/services/agents';
import { useLanguage } from '@/hooks/useLanguage';

type AgentPageMode = 'create' | 'edit' | 'view';

interface Agent {
  id: string;
  name: string;
  type: string;
  description?: string;
}

export interface SubAgentsData {
  sub_agents: string[];
}

interface SubAgentsFormProps {
  mode: AgentPageMode;
  data: SubAgentsData;
  onChange: (data: SubAgentsData) => void;
  onValidationChange: (isValid: boolean, errors: string[]) => void;
  editingAgentId?: string;
  folderId?: string;
  /** Inside the Tools accordion the form already sits in a card, so it drops its own. */
  embedded?: boolean;
}

const SubAgentsForm = ({
  mode,
  data,
  onChange,
  onValidationChange,
  editingAgentId,
  folderId,
  embedded = false,
}: SubAgentsFormProps) => {
  const { t } = useLanguage('aiAgents');
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onValidationChange(true, []);
  }, [onValidationChange]);

  useEffect(() => {
    loadAvailableAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId, editingAgentId]);

  const loadAvailableAgents = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await listAgents(0, 100, folderId);

      // Drops the current agent to avoid self-reference.
      const filteredAgents = response.data.filter((agent: any) => agent.id !== editingAgentId);
      setAvailableAgents(filteredAgents);
    } catch (err) {
      console.error('Error loading agents:', err);
      setError(t('subAgents.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAgents = availableAgents.filter(agent =>
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getAgentNameById = (agentId: string): string => {
    const agent = availableAgents.find(a => a.id === agentId);
    return agent ? agent.name : agentId;
  };

  const getAgentTypeById = (agentId: string): string => {
    const agent = availableAgents.find(a => a.id === agentId);
    return agent ? agent.type : 'unknown';
  };

  const handleAddSubAgent = useCallback(
    (agentId: string) => {
      if (!data.sub_agents.includes(agentId)) {
        onChange({
          ...data,
          sub_agents: [...data.sub_agents, agentId],
        });
      }
    },
    [data, onChange],
  );

  const handleRemoveSubAgent = useCallback(
    (agentId: string) => {
      onChange({
        ...data,
        sub_agents: data.sub_agents.filter(id => id !== agentId),
      });
    },
    [data, onChange],
  );

  const isReadOnly = mode === 'view';

  const selectedCountBadge = (
    <Badge variant="outline" className="flex-shrink-0 text-xs">
      {t('subAgents.selectedCount', { count: data.sub_agents.length })}
    </Badge>
  );

  // Both layouts share the search, agent row, loading and error states; only the
  // surrounding wrapper differs.
  const renderSelectedChip = (agentId: string, chipClass: string) => (
    <div key={agentId} className={chipClass}>
      <span className="text-sm font-medium">{getAgentNameById(agentId)}</span>
      <Badge variant="outline" className="text-xs">
        {getAgentTypeById(agentId)}
      </Badge>
      {!isReadOnly && (
        <button
          onClick={() => handleRemoveSubAgent(agentId)}
          aria-label={t('actions.remove')}
          className="text-muted-foreground transition-colors hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const renderSearchField = (inputClass: string) => (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id="search-agents"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        placeholder={t('subAgents.searchPlaceholder')}
        className={inputClass}
        disabled={isLoading}
        aria-label={t('subAgents.searchAgents')}
      />
      {searchTerm && (
        <button
          onClick={() => setSearchTerm('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  const renderAgentRow = (agent: Agent, rowClass: string) => {
    const isSelected = data.sub_agents.includes(agent.id);
    return (
      <div key={agent.id} className={rowClass}>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            <span className="text-sm font-medium">{agent.name}</span>
            <Badge variant="outline" className="text-xs">
              {agent.type}
            </Badge>
          </div>
          {agent.description && (
            <p className="truncate text-xs text-muted-foreground">{agent.description}</p>
          )}
        </div>
        <Button
          variant={isSelected ? 'secondary' : 'outline'}
          size="sm"
          onClick={() =>
            isSelected ? handleRemoveSubAgent(agent.id) : handleAddSubAgent(agent.id)
          }
          className="ml-2 h-7 text-xs"
        >
          {isSelected ? (
            <>
              <Check className="mr-1 h-3 w-3" />
              {t('actions.added')}
            </>
          ) : (
            <>
              <Plus className="mr-1 h-3 w-3" />
              {t('actions.add')}
            </>
          )}
        </Button>
      </div>
    );
  };

  const loadingBlock = (
    <div className="flex items-center justify-center py-6">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <span className="ml-2 text-sm text-muted-foreground">{t('subAgents.loadingAgents')}</span>
    </div>
  );

  const errorBlock = (
    <div className="py-6 text-center text-destructive">
      <p className="text-sm font-medium">{error}</p>
      <Button variant="outline" size="sm" onClick={loadAvailableAgents} className="mt-2">
        {t('actions.tryAgain')}
      </Button>
    </div>
  );

  const selectedChips =
    data.sub_agents.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {data.sub_agents.map(agentId =>
          renderSelectedChip(
            agentId,
            'flex items-center gap-2 rounded-[9px] border border-border bg-card px-3 py-2'
          )
        )}
      </div>
    ) : (
      <div className="rounded-[10px] border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {t('subAgents.noSubAgentsSelected')}
      </div>
    );

  const howItWorksBullets = (
    <div className="space-y-1 text-xs text-muted-foreground">
      <p>
        • <strong>{t('subAgents.howItWorks.composition.title')}:</strong>{' '}
        {t('subAgents.howItWorks.composition.description')}
      </p>
      <p>
        • <strong>{t('subAgents.howItWorks.execution.title')}:</strong>{' '}
        {t('subAgents.howItWorks.execution.description')}
      </p>
      <p>
        • <strong>{t('subAgents.howItWorks.context.title')}:</strong>{' '}
        {t('subAgents.howItWorks.context.description')}
      </p>
      <p>
        • <strong>{t('subAgents.howItWorks.flexibility.title')}:</strong>{' '}
        {t('subAgents.howItWorks.flexibility.description')}
      </p>
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* No title of its own: the accordion header already names the block, and the
              duas colunas precisam do mesmo número de níveis para as linhas baterem. */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-foreground">
                  {t('subAgents.selectedSubAgents')}
                </p>
                {selectedCountBadge}
              </div>
              <p className="mt-[3px] text-[13px] text-muted-foreground">
                {t('subAgents.complexCompositions')}
              </p>
            </div>

            {selectedChips}
          </div>

          {!isReadOnly && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-bold text-foreground">{t('subAgents.availableAgents')}</p>
                <p className="mt-[3px] text-[13px] text-muted-foreground">{t('subAgents.selectToAdd')}</p>
              </div>

              {/* No border/background/height override, so the `--ring` focus token shows. */}
              {renderSearchField('pl-9 pr-9')}

              {isLoading && loadingBlock}

              {error && errorBlock}

              {!isLoading && !error && filteredAgents.length > 0 && (
                <ScrollArea className="h-[220px]">
                  <div className="space-y-1.5 pr-4">
                    {filteredAgents.map(agent =>
                      renderAgentRow(
                        agent,
                        'flex items-center justify-between rounded-[9px] border border-border p-2 transition-colors hover:bg-accent'
                      )
                    )}
                  </div>
                </ScrollArea>
              )}

              {!isLoading && !error && filteredAgents.length === 0 && (
                <div className="py-6 text-center text-muted-foreground">
                  <p className="text-sm font-medium">
                    {searchTerm ? t('subAgents.noAgentsFound') : t('subAgents.noAvailableAgents')}
                  </p>
                  <p className="text-xs">
                    {searchTerm
                      ? t('subAgents.adjustSearch')
                      : folderId
                        ? t('subAgents.noOtherAgentsInFolder')
                        : t('subAgents.createOtherAgentsFirst')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {mode !== 'create' && (
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-[13.5px] font-bold text-foreground">
              {t('subAgents.howItWorks.title')}
            </p>
            {howItWorksBullets}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-blue-500/10">
              <Users className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-sm">{t('subAgents.title')}</CardTitle>
              <CardDescription className="text-xs">{t('subAgents.description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1.5 pt-0 pb-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{t('subAgents.complexCompositions')}</p>
            <Badge variant="outline" className="text-xs">
              {t('subAgents.selectedCount', { count: data.sub_agents.length })}
            </Badge>
          </div>

          {data.sub_agents.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('subAgents.selectedSubAgents')}</Label>
              <div className="flex flex-wrap gap-2">
                {data.sub_agents.map(agentId =>
                  renderSelectedChip(
                    agentId,
                    'flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border'
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">{t('subAgents.noSubAgentsSelected')}</p>
              <p className="text-sm">
                {isReadOnly ? t('subAgents.noSubAgentsUsed') : t('subAgents.addFromListBelow')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {!isReadOnly && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('subAgents.availableAgents')}</CardTitle>
            <CardDescription className="text-xs">{t('subAgents.selectToAdd')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="space-y-1.5">
              <Label htmlFor="search-agents" className="text-sm">
                {t('subAgents.searchAgents')}
              </Label>
              {renderSearchField('pl-9 pr-9 h-9 text-sm')}
            </div>

            {isLoading && loadingBlock}

            {error && errorBlock}

            {!isLoading && !error && (
              <ScrollArea className="h-[250px]">
                <div className="space-y-1.5 pr-4">
                  {filteredAgents.length > 0 ? (
                    filteredAgents.map(agent =>
                      renderAgentRow(
                        agent,
                        'flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors'
                      )
                    )
                  ) : searchTerm ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Search className="h-8 w-8 mx-auto mb-3 opacity-50" />
                      <p className="font-medium text-sm">{t('subAgents.noAgentsFound')}</p>
                      <p className="text-xs">{t('subAgents.adjustSearch')}</p>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-3 opacity-50" />
                      <p className="font-medium text-sm">{t('subAgents.noAvailableAgents')}</p>
                      <p className="text-xs">
                        {folderId
                          ? t('subAgents.noOtherAgentsInFolder')
                          : t('subAgents.createOtherAgentsFirst')}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {mode !== 'create' && (
        <Card>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs">{t('subAgents.howItWorks.title')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3 space-y-1 text-xs text-muted-foreground">
            <p>
              • <strong>{t('subAgents.howItWorks.composition.title')}:</strong>{' '}
              {t('subAgents.howItWorks.composition.description')}
            </p>
            <p>
              • <strong>{t('subAgents.howItWorks.execution.title')}:</strong>{' '}
              {t('subAgents.howItWorks.execution.description')}
            </p>
            <p>
              • <strong>{t('subAgents.howItWorks.context.title')}:</strong>{' '}
              {t('subAgents.howItWorks.context.description')}
            </p>
            <p>
              • <strong>{t('subAgents.howItWorks.flexibility.title')}:</strong>{' '}
              {t('subAgents.howItWorks.flexibility.description')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubAgentsForm;
