import { useTranslation as useUiTranslation } from 'react-i18next';
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Textarea,
  Label,
  Button,
  Alert,
  AlertDescription,
} from '@evoapi/design-system';
import { toast } from 'sonner';
import usersService from '@/services/users/usersService';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface BulkInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkInviteModal({ isOpen, onClose, onSuccess }: BulkInviteModalProps) {
  const { t: tUi } = useUiTranslation();
  const { t } = useLanguage('users');
  const [loading, setLoading] = useState(false);
  const [emailsText, setEmailsText] = useState('');
  const [result, setResult] = useState<{
    invited: Array<{ email: string; name: string }>;
    failed: Array<{ email: string; error: string }>;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailsText.trim()) {
      toast.error(t('bulkInvite.messages.enterEmail'));
      return;
    }

    // Extrair emails do texto
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = emailsText.match(emailRegex) || [];

    if (emails.length === 0) {
      toast.error(t('bulkInvite.messages.noValidEmail'));
      return;
    }

    // Remover duplicatas
    const uniqueEmails = [...new Set(emails)];

    setLoading(true);
    try {
      const response = await usersService.bulkInvite({
        emails: uniqueEmails,
      });

      setResult({
        invited: response.invited_users || [],
        failed: response.failed_invitations || [],
      });

      const successCount = response.invited_users?.length || 0;
      const failedCount = response.failed_invitations?.length || 0;

      if (successCount > 0 && failedCount === 0) {
        toast.success(t('bulkInvite.messages.allSuccess', { count: successCount }));
      } else if (successCount > 0 && failedCount > 0) {
        toast.success(t('bulkInvite.messages.partialSuccess', { successCount, failedCount }));
      } else if (failedCount > 0) {
        toast.error(t('bulkInvite.messages.allFailed', { count: failedCount }));
      }
    } catch (error: any) {
      console.error('Erro no convite em massa:', error);
      toast.error(error.message || t('bulkInvite.messages.sendError'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (result?.invited.length) {
      onSuccess();
    }
    setEmailsText('');
    setResult(null);
    onClose();
  };

  const handleStartNew = () => {
    setEmailsText('');
    setResult(null);
  };

  if (result) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="bg-sidebar border-sidebar-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sidebar-foreground flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t('bulkInvite.resultTitle')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {result.invited.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-green-600 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {t('bulkInvite.results.invited', { count: result.invited.length })}
                </h3>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <ul className="text-sm space-y-1">
                    {result.invited.map((user, index) => (
                      <li key={index} className="text-green-700 dark:text-green-300">
                        {user.email}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {result.failed.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-red-600 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  {t('bulkInvite.results.failed', { count: result.failed.length })}
                </h3>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <ul className="text-sm space-y-1">
                    {result.failed.map((failure, index) => (
                      <li key={index} className="text-red-700 dark:text-red-300">
                        <span className="font-medium">{failure.email}</span>
                        <span className="text-red-600 dark:text-red-400"> - {failure.error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                onClick={handleStartNew}
                variant="outline"
                className="bg-sidebar hover:bg-sidebar-accent border-sidebar-border"
              >
                {t('bulkInvite.actions.sendMore')}
              </Button>
              <Button
                onClick={handleClose}
                className="bg-[#00ffa7] hover:bg-[#00e693] text-black border-0 font-semibold"
              >
                {t('bulkInvite.actions.finish')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-sidebar border-sidebar-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sidebar-foreground flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t('bulkInvite.title')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
            <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
              <strong>{t('bulkInvite.howToUse.title')}</strong>
              <br />• {t('bulkInvite.howToUse.step1')}
              <br />• {t('bulkInvite.howToUse.step2')}
              <br />• {t('bulkInvite.howToUse.step3')}
              <br />• {t('bulkInvite.howToUse.step4')}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="emails">
              {t('bulkInvite.fields.emails.label')}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Textarea
              id="emails"
              value={emailsText}
              onChange={e => setEmailsText(e.target.value)}
              placeholder={tUi("interface:bulkinvitemodal.user1ExampleComUser2ExampleComUser3ExampleComUser4")}
              className="bg-sidebar border-sidebar-border text-sidebar-foreground min-h-[120px]"
              disabled={loading}
            />
            <p className="text-xs text-sidebar-foreground/60">
              {t('bulkInvite.fields.emails.hint')}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="bg-sidebar hover:bg-sidebar-accent border-sidebar-border"
            >
              {t('bulkInvite.actions.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading || !emailsText.trim()}
              className="bg-[#00ffa7] hover:bg-[#00e693] text-black border-0 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('bulkInvite.actions.sending')}
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  {t('bulkInvite.actions.sendInvites')}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
