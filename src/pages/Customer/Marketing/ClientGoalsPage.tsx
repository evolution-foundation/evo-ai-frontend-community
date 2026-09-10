import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Plus,
  Trash2,
  Edit2,
  Target,
  Building2,
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  Power,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Card,
  CardContent,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@evoapi/design-system';
import { BaseHeader } from '@/components/base';
import {
  clientGoalsService,
  ClientGoal,
  ClientGoalFormData,
  ClientGoalObjective,
  ClientGoalAdAccount,
  ClientGoalLocation,
  ClientGoalChangelogEntry,
  ObjectiveType,
  ChangelogLevel,
  OBJECTIVE_TYPE_OPTIONS,
  SALES_CHANNEL_OPTIONS,
  CHANGELOG_LEVEL_OPTIONS,
  GENDER_OPTIONS,
  Gender,
} from '@/services/marketing/clientGoalsService';

// Os campos do design system usam fundo transparente por padrão (só a borda
// marca o campo) — nesta tela, com vários campos numéricos pequenos lado a
// lado, isso ficava ilegível tanto no claro quanto no escuro (o campo se
// confundia com o fundo do card/diálogo). Fundo próprio, visível nos dois
// temas.
const FIELD_CLASS = 'bg-slate-100 dark:bg-slate-800/70 border-slate-300 dark:border-slate-700';

const PERIODS = [
  { key: 'daily', label: 'Diário' },
  { key: 'weekly', label: 'Semanal' },
  { key: 'monthly', label: 'Mensal' },
] as const;

const emptyObjective = (): ClientGoalObjective => ({
  key: `novo-${Math.random().toString(36).slice(2)}`,
  objective_type: 'mensagens',
  custom_label: '',
  budget: null,
  target_result_daily: null,
  target_result_weekly: null,
  target_result_monthly: null,
  cost_margin_daily_min: null,
  cost_margin_daily_max: null,
  cost_margin_weekly_min: null,
  cost_margin_weekly_max: null,
  cost_margin_monthly_min: null,
  cost_margin_monthly_max: null,
});

// Cada conta de anúncio tem seus PRÓPRIOS objetivos — contas diferentes do
// mesmo cliente podem ter metas bem diferentes entre si.
const emptyAdAccount = (): ClientGoalAdAccount => ({
  id: '',
  name: '',
  locations: [],
  age_min: null,
  age_max: null,
  gender: 'all',
  objectives: [emptyObjective()],
});

const emptyForm = (): ClientGoalFormData => ({
  name: '',
  segments: [],
  sales_channel: '',
  meta_budget: null,
  active: true,
  ad_accounts: [emptyAdAccount()],
  changelog: [],
});

const formFromGoal = (goal: ClientGoal): ClientGoalFormData => ({
  name: goal.name,
  segments: goal.segments || [],
  sales_channel: goal.sales_channel || '',
  meta_budget: goal.meta_budget,
  active: goal.active,
  ad_accounts: goal.ad_accounts.length ? goal.ad_accounts : [emptyAdAccount()],
  changelog: goal.changelog,
});

const objectiveLabel = (o: ClientGoalObjective) =>
  o.objective_type === 'outro'
    ? o.custom_label || 'Outro'
    : OBJECTIVE_TYPE_OPTIONS.find((opt) => opt.value === o.objective_type)?.label || o.objective_type;

const money = (v: number | null | undefined) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const num = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('pt-BR'));

const genderLabel = (g: Gender | null | undefined) => GENDER_OPTIONS.find((opt) => opt.value === g)?.label || 'Todos';

