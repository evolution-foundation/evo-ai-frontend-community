import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import FacebookModerationService from '@/services/channels/facebookModerationService';
import { FacebookCommentModeration } from '@/types/channels/inbox';

interface UseConversationModerationsProps {
  conversationId: string | null;
  enabled?: boolean;
}

export function useConversationModerations({
  conversationId,
  enabled = true,
}: UseConversationModerationsProps) {
  const { t: tUi } = useUiTranslation();
  const LAST_LOAD_WINDOW_MS = 15_000;
  const [moderations, setModerations] = useState<FacebookCommentModeration[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const lastLoadedRef = useRef<{ conversationId: string; loadedAt: number } | null>(null);

  const messageModerationsMap = useMemo(() => {
    const map = new Map<string, FacebookCommentModeration>();

    moderations.forEach(moderation => {
      if (moderation.message_id) {
        map.set(moderation.message_id, moderation);
      }
    });

    return map;
  }, [moderations]);

  const loadModerations = useCallback(async (force = false) => {
    if (!conversationId || !enabled) {
      setModerations([]);
      return;
    }

    const now = Date.now();
    const lastLoaded = lastLoadedRef.current;
    if (
      !force &&
      lastLoaded &&
      lastLoaded.conversationId === conversationId &&
      now - lastLoaded.loadedAt < LAST_LOAD_WINDOW_MS
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await FacebookModerationService.getModerations({
        conversation_id: conversationId,
        pending_only: true,
        page: 1,
        per_page: 50,
      });
      setModerations(response.data || []);
      lastLoadedRef.current = { conversationId, loadedAt: Date.now() };
    } catch (err) {
      console.error('Error loading conversation moderations:', err);
      setError(err instanceof Error ? err : new Error(tUi("interface:useconversationmoderations.couldNotLoadModerations")));
      setModerations([]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, enabled, tUi]);

  useEffect(() => {
    if (enabled && conversationId) {
      loadModerations();
    } else {
      lastLoadedRef.current = null;
      setModerations([]);
    }
  }, [conversationId, enabled, loadModerations]);

  // Get pending response moderations (for approval)
  const pendingResponseModerations = useMemo(() => {
    return moderations.filter(
      m => m.moderation_type === 'response_approval' && m.status === 'pending',
    );
  }, [moderations]);

  // Get moderation for a specific message
  const getModerationForMessage = (messageId: string): FacebookCommentModeration | undefined => {
    return moderations.find(m => m.message_id === messageId);
  };

  // Check if message has pending moderation
  const hasPendingModeration = (messageId: string): boolean => {
    return moderations.some(m => m.message_id === messageId && m.status === 'pending');
  };

  // Check if message was blocked/deleted
  const isMessageBlocked = (messageId: string): boolean => {
    const moderation = moderations.find(m => m.message_id === messageId);
    return (
      moderation !== undefined &&
      moderation.status === 'approved' &&
      (moderation.action_type === 'delete_comment' || moderation.action_type === 'block_user')
    );
  };

  return {
    moderations,
    pendingResponseModerations,
    isLoading,
    error,
    loadModerations,
    getModerationForMessage,
    hasPendingModeration,
    isMessageBlocked,
    messageModerationsMap,
  };
}
