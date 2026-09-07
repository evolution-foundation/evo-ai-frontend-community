import i18n from '@/i18n/config';
import { BaseFilter, FilterType, OPERATOR_TYPES_1, OPERATOR_TYPES_3, OPERATOR_TYPES_5 } from '@/types/core';


// Tipos de filtro para usuários
export const USER_FILTER_TYPES: FilterType[] = [
  {
    attributeKey: 'name',
    attributeI18nKey: "roles:table.name",
    inputType: 'plain_text',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_3,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'email',
    attributeI18nKey: 'common:filterFields.email',
    inputType: 'plain_text',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_3,
    attribute_type: 'standard',
  },
  {
    attributeKey: 'role',
    attributeI18nKey: "users:card.role",
    inputType: 'search_select',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_1,
    attribute_type: 'standard',
    options: [
      { get label() { return i18n.t("integrations:oauth.modal.presets.admin"); }, value: 'administrator' },
      { get label() { return i18n.t("aiAgents:wizard.step3.taskConfig.agentLabel"); }, value: 'agent' },
    ],
  },
  {
    attributeKey: 'availability_status',
    attributeI18nKey: 'common:filterFields.availability',
    inputType: 'search_select',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_1,
    attribute_type: 'standard',
    options: [
      { label: 'Online', value: 'online' },
      { get label() { return i18n.t("users:details.status.busy"); }, value: 'busy' },
      { label: 'Offline', value: 'offline' },
    ],
  },
  {
    attributeKey: 'confirmed',
    attributeI18nKey: "interface:usersFilters.confirmationStatus",
    inputType: 'search_select',
    dataType: 'text',
    filterOperators: OPERATOR_TYPES_1,
    attribute_type: 'standard',
    options: [
      { get label() { return i18n.t("users:table.columns.confirmed"); }, value: 'true' },
      { get label() { return i18n.t("common:base.status.pending"); }, value: 'false' },
    ],
  },
  {
    attributeKey: 'created_at',
    attributeI18nKey: "contacts:export.fields.createdAt",
    inputType: 'date',
    dataType: 'date',
    filterOperators: OPERATOR_TYPES_5,
    attribute_type: 'standard',
  },
];

// Filtro padrão para usuários
export const DEFAULT_USER_FILTER: BaseFilter = {
  attributeKey: 'name',
  filterOperator: 'equal_to',
  values: '',
  queryOperator: 'and',
  attributeModel: 'standard',
};
