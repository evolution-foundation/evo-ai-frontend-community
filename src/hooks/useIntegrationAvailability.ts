import { useState, useEffect } from 'react';
import { getIntegrationAvailability } from '@/services/agents/integrationAvailabilityService';

interface UseIntegrationAvailabilityReturn {
  /**
   * Availability map keyed by the ids used in the editor tabs (hyphen-case,
   * e.g. `google-calendar`). Value = whether the provider is globally
   * available/configured for this tenant. Missing key ⇒ treat as unavailable.
   */
  available: Record<string, boolean>;
  isLoadingAvailability: boolean;
  /** The check itself failed, so an unavailable provider may still be configured. */
  availabilityFailed: boolean;
}

/**
 * Loads the integration *availability* map once (from the CRM `:3000`
 * endpoint) and normalizes the snake_case backend keys (`google_calendar`)
 * to the hyphen-case ids the tabs use (`google-calendar`), so the consumer
 * can look up `available[integration.id]` directly.
 *
 * Fail-safe: the underlying service never throws (returns `{}`), so this hook
 * always resolves to a valid (possibly empty) map.
 */
export function useIntegrationAvailability(): UseIntegrationAvailabilityReturn {
  const [available, setAvailable] = useState<Record<string, boolean>>({});
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
  const [availabilityFailed, setAvailabilityFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const raw = await getIntegrationAvailability();

      // Normalize snake_case → hyphen-case to match the tab ids
      // (google_calendar → google-calendar; single-word keys are unchanged).
      const normalized: Record<string, boolean> = {};
      Object.entries(raw ?? {}).forEach(([key, value]) => {
        normalized[key.replace(/_/g, '-')] = Boolean(value);
      });

      if (!cancelled) {
        setAvailable(normalized);
        setAvailabilityFailed(raw === null);
        setIsLoadingAvailability(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { available, isLoadingAvailability, availabilityFailed };
}

export default useIntegrationAvailability;
