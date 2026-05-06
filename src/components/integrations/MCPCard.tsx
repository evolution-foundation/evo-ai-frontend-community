import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from '@evoapi/design-system';
import { Plus, Check, Settings } from 'lucide-react';
import BrandIcon, { getBrandIcon } from '@/components/BrandIcon';

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
  showComingSoon?: boolean;
}

export function MCPCard({
  mcp,
  isEnabled,
  isConfigured,
  isConnected,
  onToggle,
  onConfigure,
  showComingSoon = false,
}: MCPCardProps) {
  const { t } = useLanguage('aiAgents');

  const renderActionButtons = () => {
    // Not configured - show disabled button
    if (!isConfigured) {
      return (
        <Button variant="outline" className="w-full gap-2 opacity-50 cursor-not-allowed" disabled>
          <Plus className="h-4 w-4" />
          {t('edit.integrations.activate') || 'ATIVAR INTEGRAÇÃO'}
        </Button>
      );
    }

    // Connected - show active status and configure button
    if (isConnected) {
      return (
        <>
          <Button
            variant="success"
            className="w-full gap-2 bg-green-600 text-white hover:bg-green-700 border-green-600 cursor-default"
            disabled
          >
            <Check className="h-4 w-4" />
            {t('edit.integrations.active') || 'ATIVO'}
          </Button>
          {onConfigure && (
            <Button variant="outline" className="w-full gap-2" onClick={onConfigure}>
              <Settings className="h-4 w-4" />
              {t('edit.integrations.configure') || 'CONFIGURAR'}
            </Button>
          )}
        </>
      );
    }

    // Configured but not connected - show activate button
    if (onConfigure) {
      return (
        <Button variant="outline" className="w-full gap-2" onClick={onConfigure}>
          <Plus className="h-4 w-4" />
          {t('edit.integrations.activate') || 'ATIVAR INTEGRAÇÃO'}
        </Button>
      );
    }

    // Simple toggle for other MCPs
    if (onToggle) {
      return (
        <Button variant="outline" className="w-full gap-2" onClick={onToggle}>
          {isEnabled ? (
            <>
              <Check className="h-4 w-4" />
              {t('mcpServers.enabled') || 'ATIVO'}
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              {t('mcpServers.enable') || 'ATIVAR'}
            </>
          )}
        </Button>
      );
    }

    return null;
  };

  const hasBrandIcon = Boolean(getBrandIcon(mcp.id));

  return (
    <Card className="hover:border-primary/50 transition-colors flex flex-col">
      <CardHeader className="flex flex-col items-center text-center space-y-4 pb-4">
        {/* Logo — BrandIcon applies the official brand color so each MCP card
            renders in its real brand palette instead of monochrome. */}
        <div className="flex items-center justify-center w-20 h-20 p-3 rounded-lg bg-muted/50">
          {hasBrandIcon ? <BrandIcon id={mcp.id} size={48} className="h-12 w-12" /> : null}
        </div>

        {/* Title */}
        <CardTitle className="text-xl font-semibold">{mcp.name}</CardTitle>

        {/* Coming Soon Badge */}
        {showComingSoon && (
          <span className="px-1 py-0.5 text-[12px] font-medium bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
            {t('mcpServers.comingSoon') || 'Em breve'}
          </span>
        )}

        {/* Description */}
        <CardDescription className="text-sm leading-relaxed">{mcp.description}</CardDescription>
      </CardHeader>

      {/* Action Buttons */}
      <CardContent className="mt-auto pt-0 space-y-2">{renderActionButtons()}</CardContent>
    </Card>
  );
}

