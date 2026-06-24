import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import PublicRoute from './PublicRoute';
import CustomerRoute from './CustomerRoute';
import SmartRedirect from './SmartRedirect';
import RouterGuard from '@/guards/RouterGuard';
import PermissionRoute from './PermissionRoute';
import { PluginRoutes, type PluginRoute as PluginRouteType } from '@/plugin-host';

import MainLayout from '@/components/layout/MainLayout';

// Páginas públicas
import Auth from '@/pages/Auth';
import KeycloakCallback from '@/pages/Auth/KeycloakCallback';
import EmailConfirmation from '@/components/auth/EmailConfirmation';
import ResetPassword from '@/components/auth/ResetPassword';
import InstagramCallback from '@/pages/InstagramCallback';
import GoogleCallback from '@/pages/GoogleCallback';
import GoogleCalendarCallback from '@/pages/GoogleCalendarCallback';
import GoogleSheetsCallback from '@/pages/GoogleSheetsCallback';
import GitHubCallback from '@/pages/GitHubCallback';
import NotionCallback from '@/pages/NotionCallback';
import StripeCallback from '@/pages/StripeCallback';
import LinearCallback from '@/pages/LinearCallback';
import MondayCallback from '@/pages/MondayCallback';
import AtlassianCallback from '@/pages/AtlassianCallback';
import MicrosoftCallback from '@/pages/MicrosoftCallback';
import SurveyResponse from '@/pages/Public/Survey/SurveyResponse';
import PublicChatPage from '@/pages/Public/Chat/ChatPage';
import FormPage from '@/pages/Public/Form/FormPage';

// Páginas customer
import Dashboard from '@/pages/Customer/Dashboard';
import Agents from '@/pages/Customer/Agents';
import AgentEditPage from '@/pages/Customer/Agents/Agent/AgentEditPage';
import MCPServers from '@/pages/Customer/Agents/MCPServers';
import CustomMCPServers from '@/pages/Customer/Agents/CustomMCPServers';
import Tools from '@/pages/Customer/Agents/Tools';
import CustomTools from '@/pages/Customer/Agents/CustomTools';
import Contacts from '@/pages/Customer/Contacts';
import ScheduledActions from '@/pages/Customer/Contacts/ScheduledActions';
import { Channels, ChannelSettings, NewChannel } from '@/pages/Customer/Channels';
const ChatPage = React.lazy(() => import('@/pages/Customer/Chat/ChatPage'));

