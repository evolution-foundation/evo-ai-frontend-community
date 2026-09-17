import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { useAppDataStore } from '@/store/appDataStore';
import InboxesService from '@/services/channels/inboxesService';

export const useReactivateInbox = () => {
  const navigate = useNavigate();
  const { t } = useLanguage('channels');
  const { fetchInboxes } = useAppDataStore();

  const reactivateInbox = async (inboxId: string, name: string) => {
    await InboxesService.reactivate(inboxId);
    toast.success(t('overview.archived.reactivated', { name }));
    await fetchInboxes();
    navigate(`/channels/${inboxId}/settings`);
  };

  return { reactivateInbox };
};
