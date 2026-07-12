import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@evoapi/design-system';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

import { useAppDataStore } from '@/store/appDataStore';
import { usePermissions } from '@/contexts/PermissionsContext';
import InboxesService from '@/services/channels/inboxesService';
import { Inbox } from '@/types/channels/inbox';
import { ChannelsHeader, ChannelTypeHub } from '@/components/channels';
import { ChannelTypeStatus } from '@/utils/channelStatus';
import { useNavigate } from 'react-router-dom';
import { ChannelsTour } from '@/tours';

export default function Channels() {
  const { can, isReady: permissionsReady, loading: permissionsLoading } = usePermissions();
  const { t } = useLanguage('channels');

  const { inboxes, isLoadingInboxes, fetchInboxes, removeInbox } = useAppDataStore();
  const [query, setQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    channel: Inbox | null;
    confirmationText: string;
  }>({
    isOpen: false,
    channel: null,
    confirmationText: '',
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (!permissionsReady || permissionsLoading) {
      return;
    }

    if (!can('inboxes', 'read')) {
      toast.error(t('permissions.viewDenied'));
      return;
    }
    fetchInboxes(true);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsReady, permissionsLoading, fetchInboxes]);

  const filteredInboxes = useMemo(() => {
    if (!query) return inboxes;
    const q = query.toLowerCase();
    return inboxes.filter(
      (i: Inbox) =>
        i.name?.toLowerCase().includes(q) || i.channel_type?.toLowerCase().includes(q),
    );
  }, [inboxes, query]);

  const totalCount = filteredInboxes.length;

  const openChannelSettings = useCallback(
    (inbox: Inbox) => {
      navigate(`/channels/${inbox.id}/settings`);
    },
    [navigate],
  );

  // Add a connection already scoped to the card's channel type: pass the catalog
  // id through router state so /channels/new preselects it and skips the picker.
  const handleAddType = useCallback(
    (typeStatus: ChannelTypeStatus) => {
      if (permissionsLoading || !permissionsReady) {
        return;
      }

      if (!can('inboxes', 'create')) {
        toast.error(t('permissions.createDenied'));
        return;
      }
      navigate('/channels/new', { state: { channelId: typeStatus.type.id } });
    },
    [navigate, can, permissionsLoading, permissionsReady, t],
  );

  const handleNewChannel = useCallback(() => {
    // Wait until permissions are loaded before acting.
    if (permissionsLoading || !permissionsReady) {
      return;
    }

    if (!can('inboxes', 'create')) {
      toast.error(t('permissions.createDenied'));
      return;
    }
    navigate('/channels/new');
  }, [navigate, can, permissionsLoading, permissionsReady, t]);

  const openDeleteModal = (channel: Inbox) => {
    // Wait until permissions are loaded before acting.
    if (permissionsLoading || !permissionsReady) {
      return;
    }

    if (!can('inboxes', 'delete')) {
      toast.error(t('permissions.deleteDenied'));
      return;
    }
    setDeleteModal({
      isOpen: true,
      channel,
      confirmationText: '',
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      channel: null,
      confirmationText: '',
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.channel) return;

    const channelId = deleteModal.channel.id;
    setIsDeleting(channelId);

    try {
      await InboxesService.remove(channelId);

      // Optimistically remove from local state
      removeInbox(channelId);

      toast.success(t('success.removeSuccess'));
      closeDeleteModal();
    } catch (e: unknown) {
      console.error('Failed to remove channel:', e);
      toast.error((e as Error)?.message || t('errors.removeError'));

      // Refresh list on error to restore correct state
      await fetchInboxes();
    } finally {
      setIsDeleting(null);
    }
  };

  const isDeleteConfirmationValid = deleteModal.confirmationText === deleteModal.channel?.name;

  return (
    <div className="h-full flex flex-col p-4">
      <ChannelsTour />
      <div data-tour="channels-header">
        <ChannelsHeader
          totalCount={totalCount}
          selectedCount={0}
          searchValue={query}
          onSearchChange={setQuery}
          onNewChannel={handleNewChannel}
          onClearSelection={() => {}}
        />
      </div>

      <div className="flex-1 overflow-auto" data-tour="channels-list">
        <ChannelTypeHub
          inboxes={filteredInboxes}
          isLoading={isLoadingInboxes}
          onAdd={handleAddType}
          onOpenInbox={openChannelSettings}
          onDelete={openDeleteModal}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModal.isOpen} onOpenChange={closeDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="h-5 w-5" />
              {t('deleteDialog.title')}
            </DialogTitle>
            <DialogDescription className="text-sidebar-foreground/70">
              {t('deleteDialog.description', { name: deleteModal.channel?.name })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-sidebar-foreground">
                {t('deleteDialog.confirmLabel')}
              </label>
              <Input
                placeholder={deleteModal.channel?.name || t('deleteDialog.placeholder')}
                value={deleteModal.confirmationText}
                onChange={e =>
                  setDeleteModal(prev => ({
                    ...prev,
                    confirmationText: e.target.value,
                  }))
                }
                className="mt-2 bg-sidebar border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={closeDeleteModal}
              className="bg-sidebar border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
            >
              {t('deleteDialog.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={!isDeleteConfirmationValid || isDeleting === deleteModal.channel?.id}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting === deleteModal.channel?.id
                ? t('deleteDialog.deleting')
                : t('deleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