import Automation from '../pages/Customer/Automation';
import AutomationForm from '../pages/Customer/Automation/AutomationForm';
// import AutomationFlowEditor from '../pages/Customer/Automation/AutomationFlowEditor';
import Pipelines from '@/pages/Customer/Pipelines/Pipelines';
import PipelineKanban from '@/pages/Customer/Pipelines/PipelineKanban';
import { AccountSettings } from '@/pages/Customer/Settings/Account';
import Teams from '@/pages/Customer/Settings/Teams/Teams';
import { AddUsers } from '@/pages/Customer/Settings/Teams';
import Users from '@/pages/Customer/Settings/Users';
import Labels from '@/pages/Customer/Settings/Labels';
import CustomAttributes from '@/pages/Customer/Settings/CustomAttributes';
import Segments from '@/pages/Customer/Settings/Segments/Segments';
import SegmentCreateEdit from '@/pages/Customer/Settings/Segments/SegmentCreateEdit';
import Journey from '@/pages/Customer/Journey/Journey';
import JourneyFlowEditor from '@/pages/Customer/Journey/JourneyFlowEditor';
import Campaigns from '@/pages/Customer/Campaigns/Campaigns';
import NewCampaign from '@/pages/Customer/Campaigns/NewCampaign/NewCampaign';
import CannedResponses from '@/pages/Customer/Settings/CannedResponses';
import MessageTemplates from '@/pages/Customer/Settings/MessageTemplates';
import { Macros } from '@/pages/Customer/Settings/Macros';
import Products, { ProductsImport } from '@/pages/Customer/Settings/Products';
import CrmForms from '@/pages/Customer/Settings/CrmForms';
import ChatPages from '@/pages/Customer/Settings/ChatPages';
import Templates from '@/pages/Customer/Settings/Templates/Templates';
import { Integrations } from '@/pages/Customer/Settings/Integrations';
import EmailTemplateEditor from '@/pages/Customer/Settings/EmailTemplateEditor';
import WebhooksPage from '../pages/Customer/Settings/Integrations/WebhooksPage';
import OAuthAppsPage from '../pages/Customer/Settings/Integrations/OAuthAppsPage';
import DashboardAppsPage from '../pages/Customer/Settings/Integrations/DashboardAppsPage';
import AccessTokens from '../pages/Customer/Settings/AccessTokens/AccessTokens';
import SlackIntegrationPage from '../pages/Customer/Settings/Integrations/SlackIntegrationPage';
import OpenAIPage from '../pages/Customer/Settings/Integrations/OpenAIPage';
import BMSPage from '../pages/Customer/Settings/Integrations/BMSPage';
import LeadSquaredPage from '../pages/Customer/Settings/Integrations/LeadSquaredPage';
import HubSpotPage from '../pages/Customer/Settings/Integrations/HubSpotPage';
import ShopifyPage from '../pages/Customer/Settings/Integrations/ShopifyPage';
import LinearPage from '../pages/Customer/Settings/Integrations/LinearPage';
import DashboardAppPage from '../pages/Customer/DashboardApp';
// import { Overview, Conversations } from '../pages/Customer/Reports';
// import * as Reports from '../pages/Customer/Reports';

// Páginas admin
import AdminSettingsLayout from '@/pages/Admin/Settings';
const RolesList = React.lazy(() => import('@/pages/Admin/Roles/RolesList'));
const RoleDetail = React.lazy(() => import('@/pages/Admin/Roles/RoleDetail'));
const SmtpConfig = React.lazy(() => import('@/pages/Admin/Settings/SmtpConfig'));
const StorageConfig = React.lazy(() => import('@/pages/Admin/Settings/StorageConfig'));
const SocialLoginConfig = React.lazy(() => import('@/pages/Admin/Settings/SocialLoginConfig'));
const ChannelConfig = React.lazy(() => import('@/pages/Admin/Settings/ChannelConfig'));
const OpenAIConfig = React.lazy(() => import('@/pages/Admin/Settings/OpenAIConfig'));
const IntegrationsConfig = React.lazy(() => import('@/pages/Admin/Settings/IntegrationsConfig'));
const EvolutionHubConfig = React.lazy(() => import('@/pages/Admin/Settings/EvolutionHubConfig'));
const InboundEmailConfig = React.lazy(() => import('@/pages/Admin/Settings/InboundEmailConfig'));
const FrontendRuntimeConfig = React.lazy(() => import('@/pages/Admin/Settings/FrontendRuntimeConfig'));

// Página de tutoriais
import Tutorials from '@/pages/Customer/Tutorials';

// Páginas compartilhadas
import Documentation from '@/pages/Shared/Documentation';
import Marketplace from '@/pages/Shared/Marketplace';
import Profile from '@/pages/Shared/Profile';

// Página de setup inicial
import Setup from '@/pages/Setup/Setup';
import OnboardingPage from '@/pages/Setup/OnboardingPage';

// Outras páginas
import NotFound from '@/pages/NotFound';
import Unauthorized from '@/pages/Unauthorized';
import Widget from '@/pages/Widget';
import AsanaCallback from '@/pages/AsanaCallback';
import HubSpotCallback from '@/pages/HubSpotCallback';
import PayPalCallback from '@/pages/PayPalCallback';
import CanvaCallback from '@/pages/CanvaCallback';
import SupabaseCallback from '@/pages/SupabaseCallback';
// import ChangePassword from '../pages/ChangePassword';

