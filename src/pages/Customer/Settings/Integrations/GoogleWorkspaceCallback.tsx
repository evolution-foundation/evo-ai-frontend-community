import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { integrationsService } from '@/services/integrations';
import { AppLogo } from '@/components/AppLogo';

export default function GoogleWorkspaceCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processando autorização...');
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    if (hasProcessed) return;
    setHasProcessed(true);

    const run = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      const state = searchParams.get('state');

      if (error) {
        setStatus('error');
        setMessage(errorDescription || `Erro de autorização: ${error}`);
        toast.error(errorDescription || error);
        return;
      }

      if (!code || !state) {
        setStatus('error');
        setMessage('Código de autorização ou state não encontrado.');
        return;
      }

      try {
        const response = await integrationsService.handleGoogleWorkspaceCallback(code, state);
        setStatus('success');
        setMessage(
          response.email
            ? `Conta ${response.email} conectada com sucesso!`
            : 'Conta Google conectada com sucesso!',
        );
        toast.success('Login com Google concluído!');
        setTimeout(() => navigate('/settings/integrations'), 2000);
      } catch (err) {
        setStatus('error');
        const errorMessage =
          (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ||
          'Erro ao concluir a autorização com o Google.';
        setMessage(errorMessage);
        toast.error(errorMessage);
      }
    };

    run();
  }, [hasProcessed, searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-t from-primary/20 via-background/95 to-background relative">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <AppLogo className="h-10 mx-auto" />
        </div>

        <div className="bg-background/80 backdrop-blur-sm border rounded-lg p-6 shadow-lg text-center space-y-6 py-8">
          <div className="flex flex-col items-center gap-4">
            {status === 'processing' && <Loader2 className="h-12 w-12 animate-spin text-blue-500" />}
            {status === 'success' && <CheckCircle className="h-12 w-12 text-green-500" />}
            {status === 'error' && <AlertTriangle className="h-12 w-12 text-red-500" />}
            <div className="space-y-2">
              <p
                className={`text-lg font-semibold ${
                  status === 'success'
                    ? 'text-green-600 dark:text-green-400'
                    : status === 'error'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-blue-600 dark:text-blue-400'
                }`}
              >
                {status === 'processing' && 'Conectando com o Google...'}
                {status === 'success' && 'Sucesso!'}
                {status === 'error' && 'Erro'}
              </p>
              <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
            </div>
          </div>

          {status === 'error' && (
            <div className="text-xs text-muted-foreground pt-4 border-t">
              <p>Você pode fechar esta janela e tentar novamente em Configurações &gt; Integrações.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
