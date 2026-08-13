// Maps known WhatsApp/provider delivery errors (message.content_attributes.external_error)
// to a plain-language explanation a non-technical agent can act on. Codes are the
// documented Meta WhatsApp Cloud API error codes most likely to show up here; the
// substring patterns cover the other providers (Evolution Go, Z-API) which return
// free-form text instead of a numeric code.
const WHATSAPP_ERROR_MESSAGES: Record<string, string> = {
  '131026': 'O número não tem WhatsApp ativo ou não pôde ser alcançado.',
  '131047': 'Fora da janela de 24h de resposta — só é possível enviar um template aprovado pra esse contato.',
  '131053': 'Falha ao enviar o arquivo/mídia anexado.',
  '131056': 'Limite de mensagens pra esse número foi atingido — tente novamente mais tarde.',
  '132000': 'O template usado não bate com os parâmetros esperados.',
  '132001': 'Esse template não existe ou ainda não foi aprovado.',
  '133010': 'O canal não está registrado corretamente — verifique a conexão do WhatsApp em Configurações.',
  '190': 'A sessão do canal expirou — reconecte o WhatsApp em Configurações.',
};

const PATTERN_MESSAGES: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /not registered on whatsapp/i, message: 'O número não tem WhatsApp ativo ou não pôde ser alcançado.' },
  { pattern: /rate.?limit/i, message: 'Limite de mensagens pra esse número foi atingido — tente novamente mais tarde.' },
];

// Returns a friendly explanation when the error is recognized, or undefined when it
// isn't — callers should fall back to showing the raw error rather than guessing.
export const getFriendlyDeliveryError = (externalError?: string): string | undefined => {
  if (!externalError) return undefined;

  // Anchored to the start ("131026: Message undeliverable") so we don't accidentally
  // match an unrelated number (HTTP status, phone number...) buried later in the string.
  const codeMatch = externalError.match(/^(\d{3,})\s*:/);
  if (codeMatch && WHATSAPP_ERROR_MESSAGES[codeMatch[1]]) {
    return WHATSAPP_ERROR_MESSAGES[codeMatch[1]];
  }

  const patternMatch = PATTERN_MESSAGES.find(({ pattern }) => pattern.test(externalError));
  return patternMatch?.message;
};
