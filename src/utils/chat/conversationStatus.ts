import i18n from '@/i18n/config';
/**
 * Utilitário para traduzir e formatar status de conversas
 */

export type ConversationStatus = 'open' | 'resolved' | 'pending' | 'snoozed';

export interface StatusConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
}

// Assinatura solta (não `(key, fallback?) => string`) porque o `t` retornado por
// useTranslation/useLanguage é tipado como TFunction do i18next (overloads com
// tipo de retorno genérico `string | object` conforme os options), incompatível
// estruturalmente com uma assinatura estrita de 2 string args / retorno string.
type Translate = (...args: any[]) => any;

/** Resolve labels at call time, including callers outside React. */
export const getStatusLabel = (status: string, t: Translate = i18n.getFixedT(null, 'chat')): string => {
  return ['open', 'resolved', 'pending', 'snoozed'].includes(status)
    ? t(`contexts.conversations.statusNames.${status}`)
    : t('conversationStatusIcon.unknown.label');
};

/**
 * Retorna configuração completa do status (label, cores, etc.)
 *
 * Cores seguem o fluxo operacional: pending=âmbar (precisa agir) →
 * open=azul (em atendimento) → resolved=verde (concluído) e
 * snoozed=cinza (pausado, neutro).
 */
export const getStatusConfig = (status: string, t: Translate = i18n.getFixedT(null, 'chat')): StatusConfig => {
  const configs: Record<string, StatusConfig> = {
    open: {
      label: getStatusLabel('open', t),
      description: t('conversationStatusIcon.open.description'),
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    pending: {
      label: getStatusLabel('pending', t),
      description: t('conversationStatusIcon.pending.description'),
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    resolved: {
      label: getStatusLabel('resolved', t),
      description: t('conversationStatusIcon.resolved.description'),
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    snoozed: {
      label: getStatusLabel('snoozed', t),
      description: t('conversationStatusIcon.snoozed.description'),
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
  };

  return (
    configs[status] || {
      label: t('conversationStatusIcon.unknown.label'),
      description: t('conversationStatusIcon.unknown.description'),
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    }
  );
};

/**
 * Verifica se o status indica que a conversa está ativa
 */
export const isActiveStatus = (status: string): boolean => {
  return status === 'open';
};

/**
 * Verifica se o status indica que a conversa está pendente
 */
export const isPendingStatus = (status: string): boolean => {
  return status === 'pending';
};
