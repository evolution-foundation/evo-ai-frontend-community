import { createContext, useContext, type ReactNode } from 'react';

/** Generic credentials the host hands a post-bootstrap step (e.g. to upload
 *  assets behind an authenticated endpoint). Not brand-specific. */
export interface SetupCredentials {
  email: string;
  password: string;
}

export interface SetupHostContextValue {
  /** True while the host's bootstrap call is in flight. */
  isLoading: boolean;
  /** Host-level error string ('' when none). */
  error: string;
  /** Return to the account step. */
  goBack: () => void;
  /**
   * Finish the install. The host merges `extensionPayload` into the single
   * /setup/bootstrap request under the opaque `extension_payload` key, and on
   * success invokes `afterBootstrap` with generic credentials. The host assigns
   * NO meaning to `extensionPayload`.
   */
  submit: (
    extensionPayload?: Record<string, unknown>,
    afterBootstrap?: (credentials: SetupCredentials) => Promise<void>,
  ) => void;
}

const SetupHostContext = createContext<SetupHostContextValue | null>(null);

export function SetupHostProvider({
  value,
  children,
}: {
  value: SetupHostContextValue;
  children: ReactNode;
}) {
  return <SetupHostContext.Provider value={value}>{children}</SetupHostContext.Provider>;
}

/** Read by a `setup.steps` slot contribution. Throws if used outside the host. */
export function useSetupHost(): SetupHostContextValue {
  const ctx = useContext(SetupHostContext);
  if (!ctx) {
    throw new Error('[plugin-host] useSetupHost must be used within <SetupHostProvider>');
  }
  return ctx;
}
