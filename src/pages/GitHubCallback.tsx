import GitHubService from '@/services/integrations/githubService';
import { createCallbackPage } from '@/utils/createCallbackPage';

const GitHubCallback = createCallbackPage({
  integrationName: 'GitHub',
  service: GitHubService,
  integrationId: 'github',
});

export default GitHubCallback;
