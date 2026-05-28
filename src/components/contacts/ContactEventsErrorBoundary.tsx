import React from 'react';
import { Button } from '@evoapi/design-system';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle: string;
  fallbackReload: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  resetKey: number;
}

// Class component (no react-error-boundary dependency). Captures crashes in
// any child of the Eventos tab so a bad event payload doesn't tear down the
// surrounding contact dialog. The Reload button increments resetKey, which
// remounts the children subtree and clears any stale state.
export class ContactEventsErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, resetKey: 0 };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true, resetKey: 0 };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Skip noisy console output in test runs — Vitest captures it as a
    // failure signal even when the throw is intentional. Production still
    // gets the trace through the standard React DevTools / Sentry pipeline.
    if (import.meta.env.MODE !== 'test') {
      console.error('[ContactEventsErrorBoundary]', error, info.componentStack);
    }
  }

  handleReload = () => {
    this.setState((prev) => ({ hasError: false, resetKey: prev.resetKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="flex flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm text-muted-foreground">{this.props.fallbackTitle}</p>
          <Button variant="outline" size="sm" onClick={this.handleReload}>
            {this.props.fallbackReload}
          </Button>
        </div>
      );
    }
    return (
      <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>
    );
  }
}

export default ContactEventsErrorBoundary;
