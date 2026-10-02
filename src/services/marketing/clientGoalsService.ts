import api from '@/services/core/api';

export type ObjectiveType =
  | 'mensagens'
  | 'seguidores'
  | 'video'
  | 'alcance'
  | 'vendas_site'
  | 'lead_site'
  | 'outro';

export const OBJECTIVE_TYPE_OPTIONS: { value: ObjectiveType; label: string }[] = [
  { value: 'mensagens', label: 'Mensagens' },
  { value: 'seguidores', label: 'Seguidores' },
  { value: 'video', label: 'Visualizações de Vídeo' },
  { value: 'alcance', label: 'Alcance' },
  { value: 'vendas_site', label: 'Vendas no Site' },
  { value: 'lead_site', label: 'Lead no Site' },
  { value: 'outro', label: 'Outro' },
];

export const SALES_CHANNEL_OPTIONS = [
  'Site',
  'WhatsApp',
  'Loja Física',
  'Marketplace',
  'Instagram/Direct',
  'Telefone',
  'Outro',
];

export const CHANGELOG_LEVEL_OPTIONS: { value: ChangelogLevel; label: string }[] = [
  { value: 'conta', label: 'Conta' },
  { value: 'campanha', label: 'Campanha' },
  { value: 'conjunto', label: 'Conjunto de Anúncios' },
  { value: 'anuncio', label: 'Anúncio' },
];

export type ChangelogLevel = 'conta' | 'campanha' | 'conjunto' | 'anuncio';

export type Gender = 'all' | 'male' | 'female';

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Feminino' },
];

export interface ClientGoalLocation {
  name: string;
  radius: number | null;
}

export interface ClientGoalAdAccount {
  id: string;
  name: string;
  locations: ClientGoalLocation[];
  age_min: number | null;
  age_max: number | null;
  gender: Gender | null;
  objectives: ClientGoalObjective[];
}

export interface ClientGoalObjectiveStatus {
  trackable: boolean;
  last_date: string | null;
  last_cost_per_result: number | null;
  last_within_margin: boolean | null;
  days_out_of_margin: number;
  observation: string;
}

export interface ClientGoalObjective {
  key?: string;
  objective_type: ObjectiveType;
  custom_label?: string | null;
  budget: number | null;
  target_result_daily?: number | null;
  target_result_weekly?: number | null;
  target_result_monthly?: number | null;
  cost_margin_daily_min?: number | null;
  cost_margin_daily_max?: number | null;
  cost_margin_weekly_min?: number | null;
  cost_margin_weekly_max?: number | null;
  cost_margin_monthly_min?: number | null;
  cost_margin_monthly_max?: number | null;
  status?: ClientGoalObjectiveStatus;
}

export interface ClientGoalChangelogEntry {
  change_date: string;
  level: ChangelogLevel;
  reference_name?: string;
  description: string;
}

export interface ClientGoal {
  id: string;
  name: string;
  segments: string[];
  sales_channel?: string | null;
  meta_budget: number | null;
  active: boolean;
  ad_accounts: ClientGoalAdAccount[];
  changelog: ClientGoalChangelogEntry[];
  created_at: string;
  updated_at: string;
}

export type ClientGoalFormData = Omit<ClientGoal, 'id' | 'created_at' | 'updated_at'>;

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  errors?: string[];
}

class ClientGoalsService {
  private readonly baseUrl = '/marketing/client_goals';

  async list(includeInactive = false): Promise<ClientGoal[]> {
    const response = await api.get<ApiEnvelope<ClientGoal[]>>(this.baseUrl, {
      params: includeInactive ? { include_inactive: 1 } : undefined,
    });
    return response.data.data;
  }

  async get(id: string): Promise<ClientGoal> {
    const response = await api.get<ApiEnvelope<ClientGoal>>(`${this.baseUrl}/${id}`);
    return response.data.data;
  }

  async create(payload: ClientGoalFormData): Promise<ClientGoal> {
    const response = await api.post<ApiEnvelope<ClientGoal>>(this.baseUrl, {
      marketing_client_goal: payload,
    });
    return response.data.data;
  }

  async update(id: string, payload: ClientGoalFormData): Promise<ClientGoal> {
    const response = await api.put<ApiEnvelope<ClientGoal>>(`${this.baseUrl}/${id}`, {
      marketing_client_goal: payload,
    });
    return response.data.data;
  }

  async remove(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }
}

export const clientGoalsService = new ClientGoalsService();
