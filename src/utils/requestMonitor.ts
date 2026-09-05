/**
 * Request Monitor Utility
 *
 * Monitora e registra todas as requisições HTTP feitas pela aplicação
 * Útil para debugging e otimização de performance
 *
 * Para ativar, adicione no console do browser:
 * localStorage.setItem('ENABLE_REQUEST_MONITOR', 'true')
 *
 * Para desativar:
 * localStorage.removeItem('ENABLE_REQUEST_MONITOR')
 */

interface RequestLog {
  id: string;
  method: string;
  url: string;
  timestamp: number;
  duration?: number;
  status?: number;
  error?: string;
}

declare global {
  interface Window {
    requestMonitor: RequestMonitor;
  }
}

class RequestMonitor {
  private requests: Map<string, RequestLog> = new Map();
  private enabled: boolean = false;
  private startTime: number = Date.now();

  constructor() {
    this.checkEnabled();
  }

  private checkEnabled() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    this.enabled = localStorage.getItem('ENABLE_REQUEST_MONITOR') === 'true';
  }

  enable() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('ENABLE_REQUEST_MONITOR', 'true');
    this.enabled = true;
    this.reset();
  }

  disable() {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem('ENABLE_REQUEST_MONITOR');
    this.enabled = false;
  }

  reset() {
    this.requests.clear();
    this.startTime = Date.now();
  }

  logRequest(method: string, url: string): string {
    if (!this.enabled) return '';

    const id = `${method}-${url}-${Date.now()}`;
    const timestamp = Date.now() - this.startTime;

    const log: RequestLog = {
      id,
      method,
      url,
      timestamp,
    };

    this.requests.set(id, log);

    return id;
  }

  logResponse(id: string, status: number, duration: number) {
    if (!this.enabled || !id) return;

    const request = this.requests.get(id);
    if (!request) return;

    request.status = status;
    request.duration = duration;
  }

  logError(id: string, error: string) {
    if (!this.enabled || !id) return;

    const request = this.requests.get(id);
    if (!request) return;

    request.error = error;
  }

  private cleanUrl(url: string): string {
    // Remove base URLs para melhor legibilidade
    return url
      .replace(/^https?:\/\/[^/]+/, '')
      .replace(/\/api\/v1/, '')
      .replace(/\/accounts\/\d+/, '/accounts/{id}')
      .replace(/\/conversations\/\d+/, '/conversations/{id}');
  }

  getSummary() {
    if (!this.enabled) {
      return;
    }

    const requests = Array.from(this.requests.values());
    const totalRequests = requests.length;
    const successRequests = requests.filter(
      r => r.status && r.status >= 200 && r.status < 300,
    ).length;
    const errorRequests = requests.filter(r => r.status && r.status >= 400).length;
    const pendingRequests = requests.filter(r => !r.status && !r.error).length;

    const avgDuration =
      requests.filter(r => r.duration).reduce((sum, r) => sum + (r.duration || 0), 0) /
      (requests.filter(r => r.duration).length || 1);

    // Agrupar por endpoint
    const byEndpoint = new Map<string, RequestLog[]>();
    requests.forEach(req => {
      const cleanUrl = this.cleanUrl(req.url);
      const existing = byEndpoint.get(cleanUrl) || [];
      existing.push(req);
      byEndpoint.set(cleanUrl, existing);
    });

    return {
      totalRequests,
      successRequests,
      errorRequests,
      pendingRequests,
      avgDuration,
      byEndpoint: Array.from(byEndpoint.entries()).map(([endpoint, reqs]) => ({
        endpoint,
        count: reqs.length,
        avgDuration:
          reqs.filter(r => r.duration).reduce((sum, r) => sum + (r.duration || 0), 0) /
          (reqs.filter(r => r.duration).length || 1),
      })),
    };
  }

  getRequests() {
    return Array.from(this.requests.values());
  }
}

// Singleton instance
export const requestMonitor = new RequestMonitor();

const bootstrapMarks = new Map<string, number>();

const isBootstrapMonitorEnabled = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('ENABLE_BOOTSTRAP_MONITOR') === 'true';
};

export const markBootstrapPhaseStart = (phase: string) => {
  if (!isBootstrapMonitorEnabled() || typeof performance === 'undefined') return;
  bootstrapMarks.set(phase, performance.now());
  console.info(`[Bootstrap] ${phase} started`);
};

export const markBootstrapPhaseEnd = (phase: string, details?: Record<string, unknown>) => {
  if (!isBootstrapMonitorEnabled() || typeof performance === 'undefined') return;
  const startedAt = bootstrapMarks.get(phase);
  const durationMs = startedAt ? performance.now() - startedAt : undefined;

  if (durationMs !== undefined) {
    console.info(`[Bootstrap] ${phase} finished in ${durationMs.toFixed(1)}ms`, details || {});
  } else {
    console.info(`[Bootstrap] ${phase} finished`, details || {});
  }
};

// Expor globalmente para facilitar uso no console
if (typeof window !== 'undefined') {
  window.requestMonitor = requestMonitor;
}

/**
 * HOW TO USE:
 *
 * 1. Enable monitoring (in browser console):
 *    requestMonitor.enable()
 *
 * 2. Navigate to a page (e.g., /conversations)
 *
 * 3. Check summary:
 *    requestMonitor.getSummary()
 *
 * 4. Reset and start over:
 *    requestMonitor.reset()
 *
 * 5. Disable monitoring:
 *    requestMonitor.disable()
 */
