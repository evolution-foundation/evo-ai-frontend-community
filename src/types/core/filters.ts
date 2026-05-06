export interface FilterOperatorType {
  key: string;
  label: string;
  value?: string;
}

export interface FilterType {
  attributeKey: string;
  attributeI18nKey: string;
  inputType: 'plain_text' | 'date' | 'search_select' | 'number';
  dataType: 'text' | 'number' | 'date';
  filterOperators: FilterOperatorType[];
  attribute_type: 'standard' | 'custom';
  attributeModel?: string;
  options?: Array<{ label: string; value: string | number }>;
}

// Interface base para filtros (genérica)
export interface BaseFilter {
  attributeKey: string;
  filterOperator: string;
  values: string | number | Array<string | number>;
  queryOperator: 'and' | 'or';
  attributeModel: 'standard' | 'custom';
}

export interface AppliedFilter {
  id: string;
  label: string;
  value: string | number;
  onRemove: () => void;
}

// Operadores de filtro padrão
export const OPERATOR_TYPES_1: FilterOperatorType[] = [
  { key: 'equal_to', label: 'filter.operators.equal_to', value: 'equal_to' },
  { key: 'not_equal_to', label: 'filter.operators.not_equal_to', value: 'not_equal_to' },
];

export const OPERATOR_TYPES_3: FilterOperatorType[] = [
  { key: 'equal_to', label: 'filter.operators.equal_to', value: 'equal_to' },
  { key: 'not_equal_to', label: 'filter.operators.not_equal_to', value: 'not_equal_to' },
  { key: 'contains', label: 'filter.operators.contains', value: 'contains' },
  { key: 'does_not_contain', label: 'filter.operators.does_not_contain', value: 'does_not_contain' },
];

export const OPERATOR_TYPES_5: FilterOperatorType[] = [
  { key: 'equal_to', label: 'filter.operators.equal_to', value: 'equal_to' },
  { key: 'not_equal_to', label: 'filter.operators.not_equal_to', value: 'not_equal_to' },
  { key: 'contains', label: 'filter.operators.contains', value: 'contains' },
  { key: 'does_not_contain', label: 'filter.operators.does_not_contain', value: 'does_not_contain' },
  { key: 'is_present', label: 'filter.operators.is_present', value: 'is_present' },
  { key: 'is_not_present', label: 'filter.operators.is_not_present', value: 'is_not_present' },
];

// Tipos de filtro para contatos
export const CONTACT_FILTER_TYPES: FilterType[] = [
  {
    attributeKey: 'name',
    attributeI18nKey: 'filter.attributes.name',
    inputType: 'plain_text',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_1,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'email',
    attributeI18nKey: 'filter.attributes.email',
    inputType: 'plain_text',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_3,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'phone_number',
    attributeI18nKey: 'filter.attributes.phone_number',
    inputType: 'plain_text',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_3,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'identifier',
    attributeI18nKey: 'filter.attributes.identifier',
    inputType: 'plain_text',
    dataType: 'number',
    filterOperators: OPERATOR_TYPES_1,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'created_at',
    attributeI18nKey: 'filter.attributes.created_at',
    inputType: 'date',
    dataType: 'date',
    filterOperators: OPERATOR_TYPES_5,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'last_activity_at',
    attributeI18nKey: 'filter.attributes.last_activity_at',
    inputType: 'date',
    dataType: 'date',
    filterOperators: OPERATOR_TYPES_5,
    attribute_type: 'standard',
  },
];

// Filtro padrão genérico
export const DEFAULT_BASE_FILTER: BaseFilter = {
  attributeKey: 'name',
  filterOperator: 'equal_to',
  values: '',
  queryOperator: 'and',
  attributeModel: 'standard',
};

export const DEFAULT_CONTACT_FILTER: BaseFilter = {
  ...DEFAULT_BASE_FILTER,
  attributeKey: 'name',
};