const ChatRouteElement = (
  <PrivateRoute>
    <CustomerRoute>
      <MainLayout>
        <PermissionRoute resource="conversations" action="read">
          <Suspense
            fallback={<div className="flex items-center justify-center h-full">Carregando...</div>}
          >
            <ChatPage />
          </Suspense>
        </PermissionRoute>
      </MainLayout>
    </CustomerRoute>
  </PrivateRoute>
);

const AppRouter = () => {
  return (
    <BrowserRouter>
      <RouterGuard>
        <Routes>
          {/* Redirecionamento inteligente da raiz baseado no tipo de usuário */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <SmartRedirect />
              </PrivateRoute>
            }
          />

          {/* Rotas públicas */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Auth />
              </PublicRoute>
            }
          />

          <Route
            path="/auth/confirm-email"
            element={
              <PublicRoute>
                <EmailConfirmation />
              </PublicRoute>
            }
          />

          <Route
            path="/auth/confirmation"
            element={
              <PublicRoute>
                <EmailConfirmation />
              </PublicRoute>
            }
          />

          <Route
            path="/auth/reset-password"
            element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            }
          />

          <Route
            path="/auth/password/edit"
            element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            }
          />

          {/* Keycloak PKCE Callback */}
          <Route
            path="/keycloak/callback"
            element={
              <PublicRoute>
                <KeycloakCallback />
              </PublicRoute>
            }
          />

          {/* Instagram OAuth Callback */}
          <Route
            path="/instagram/callback"
            element={
              <PublicRoute>
                <InstagramCallback />
              </PublicRoute>
            }
          />

          {/* Google OAuth Callback */}
          <Route
            path="/google/callback"
            element={
              <PublicRoute>
                <GoogleCallback />
              </PublicRoute>
            }
          />

          {/* Google Calendar OAuth Callback */}
          <Route
            path="/google-calendar/callback"
            element={
              <PublicRoute>
                <GoogleCalendarCallback />
              </PublicRoute>
            }
          />

          {/* Google Sheets OAuth Callback */}
          <Route
            path="/google-sheets/callback"
            element={
              <PublicRoute>
                <GoogleSheetsCallback />
              </PublicRoute>
            }
          />

          {/* GitHub OAuth Callback */}
          <Route
            path="/github/callback"
            element={
              <PublicRoute>
                <GitHubCallback />
              </PublicRoute>
            }
          />

          {/* Notion OAuth Callback */}
          <Route
            path="/notion/callback"
            element={
              <PublicRoute>
                <NotionCallback />
              </PublicRoute>
            }
          />

          {/* Stripe OAuth Callback */}
          <Route
            path="/stripe/callback"
            element={
              <PublicRoute>
                <StripeCallback />
              </PublicRoute>
            }
          />

          {/* Linear OAuth Callback */}
          <Route
            path="/linear/callback"
            element={
              <PublicRoute>
                <LinearCallback />
              </PublicRoute>
            }
          />

          {/* Monday OAuth Callback */}
          <Route
            path="/monday/callback"
            element={
              <PublicRoute>
                <MondayCallback />
              </PublicRoute>
            }
          />

          {/* Atlassian OAuth Callback */}
          <Route
            path="/atlassian/callback"
            element={
              <PublicRoute>
                <AtlassianCallback />
              </PublicRoute>
            }
          />

          {/* Asana OAuth Callback */}
          <Route
            path="/asana/callback"
            element={
              <PublicRoute>
                <AsanaCallback />
              </PublicRoute>
            }
          />

          {/* HubSpot OAuth Callback */}
          <Route
            path="/hubspot/callback"
            element={
              <PublicRoute>
                <HubSpotCallback />
              </PublicRoute>
            }
          />

          {/* PayPal OAuth Callback */}
          <Route
            path="/paypal/callback"
            element={
              <PublicRoute>
                <PayPalCallback />
              </PublicRoute>
            }
          />

          {/* Canva OAuth Callback */}
          <Route
            path="/canva/callback"
            element={
              <PublicRoute>
                <CanvaCallback />
              </PublicRoute>
            }
          />

          {/* Supabase OAuth Callback */}
          <Route
            path="/supabase/callback"
            element={
              <PublicRoute>
                <SupabaseCallback />
              </PublicRoute>
            }
          />

          {/* Microsoft OAuth Callback */}
          <Route
            path="/microsoft/callback"
            element={
              <PublicRoute>
                <MicrosoftCallback />
              </PublicRoute>
            }
          />

          {/* <Route path="/change-password" element={<ChangePassword />} /> */}

          {/* Public widget route (for website embeds) */}
          <Route
            path="/widget"
            element={
              <PublicRoute>
                <Widget />
              </PublicRoute>
            }
          />

          {/* Public survey response route (CSAT surveys) */}
          <Route
            path="/survey/responses/:uuid"
            element={
              <PublicRoute>
                <SurveyResponse />
              </PublicRoute>
            }
          />

          {/* Public lead-capture form route (B14.02) */}
          <Route
            path="/f/:slug"
            element={
              <PublicRoute>
                <FormPage />
              </PublicRoute>
            }
          />

          {/* Public chat page route (B14.03) */}
          <Route
            path="/chat/:slug"
            element={
              <PublicRoute>
                <PublicChatPage />
              </PublicRoute>
            }
          />

          {/* Rota de Setup Inicial */}
          <Route path="/setup" element={<Setup />} />
          <Route path="/setup/onboarding" element={<OnboardingPage />} />

          <Route
            path="/contacts"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="contacts" action="read">
                      <Contacts />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/contacts/:contactId"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="contacts" action="read">
                      <Contacts />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/contacts/scheduled-actions"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="contacts" action="read">
                      <ScheduledActions />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/pipelines"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="pipelines" action="read">
                      <Pipelines />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/pipelines/:pipelineId"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="pipelines" action="read">
                      <PipelineKanban />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/automation"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="automation_rules" action="read">
                      <Automation />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/automation/new"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="automation_rules" action="create">
                      <AutomationForm mode="create" />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/automation/:id/edit"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="automation_rules" action="update">
                      <AutomationForm mode="edit" />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          {/* <Route
            path="/automation/:id/flow"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <PermissionRoute resource="automation_rules" action="update">
                    <AutomationFlowEditor />
                  </PermissionRoute>
                </CustomerRoute>
              </PrivateRoute>
            }
          /> */}

          {/* Segments (settings subroute) */}
          <Route
            path="/settings/segments"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="segments" action="read">
                      <Segments />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/segments/new"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="segments" action="create">
                      <SegmentCreateEdit />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/segments/:id/edit"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="segments" action="update">
                      <SegmentCreateEdit />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          {/* Journeys */}
          <Route
            path="/journeys"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="journeys" action="read">
                      <Journey />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/journey/:id/flow"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="journeys" action="update">
                      <JourneyFlowEditor />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          {/* Campaigns */}
          <Route
            path="/campaigns"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="campaigns" action="read">
                      <Campaigns />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/campaigns/new"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="campaigns" action="create">
                      <NewCampaign />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/campaigns/:id/edit"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="campaigns" action="update">
                      <NewCampaign />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/account"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="accounts" action="read">
                      <AccountSettings />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/users"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="users" action="manage">
                      <Users />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/teams"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="teams" action="read">
                      <Teams />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/teams/:teamId/add-users"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="teams" action="create">
                      <AddUsers />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/labels"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="labels" action="read">
                      <Labels />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/attributes"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="custom_attribute_definitions" action="read">
                      <CustomAttributes />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/canned-responses"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="canned_responses" action="read">
                      <CannedResponses />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/message-templates"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="message_templates" action="read">
                      <MessageTemplates />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/products"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="products" action="read">
                      <Products />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/crm-forms"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="crm_forms" action="read">
                      <CrmForms />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/chat-pages"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="chat_pages" action="read">
                      <ChatPages />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/products/import"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="products" action="create">
                      <ProductsImport />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/macros"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="macros" action="read">
                      <Macros />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/templates"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="templates" action="read">
                      <Templates />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/integrations"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="integrations" action="read">
                      <Integrations />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          {/* Redirecionamentos das rotas antigas de settings para agents */}
          <Route
            path="/settings/custom-tools"
            element={<Navigate to="/agents/custom-tools" replace />}
          />

          <Route
            path="/settings/custom-mcp-servers"
            element={<Navigate to="/agents/custom-mcp-servers" replace />}
          />

          <Route
            path="/settings/integrations/webhooks"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="webhooks" action="read">
                      <WebhooksPage />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/integrations/oauth-apps"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="oauth_applications" action="read">
                      <OAuthAppsPage />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/integrations/dashboard-apps"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="dashboard_apps" action="read">
                      <DashboardAppsPage />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/integrations/slack"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="integrations" action="read">
                      <SlackIntegrationPage />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/integrations/openai"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="integrations" action="read">
                      <OpenAIPage />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/integrations/bms"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="integrations" action="read">
                      <BMSPage />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/integrations/leadsquared"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="integrations" action="read">
                      <LeadSquaredPage />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/integrations/hubspot"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="integrations" action="read">
                      <HubSpotPage />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/integrations/shopify"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="integrations" action="read">
                      <ShopifyPage />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/integrations/linear"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="integrations" action="read">
                      <LinearPage />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          {/* Dynamic Dashboard Apps Routes */}
          <Route
            path="/dashboard-app/:appId"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="integrations" action="read">
                      <DashboardAppPage />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/access-tokens"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="access_tokens" action="read">
                      <AccessTokens />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/integrations/:integrationId"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="integrations" action="read">
                      <div className="p-6">
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center">
                            <h2 className="text-2xl font-bold mb-2">🔧 Configuração</h2>
                            <p className="text-muted-foreground">
                              Página de configuração em desenvolvimento
                            </p>
                          </div>
                        </div>
                      </div>
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          {/* Reports Routes */}
          {/* <Route
            path="/reports/overview"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="reports" action="read">
                      <Overview />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/reports/conversations"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="reports" action="read">
                      <Conversations />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/reports/users"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="reports" action="read">
                      <Reports.Agents />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/reports/labels"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="reports" action="read">
                      <Reports.Labels />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          /> */}
          <Route
            path="/bots"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="bots" action="read">
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <h2 className="text-2xl font-bold mb-2">🤖 Bots</h2>
                          <p className="text-muted-foreground">Página em desenvolvimento</p>
                        </div>
                      </div>
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/channels"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="channels" action="read">
                      <Channels />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/channels/new"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="channels" action="create">
                      <NewChannel />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/channels/:id/settings"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="channels" action="create">
                      <ChannelSettings />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/settings/email-template-editor"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="message_templates" action="create">
                      <EmailTemplateEditor />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="reports" action="read">
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <h2 className="text-2xl font-bold mb-2">📊 Relatórios</h2>
                          <p className="text-muted-foreground">Página em desenvolvimento</p>
                        </div>
                      </div>
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          {/* Rota principal de agents redireciona para /agents/list */}
          <Route path="/agents" element={<Navigate to="/agents/list" replace />} />

          {/* Lista de agentes */}
          <Route
            path="/agents/list"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="ai_agents" action="read">
                      <Agents />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/agents/new"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="ai_agents" action="create">
                      <Agents />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/agents/:id/edit"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="ai_agents" action="update">
                      <AgentEditPage />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/agents/management"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="ai_agents" action="read">
                      <Agents />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/agents/mcp-servers"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="ai_mcp_servers" action="read">
                      <MCPServers />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/agents/custom-mcp-servers"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="ai_custom_mcp_servers" action="read">
                      <CustomMCPServers />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/agents/tools"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="ai_tools" action="read">
                      <Tools />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/agents/custom-tools"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="ai_custom_tools" action="read">
                      <CustomTools />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="dashboard" action="read">
                      <Dashboard />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          <Route path="/conversations" element={ChatRouteElement} />

          <Route path="/conversations/:conversationId" element={ChatRouteElement} />

          {/* Tutoriais */}
          <Route
            path="/tutorials"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <Tutorials />
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          {/* Rotas específicas de canais foram integradas no fluxo unificado do NewChannel */}
          {/* Meta e WhatsApp Cloud agora são parte do componente NewChannel */}

          {/* Roles & Permissions Routes */}
          <Route
            path="/settings/roles"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="roles" action="read">
                      <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
                        <RolesList />
                      </Suspense>
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/settings/roles/:id"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="roles" action="read">
                      <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
                        <RoleDetail />
                      </Suspense>
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          />

          {/* Admin Settings Routes */}
          <Route
            path="/settings/admin"
            element={
              <PrivateRoute>
                <CustomerRoute>
                  <MainLayout>
                    <PermissionRoute resource="installation_configs" action="manage">
                      <AdminSettingsLayout />
                    </PermissionRoute>
                  </MainLayout>
                </CustomerRoute>
              </PrivateRoute>
            }
          >
            <Route
              path="email"
              element={
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
                  <SmtpConfig />
                </Suspense>
              }
            />
            <Route
              path="storage"
              element={
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
                  <StorageConfig />
                </Suspense>
              }
            />
            <Route
              path="social-login"
              element={
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
                  <SocialLoginConfig />
                </Suspense>
              }
            />
            <Route
              path="channels"
              element={
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
                  <ChannelConfig />
                </Suspense>
              }
            />
            <Route
              path="openai"
              element={
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
                  <OpenAIConfig />
                </Suspense>
              }
            />
            <Route
              path="integrations"
              element={
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
                  <IntegrationsConfig />
                </Suspense>
              }
            />
            <Route
              path="evolution-hub"
              element={
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
                  <EvolutionHubConfig />
                </Suspense>
              }
            />
            <Route
              path="inbound-email"
              element={
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
                  <InboundEmailConfig />
                </Suspense>
              }
            />
            <Route
              path="frontend-runtime"
              element={
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
                  <FrontendRuntimeConfig />
                </Suspense>
              }
            />
          </Route>

          {/* Rotas Compartilhadas */}
          <Route
            path="/documentation"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Documentation />
                </MainLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/marketplace"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Marketplace />
                </MainLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/profile/:section?"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Profile />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* Rota 403 - Sem permissão */}
          <Route
            path="/unauthorized"
            element={
              <PrivateRoute>
                <Unauthorized />
              </PrivateRoute>
            }
          />

          {PluginRoutes({
            namespace: 'admin',
            wrap: (element, route: PluginRouteType) => (
              <PrivateRoute>
                {route.layout === 'none' ? element : <MainLayout>{element}</MainLayout>}
              </PrivateRoute>
            ),
          })}

          {PluginRoutes({
            namespace: 'customer',
            wrap: (element, route: PluginRouteType) => (
              <PrivateRoute>
                <CustomerRoute>
                  {route.layout === 'none' ? element : <MainLayout>{element}</MainLayout>}
                </CustomerRoute>
              </PrivateRoute>
            ),
          })}

          {PluginRoutes({ namespace: 'public' })}

          {/* Rota 404 - Página não encontrada */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </RouterGuard>
    </BrowserRouter>
  );
};

export default AppRouter;
