import { useLanguage } from '@/hooks/useLanguage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Button,
  Card,
  CardContent,
  Checkbox,
} from '@evoapi/design-system';
import { UserRound, Trash2, Plus, Info } from 'lucide-react';

export interface TransferRule {
  id: string;
  transferTo: 'human' | 'team';
  userId?: string;
  userName?: string;
  teamId?: string;
  teamName?: string;
  returnOnFinish: boolean;
  instructions: string;
}

interface TransferRulesProps {
  rules: TransferRule[];
  onChange: (rules: TransferRule[]) => void;
  availableUsers?: Array<{ id: string; name: string }>;
  availableTeams?: Array<{ id: string; name: string }>;
}

const TransferRules = ({ rules, onChange, availableUsers = [], availableTeams = [] }: TransferRulesProps) => {
  const { t } = useLanguage('aiAgents');

  const handleAddRule = () => {
    const newRule: TransferRule = {
      id: `rule_${Date.now()}`,
      transferTo: 'human',
      returnOnFinish: false,
      instructions: '',
    };
    onChange([...rules, newRule]);
  };

  const handleUpdateRule = (id: string, updates: Partial<TransferRule>) => {
    onChange(
      rules.map(rule => (rule.id === id ? { ...rule, ...updates } : rule))
    );
  };

  const handleRemoveRule = (id: string) => {
    onChange(rules.filter(rule => rule.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-[10px] border border-primary/30 bg-primary/10 p-4">
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
        <p className="text-sm text-primary">
          {t('edit.configuration.transferRules.description') ||
            'Configure instruções para o agente fazer transferência do atendimento.'}
        </p>
      </div>

      <div className="space-y-4">
        {rules.map(rule => (
          <Card
            key={rule.id}
            // `py-0` cancels the Card base `py-6`, which would stack with the CardContent.
            className="rounded-[14px] border-border bg-card py-0 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
          >
            <CardContent className="p-5">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-[13.5px] font-bold text-foreground">
                      {t('edit.configuration.transferRules.transferTo') || 'Transferir para:'}
                    </label>
                    <Select
                      value={rule.transferTo}
                      onValueChange={value =>
                        handleUpdateRule(rule.id, { transferTo: value as 'human' | 'team' })
                      }
                    >
                      <SelectTrigger className="w-full rounded-[9px] border-border bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="human">
                          {t('edit.configuration.transferRules.aHuman') || 'Humano'}
                        </SelectItem>
                        <SelectItem value="team">
                          {t('edit.configuration.transferRules.aTeam') || 'Time'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {rule.transferTo === 'human' && (
                    <div className="flex-1 space-y-2">
                      <label className="text-[13.5px] font-bold text-foreground">
                        {t('edit.configuration.transferRules.selectUser') || 'Selecione o usuário:'}
                      </label>
                      <Select
                        value={rule.userId || ''}
                        onValueChange={value => {
                          const user = availableUsers.find(u => u.id === value);
                          handleUpdateRule(rule.id, {
                            userId: value,
                            userName: user?.name,
                          });
                        }}
                      >
                        <SelectTrigger className="w-full rounded-[9px] border-border bg-card">
                          <SelectValue placeholder={t('edit.configuration.transferRules.selectUserPlaceholder') || 'Selecione um usuário'} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                  <UserRound className="h-3 w-3 text-primary" />
                                </div>
                                <span>{user.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {rule.transferTo === 'team' && (
                    <div className="flex-1 space-y-2">
                      <label className="text-[13.5px] font-bold text-foreground">
                        {t('edit.configuration.transferRules.selectTeam') || 'Selecione o time:'}
                      </label>
                      <Select
                        value={rule.teamId || ''}
                        onValueChange={value => {
                          const team = availableTeams.find(t => t.id === value);
                          handleUpdateRule(rule.id, {
                            teamId: value,
                            teamName: team?.name,
                          });
                        }}
                      >
                        <SelectTrigger className="w-full rounded-[9px] border-border bg-card">
                          <SelectValue placeholder={t('edit.configuration.transferRules.selectTeamPlaceholder') || 'Selecione um time'} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTeams.map(team => (
                            <SelectItem key={team.id} value={team.id}>
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                  <UserRound className="h-3 w-3 text-primary" />
                                </div>
                                <span>{team.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`return-${rule.id}`}
                    checked={rule.returnOnFinish}
                    onCheckedChange={checked =>
                      handleUpdateRule(rule.id, { returnOnFinish: !!checked })
                    }
                  />
                  <label
                    htmlFor={`return-${rule.id}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {t('edit.configuration.transferRules.returnOnFinish') || 'Devolver ao finalizar'}
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[13.5px] font-bold text-foreground">
                      {t('edit.configuration.transferRules.instructions') || 'Instruções:'}
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {(rule.instructions?.length || 0)}/255
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRule(rule.id)}
                        aria-label={t('actions.remove') || 'Remover'}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={rule.instructions || ''}
                    onChange={e =>
                      handleUpdateRule(rule.id, { instructions: e.target.value })
                    }
                    placeholder={t('edit.configuration.transferRules.instructionsPlaceholder') || 'Quando o cliente quiser falar sobre tal assunto...'}
                    maxLength={255}
                    className="min-h-[130px] rounded-[9px] border-border bg-card text-sm placeholder:text-muted-foreground/70"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleAddRule}
        className="h-auto w-full rounded-[12px] border-border bg-card py-[14px] text-sm font-semibold text-foreground"
      >
        <Plus className="mr-2 h-4 w-4" />
        {t('edit.configuration.transferRules.addRule') || 'Adicionar regra de transferência'}
      </Button>
    </div>
  );
};

export default TransferRules;

