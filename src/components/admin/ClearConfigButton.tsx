import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@evoapi/design-system';
import { adminConfigService } from '@/services/admin/adminConfigService';
import { refreshGlobalConfig } from '@/contexts/GlobalConfigContext';
import { useLanguage } from '@/hooks/useLanguage';

interface ClearConfigButtonProps {
  configType: string;
  configLabel: string;
  onCleared?: () => void;
}

export const ClearConfigButton = ({ configType, configLabel, onCleared }: ClearConfigButtonProps) => {
  const { t } = useLanguage('adminSettings');
  const [isClearing, setIsClearing] = useState(false);

  const handleClear = async () => {
    setIsClearing(true);
    try {
      await adminConfigService.clearConfig(configType);
      await refreshGlobalConfig();
      toast.success(
        t("channels.clearConfig.success", { config: configLabel }),
      );
      onCleared?.();
    } catch (error) {
      console.error('Error clearing config:', error);
      toast.error(
        t("channels.clearConfig.error", { config: configLabel }),
      );
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
          <Trash2 className="h-4 w-4 mr-2" />
          {t("channels.clearConfig.button")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("channels.clearConfig.dialogTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("channels.clearConfig.dialogDescription", {
              config: configLabel,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {t("channels.clearConfig.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClear}
            disabled={isClearing}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isClearing
              ? t("channels.clearConfig.clearing")
              : t("channels.clearConfig.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
