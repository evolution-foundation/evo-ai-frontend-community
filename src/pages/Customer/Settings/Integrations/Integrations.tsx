import { useState, useCallback } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigate } from 'react-router-dom';
import { SettingsIntegrationsTour } from '@/tours';
import {
  Card,
  Badge,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Skeleton,
} from '@evoapi/design-system';
import { Search, Puzzle, Grid3X3 } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';
import BaseHeader from '@/components/base/BaseHeader';
import { integrationsService } from '@/services/integrations';
import { Integration, IntegrationCategory } from '@/types/integrations';
import { IntegrationCard } from '@/components/integrations/base';
import { toast } from 'sonner';
import { usePermissions } from '@/contexts/PermissionsContext';
import { usePermissionGatedLoad } from '@/hooks/rbac/usePermissionGatedLoad';
import { useGlobalConfig } from '@/contexts/GlobalConfigContext';

// Integration categories for organization - will be translated
const getIntegrationCategories = (t: (key: string) => string): IntegrationCategory[] => [
  { id: 'all', name: t('categories.all'), icon: Grid3X3 },
  { id: 'crm', name: t('categories.crm'), icon: null },
  { id: 'communication', name: t('categories.communication'), icon: null },
  { id: 'productivity', name: t('categories.productivity'), icon: null },
  { id: 'ai', name: t('categories.ai'), icon: null },
  { id: 'custom', name: t('categories.custom'), icon: null },
];

// Map integration IDs to categories
const INTEGRATION_CATEGORY_MAP: Record<string, string> = {
  // CRM
  bms: 'crm',
  leadsquared: 'crm',
  hubspot: 'crm',

  // Communication
  slack: 'communication',
  dyte: 'communication',
  google_translate: 'communication',

  // Productivity
  linear: 'productivity',
  shopify: 'productivity',
  google_workspace: 'productivity',
  google_ads: 'productivity',

  // AI & Automation
  openai: 'ai',
  gemini: 'ai',
  dialogflow: 'ai',
  groq: 'ai',
  elevenlabs: 'ai',
  huggingface: 'ai',

  // Custom
  webhook: 'custom',
  dashboard_apps: 'custom',
  oauth_applications: 'custom',
};

