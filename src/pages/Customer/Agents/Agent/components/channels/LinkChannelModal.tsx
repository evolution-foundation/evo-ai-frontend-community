import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from '@evoapi/design-system';
import { Plus, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { ChannelIcon } from '@/components/channels';
import type { Inbox } from '@/types/channels/inbox';
import InboxesService from '@/services/channels/inboxesService';
import { getInboxIdentifier } from './channelIdentifier';

interface LinkChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Channels of the account not bound to this agent. */
  inboxes: Inbox[];
  isLoading: boolean;
  onLink: (inbox: Inbox) => Promise<void>;
  onConnectNewChannel: () => void;
}

export default function LinkChannelModal({
  open,
  onOpenChange,
  inboxes,
  isLoading,
  onLink,
  onConnectNewChannel,
}: LinkChannelModalProps) {
  const { t } = useLanguage('aiAgents');
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [pendingTransfer, setPendingTransfer] = useState<Inbox | null>(null);

  const link = async (inbox: Inbox) => {
    setLinkingId(inbox.id);
    try {
      await onLink(inbox);
    } finally {
      setLinkingId(null);
    }
  };

  // A channel holds one agent: linking it here replaces whoever answers it, so
  // that never happens without the user confirming. The list is a snapshot from
  // when the modal opened, so the channel is checked again first; without that
  // check there is nothing current to confirm against, so nothing is linked.
  const handleLinkClick = async (inbox: Inbox) => {
    let current: Inbox | undefined;
    setLinkingId(inbox.id);
    try {
      current = (await InboxesService.getById(inbox.id)).data;
    } catch (error) {
      console.error('Error refreshing the channel before linking:', error);
    } finally {
      setLinkingId(null);
    }

    if (!current) {
      toast.error(t('edit.channels.errors.refreshChannel'));
      return;
    }

    if (current.agent_bot) {
      setPendingTransfer(current);
      return;
    }
    link(current);
  };

  const confirmTransfer = () => {
    const inbox = pendingTransfer;
    setPendingTransfer(null);
    if (inbox) link(inbox);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('edit.channels.linkModal.title')}</DialogTitle>
            <DialogDescription>{t('edit.channels.linkModal.description')}</DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : inboxes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Radio className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium text-foreground">{t('edit.channels.linkModal.emptyTitle')}</p>
              <p className="text-sm text-muted-foreground">
                {t('edit.channels.linkModal.emptyDescription')}
              </p>
            </div>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {inboxes.map(inbox => {
                const identifier = getInboxIdentifier(inbox);
                return (
                  <li
                    key={inbox.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <ChannelIcon channelType={inbox.channel_type} provider={inbox.provider} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{inbox.name}</p>
                      {identifier && (
                        <p className="truncate text-xs text-muted-foreground">{identifier}</p>
                      )}
                      {inbox.agent_bot && (
                        <p className="truncate text-xs text-muted-foreground">
                          {inbox.agent_bot.status === 'active'
                            ? t('edit.channels.linkModal.servedBy', { name: inbox.agent_bot.name })
                            : t('edit.channels.linkModal.linkedInactive', {
                                name: inbox.agent_bot.name,
                              })}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={inbox.agent_bot ? 'outline' : 'default'}
                      disabled={linkingId !== null}
                      onClick={() => handleLinkClick(inbox)}
                    >
                      {linkingId === inbox.id
                        ? t('edit.channels.linkModal.linking')
                        : t('edit.channels.linkModal.link')}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}

          <DialogFooter className="sm:justify-start">
            <Button type="button" variant="ghost" onClick={onConnectNewChannel}>
              <Plus className="mr-2 h-4 w-4" />
              {t('edit.channels.linkModal.connectNew')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingTransfer !== null}
        onOpenChange={isOpen => {
          if (!isOpen) setPendingTransfer(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('edit.channels.transfer.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                pendingTransfer?.agent_bot?.status === 'inactive'
                  ? 'edit.channels.transfer.descriptionInactive'
                  : 'edit.channels.transfer.description',
                {
                  channel: pendingTransfer?.name ?? '',
                  agent: pendingTransfer?.agent_bot?.name ?? '',
                },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('edit.channels.transfer.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTransfer}>
              {t('edit.channels.transfer.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
