import CallbackPage from '@/components/integrations/CallbackPage';

interface IntegrationService {
  completeAuthorization: (
    agentId: string,
    code: string,
    state: string
  ) => Promise<{ success: boolean; error?: string; username?: string }>;
}

interface CallbackConfig {
  integrationName: string;
  service: IntegrationService;
  iconPath?: string;
  iconPathDark?: string;
  integrationId?: string;
  onSuccess?: (response: any, agentId: string) => Promise<void> | void;
  redirectPath?: string | ((agentId: string) => string);
}

/**
 * Helper function to create a callback page component
 * This eliminates code duplication across all callback pages
 */
export function createCallbackPage({ integrationName, service, iconPath, iconPathDark, integrationId, onSuccess, redirectPath }: CallbackConfig) {
  function CallbackComponent() {
    return (
      <CallbackPage
        integrationName={integrationName}
        onCallback={async (code, state, agentId) => {
          // MCP integrations require agentId
          if (!agentId) {
            throw new Error('Agent ID is required for MCP integrations');
          }
          return await service.completeAuthorization(agentId, code, state);
        }}
        onSuccess={onSuccess}
        redirectPath={redirectPath}
        iconPath={iconPath}
        iconPathDark={iconPathDark}
        integrationId={integrationId}
      />
    );
  }

  CallbackComponent.displayName = `${integrationName}Callback`;
  return CallbackComponent;
}