export default function Integrations() {
  const { t } = useLanguage('integrations');
  const { can } = usePermissions();
  const { openaiConfigured } = useGlobalConfig();
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Load integrations
  const loadIntegrations = useCallback(async () => {
    if (!can('integrations', 'read')) {
      toast.error(t('messages.permissionDenied.read'));
      return;
    }

    setLoading(true);
    try {
      const response = await integrationsService.getIntegrations();
      setIntegrations(response.data);
    } catch (error) {
      console.error('Error loading integrations:', error);
      toast.error(t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [can, t]);

  usePermissionGatedLoad({
    resource: 'integrations',
    load: loadIntegrations,
    onDenied: () => toast.error(t('messages.permissionDenied.read')),
  });

  // Handle integration toggle
  const handleToggleIntegration = async (integration: Integration) => {
    if (!can('integrations', 'update')) {
      toast.error(t('messages.permissionDenied.update'));
      return;
    }
    setProcessingId(integration.id);
    try {
      if (integration.enabled) {
        // Special handling for different integration types
        if (['slack', 'hubspot', 'linear', 'shopify'].includes(integration.id)) {
          // OAuth integrations have specific delete endpoints
          await integrationsService.deleteIntegration(integration.id);
        } else if (
          ['openai', 'gemini', 'google_workspace', 'bms', 'leadsquared', 'google_translate', 'dialogflow'].includes(
            integration.id,
          )
        ) {
          // Hook-based integrations - need to delete the hook
          const hook = await integrationsService.getIntegrationHook(integration.id);
          if (hook) {
            await integrationsService.deleteIntegrationHook(hook.id);
          }
        } else {
          await integrationsService.toggleIntegration(integration.id, false);
        }
        toast.success(t('messages.disconnected', { name: integration.name }));
      } else {
        // Check if it's an OAuth integration that needs redirect
        if (integration.action && integration.action.startsWith('http')) {
          // OAuth flow - redirect to provider
          window.location.href = integration.action;
          return;
        } else {
          // Navigate to configuration page
          handleConfigureIntegration(integration);
          return;
        }
      }

      // Reload integrations
      await loadIntegrations();
    } catch (error) {
      console.error('Error toggling integration:', error);
      toast.error(t('messages.toggleError'));
    } finally {
      setProcessingId(null);
    }
  };

  // Handle integration configuration
  const handleConfigureIntegration = (integration: Integration) => {
    if (!can('integrations', 'update')) {
      toast.error(t('messages.permissionDenied.update'));
      return;
    }
    // Special routes for custom integrations
    if (integration.id === 'webhook') {
      navigate(`/settings/integrations/webhooks`);
    } else if (integration.id === 'dashboard_apps') {
      navigate(`/settings/integrations/dashboard-apps`);
    } else if (integration.id === 'oauth_applications') {
      navigate(`/settings/integrations/oauth-apps`);
    } else {
      // Generic integration configuration page
      navigate(`/settings/integrations/${integration.id}`);
    }
  };

  const visibleIntegrations = integrations.filter(
    integration => !(integration.id === 'openai' && openaiConfigured),
  );

  // Filter integrations
  const filteredIntegrations = visibleIntegrations.filter(integration => {
    // Category filter
    if (selectedCategory !== 'all') {
      const category = INTEGRATION_CATEGORY_MAP[integration.id] || 'custom';
      if (category !== selectedCategory) return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        integration.name.toLowerCase().includes(query) ||
        integration.description.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Count integrations by category
  const getCategoryCount = (categoryId: string) => {
    if (categoryId === 'all') return visibleIntegrations.length;

    return visibleIntegrations.filter(integration => {
      const category = INTEGRATION_CATEGORY_MAP[integration.id] || 'custom';
      return category === categoryId;
    }).length;
  };

  // Check if integration is config-only
  const isConfigOnlyIntegration = (integrationId: string) => {
    return ['webhook', 'dashboard_apps', 'oauth_applications'].includes(integrationId);
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col p-4">
        <BaseHeader title={t('header.title')} subtitle={t('header.subtitle')} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <Skeleton className="w-16 h-6 rounded-full" />
              </div>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 w-24" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4" data-tour="settings-integrations-page">
      <SettingsIntegrationsTour />
      <div data-tour="settings-integrations-header">
        <BaseHeader title={t('title')} subtitle={t('subtitle')} />
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 mt-6" data-tour="settings-integrations-search">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
          <Input
            placeholder={t('search.placeholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div data-tour="settings-integrations-categories">
      <Tabs
        value={selectedCategory}
        onValueChange={setSelectedCategory}
        className="flex-1 flex flex-col"
      >
        <TabsList className="w-full justify-start mb-4">
          {getIntegrationCategories(t).map(category => (
            <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2">
              {category.icon && <category.icon className="w-4 h-4" />}
              {category.name}
              <Badge variant="secondary" className="ml-1">
                {getCategoryCount(category.id)}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="flex-1 mt-0">
          {filteredIntegrations.length === 0 ? (
            <EmptyState
              icon={Puzzle}
              title={t('empty.title')}
              description={
                searchQuery ? t('empty.descriptionWithSearch') : t('empty.descriptionWithoutSearch')
              }
              className="h-full"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredIntegrations.map(integration => (
                <IntegrationCard
                  key={integration.id}
                  integration={{
                    ...integration,
                    enabled: isConfigOnlyIntegration(integration.id)
                      ? true
                      : integration.enabled && processingId !== integration.id,
                  }}
                  onConfigure={() => handleConfigureIntegration(integration)}
                  onToggle={
                    isConfigOnlyIntegration(integration.id) || !can('integrations', 'update')
                      ? undefined
                      : () => handleToggleIntegration(integration)
                  }
                  isProcessing={processingId === integration.id}
                  configOnly={isConfigOnlyIntegration(integration.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
