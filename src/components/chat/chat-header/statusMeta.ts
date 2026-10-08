// Cores/labels EXATOS do protótipo de referência (Melhorias CRM Chat §3.2) —
// não são as classes Tailwind genéricas usadas em outros lugares do CRM.
// Compartilhado entre ConversationStatusButton (botão de ação) e o pill de
// status no ChatHeader — a paleta precisa bater entre os dois.
export const STATUS_META: Record<string, { color: string; dark: string; label: string }> = {
  pending: { color: '#C77D14', dark: '#A9670F', label: 'Pendente' },
  open: { color: '#2563C9', dark: '#1E52A8', label: 'Atendimento em Aberto' },
  resolved: { color: '#359558', dark: '#2C834E', label: 'Atendimento concluído' },
  snoozed: { color: '#6B7280', dark: '#565C64', label: 'Conversa pausada' },
};

// Pastel pill version of the same palette. Only `pending` is pixel-exact to the
// prototype; the others are hand-derived, and the prototype has no dark theme.
export const STATUS_PILL_CLASSES: Record<string, string> = {
  pending: 'bg-[#FDF3E3] border-[#E7B45C] text-[#C77D14] dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300',
  open: 'bg-[#E7EFFB] border-[#8CAEE0] text-[#2563C9] dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-300',
  resolved: 'bg-[#E6F3EA] border-[#8FC5A2] text-[#359558] dark:bg-green-950/40 dark:border-green-700 dark:text-green-300',
  snoozed: 'bg-[#EEF0F2] border-[#B8BFC7] text-[#6B7280] dark:bg-muted dark:border-border dark:text-muted-foreground',
};
