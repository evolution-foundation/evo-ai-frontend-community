import { useLanguage } from '@/hooks/useLanguage';
import { Button, Badge } from '@evoapi/design-system';
import { ArrowLeft, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { Integration } from '@/types/integrations';
import BrandIcon from '@/components/BrandIcon';

interface IntegrationHeaderProps {
  integration: Integration;
  onBack: () => void;
  onExternalLink?: () => void;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function IntegrationHeader({
  integration,
  onBack,
  onExternalLink,
  subtitle,
  children
}: IntegrationHeaderProps) {
  const { t } = useLanguage('integrations');

  return (
    <div className="border-b border-slate-200 dark:border-slate-700 pb-6 mb-6">
      {/* Navigation */}
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {t('breadcrumb.integrations')} / {integration.name}
        </div>
      </div>

      {/* Header Content */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
            <BrandIcon
              id={integration.id}
              size={40}
              className="w-10 h-10"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {integration.name}
              </h1>
              {integration.enabled ? (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {t('status.active')}
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {t('status.inactive')}
                </Badge>
              )}
            </div>

            <p className="text-slate-600 dark:text-slate-400 mb-2">
              {subtitle || integration.description}
            </p>

            {/* External Link */}
            {onExternalLink && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onExternalLink}
                className="p-0 h-auto text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                {t('actions.visitOfficialSite')}
              </Button>
            )}
          </div>
        </div>

        {/* Actions */}
        {children && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
