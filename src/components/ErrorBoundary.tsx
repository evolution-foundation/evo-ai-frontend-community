import React from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@evoapi/design-system';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      return <DefaultErrorFallback error={this.state.error} retry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error?: Error;
  retry: () => void;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({ error, retry }) => {
  const { t } = useLanguage('common');

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-destructive" />
      </div>

      <h2 className="text-xl font-semibold mb-2">{t('base.errorBoundary.title')}</h2>

      <p className="text-muted-foreground mb-4 max-w-md">
        {t('base.errorBoundary.description')}
      </p>

      {error && (
        <details className="mb-4 text-left max-w-md">
          <summary className="cursor-pointer text-sm text-muted-foreground mb-2">
            {t('base.errorBoundary.technicalDetails')}
          </summary>
          <pre className="text-xs bg-muted p-2 rounded overflow-auto">
            {error.message}
            {error.stack && '\n\n' + error.stack}
          </pre>
        </details>
      )}

      <Button onClick={retry} className="gap-2">
        <RefreshCw className="w-4 h-4" />
        {t('base.errorBoundary.retry')}
      </Button>
    </div>
  );
};

export default ErrorBoundary;
