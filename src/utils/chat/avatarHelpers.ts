import type { CSSProperties } from 'react';
import { Contact } from '@/types/chat/api';

// Tipo genérico para qualquer contato com avatar
interface AvatarContact {
  avatar_url?: string | null;
  avatar?: string | null;
  thumbnail?: string | null; // Para compatibilidade com sistema de contatos
}

/**
 * Constrói a URL completa para o avatar de um contato
 * Prioriza avatar_url (URL completa) sobre avatar (path relativo)
 * Compatível com diferentes tipos de contato (Chat e Contacts)
 */
export const getContactAvatarUrl = (
  contact: Contact | AvatarContact | null | undefined,
): string | undefined => {
  if (!contact) return undefined;

  // Priorizar avatar_url (URL completa da API)
  if (contact.avatar_url) {
    return contact.avatar_url;
  }

  // Fallback para thumbnail (usado no sistema de contatos)
  if ('thumbnail' in contact && contact.thumbnail) {
    return contact.thumbnail;
  }

  // Fallback para avatar (pode ser um path relativo)
  if (contact.avatar) {
    // Se avatar já é uma URL completa, usar diretamente
    if (contact.avatar.startsWith('http') || contact.avatar.startsWith('//')) {
      return contact.avatar;
    }

    // Se começa com /, assumir que é um path absoluto no servidor
    if (contact.avatar.startsWith('/')) {
      return contact.avatar;
    }

    // Se não tem protocolo nem barra, assumir que é um path relativo
    // Construir URL baseada na estrutura típica do Evolution
    return `/uploads/${contact.avatar}`;
  }

  return undefined;
};

const PHONE_LIKE = /^\+?[\d\s().-]{7,}$/;
const EMAIL_LIKE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Nome provisório: vazio, número de telefone ou e-mail (ainda sem o nome real). */
export const isPlaceholderContactName = (name: string | null | undefined): boolean => {
  const value = (name || '').trim();
  return !value || PHONE_LIKE.test(value) || EMAIL_LIKE.test(value);
};

const formatPhoneName = (digits: string): string => {
  // Números brasileiros: +55 21 97380-1603; demais: apenas com "+"
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    const area = digits.slice(2, 4);
    const rest = digits.slice(4);
    const cut = rest.length - 4;
    return `+55 ${area} ${rest.slice(0, cut)}-${rest.slice(cut)}`;
  }
  return `+${digits}`;
};

/**
 * Nome para exibição: se o nome ainda é provisório, apresenta-o de forma legível
 * (telefone formatado; e-mail pela parte antes do "@", com a primeira letra maiúscula).
 */
export const getContactDisplayName = (name: string | null | undefined): string => {
  const value = (name || '').trim();
  if (!value) return '';
  if (EMAIL_LIKE.test(value)) {
    const local = value.split('@')[0].replace(/[._-]+/g, ' ').trim();
    return local ? local.charAt(0).toUpperCase() + local.slice(1) : value;
  }
  if (PHONE_LIKE.test(value)) {
    const digits = value.replace(/\D/g, '');
    return digits ? formatPhoneName(digits) : value;
  }
  return value;
};

/**
 * Obtém as iniciais do nome de um contato
 * Retorna até 2 caracteres (primeira letra do primeiro e último nome).
 * Telefone/e-mail não geram iniciais (retorna vazio) para não exibir "+" ou "5".
 */
export const getContactInitials = (name: string | null | undefined): string => {
  if (!name || PHONE_LIKE.test(name.trim())) return '';

  const words = getContactDisplayName(name)
    .split(/\s+/)
    .map(word => word.replace(/^[^\p{L}\p{N}]+/u, ''))
    .filter(word => word.length > 0);
  if (words.length === 0) return '';

  if (words.length === 1) {
    return Array.from(words[0])[0].toUpperCase();
  }

  return (Array.from(words[0])[0] + Array.from(words[words.length - 1])[0]).toUpperCase();
};

/**
 * Matiz estável por nome (mesmo nome => mesma cor). Devolve a variável CSS `--av-h`
 * para a classe `.av-hue` (globals.css), que escolhe fundo/texto legíveis no tema
 * claro e no escuro. Nome provisório (telefone/e-mail) não recebe cor.
 */
export const getContactAvatarStyle = (
  name: string | null | undefined,
): CSSProperties | undefined => {
  if (isPlaceholderContactName(name)) return undefined;
  let hash = 0;
  for (const char of (name as string).trim().toLowerCase()) {
    hash = (hash * 31 + char.codePointAt(0)!) | 0;
  }
  return { '--av-h': Math.abs(hash) % 360 } as CSSProperties;
};

/**
 * Verifica se uma URL de avatar é válida
 * Útil para validar antes de fazer requests
 */
export const isValidAvatarUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;

  try {
    // Verificar se é uma URL válida
    new URL(url, window.location.origin);
    return true;
  } catch {
    // Se não é uma URL válida, verificar se é um path válido
    return url.startsWith('/') || url.startsWith('./') || !url.includes(' ');
  }
};

/**
 * Gera uma cor de fundo baseada no nome do contato
 * Útil para criar avatars coloridos consistentes
 */
export const getContactAvatarColor = (name: string | null | undefined): string => {
  if (!name) return 'bg-primary/10';

  // Cores baseadas no hash do nome
  const colors = [
    'bg-red-100 text-red-600',
    'bg-blue-100 text-blue-600',
    'bg-green-100 text-green-600',
    'bg-yellow-100 text-yellow-600',
    'bg-purple-100 text-purple-600',
    'bg-pink-100 text-pink-600',
    'bg-indigo-100 text-indigo-600',
    'bg-teal-100 text-teal-600',
  ];

  // Gerar hash simples do nome
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Usar hash para selecionar cor
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};
