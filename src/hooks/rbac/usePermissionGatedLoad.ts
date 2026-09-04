import { useEffect, useRef } from 'react';
import { usePermissions } from '@/contexts/PermissionsContext';

interface PermissionGatedLoadArgs {
  /** Resource key of the read permission. Changing it re-opens the gate. */
  resource: string;
  /** The screen's initial load. Fired once per allowed verdict, with no arguments. */
  load: () => void;
  /** Reports the denial. Fired once per denied verdict — omit for a silent screen. */
  onDenied?: () => void;
}

/**
 * Runs a list screen's initial load as soon as `can(resource, 'read')` allows it.
 *
 * The latch follows the VERDICT, not the first render where permissions were ready:
 * a false answered before the grants landed used to stick until the screen remounted.
 */
export function usePermissionGatedLoad({ resource, load, onDenied }: PermissionGatedLoadArgs): void {
  const { can, isReady } = usePermissions();
  const allowed = isReady && can(resource, 'read');

  // Latest-callback refs: callers pass inline closures, which as dependencies
  // would re-run the gate on every render.
  const loadRef = useRef(load);
  const onDeniedRef = useRef(onDenied);
  useEffect(() => {
    loadRef.current = load;
    onDeniedRef.current = onDenied;
  });

  const loadedRef = useRef(false);
  const deniedRef = useRef(false);
  const resourceRef = useRef(resource);

  useEffect(() => {
    // Both latches answer for one resource. Keeping them across a change would
    // carry the old key's verdict onto the new one.
    if (resourceRef.current !== resource) {
      resourceRef.current = resource;
      loadedRef.current = false;
      deniedRef.current = false;
    }

    if (!isReady) return;

    if (allowed) {
      // A later revocation is a new verdict and gets its own denial.
      deniedRef.current = false;
      if (loadedRef.current) return;
      loadedRef.current = true;
      loadRef.current();
      return;
    }

    // Clearing the load latch is what makes a later grant load instead of staying
    // empty. The reload calls `load()` with no arguments, so each screen resumes
    // from the state it is holding — its current page and filters, not the first.
    loadedRef.current = false;
    if (deniedRef.current) return;
    deniedRef.current = true;
    onDeniedRef.current?.();
  }, [isReady, allowed, resource]);
}
