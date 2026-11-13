import { useEffect, useState } from 'react';
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
  const [showToken, setShowToken] = useState(false);
  const { t } = useTranslation('accessTokens');

  // Every value starts masked, whichever token or opening it belongs to.
  useEffect(() => {
    setShowToken(false);
  }, [open, token?.id, token?.token]);

  if (!token) return null;

  const handleCopy = (text: string, label: string) => {
    onCopy(text, label);
  };

  // The auth returns the value only on create and regenerate; afterwards the
  // examples carry a placeholder.
  const tokenValue = token.token;
  const exampleToken = tokenValue ?? 'YOUR_ACCESS_TOKEN';
  const maskedToken = tokenValue ? '•'.repeat(Math.min(tokenValue.length, 40)) : '';
  const scopes = parseScopesFromAPI(token.scopes);
  // VITE_API_URL is relative ("/crm-api") when the CRM is served inside the shell.
  const apiBase = String(import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
  const exampleUrl = new URL(`${apiBase}/api/v1/contacts`, window.location.origin).href;
  // Hyphens, not underscores: nginx drops underscored request headers unless
  // underscores_in_headers is on. Rails reads both as HTTP_API_ACCESS_TOKEN.
  const curlExample = `curl -H "Api-Access-Token: ${exampleToken}" ${exampleUrl}`;
  const javascriptExample = `fetch('${exampleUrl}', { headers: { 'Api-Access-Token': '${exampleToken}' } })`;

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
            <label className="text-sm font-medium">{t('viewModal.labels.tokenId')}</label>
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
                onClick={() => handleCopy(token.id, t('viewModal.labels.tokenId'))}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('viewModal.descriptions.tokenId')}
            </p>
          </div>

          {/* Access Token */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('viewModal.labels.token')}</label>
            {tokenValue ? (
            <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={showToken ? tokenValue : maskedToken}
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
                onClick={() => handleCopy(tokenValue, t('viewModal.copyToken'))}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('viewModal.descriptions.tokenUsage')} <code>Api-Access-Token: {tokenValue.substring(0, 20)}...</code>
            </p>
            <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
              {t('viewModal.descriptions.shownOnce')}
            </p>
            </>
            ) : (
              <p className="text-sm text-muted-foreground">{t('viewModal.descriptions.valueNotStored')}</p>
            )}
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
                <span className="text-sm text-muted-foreground">{t('viewModal.descriptions.noScopes')}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('viewModal.descriptions.scopes')}
            </p>
          </div>

          {/* Token Details */}
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium">{t('viewModal.sections.tokenDetails')}</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('viewModal.labels.createdAt')}</p>
                <p className="text-sm">{new Date(token.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('viewModal.labels.updatedAt')}</p>
                <p className="text-sm">{new Date(token.updated_at).toLocaleString()}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('viewModal.labels.ownerId')}</p>
              <p className="text-sm font-mono">{token.owner_id}</p>
            </div>
          </div>

          {/* API Usage Example */}
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium">{t('viewModal.sections.apiUsage')}</h4>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('viewModal.examples.curl')}</label>
              <div className="flex gap-2">
                <Input
                  value={curlExample}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(curlExample, t('viewModal.examples.curl'))}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('viewModal.examples.javascript')}</label>
              <div className="flex gap-2">
                <Input
                  value={javascriptExample}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(javascriptExample, t('viewModal.examples.javascript'))}
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
                  {t('viewModal.sections.security')}
                </h4>
                <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  <li>• Never expose the access token in client-side code or public repositories</li>
                  <li>• Use HTTPS in production for all API communications</li>
                  <li>• Regenerate the token if you suspect it has been compromised</li>
                  <li>• Monitor token usage regularly</li>
                  <li>• Store tokens securely using environment variables or secure vaults</li>
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
