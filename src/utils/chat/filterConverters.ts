import { toast } from 'sonner';
import { ConversationFilter, ConversationListParams } from '@/types/chat/api';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n/config';

const ADDITIONAL_ATTRIBUTE_KEYS = [
  'browser_language',
  'conversation_language',
  'country_code',
  'referer',
  'mail_subject',
];

// Rewrites assignee_type / assignee_id filter rows so they target the real
// column assignee_id on the backend. The attribute assignee_type exists only
// on the frontend catalog; it needs semantic translation when heading into
// the POST /conversations/filter payload.
const rewriteAssigneeRow = (filter: ConversationFilter): ConversationFilter | null => {
  const { attribute_key, values } = filter;
  if (attribute_key !== 'assignee_type' && attribute_key !== 'assignee_id') {
    return filter;
  }
  const value = Array.isArray(values) ? values[0] : values;

  if (attribute_key === 'assignee_id' && typeof value === 'string' && !['me', 'unassigned', 'assigned', 'all'].includes(value)) {
    return filter;
  }

  switch (value) {
    case 'me': {
      const currentUserId = useAuthStore.getState().currentUser?.id;
      if (!currentUserId) {
        console.warn(
          '[filterConverters] assignee "me" filter dropped: no current user in auth store (session expired?)',
        );
        toast.error(i18n.t('chat:conversationsFilter.errors.assigneeMeNoSession.title'), {
          description: i18n.t('chat:conversationsFilter.errors.assigneeMeNoSession.description'),
        });
        return null;
      }
      return { ...filter, attribute_key: 'assignee_id', filter_operator: 'equal_to', values: [currentUserId] };
    }
    case 'unassigned':
      return { ...filter, attribute_key: 'assignee_id', filter_operator: 'is_not_present', values: [] };
    case 'assigned':
      return { ...filter, attribute_key: 'assignee_id', filter_operator: 'is_present', values: [] };
    case 'all':
      return null;
    default:
      return { ...filter, attribute_key: 'assignee_id' };
  }
};

interface FilterApiItem {
  attribute_key: string;
  filter_operator: string;
  values: unknown[];
  query_operator: string | null;
  custom_attribute_type?: string;
}

/**
 * Converte filtros do modal para o formato da API do CRM Chat (POST /conversations/filter)
 */
export const convertFiltersToApiFormat = (
  filters: ConversationFilter[],
): { filters: FilterApiItem[] } => {
  const rewritten = filters
    .map(rewriteAssigneeRow)
    .filter((f): f is ConversationFilter => f !== null);

  const filterArray: FilterApiItem[] = rewritten.map((filter, index) => {
    const { attribute_key, filter_operator, values } = filter;
    const query_operator =
      index === 0 ? null : (filter.query_operator || 'and').toUpperCase();

    const filterItem: FilterApiItem = {
      attribute_key,
      filter_operator,
      values,
      query_operator,
    };

    if (ADDITIONAL_ATTRIBUTE_KEYS.includes(attribute_key)) {
      filterItem.custom_attribute_type = '';
    }

    return filterItem;
  });

  return { filters: filterArray };
};

/**
 * Converte filtros simples para parâmetros da URL (GET /conversations)
 */
export const convertFiltersToUrlParams = (
  filters: ConversationFilter[],
): ConversationListParams => {
  const params: ConversationListParams = {};

  filters.forEach(filter => {
    const { attribute_key, values } = filter;

    switch (attribute_key) {
      case 'status':
        if (values.length === 1) {
          params.status = values[0] as ConversationListParams['status'];
        }
        break;

      case 'assignee_id':
        if (values.length === 1) {
          const value = values[0];
          if (value === 'me') {
            params.assignee_type = 'me';
          } else if (value === 'unassigned') {
            params.assignee_type = 'unassigned';
          } else {
            params.assignee_id = value as string;
          }
        }
        break;

      case 'inbox_id':
        if (values.length === 1) {
          params.inbox_id = values[0] as string;
        }
        break;

      case 'team_id':
        if (values.length === 1) {
          params.team_id = values[0] as string;
        }
        break;

      case 'labels':
        if (values.length > 0) {
          params.labels = values as string[];
        }
        break;

      // case 'priority': // Não suportado pela API GET
      //   if (values.length === 1) {
      //     params.priority = values[0] as string;
      //   }
      //   break;
    }
  });

  return params;
};

/**
 * Determina se deve usar filtros avançados (POST) ou simples (GET)
 */
export const shouldUseAdvancedFilters = (filters: ConversationFilter[]): boolean => {
  // Sem filtros, GET simples vazio é suficiente.
  if (filters.length === 0) return false;

  // Multi-filtro sempre via POST — GET expressa só AND implícito na URL,
  // e o converter pra URL params não cobre todos os operators/attributes.
  if (filters.length > 1) return true;

  // Operators is_present / is_not_present não têm mapeamento completo no GET
  // path (convertFiltersToUrlParams só trata equal_to), então forçamos POST.
  const hasPresenceOperator = filters.some(f =>
    ['is_present', 'is_not_present'].includes(f.filter_operator),
  );
  if (hasPresenceOperator) return true;

  // Verificar cada filtro individualmente (cenários single-row restantes).
  return filters.some(filter => {
    const { attribute_key, filter_operator } = filter;

    // Operadores complexos que requerem POST
    const complexOperators = [
      'contains',
      'does_not_contain',
      'not_equal_to',
      'is_greater_than',
      'is_less_than',
      'days_before',
    ];

    // Campos complexos que sempre requerem POST
    const complexFields = [
      'created_at',
      'last_activity_at',
      'campaign_id',
      'channel_type',
      'contact_id',
      'priority',
      'pipeline_id',
      'browser_language',
      'conversation_language',
      'country_code',
      'referer',
      'mail_subject',
    ];

    // Se usa operador complexo
    if (complexOperators.includes(filter_operator)) {
      return true;
    }

    // Se usa campo complexo
    if (complexFields.includes(attribute_key)) {
      return true;
    }

    // Para labels, alguns operadores requerem POST
    if (
      attribute_key === 'labels' &&
      ['not_equal_to', 'is_present', 'is_not_present'].includes(filter_operator)
    ) {
      return true;
    }

    // Múltiplos valores no mesmo filtro simples podem usar GET se for apenas equal_to
    // Caso contrário, usar POST para maior flexibilidade
    if (filter.values.length > 1 && filter_operator !== 'equal_to') {
      return true;
    }

    return false;
  });
};

/**
 * Cria filtro de busca por texto
 */
export const createSearchFilter = (searchTerm: string): ConversationListParams => {
  return {
    q: searchTerm.trim(),
  };
};

/**
 * Combina parâmetros de busca com filtros
 */
export const combineSearchWithFilters = (
  searchParams: ConversationListParams,
  filterParams: ConversationListParams,
): ConversationListParams => {
  return {
    ...filterParams,
    ...searchParams,
  };
};
