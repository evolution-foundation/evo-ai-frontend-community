import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@evoapi/design-system';
import { Plus, Check, AlertCircle } from 'lucide-react';
import { CompactIntegrationCard } from './CompactIntegrationCard';

interface AvailableMCP {
  id: string;
  name: string;
  description: string;
}

interface MCPCardProps {
  mcp: AvailableMCP;
  isEnabled: boolean;
  isConfigured: boolean;
  isConnected: boolean;
  onToggle?: () => void;
  onConfigure?: () => void;
}

export function MCPCard({
  mcp,
  isEnabled,
  isConfigured,
  isConnected,
  onToggle,
  onConfigure,
}: MCPCardProps) {
  const { t } = useLanguage('aiAgents');

  // Coming soon -> Activate -> Activated. "Activated" stays clickable when a dialog
  // exists, to reconfigure.
  const renderAction = () => {
    if (!isConfigured) {
      return (
        <Button
          variant="outline"
          className="w-full cursor-not-allowed gap-2 border-border text-muted-foreground md:w-auto"
          disabled
        >
          <AlertCircle className="h-4 w-4" />
          {t('edit.integrations.notAvailable') || 'Em breve'}
        </Button>
      );
    }

    if (isConnected) {
      return (
        <Button
          variant="outline"
          className="w-full gap-2 border-primary/40 text-primary hover:bg-primary/10 md:w-auto"
          onClick={onConfigure}
          disabled={!onConfigure}
          title={t('edit.integrations.configure') || 'Configurar'}
        >
          <Check className="h-4 w-4" />
          {t('edit.integrations.active') || 'Ativado'}
        </Button>
      );
    }

    if (onConfigure) {
      return (
        <Button variant="outline" className="w-full gap-2 md:w-auto" onClick={onConfigure}>
          <Plus className="h-4 w-4" />
          {t('edit.integrations.activate') || 'Ativar'}
        </Button>
      );
    }

    if (onToggle) {
      return (
        <Button
          variant="outline"
          className={`w-full gap-2 md:w-auto ${isEnabled ? 'border-primary/40 text-primary hover:bg-primary/10' : ''}`}
          onClick={onToggle}
        >
          {isEnabled ? (
            <>
              <Check className="h-4 w-4" />
              {t('edit.integrations.active') || 'Ativado'}
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              {t('edit.integrations.activate') || 'Ativar'}
            </>
          )}
        </Button>
      );
    }

    return null;
  };

  return (
    <CompactIntegrationCard
      id={mcp.id}
      name={mcp.name}
      description={mcp.description}
      action={renderAction()}
    />
  );
}