// Tipos de filtro para servidores MCP
export const MCP_SERVER_FILTER_TYPES: FilterType[] = [
  {
    attributeKey: 'name',
    attributeI18nKey: 'Nome',
    inputType: 'plain_text',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_3,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'description',
    attributeI18nKey: 'Descrição',
    inputType: 'plain_text',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_3,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'type',
    attributeI18nKey: 'Tipo',
    inputType: 'search_select',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_1,
    attribute_type: 'standard',
    options: [
      { label: 'Oficial', value: 'official' },
      { label: 'Comunidade', value: 'community' },
    ],
  },
  {
    attributeKey: 'config_type',
    attributeI18nKey: 'Tipo de Configuração',
    inputType: 'search_select',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_1,
    attribute_type: 'standard',
    options: [
      { label: 'SSE', value: 'sse' },
      { label: 'OAuth', value: 'oauth' },
      { label: 'Webhook', value: 'webhook' },
      { label: 'Basic Auth', value: 'basic_auth' },
      { label: 'Credentials', value: 'credentials' },
    ],
  },
  {
    attributeKey: 'created_at',
    attributeI18nKey: 'Data de Criação',
    inputType: 'date',
    dataType: 'date',
    filterOperators: OPERATOR_TYPES_5,
    attribute_type: 'standard',
  },
];

export const DEFAULT_MCP_SERVER_FILTER: BaseFilter = {
  ...DEFAULT_BASE_FILTER,
  attributeKey: 'name',
};

// Tipos de filtro para servidores MCP personalizados
export const CUSTOM_MCP_SERVER_FILTER_TYPES: FilterType[] = [
  {
    attributeKey: 'name',
    attributeI18nKey: 'Nome',
    inputType: 'plain_text',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_3,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'description',
    attributeI18nKey: 'Descrição',
    inputType: 'plain_text',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_3,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'url',
    attributeI18nKey: 'URL',
    inputType: 'plain_text',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_3,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'timeout',
    attributeI18nKey: 'Timeout',
    inputType: 'number',
    dataType: 'number',
    filterOperators: OPERATOR_TYPES_1,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'tags',
    attributeI18nKey: 'Tags',
    inputType: 'plain_text',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_3,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'created_at',
    attributeI18nKey: 'Data de Criação',
    inputType: 'date',
    dataType: 'date',
    filterOperators: OPERATOR_TYPES_5,
    attribute_type: 'standard',
  },
];

export const DEFAULT_CUSTOM_MCP_SERVER_FILTER: BaseFilter = {
  ...DEFAULT_BASE_FILTER,
  attributeKey: 'name',
};

// Tipos de filtro para ferramentas
export const TOOL_FILTER_TYPES: FilterType[] = [
  {
    attributeKey: 'name',
    attributeI18nKey: 'Nome',
    inputType: 'plain_text',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_3,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'description',
    attributeI18nKey: 'Descrição',
    inputType: 'plain_text',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_3,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'tags',
    attributeI18nKey: 'Tags',
    inputType: 'plain_text',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_3,
    attribute_type: 'standard',
  },
];

export const DEFAULT_TOOL_FILTER: BaseFilter = {
  ...DEFAULT_BASE_FILTER,
  attributeKey: 'name',
};

// Tipos de filtro para ferramentas personalizadas
export const CUSTOM_TOOL_FILTER_TYPES: FilterType[] = [
  {
    attributeKey: 'name',
    attributeI18nKey: 'Nome',
    inputType: 'plain_text',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_3,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'description',
    attributeI18nKey: 'Descrição',
    inputType: 'plain_text',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_3,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'method',
    attributeI18nKey: 'Método HTTP',
    inputType: 'search_select',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_1,
    attribute_type: 'standard',
    options: [
      { label: 'GET', value: 'GET' },
      { label: 'POST', value: 'POST' },
      { label: 'PUT', value: 'PUT' },
      { label: 'DELETE', value: 'DELETE' },
      { label: 'PATCH', value: 'PATCH' },
      { label: 'HEAD', value: 'HEAD' },
      { label: 'OPTIONS', value: 'OPTIONS' },
    ],
  },
  {
    attributeKey: 'endpoint',
    attributeI18nKey: 'Endpoint',
    inputType: 'plain_text',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_3,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'tags',
    attributeI18nKey: 'Tags',
    inputType: 'plain_text',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_3,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'created_at',
    attributeI18nKey: 'Data de Criação',
    inputType: 'date',
    dataType: 'date',
    filterOperators: OPERATOR_TYPES_5,
    attribute_type: 'standard',
  },
];

export const DEFAULT_CUSTOM_TOOL_FILTER: BaseFilter = {
  ...DEFAULT_BASE_FILTER,
  attributeKey: 'name',
};

