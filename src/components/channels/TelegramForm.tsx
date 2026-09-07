import React, { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, Button, Input, Skeleton } from '@evoapi/design-system';
import { MessageSquare, Key, Shield, Bot } from 'lucide-react';
import InboxesService from '@/services/channels/inboxesService';
import type { TelegramChannelPayload } from '@/types/channels/inbox';
import { useLanguage } from '@/hooks/useLanguage';

interface TelegramFormProps {
  onSuccess: (channelId: string) => void;
  onBack: () => void;
}

const TelegramForm: React.FC<TelegramFormProps> = ({ onSuccess, onBack }) => {
  const { t } = useLanguage('channels');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bot_token: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) {
      newErrors.name = t("telegram:validation.nameRequired");
    }

    if (!formData.bot_token) {
      newErrors.bot_token = t("telegram:validation.botTokenRequired");
    } else if (!formData.bot_token.match(/^\d+:[a-zA-Z0-9_-]+$/)) {
      newErrors.bot_token = t("telegram:validation.botTokenFormat");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error(t("telegram:validation.fillAllFields"));
      return;
    }

    setIsLoading(true);
    try {
      const payload: TelegramChannelPayload = {
        name: formData.name,
        channel: {
          type: 'telegram',
          bot_token: formData.bot_token,
        },
      };

      const result = await InboxesService.create(payload);
      toast.success(t("telegram:success.created"));
      onSuccess(result.data.id);
    } catch (error) {
      console.error('Erro ao criar canal Telegram:', error);
      toast.error(t("telegram:errors.createError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          ← {t("telegram:backButton")}
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t("telegram:title")}</h1>
          <p className="text-muted-foreground">{t("telegram:description")}</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                {t("telegram:fields.basicInfo")}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t("telegram:fields.name.label")} *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={t("telegram:fields.name.placeholder")}
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && <p className="text-destructive text-sm mt-1">{errors.name}</p>}
                </div>
              </div>
            </div>

            {/* Bot Configuration */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Bot className="h-5 w-5 mr-2" />
                {t("telegram:fields.botConfiguration")}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t("telegram:fields.botToken.label")} *
                  </label>
                  <Input
                    type="password"
                    value={formData.bot_token}
                    onChange={e => setFormData(prev => ({ ...prev, bot_token: e.target.value }))}
                    placeholder={t("telegram:fields.botToken.placeholder")}
                    className={errors.bot_token ? 'border-destructive' : ''}
                  />
                  {errors.bot_token && (
                    <p className="text-destructive text-sm mt-1">{errors.bot_token}</p>
                  )}
                  <p className="text-muted-foreground text-xs mt-1">
                    {t("telegram:fields.botToken.helpText")}
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                {t("telegram:instructions.title")}
              </h4>
              <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                <p>{t("telegram:instructions.step1")}</p>
                <p>{t("telegram:instructions.step2")}</p>
                <p>{t("telegram:instructions.step3")}</p>
                <p>{t("telegram:instructions.step4")}</p>
                <p>{t("telegram:instructions.step5")}</p>
                <p>{t("telegram:instructions.step6")}</p>
              </div>
            </div>

            {/* Webhook Info */}
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center">
                <Key className="h-4 w-4 mr-2" />
                {t("telegram:webhook.title")}
              </h4>
              <div className="text-sm text-green-800 dark:text-green-200 space-y-2">
                <p>{t("telegram:webhook.description")}</p>
                <code className="block bg-green-100 dark:bg-green-900/50 p-2 rounded mt-1">
                  {window.location.origin}/api/v1/webhooks/telegram
                </code>
                <p>{t("telegram:webhook.note")}</p>
              </div>
            </div>

            {/* Bot Commands */}
            <div className="bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {t("telegram:commands.title")}
              </h4>
              <div className="text-sm text-gray-800 dark:text-gray-200 space-y-1">
                <p>{t("telegram:commands.description")}</p>
                <code className="block bg-gray-100 dark:bg-gray-900/50 p-2 rounded mt-1 whitespace-pre-line">
                  {t("telegram:commands.list")}
                </code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isLoading} size="lg">
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-4 mr-2" />
              {t("telegram:creating")}
            </>
          ) : (
            t("telegram:createButton")
          )}
        </Button>
      </div>
    </div>
  );
};

export default TelegramForm;
