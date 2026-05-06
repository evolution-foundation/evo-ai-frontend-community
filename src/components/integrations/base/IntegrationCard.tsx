import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button, Card, CardContent } from '@evoapi/design-system';
import { Settings, Power } from 'lucide-react';
import { Integration } from '@/types/integrations';
import BaseStatusBadge from '@/components/base/BaseStatusBadge';
import BrandIcon, { getBrandIcon } from '@/components/BrandIcon';

interface IntegrationCardProps {
  integration: Integration;
  onConfigure: () => void;
  onToggle?: () => void; // Optional for config-only integrations
  isProcessing?: boolean;
  configOnly?: boolean; // For integrations that only need configuration
}

export default function IntegrationCard({
  integration,
  onConfigure,
  onToggle,
  isProcessing = false,
  configOnly = false,
}: IntegrationCardProps) {
  const { t } = useLanguage('integrations');

  const [imageError, setImageError] = useState(false);
  const [darkImageError, setDarkImageError] = useState(false);

  const logoPath = `/integrations/${integration.id}.png`;
  const logoPathDark = `/integrations/${integration.id}-dark.png`;

  const hasBrandIcon = Boolean(getBrandIcon(integration.id));

  const handleImageError = () => setImageError(true);
  const handleDarkImageError = () => setDarkImageError(true);

  const getInitials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(word => word[0]?.toUpperCase())
      .join('');

  // status/text calculados uma vez
  const status = configOnly ? 'active' : integration.enabled ? 'active' : 'inactive';
  const statusText = configOnly
    ? t('status.active')
    : integration.enabled
      ? t('status.connected')
      : t('status.disconnected');

  const monoStatusClass =
    configOnly || integration.enabled
      ? 'text-green-600 dark:text-green-400'
      : 'text-gray-500';

  return (
    <Card className="group relative bg-sidebar border-sidebar-border hover:bg-sidebar-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-black/10 overflow-hidden">
      <CardContent className="p-0">
        {/* Header with logo, name and status */}
        <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-sidebar-accent/20 flex items-center justify-center flex-shrink-0 relative">
            {hasBrandIcon ? (
              <BrandIcon id={integration.id} size={28} className="w-7 h-7" />
            ) : (
              <>
                {/* Logo padrão:
                    - no light sempre aparece
                    - no dark só some se existir um dark logo carregado com sucesso */}
                {!imageError && (
                  <img
                    src={logoPath}
                    alt={integration.name}
                    className={[
                      'w-full h-full object-contain',
                      // se o dark logo NÃO falhou, então esconde no dark (porque o dark logo vai aparecer)
                      // se o dark logo falhou, não esconde -> vira fallback no dark
                      !darkImageError ? 'dark:hidden' : '',
                    ].join(' ')}
                    onError={handleImageError}
                  />
                )}

                {/* Logo dark (opcional) */}
                {!darkImageError && (
                  <img
                    src={logoPathDark}
                    alt={integration.name}
                    className="w-full h-full object-contain hidden dark:block"
                    onError={handleDarkImageError}
                  />
                )}

                {/* Fallback final: se o normal falhar, não tem imagem nenhuma pra mostrar */}
                {imageError && (
                  <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-semibold">
                    {getInitials(integration.name)}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate text-sidebar-foreground">
              {integration.name}
            </h3>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {integration.description}
            </p>
          </div>

          <BaseStatusBadge status={status} text={statusText} />
        </div>

        {/* Details section */}
        <div className="px-4 py-3 text-xs text-sidebar-foreground/70">
          <div className="flex items-center justify-between">
            <span>{t('status.statusLabel')}</span>
            <span className={`font-mono ${monoStatusClass}`}>{statusText}</span>
          </div>

          <div className="flex items-center justify-between">
            <span>{t('status.typeLabel')}</span>
            <span className="font-mono capitalize">{integration.id.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Action buttons - hover effect like ContactCard */}
        <div className="flex border-t border-sidebar-border opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {configOnly ? (
            <Button
              variant="ghost"
              className="flex-1 rounded-none h-12 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
              onClick={onConfigure}
              disabled={isProcessing}
            >
              <Settings className="h-4 w-4 mr-2" />
              {t('actions.configure')}
            </Button>
          ) : integration.enabled ? (
            <>
              <Button
                variant="ghost"
                className="flex-1 rounded-none h-12 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
                onClick={onConfigure}
                disabled={isProcessing}
              >
                <Settings className="h-4 w-4 mr-2" />
                {t('actions.configure')}
              </Button>

              <div className="w-px bg-sidebar-border" />

              <Button
                variant="ghost"
                className="flex-1 rounded-none h-12 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                onClick={() => onToggle?.()}
                disabled={isProcessing}
              >
                <Power className="h-4 w-4 mr-2" />
                {isProcessing ? t('actions.processing') : t('actions.disconnect')}
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              className="flex-1 rounded-none h-12 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
              onClick={() => onToggle?.()}
              disabled={isProcessing || !onToggle}
            >
              <Power className="h-4 w-4 mr-2" />
              {isProcessing ? t('actions.processing') : t('actions.connect')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