// Tipos de filtro para conversas
export const CONVERSATION_FILTER_TYPES: FilterType[] = [
  {
    attributeKey: 'status',
    attributeI18nKey: 'conversationsFilter.attributes.status',
    inputType: 'search_select',
    dataType: 'text',
    filterOperators: [{ key: 'equal_to', label: 'conversationsFilter.operators.equal_to', value: 'equal_to' }],
    attribute_type: 'standard',
    options: [
      { label: 'conversationsFilter.options.status.all', value: 'all' },
      { label: 'conversationsFilter.options.status.open', value: 'open' },
      { label: 'conversationsFilter.options.status.resolved', value: 'resolved' },
      { label: 'conversationsFilter.options.status.pending', value: 'pending' },
      { label: 'conversationsFilter.options.status.snoozed', value: 'snoozed' },
    ],
  },
  {
    attributeKey: 'assignee_type',
    attributeI18nKey: 'conversationsFilter.attributes.assignee_type',
    inputType: 'search_select',
    dataType: 'text',
    filterOperators: [{ key: 'equal_to', label: 'conversationsFilter.operators.equal_to', value: 'equal_to' }],
    attribute_type: 'standard',
    options: [
      { label: 'conversationsFilter.options.assignee_type.me', value: 'me' },
      { label: 'conversationsFilter.options.assignee_type.assigned', value: 'assigned' },
      { label: 'conversationsFilter.options.assignee_type.unassigned', value: 'unassigned' },
      { label: 'conversationsFilter.options.assignee_type.all', value: 'all' },
    ],
  },
  {
    attributeKey: 'inbox_id',
    attributeI18nKey: 'conversationsFilter.attributes.inbox_id',
    inputType: 'search_select',
    dataType: 'text',
    filterOperators: [{ key: 'equal_to', label: 'conversationsFilter.operators.equal_to', value: 'equal_to' }],
    attribute_type: 'standard',
    options: [], // Will be populated dynamically
  },
  {
    attributeKey: 'channel_type',
    attributeI18nKey: 'conversationsFilter.attributes.channel_type',
    inputType: 'search_select',
    dataType: 'text',
    filterOperators: [{ key: 'equal_to', label: 'conversationsFilter.operators.equal_to', value: 'equal_to' }],
    attribute_type: 'standard',
    options: [
      { label: 'conversationsFilter.options.channel_type.whatsapp', value: 'Channel::Whatsapp' },
      { label: 'conversationsFilter.options.channel_type.email', value: 'Channel::Email' },
      { label: 'conversationsFilter.options.channel_type.web_widget', value: 'Channel::WebWidget' },
      { label: 'conversationsFilter.options.channel_type.facebook', value: 'Channel::FacebookPage' },
      { label: 'conversationsFilter.options.channel_type.instagram', value: 'Channel::Instagram' },
      { label: 'conversationsFilter.options.channel_type.telegram', value: 'Channel::Telegram' },
      { label: 'conversationsFilter.options.channel_type.line', value: 'Channel::Line' },
      { label: 'conversationsFilter.options.channel_type.api', value: 'Channel::Api' },
      { label: 'conversationsFilter.options.channel_type.sms', value: 'Channel::Sms' },
      { label: 'conversationsFilter.options.channel_type.twilio', value: 'Channel::TwilioSms' },
      { label: 'conversationsFilter.options.channel_type.twitter', value: 'Channel::TwitterProfile' },
    ],
  },
  {
    attributeKey: 'team_id',
    attributeI18nKey: 'conversationsFilter.attributes.team_id',
    inputType: 'search_select',
    dataType: 'text',
    filterOperators: [{ key: 'equal_to', label: 'conversationsFilter.operators.equal_to', value: 'equal_to' }],
    attribute_type: 'standard',
    options: [], // Will be populated dynamically
  },
  {
    attributeKey: 'labels',
    attributeI18nKey: 'conversationsFilter.attributes.labels',
    inputType: 'search_select',
    dataType: 'text',
    filterOperators: [
      { key: 'equal_to', label: 'conversationsFilter.operators.contains', value: 'equal_to' },
      { key: 'not_equal_to', label: 'conversationsFilter.operators.not_equal_to', value: 'not_equal_to' },
      { key: 'is_present', label: 'conversationsFilter.operators.is_present', value: 'is_present' },
      { key: 'is_not_present', label: 'conversationsFilter.operators.is_not_present', value: 'is_not_present' },
    ],
    attribute_type: 'standard',
    options: [], // Will be populated dynamically
  },
  {
    attributeKey: 'created_at',
    attributeI18nKey: 'conversationsFilter.attributes.created_at',
    inputType: 'date',
    dataType: 'date',
    filterOperators: [
      { key: 'is_greater_than', label: 'conversationsFilter.operators.is_greater_than', value: 'is_greater_than' },
      { key: 'is_less_than', label: 'conversationsFilter.operators.is_less_than', value: 'is_less_than' },
      { key: 'days_before', label: 'conversationsFilter.operators.days_before', value: 'days_before' },
    ],
    attribute_type: 'standard',
    options: [],
  },
  {
    attributeKey: 'last_activity_at',
    attributeI18nKey: 'conversationsFilter.attributes.last_activity_at',
    inputType: 'date',
    dataType: 'date',
    filterOperators: [
      { key: 'is_greater_than', label: 'conversationsFilter.operators.is_greater_than', value: 'is_greater_than' },
      { key: 'is_less_than', label: 'conversationsFilter.operators.is_less_than', value: 'is_less_than' },
      { key: 'days_before', label: 'conversationsFilter.operators.days_before', value: 'days_before' },
    ],
    attribute_type: 'standard',
    options: [],
  },
  {
    attributeKey: 'priority',
    attributeI18nKey: 'conversationsFilter.attributes.priority',
    inputType: 'search_select',
    dataType: 'text',
    filterOperators: [
      { key: 'equal_to', label: 'conversationsFilter.operators.equal_to', value: 'equal_to' },
      { key: 'not_equal_to', label: 'conversationsFilter.operators.not_equal_to', value: 'not_equal_to' },
    ],
    attribute_type: 'standard',
    options: [
      { label: 'conversationsFilter.options.priority.low', value: 'low' },
      { label: 'conversationsFilter.options.priority.medium', value: 'medium' },
      { label: 'conversationsFilter.options.priority.high', value: 'high' },
      { label: 'conversationsFilter.options.priority.urgent', value: 'urgent' },
    ],
  },
  {
    attributeKey: 'pipeline_id',
    attributeI18nKey: 'conversationsFilter.attributes.pipeline_id',
    inputType: 'search_select',
    dataType: 'text',
    filterOperators: [
      { key: 'equal_to', label: 'conversationsFilter.operators.equal_to', value: 'equal_to' },
      { key: 'not_equal_to', label: 'conversationsFilter.operators.not_equal_to', value: 'not_equal_to' },
      { key: 'is_present', label: 'conversationsFilter.operators.is_present', value: 'is_present' },
      { key: 'is_not_present', label: 'conversationsFilter.operators.is_not_present', value: 'is_not_present' },
    ],
    attribute_type: 'standard',
    options: [], // Will be populated dynamically
  },
  {
    attributeKey: 'contact_id',
    attributeI18nKey: 'conversationsFilter.attributes.contact_id',
    inputType: 'search_select',
    dataType: 'text',
    filterOperators: [
      { key: 'equal_to', label: 'conversationsFilter.operators.equal_to', value: 'equal_to' },
      { key: 'not_equal_to', label: 'conversationsFilter.operators.not_equal_to', value: 'not_equal_to' },
      { key: 'is_present', label: 'conversationsFilter.operators.is_present', value: 'is_present' },
      { key: 'is_not_present', label: 'conversationsFilter.operators.is_not_present', value: 'is_not_present' },
    ],
    attribute_type: 'standard',
    options: [], // Will be populated dynamically from the first 100 contacts by last_activity_at
  },
  // Removido temporariamente: API GET não suporta filtro por priority
  // {
  //   attributeKey: 'priority',
  //   attributeI18nKey: 'Prioridade',
  //   inputType: 'search_select',
  //   dataType: 'text',
  //   filterOperators: OPERATOR_TYPES_1,
  //   attribute_type: 'standard',
  //   options: [
  //     { label: 'Baixa', value: 'low' },
  //     { label: 'Média', value: 'medium' },
  //     { label: 'Alta', value: 'high' },
  //     { label: 'Urgente', value: 'urgent' },
  //   ],
  // },
  // Removidos temporariamente: filtros de data requerem POST /filter
  // {
  //   attributeKey: 'created_at',
  //   attributeI18nKey: 'Data de Criação',
  //   inputType: 'date',
  //   dataType: 'date',
  //   filterOperators: OPERATOR_TYPES_5,
  //   attribute_type: 'standard',
  // },
  // {
  //   attributeKey: 'last_activity_at',
  //   attributeI18nKey: 'Última Atividade',
  //   inputType: 'date',
  //   dataType: 'date',
  //   filterOperators: OPERATOR_TYPES_5,
  //   attribute_type: 'standard',
  // },
];

export const DEFAULT_CONVERSATION_FILTER: BaseFilter = {
  ...DEFAULT_BASE_FILTER,
  attributeKey: 'status',
  filterOperator: 'equal_to',
  values: 'open',
};
