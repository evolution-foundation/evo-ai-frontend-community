import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState, useEffect, useCallback } from 'react';
import { Webhook, WebhookFormData } from '@/types/integrations';
import { webhooksService } from '@/services/integrations';
import { toast } from 'sonner';

interface UseWebhooksOptions {
  autoLoad?: boolean;
}

interface UseWebhooksReturn {
  webhooks: Webhook[];
  loading: boolean;
  error: string | null;
  loadWebhooks: () => Promise<void>;
  createWebhook: (data: WebhookFormData) => Promise<void>;
  updateWebhook: (id: string, data: WebhookFormData) => Promise<void>;
  deleteWebhook: (id: string) => Promise<void>;
  testWebhook: (id: string) => Promise<void>;
  getWebhookById: (id: string) => Webhook | undefined;
}

export function useWebhooks(options: UseWebhooksOptions = {}): UseWebhooksReturn {
  const { t: tUi } = useUiTranslation();
  const { autoLoad = true } = options;
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWebhooks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await webhooksService.getWebhooks();
      setWebhooks(response.data);
    } catch (err) {
      const errorMessage = tUi("integrations:webhooks.messages.loadError");
      setError(errorMessage);
      console.error('Error loading webhooks:', err);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [tUi]);

  const createWebhook = useCallback(
    async (data: WebhookFormData) => {
      try {
        await webhooksService.createWebhook(data);
        toast.success(tUi("integrations:webhooks.messages.createSuccess"));
        await loadWebhooks(); // Reload list
      } catch (err) {
        console.error('Error creating webhook:', err);
        toast.error(tUi("integrations:webhooks.messages.createError"));
        throw err;
      }
    },
    [loadWebhooks, tUi],
  );

  const updateWebhook = useCallback(
    async (id: string, data: WebhookFormData) => {
      try {
        await webhooksService.updateWebhook(id, data);
        toast.success(tUi("integrations:webhooks.messages.updateSuccess"));
        await loadWebhooks(); // Reload list
      } catch (err) {
        console.error('Error updating webhook:', err);
        toast.error(tUi("integrations:webhooks.messages.updateError"));
        throw err;
      }
    },
    [loadWebhooks, tUi],
  );

  const deleteWebhook = useCallback(
    async (id: string) => {
      try {
        await webhooksService.deleteWebhook(id);
        toast.success(tUi("interface:usewebhooks.webhookDeletedSuccessfully"));
        await loadWebhooks(); // Reload list
      } catch (err) {
        console.error('Error deleting webhook:', err);
        toast.error(tUi("interface:usewebhooks.couldNotDeleteWebhook"));
        throw err;
      }
    },
    [loadWebhooks, tUi],
  );

  const testWebhook = useCallback(async (id: string) => {
    try {
      await webhooksService.testWebhook(id);
      toast.success(tUi("integrations:webhooks.messages.testSuccess"));
    } catch (err) {
      console.error('Error testing webhook:', err);
      toast.error(tUi("integrations:webhooks.messages.testError"));
      throw err;
    }
  }, [tUi]);

  const getWebhookById = useCallback(
    (id: string) => {
      return webhooks.find(webhook => webhook.id === id);
    },
    [webhooks],
  );

  useEffect(() => {
    if (autoLoad) {
      loadWebhooks();
    }
  }, [autoLoad, loadWebhooks]);

  return {
    webhooks,
    loading,
    error,
    loadWebhooks,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    getWebhookById,
  };
}
