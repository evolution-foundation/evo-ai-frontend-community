import { getFormattingLocale } from '@/lib/formattingLocale';
import { useTranslation as useUiTranslation } from 'react-i18next';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
} from '@evoapi/design-system';
import { Copy, Eye, EyeOff, Key } from 'lucide-react';
import { Badge } from '@evoapi/design-system';
import type { AccessToken } from '@/types/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { parseScopesFromAPI } from '@/services/auth/accessTokensService';

interface ViewTokenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: AccessToken | null;
  onCopy: (text: string, label: string) => void;
}

export default function ViewTokenModal({
  open,
  onOpenChange,
  token,
  onCopy,
}: ViewTokenModalProps) {
  const { t: tUi } = useUiTranslation();
  const [showToken, setShowToken] = useState(false);
  const { t } = useTranslation('accessTokens');

  if (!token) return null;

  const handleCopy = (text: string, label: string) => {
    onCopy(text, label);
  };

  const maskedToken = token.token ? '•'.repeat(Math.min(token.token.length, 40)) : '';
  const scopes = parseScopesFromAPI(token.scopes);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t('viewModal.title')} - {token.name}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          <div className="space-y-6">
          {/* Token Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('viewModal.labels.name')}</p>
              <p className="font-medium">{token.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('viewModal.labels.owner')}</p>
              <div className="flex gap-2">
                <Badge variant="default">
                  {token.owner_type}
                </Badge>
                {token.owner_name && (
                  <span className="text-sm">{token.owner_name}</span>
                )}
              </div>
            </div>
          </div>

          {/* Token ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{tUi("accessTokens:viewModal.labels.tokenId")}</label>
            <div className="flex gap-2">
              <Input
                value={token.id}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopy(token.id, 'Token ID')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {tUi("accessTokens:viewModal.descriptions.tokenId")}</p>
          </div>

          {/* Access Token */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('viewModal.labels.token')}</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={showToken ? token.token : maskedToken}
                  readOnly
                  className="font-mono text-sm pr-10"
                  type={showToken ? 'text' : 'password'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopy(token.token, t('viewModal.copyToken'))}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {tUi("interface:viewtokenmodal.useThisTokenInTheAuthorizationHeader")} <code>Authorization: Bearer {token.token.substring(0, 20)}...</code>
            </p>
          </div>

          {/* Scopes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('viewModal.labels.scopes')}</label>
            <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-md min-h-[2.5rem]">
              {scopes.length > 0 ? (
                scopes.map((scope) => (
                  <Badge key={scope} variant="outline" className="text-xs font-mono">
                    {scope}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">{tUi("accessTokens:viewModal.descriptions.noScopes")}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {tUi("accessTokens:viewModal.descriptions.scopes")}</p>
          </div>

          {/* Token Details */}
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium">{tUi("accessTokens:viewModal.sections.tokenDetails")}</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('viewModal.labels.createdAt')}</p>
                <p className="text-sm">{new Date(token.created_at).toLocaleString(getFormattingLocale())}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{tUi("accessTokens:viewModal.labels.updatedAt")}</p>
                <p className="text-sm">{new Date(token.updated_at).toLocaleString(getFormattingLocale())}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">{tUi("accessTokens:viewModal.labels.ownerId")}</p>
              <p className="text-sm font-mono">{token.owner_id}</p>
            </div>
          </div>

          {/* API Usage Example */}
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium">{tUi("accessTokens:viewModal.sections.apiUsage")}</h4>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">{tUi("accessTokens:viewModal.examples.curl")}</label>
              <div className="flex gap-2">
                <Input
                  value={`curl -H "api_access_token: ${token.token}" https://api.example.com/v1/endpoint`}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(`curl -H "api_access_token: ${token.token}" https://api.example.com/v1/endpoint`, 'cURL Example')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{tUi("accessTokens:viewModal.examples.javascript")}</label>
              <div className="flex gap-2">
                <Input
                  value={`fetch('https://api.example.com/v1/endpoint', { headers: { 'Authorization': 'Bearer ${token.token}' } })`}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(`fetch('https://api.example.com/v1/endpoint', { headers: { 'Authorization': 'Bearer ${token.token}' } })`, 'JavaScript Example')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Security Warning */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
            <div className="flex items-start gap-3">
              <Key className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                  {tUi("accessTokens:viewModal.security.title")}</h4>
                <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>{tUi("interface:viewtokenmodal.neverExposeTheAccessTokenInClientSideCodeOr")}</li>
                  <li>{tUi("interface:viewtokenmodal.useHttpsInProductionForAllApiCommunications")}</li>
                  <li>{tUi("interface:viewtokenmodal.regenerateTheTokenIfYouSuspectItHasBeenCompromised")}</li>
                  <li>{tUi("interface:viewtokenmodal.monitorTokenUsageRegularly")}</li>
                  <li>{tUi("interface:viewtokenmodal.storeTokensSecurelyUsingEnvironmentVariablesOrSecureVaults")}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