const ageRangeLabel = (min: number | null | undefined, max: number | null | undefined) => {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${min}-${max} anos`;
  return min != null ? `A partir de ${min} anos` : `Até ${max} anos`;
};

// O backend devolve { success: false, errors: ["motivo real"] } — sem isso,
// qualquer rejeição de validação (ex: nome com mais de 255 caracteres, fácil
// de acontecer colando de uma planilha) virava só "Erro ao salvar", sem
// dizer o que estava errado de verdade.
const extractErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const errors = (error.response?.data as { errors?: string[] } | undefined)?.errors;
    if (errors?.length) return errors.join(' ');
  }
  return fallback;
};

function ObservationBadge({ objective }: { objective: ClientGoalObjective }) {
  const status = objective.status;
  if (!status || !status.trackable) {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <MinusCircle className="h-3 w-3" /> Sem acompanhamento automático
      </Badge>
    );
  }
  if (status.days_out_of_margin > 0) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" /> {status.observation}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800">
      <CheckCircle2 className="h-3 w-3" /> {status.observation}
    </Badge>
  );
}

// Mini-tabela Diário/Semanal/Mensal x Meta de Resultado/Margem Mín/Margem
// Máx de um objetivo — usada na leitura (linha expandida da tabela).
function ObjectivePeriodsTable({ objective }: { objective: ClientGoalObjective }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1 pr-3 font-medium">Período</th>
            <th className="py-1 pr-3 font-medium">Meta de Resultado</th>
            <th className="py-1 pr-3 font-medium">Margem Mín (R$)</th>
            <th className="py-1 pr-3 font-medium">Margem Máx (R$)</th>
          </tr>
        </thead>
        <tbody>
          {PERIODS.map((period) => (
            <tr key={period.key} className="border-t">
              <td className="py-1.5 pr-3 font-medium">{period.label}</td>
              <td className="py-1.5 pr-3">{num(objective[`target_result_${period.key}` as keyof ClientGoalObjective] as number)}</td>
              <td className="py-1.5 pr-3">{money(objective[`cost_margin_${period.key}_min` as keyof ClientGoalObjective] as number)}</td>
              <td className="py-1.5 pr-3">{money(objective[`cost_margin_${period.key}_max` as keyof ClientGoalObjective] as number)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ClientGoalFormFieldsProps {
  form: ClientGoalFormData;
  setForm: React.Dispatch<React.SetStateAction<ClientGoalFormData>>;
  isEditing: boolean;
  newChangeEntry: ClientGoalChangelogEntry;
  setNewChangeEntry: React.Dispatch<React.SetStateAction<ClientGoalChangelogEntry>>;
}

// Os campos do formulário de cliente (nome/segmento/contas+objetivos/
// changelog) — reaproveitado tanto no diálogo de "Novo Cliente" quanto
// direto na linha expandida da tabela ao editar um cliente já existente
// (sem abrir uma "tela de edição" separada).
function ClientGoalFormFields({ form, setForm, isEditing, newChangeEntry, setNewChangeEntry }: ClientGoalFormFieldsProps) {
  const updateAdAccount = (index: number, field: 'id' | 'name', value: string) => {
    setForm((prev) => {
      const list = [...prev.ad_accounts];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, ad_accounts: list };
    });
  };

  const patchAdAccount = (index: number, patch: Partial<ClientGoalAdAccount>) => {
    setForm((prev) => {
      const list = [...prev.ad_accounts];
      list[index] = { ...list[index], ...patch };
      return { ...prev, ad_accounts: list };
    });
  };

  const addAdAccount = () => setForm((prev) => ({ ...prev, ad_accounts: [...prev.ad_accounts, emptyAdAccount()] }));

  const removeAdAccount = (index: number) =>
    setForm((prev) => ({ ...prev, ad_accounts: prev.ad_accounts.filter((_, i) => i !== index) }));

  // Um par nome/raio "pendente" por conta (preenche os dois campos e clica
  // Adicionar) — precisa ser por índice porque cada conta tem sua própria
  // lista de localizações.
  const [locationInputs, setLocationInputs] = useState<Record<number, { name: string; radius: string }>>({});

  const getLocationInput = (accountIndex: number) => locationInputs[accountIndex] || { name: '', radius: '' };

  const setLocationInput = (accountIndex: number, patch: Partial<{ name: string; radius: string }>) =>
    setLocationInputs((prev) => ({ ...prev, [accountIndex]: { ...getLocationInput(accountIndex), ...patch } }));

  const addLocation = (accountIndex: number) => {
    const { name, radius } = getLocationInput(accountIndex);
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const current = form.ad_accounts[accountIndex].locations;
    if (!current.some((l) => l.name === trimmedName)) {
      patchAdAccount(accountIndex, {
        locations: [...current, { name: trimmedName, radius: radius.trim() === '' ? null : Number(radius) }],
      });
    }
    setLocationInputs((prev) => ({ ...prev, [accountIndex]: { name: '', radius: '' } }));
  };

  const removeLocation = (accountIndex: number, name: string) =>
    patchAdAccount(accountIndex, { locations: form.ad_accounts[accountIndex].locations.filter((l) => l.name !== name) });

  const updateObjective = (accountIndex: number, objIndex: number, patch: Partial<ClientGoalObjective>) => {
    setForm((prev) => {
      const accounts = [...prev.ad_accounts];
      const objectives = [...accounts[accountIndex].objectives];
      objectives[objIndex] = { ...objectives[objIndex], ...patch };
      accounts[accountIndex] = { ...accounts[accountIndex], objectives };
      return { ...prev, ad_accounts: accounts };
    });
  };

  const addObjective = (accountIndex: number) =>
    setForm((prev) => {
      const accounts = [...prev.ad_accounts];
      accounts[accountIndex] = { ...accounts[accountIndex], objectives: [...accounts[accountIndex].objectives, emptyObjective()] };
      return { ...prev, ad_accounts: accounts };
    });

  const removeObjective = (accountIndex: number, objIndex: number) =>
    setForm((prev) => {
      const accounts = [...prev.ad_accounts];
      accounts[accountIndex] = {
        ...accounts[accountIndex],
        objectives: accounts[accountIndex].objectives.filter((_, i) => i !== objIndex),
      };
      return { ...prev, ad_accounts: accounts };
    });

  const addChangelogEntry = () => {
    if (!newChangeEntry.description.trim()) {
      toast.error('Descreva a mudança antes de adicionar.');
      return;
    }
    setForm((prev) => ({ ...prev, changelog: [newChangeEntry, ...prev.changelog] }));
    setNewChangeEntry({ change_date: new Date().toISOString().slice(0, 10), level: 'conta', reference_name: '', description: '' });
  };

  const removeChangelogEntry = (index: number) =>
    setForm((prev) => ({ ...prev, changelog: prev.changelog.filter((_, i) => i !== index) }));

  const [segmentInput, setSegmentInput] = useState('');

  const addSegment = () => {
    const value = segmentInput.trim();
    if (!value) return;
    setForm((prev) => (prev.segments.includes(value) ? prev : { ...prev, segments: [...prev.segments, value] }));
    setSegmentInput('');
  };

  const removeSegment = (value: string) => setForm((prev) => ({ ...prev, segments: prev.segments.filter((s) => s !== value) }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Nome do Cliente *</Label>
          <Input
            className={FIELD_CLASS}
            value={form.name}
            maxLength={255}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Ex: Burger House"
          />
        </div>
        <div>
          <Label>Segmentos</Label>
          <div className="flex gap-2">
            <Input
              className={FIELD_CLASS}
              value={segmentInput}
              onChange={(e) => setSegmentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSegment();
                }
              }}
              placeholder="Ex: Hamburgueria (Enter pra adicionar)"
            />
            <Button type="button" size="icon" variant="outline" onClick={addSegment}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {form.segments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {form.segments.map((s) => (
                <Badge key={s} variant="outline" className="gap-1">
                  {s}
                  <button type="button" onClick={() => removeSegment(s)} className="ml-1 text-muted-foreground hover:text-red-500">
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div>
          <Label>Onde fecha venda?</Label>
          <Select value={form.sales_channel || ''} onValueChange={(v) => setForm((p) => ({ ...p, sales_channel: v }))}>
            <SelectTrigger className={FIELD_CLASS}>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {SALES_CHANNEL_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Orçamento Total pra Meta (R$)</Label>
          <Input
            className={FIELD_CLASS}
            type="number"
            step="0.01"
            value={form.meta_budget ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, meta_budget: e.target.value === '' ? null : Number(e.target.value) }))}
          />
        </div>
      </div>

      <Separator />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label className="text-sm font-semibold">Contas de Anúncio e Objetivos</Label>
          <Button size="sm" variant="outline" onClick={addAdAccount} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Adicionar Conta
          </Button>
        </div>
        <div className="space-y-4">
          {form.ad_accounts.map((acc, accIndex) => (
            <Card key={accIndex}>
              <CardContent className="space-y-3 pt-4">
                <div className="flex gap-2">
                  <Input
                    className={FIELD_CLASS}
                    placeholder="ID da conta (act_...)"
                    value={acc.id}
                    onChange={(e) => updateAdAccount(accIndex, 'id', e.target.value)}
                  />
                  <Input
                    className={FIELD_CLASS}
                    placeholder="Nome da conta"
                    value={acc.name}
                    onChange={(e) => updateAdAccount(accIndex, 'name', e.target.value)}
                  />
                  <Button size="icon" variant="ghost" onClick={() => removeAdAccount(accIndex)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <Label className="text-xs">Idade Mínima</Label>
                    <Input
                      className={FIELD_CLASS}
                      type="number"
                      min={13}
                      max={65}
                      value={acc.age_min ?? ''}
                      onChange={(e) => patchAdAccount(accIndex, { age_min: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Idade Máxima</Label>
                    <Input
                      className={FIELD_CLASS}
                      type="number"
                      min={13}
                      max={65}
                      value={acc.age_max ?? ''}
                      onChange={(e) => patchAdAccount(accIndex, { age_max: e.target.value === '' ? null : Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Gênero</Label>
                    <Select value={acc.gender || 'all'} onValueChange={(v) => patchAdAccount(accIndex, { gender: v as Gender })}>
                      <SelectTrigger className={FIELD_CLASS}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDER_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Localizações</Label>
                  <div className="flex gap-2">
                    <Input
                      className={`${FIELD_CLASS} flex-1`}
                      value={getLocationInput(accIndex).name}
                      onChange={(e) => setLocationInput(accIndex, { name: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addLocation(accIndex);
                        }
                      }}
                      placeholder="Ex: São Paulo, SP"
                    />
                    <Input
                      className={`${FIELD_CLASS} w-28`}
                      type="number"
                      min={1}
                      value={getLocationInput(accIndex).radius}
                      onChange={(e) => setLocationInput(accIndex, { radius: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addLocation(accIndex);
                        }
                      }}
                      placeholder="Raio (km)"
                    />
                    <Button type="button" size="icon" variant="outline" onClick={() => addLocation(accIndex)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {acc.locations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {acc.locations.map((loc) => (
                        <Badge key={loc.name} variant="outline" className="gap-1">
                          {loc.name}
                          {loc.radius != null && ` (+${loc.radius}km)`}
                          <button
                            type="button"
                            onClick={() => removeLocation(accIndex, loc.name)}
                            className="ml-1 text-muted-foreground hover:text-red-500"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground">Objetivos desta conta</Label>
                  <Button size="sm" variant="outline" onClick={() => addObjective(accIndex)} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> Adicionar Objetivo
                  </Button>
                </div>

                <div className="space-y-4">
                  {acc.objectives.map((obj, objIndex) => (
                    <Card key={obj.key || objIndex} className={FIELD_CLASS}>
                      <CardContent className="space-y-3 pt-4">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <Label>Tipo de Objetivo</Label>
                            <Select
                              value={obj.objective_type}
                              onValueChange={(v) => updateObjective(accIndex, objIndex, { objective_type: v as ObjectiveType })}
                            >
                              <SelectTrigger className={FIELD_CLASS}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {OBJECTIVE_TYPE_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {obj.objective_type === 'outro' && (
                            <div className="flex-1">
                              <Label>Rótulo do Objetivo</Label>
                              <Input
                                className={FIELD_CLASS}
                                value={obj.custom_label || ''}
                                onChange={(e) => updateObjective(accIndex, objIndex, { custom_label: e.target.value })}
                              />
                            </div>
                          )}
                          <div className="w-40">
                            <Label>Orçamento (R$)</Label>
                            <Input
                              className={FIELD_CLASS}
                              type="number"
                              step="0.01"
                              value={obj.budget ?? ''}
                              onChange={(e) =>
                                updateObjective(accIndex, objIndex, { budget: e.target.value === '' ? null : Number(e.target.value) })
                              }
                            />
                          </div>
                          <Button size="icon" variant="ghost" className="mt-6" onClick={() => removeObjective(accIndex, objIndex)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>

                        {obj.objective_type === 'seguidores' || obj.objective_type === 'outro' ? (
                          <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-700">
                            A API do Meta não expõe esse resultado diretamente nos Insights — este objetivo fica registrado, mas o
                            acompanhamento automático de "dias fora da meta" não é calculado para ele.
                          </p>
                        ) : null}

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          {PERIODS.map((period) => (
                            <div key={period.key} className="space-y-1 rounded-md border p-2">
                              <p className="text-xs font-semibold text-muted-foreground">{period.label}</p>
                              <Label className="text-xs">Meta de Resultado</Label>
                              <Input
                                className={FIELD_CLASS}
                                type="number"
                                step="0.01"
                                value={(obj[`target_result_${period.key}` as keyof ClientGoalObjective] as number) ?? ''}
                                onChange={(e) =>
                                  updateObjective(accIndex, objIndex, {
                                    [`target_result_${period.key}`]: e.target.value === '' ? null : Number(e.target.value),
                                  })
                                }
                              />
                              <Label className="text-xs">Custo por Resultado — Margem Aceita (R$)</Label>
                              <div className="flex items-center gap-1.5">
                                <Input
                                  className={`${FIELD_CLASS} min-w-0 flex-1`}
                                  type="number"
                                  step="0.01"
                                  placeholder="Mín"
                                  value={(obj[`cost_margin_${period.key}_min` as keyof ClientGoalObjective] as number) ?? ''}
                                  onChange={(e) =>
                                    updateObjective(accIndex, objIndex, {
                                      [`cost_margin_${period.key}_min`]: e.target.value === '' ? null : Number(e.target.value),
                                    })
                                  }
                                />
                                <span className="shrink-0 text-xs text-muted-foreground">até</span>
                                <Input
                                  className={`${FIELD_CLASS} min-w-0 flex-1`}
                                  type="number"
                                  step="0.01"
                                  placeholder="Máx"
                                  value={(obj[`cost_margin_${period.key}_max` as keyof ClientGoalObjective] as number) ?? ''}
                                  onChange={(e) =>
                                    updateObjective(accIndex, objIndex, {
                                      [`cost_margin_${period.key}_max`]: e.target.value === '' ? null : Number(e.target.value),
                                    })
                                  }
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {isEditing && obj.status && (
                          <div className="pt-1">
                            <ObservationBadge objective={obj} />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-sm font-semibold">Mudanças na Conta / Campanha / Conjunto / Anúncio</Label>
        <p className="mb-2 text-xs text-muted-foreground">
          Registre mudanças feitas (ex: aumento de orçamento, pausa de campanha, troca de criativo) com a data — ajuda a explicar
          variações de resultado depois.
        </p>
        <div className="mb-3 grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-4">
          <Input
            className={FIELD_CLASS}
            type="date"
            value={newChangeEntry.change_date}
            onChange={(e) => setNewChangeEntry((p) => ({ ...p, change_date: e.target.value }))}
          />
          <Select value={newChangeEntry.level} onValueChange={(v) => setNewChangeEntry((p) => ({ ...p, level: v as ChangelogLevel }))}>
            <SelectTrigger className={FIELD_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANGELOG_LEVEL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className={FIELD_CLASS}
            placeholder="Nome (opcional)"
            value={newChangeEntry.reference_name || ''}
            onChange={(e) => setNewChangeEntry((p) => ({ ...p, reference_name: e.target.value }))}
          />
          <Button variant="outline" className="gap-1" onClick={addChangelogEntry}>
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
          <Textarea
            className={`${FIELD_CLASS} sm:col-span-4`}
            placeholder="O que mudou?"
            value={newChangeEntry.description}
            onChange={(e) => setNewChangeEntry((p) => ({ ...p, description: e.target.value }))}
          />
        </div>
        <div className="max-h-40 space-y-1 overflow-y-auto text-xs">
          {form.changelog.map((c, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-md border p-2">
              <span>
                {c.change_date} — [{c.level}] {c.reference_name ? `${c.reference_name}: ` : ''}
                {c.description}
              </span>
              <Button size="icon" variant="ghost" onClick={() => removeChangelogEntry(idx)}>
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ClientGoalsPage() {
  const [goals, setGoals] = useState<ClientGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientGoalFormData>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientGoal | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [newChangeEntry, setNewChangeEntry] = useState<ClientGoalChangelogEntry>({
    change_date: new Date().toISOString().slice(0, 10),
    level: 'conta',
    reference_name: '',
    description: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await clientGoalsService.list(true);
      setGoals(data);
    } catch (error) {
      console.error('ClientGoalsPage.load error:', error);
      toast.error('Erro ao carregar a lista de clientes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const segments = useMemo(
    () => Array.from(new Set(goals.flatMap((g) => g.segments || []))).sort((a, b) => a.localeCompare(b)),
    [goals]
  );

  // Organizada por cliente (ordem alfabética) e filtrável por nome, status
  // (ativo/pausado) e segmento — um cliente pode ter mais de um segmento, o
  // filtro casa se QUALQUER um deles bater com o selecionado.
  const visibleGoals = useMemo(() => {
    return goals
      .filter((g) => !nameFilter.trim() || g.name.toLowerCase().includes(nameFilter.trim().toLowerCase()))
      .filter((g) => statusFilter === 'all' || (statusFilter === 'active' ? g.active : !g.active))
      .filter((g) => segmentFilter === 'all' || (g.segments || []).includes(segmentFilter))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [goals, nameFilter, statusFilter, segmentFilter]);

  const resetChangeEntry = () =>
    setNewChangeEntry({ change_date: new Date().toISOString().slice(0, 10), level: 'conta', reference_name: '', description: '' });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    resetChangeEntry();
    setDialogOpen(true);
  };

  // Edita direto na linha da tabela (expandida), sem abrir uma "tela de
  // edição" separada — acionado por duplo clique na linha ou pelo ícone de
  // lápis.
  const startInlineEdit = (goal: ClientGoal) => {
    setEditingId(goal.id);
    setForm(formFromGoal(goal));
    resetChangeEntry();
    setExpandedId(goal.id);
    setEditingRowId(goal.id);
  };

  const cancelInlineEdit = () => {
    setEditingRowId(null);
    setEditingId(null);
  };

  const toggleExpanded = (goal: ClientGoal) => {
    if (expandedId === goal.id) {
      setExpandedId(null);
      if (editingRowId === goal.id) cancelInlineEdit();
    } else {
      setExpandedId(goal.id);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome do cliente.');
      return;
    }
    // Único campo obrigatório é o nome — conta de anúncio, objetivos, etc.
    // são todos opcionais e podem ser preenchidos depois. Um objetivo "Outro"
    // sem rótulo ainda precisa de algum texto pro backend (identifica o
    // objetivo), então preenche um padrão em vez de bloquear o salvamento.
    const cleanedAdAccounts = form.ad_accounts
      .filter((a) => a.id.trim())
      .map((a) => ({
        ...a,
        objectives: a.objectives.map((o) =>
          o.objective_type === 'outro' && !o.custom_label?.trim() ? { ...o, custom_label: 'Outro' } : o
        ),
      }));

    setSaving(true);
    try {
      const payload: ClientGoalFormData = { ...form, ad_accounts: cleanedAdAccounts };
      if (editingId) {
        await clientGoalsService.update(editingId, payload);
        toast.success('Cliente atualizado.');
        setEditingRowId(null);
      } else {
        await clientGoalsService.create(payload);
        toast.success('Cliente cadastrado.');
      }
      setDialogOpen(false);
      setEditingId(null);
      load();
    } catch (error) {
      console.error('ClientGoalsPage.handleSave error:', error);
      toast.error(extractErrorMessage(error, 'Erro ao salvar. Confira os campos e tente novamente.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (goal: ClientGoal) => {
    try {
      await clientGoalsService.update(goal.id, { ...goal, active: !goal.active });
      toast.success(goal.active ? 'Cliente pausado.' : 'Cliente reativado.');
      load();
    } catch (error) {
      console.error('ClientGoalsPage.handleToggleActive error:', error);
      toast.error('Erro ao atualizar status.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await clientGoalsService.remove(deleteTarget.id);
      toast.success('Cliente removido.');
      setDeleteTarget(null);
      load();
    } catch (error) {
      console.error('ClientGoalsPage.handleDelete error:', error);
      toast.error('Erro ao remover.');
    }
  };

  return (
    <div className="flex h-full flex-col">
      <BaseHeader
        title="Metas de Clientes"
        subtitle="Cada conta de anúncio com seus próprios objetivos, orçamento e metas de custo por resultado — clique duas vezes num cliente pra editar direto na tabela."
        primaryAction={{ label: 'Novo Cliente', icon: <Plus className="h-4 w-4" />, onClick: openCreate }}
      />

      <div className="flex-1 overflow-y-auto p-4">
        {!loading && goals.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Input
              className={`${FIELD_CLASS} max-w-xs`}
              placeholder="Buscar por cliente..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive')}>
              <SelectTrigger className={`${FIELD_CLASS} w-40`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Pausados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={segmentFilter} onValueChange={setSegmentFilter}>
              <SelectTrigger className={`${FIELD_CLASS} w-48`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os segmentos</SelectItem>
                {segments.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(nameFilter || statusFilter !== 'all' || segmentFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNameFilter('');
                  setStatusFilter('all');
                  setSegmentFilter('all');
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : goals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
        ) : visibleGoals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum cliente encontrado com esses filtros.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead>Cliente</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Fecha Venda</TableHead>
                <TableHead>Contas de Anúncio</TableHead>
                <TableHead>Orçamento Meta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleGoals.map((goal) => {
                const expanded = expandedId === goal.id;
                const editingThisRow = editingRowId === goal.id;
                return (
                  <Fragment key={goal.id}>
                    <TableRow
                      className={`cursor-pointer ${!goal.active ? 'opacity-60' : ''}`}
                      onClick={() => toggleExpanded(goal)}
                      onDoubleClick={() => startInlineEdit(goal)}
                    >
                      <TableCell className="w-6 text-muted-foreground">
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-muted-foreground" /> {goal.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {goal.segments?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {goal.segments.map((s) => (
                              <Badge key={s} variant="outline">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{goal.sales_channel || '—'}</TableCell>
                      <TableCell>
                        {goal.ad_accounts.length ? (
                          <div className="flex flex-wrap gap-1">
                            {goal.ad_accounts.map((a) => (
                              <Badge key={a.id} variant="outline" className="gap-1">
                                <Building2 className="h-3 w-3" /> {a.name || a.id}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{money(goal.meta_budget)}</TableCell>
                      <TableCell>
                        {goal.active ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pausado</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" title={goal.active ? 'Pausar' : 'Reativar'} onClick={() => handleToggleActive(goal)}>
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Editar" onClick={() => startInlineEdit(goal)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(goal)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/30 p-4" onClick={(e) => e.stopPropagation()}>
                          {editingThisRow ? (
                            <div className="space-y-4">
                              <ClientGoalFormFields
                                form={form}
                                setForm={setForm}
                                isEditing
                                newChangeEntry={newChangeEntry}
                                setNewChangeEntry={setNewChangeEntry}
                              />
                              <div className="flex justify-end gap-2 border-t pt-3">
                                <Button variant="outline" onClick={cancelInlineEdit}>
                                  Cancelar
                                </Button>
                                <Button onClick={handleSave} disabled={saving}>
                                  {saving ? 'Salvando...' : 'Salvar'}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {goal.ad_accounts.length ? (
                                goal.ad_accounts.map((account) => (
                                  <div key={account.id} className="rounded-md border bg-background p-3">
                                    <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                                      <Building2 className="h-4 w-4 text-muted-foreground" />
                                      {account.name || account.id}
                                      <span className="text-xs font-normal text-muted-foreground">({account.id})</span>
                                    </div>
                                    {(account.locations.length > 0 || ageRangeLabel(account.age_min, account.age_max) || account.gender) && (
                                      <div className="mb-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                                        {account.locations.map((loc) => (
                                          <Badge key={loc.name} variant="outline">
                                            {loc.name}
                                            {loc.radius != null && ` (+${loc.radius}km)`}
                                          </Badge>
                                        ))}
                                        {ageRangeLabel(account.age_min, account.age_max) && (
                                          <Badge variant="outline">{ageRangeLabel(account.age_min, account.age_max)}</Badge>
                                        )}
                                        <Badge variant="outline">{genderLabel(account.gender)}</Badge>
                                      </div>
                                    )}
                                    {account.objectives.length ? (
                                      <div className="space-y-3">
                                        {account.objectives.map((o) => (
                                          <div key={o.key} className="rounded-md border p-2">
                                            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                              <span className="text-xs font-semibold">{objectiveLabel(o)}</span>
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">Orçamento: {money(o.budget)}</span>
                                                <ObservationBadge objective={o} />
                                              </div>
                                            </div>
                                            <ObjectivePeriodsTable objective={o} />
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground">Nenhum objetivo cadastrado pra esta conta.</p>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground">Nenhuma conta de anúncio vinculada.</p>
                              )}

                              {goal.changelog.length > 0 && (
                                <div>
                                  <p className="mb-1 text-xs font-semibold text-muted-foreground">Mudanças Registradas</p>
                                  <div className="space-y-1">
                                    {goal.changelog.map((c, idx) => (
                                      <p key={idx} className="text-xs text-muted-foreground">
                                        {c.change_date} — [{c.level}] {c.reference_name ? `${c.reference_name}: ` : ''}
                                        {c.description}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <p className="text-xs text-muted-foreground">Dica: dê dois cliques na linha do cliente pra editar.</p>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>
              Configure segmentos, contas de anúncio (cada uma com seus próprios objetivos/metas) e o histórico de mudanças.
            </DialogDescription>
          </DialogHeader>

          <ClientGoalFormFields
            form={form}
            setForm={setForm}
            isEditing={false}
            newChangeEntry={newChangeEntry}
            setNewChangeEntry={setNewChangeEntry}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove "{deleteTarget?.name}" e todo o histórico de acompanhamento automático dele. Essa ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
