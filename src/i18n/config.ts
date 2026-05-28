import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ptBRAuth from './locales/pt-BR/auth.json';
import ptBRChangePassword from './locales/pt-BR/changePassword.json';
import ptBRMcpServers from './locales/pt-BR/mcpServers.json';
import ptBRCustomerMcpServers from './locales/pt-BR/customerMcpServers.json';
import ptBRCustomMcpServers from './locales/pt-BR/customMcpServers.json';
import ptBRCustomTools from './locales/pt-BR/customTools.json';
import ptBRTools from './locales/pt-BR/tools.json';
import ptBRAgents from './locales/pt-BR/agents.json';
import ptBRChannels from './locales/pt-BR/channels.json';
import ptBRNotFound from './locales/pt-BR/notFound.json';
import ptBRUnauthorized from './locales/pt-BR/unauthorized.json';
import ptBROAuth from './locales/pt-BR/oauth.json';
import ptBRProfile from './locales/pt-BR/profile.json';
import ptBROnboarding from './locales/pt-BR/onboarding.json';
import ptBRSetup from './locales/pt-BR/setup.json';
import ptBRWidget from './locales/pt-BR/widget.json';
import ptBRPipelines from './locales/pt-BR/pipelines.json';
import ptBRContacts from './locales/pt-BR/contacts.json';
import ptBRChat from './locales/pt-BR/chat.json';
import ptBRLayout from './locales/pt-BR/layout.json';
import ptBRCommon from './locales/pt-BR/common.json';
import ptBRAccountSettings from './locales/pt-BR/accountSettings.json';
import ptBRCannedResponses from './locales/pt-BR/cannedResponses.json';
import ptBRProducts from './locales/pt-BR/products.json';
import ptBRTemplates from './locales/pt-BR/templates.json';
import ptBRCustomAttributes from './locales/pt-BR/customAttributes.json';
import ptBRLabels from './locales/pt-BR/labels.json';
import ptBRMacros from './locales/pt-BR/macros.json';
import ptBRAutomation from './locales/pt-BR/automation.json';
import ptBRTeams from './locales/pt-BR/teams.json';
import ptBRUsers from './locales/pt-BR/users.json';
import ptBRMarketplace from './locales/pt-BR/marketplace.json';
import ptBRDocumentation from './locales/pt-BR/documentation.json';
import ptBRAiAgents from './locales/pt-BR/aiAgents.json';
import ptBRApiKeys from './locales/pt-BR/apiKeys.json';
import ptBRAccessTokens from './locales/pt-BR/accessTokens.json';
import ptBRIntegrations from './locales/pt-BR/integrations.json';
import ptBRAttachments from './locales/pt-BR/attachments.json';
import ptBRWebWidget from './locales/pt-BR/webWidget.json';
import ptBRWhatsapp from './locales/pt-BR/whatsapp.json';
import ptBRTelegram from './locales/pt-BR/telegram.json';
import ptBREmail from './locales/pt-BR/email.json';
import ptBRSms from './locales/pt-BR/sms.json';
import ptBRApi from './locales/pt-BR/api.json';
import ptBRInstagram from './locales/pt-BR/instagram.json';
import ptBRMessenger from './locales/pt-BR/messenger.json';
import ptBRCustomerDashboard from './locales/pt-BR/customerDashboard.json';
import ptBRAdminSettings from './locales/pt-BR/adminSettings.json';
import ptBRRoles from './locales/pt-BR/roles.json';
import ptBRTutorials from './locales/pt-BR/tutorials.json';
import ptAuth from './locales/pt/auth.json';
import ptChangePassword from './locales/pt/changePassword.json';
import ptMcpServers from './locales/pt/mcpServers.json';
import ptCustomerMcpServers from './locales/pt/customerMcpServers.json';
import ptCustomMcpServers from './locales/pt/customMcpServers.json';
import ptCustomTools from './locales/pt/customTools.json';
import ptTools from './locales/pt/tools.json';
import ptAgents from './locales/pt/agents.json';
import ptChannels from './locales/pt/channels.json';
import ptNotFound from './locales/pt/notFound.json';
import ptUnauthorized from './locales/pt/unauthorized.json';
import ptOAuth from './locales/pt/oauth.json';
import ptProfile from './locales/pt/profile.json';
import ptOnboarding from './locales/pt/onboarding.json';
import ptSetup from './locales/pt/setup.json';
import ptWidget from './locales/pt/widget.json';
import ptPipelines from './locales/pt/pipelines.json';
import ptContacts from './locales/pt/contacts.json';
import ptChat from './locales/pt/chat.json';
import ptLayout from './locales/pt/layout.json';
import ptCommon from './locales/pt/common.json';
import ptAccountSettings from './locales/pt/accountSettings.json';
import ptCannedResponses from './locales/pt/cannedResponses.json';
import ptProducts from './locales/pt/products.json';
import ptTemplates from './locales/pt/templates.json';
import ptCustomAttributes from './locales/pt/customAttributes.json';
import ptLabels from './locales/pt/labels.json';
import ptMacros from './locales/pt/macros.json';
import ptTeams from './locales/pt/teams.json';
import ptUsers from './locales/pt/users.json';
import ptMarketplace from './locales/pt/marketplace.json';
import ptDocumentation from './locales/pt/documentation.json';
import ptAiAgents from './locales/pt/aiAgents.json';
import ptApiKeys from './locales/pt/apiKeys.json';
import ptAccessTokens from './locales/pt/accessTokens.json';
import ptIntegrations from './locales/pt/integrations.json';
import ptAttachments from './locales/pt/attachments.json';
import ptWebWidget from './locales/pt/webWidget.json';
import ptWhatsapp from './locales/pt/whatsapp.json';
import ptTelegram from './locales/pt/telegram.json';
import ptEmail from './locales/pt/email.json';
import ptSms from './locales/pt/sms.json';
import ptApi from './locales/pt/api.json';
import ptInstagram from './locales/pt/instagram.json';
import ptMessenger from './locales/pt/messenger.json';
import ptCustomerDashboard from './locales/pt/customerDashboard.json';
import ptAdminSettings from './locales/pt/adminSettings.json';
import ptRoles from './locales/pt/roles.json';
import ptTutorials from './locales/pt/tutorials.json';
import enAuth from './locales/en/auth.json';
import enChangePassword from './locales/en/changePassword.json';
import enMcpServers from './locales/en/mcpServers.json';
import enCustomerMcpServers from './locales/en/customerMcpServers.json';
import enCustomMcpServers from './locales/en/customMcpServers.json';
import enCustomTools from './locales/en/customTools.json';
import enTools from './locales/en/tools.json';
import enAgents from './locales/en/agents.json';
import enChannels from './locales/en/channels.json';
import enNotFound from './locales/en/notFound.json';
import enUnauthorized from './locales/en/unauthorized.json';
import enOAuth from './locales/en/oauth.json';
import enProfile from './locales/en/profile.json';
import enOnboarding from './locales/en/onboarding.json';
import enSetup from './locales/en/setup.json';
import enWidget from './locales/en/widget.json';
import enPipelines from './locales/en/pipelines.json';
import enContacts from './locales/en/contacts.json';
import enChat from './locales/en/chat.json';
import enLayout from './locales/en/layout.json';
import enCommon from './locales/en/common.json';
import enAccountSettings from './locales/en/accountSettings.json';
import enCannedResponses from './locales/en/cannedResponses.json';
import enProducts from './locales/en/products.json';
import enTemplates from './locales/en/templates.json';
import enCustomAttributes from './locales/en/customAttributes.json';
import enLabels from './locales/en/labels.json';
import enMacros from './locales/en/macros.json';
import enAutomation from './locales/en/automation.json';
import enTeams from './locales/en/teams.json';
import enUsers from './locales/en/users.json';
import enMarketplace from './locales/en/marketplace.json';
import enDocumentation from './locales/en/documentation.json';
import enAiAgents from './locales/en/aiAgents.json';
import enApiKeys from './locales/en/apiKeys.json';
import enAccessTokens from './locales/en/accessTokens.json';
import enIntegrations from './locales/en/integrations.json';
import enAttachments from './locales/en/attachments.json';
import enWebWidget from './locales/en/webWidget.json';
import enWhatsapp from './locales/en/whatsapp.json';
import enTelegram from './locales/en/telegram.json';
import enEmail from './locales/en/email.json';
import enSms from './locales/en/sms.json';
import enApi from './locales/en/api.json';
import enInstagram from './locales/en/instagram.json';
import enMessenger from './locales/en/messenger.json';
import enCustomerDashboard from './locales/en/customerDashboard.json';
import enAdminSettings from './locales/en/adminSettings.json';
import enRoles from './locales/en/roles.json';
import enTutorials from './locales/en/tutorials.json';
import esAuth from './locales/es/auth.json';
import esChangePassword from './locales/es/changePassword.json';
import esMcpServers from './locales/es/mcpServers.json';
import esCustomerMcpServers from './locales/es/customerMcpServers.json';
import esCustomMcpServers from './locales/es/customMcpServers.json';
import esCustomTools from './locales/es/customTools.json';
import esTools from './locales/es/tools.json';
import esAgents from './locales/es/agents.json';
import esChannels from './locales/es/channels.json';
import esNotFound from './locales/es/notFound.json';
import esUnauthorized from './locales/es/unauthorized.json';
import esOAuth from './locales/es/oauth.json';
import esProfile from './locales/es/profile.json';
import esOnboarding from './locales/es/onboarding.json';
import esSetup from './locales/es/setup.json';
import esWidget from './locales/es/widget.json';
import esPipelines from './locales/es/pipelines.json';
import esContacts from './locales/es/contacts.json';
import esChat from './locales/es/chat.json';
import esLayout from './locales/es/layout.json';
import esCommon from './locales/es/common.json';
import esAccountSettings from './locales/es/accountSettings.json';
import esCannedResponses from './locales/es/cannedResponses.json';
import esProducts from './locales/es/products.json';
import esTemplates from './locales/es/templates.json';
import esCustomAttributes from './locales/es/customAttributes.json';
import esLabels from './locales/es/labels.json';
import esMacros from './locales/es/macros.json';
import esTeams from './locales/es/teams.json';
import esUsers from './locales/es/users.json';
import esMarketplace from './locales/es/marketplace.json';
import esDocumentation from './locales/es/documentation.json';
import esAiAgents from './locales/es/aiAgents.json';
import esApiKeys from './locales/es/apiKeys.json';
import esAccessTokens from './locales/es/accessTokens.json';
import esIntegrations from './locales/es/integrations.json';
import esAttachments from './locales/es/attachments.json';
import esWebWidget from './locales/es/webWidget.json';
import esWhatsapp from './locales/es/whatsapp.json';
import esTelegram from './locales/es/telegram.json';
import esEmail from './locales/es/email.json';
import esSms from './locales/es/sms.json';
import esApi from './locales/es/api.json';
import esInstagram from './locales/es/instagram.json';
import esMessenger from './locales/es/messenger.json';
import esCustomerDashboard from './locales/es/customerDashboard.json';
import esAdminSettings from './locales/es/adminSettings.json';
import esRoles from './locales/es/roles.json';
import esTutorials from './locales/es/tutorials.json';
import frAuth from './locales/fr/auth.json';
import frChangePassword from './locales/fr/changePassword.json';
import frMcpServers from './locales/fr/mcpServers.json';
import frCustomerMcpServers from './locales/fr/customerMcpServers.json';
import frCustomMcpServers from './locales/fr/customMcpServers.json';
import frCustomTools from './locales/fr/customTools.json';
import frTools from './locales/fr/tools.json';
import frAgents from './locales/fr/agents.json';
import frChannels from './locales/fr/channels.json';
import frNotFound from './locales/fr/notFound.json';
import frUnauthorized from './locales/fr/unauthorized.json';
import frOAuth from './locales/fr/oauth.json';
import frProfile from './locales/fr/profile.json';
import frOnboarding from './locales/fr/onboarding.json';
import frSetup from './locales/fr/setup.json';
import frWidget from './locales/fr/widget.json';
import frPipelines from './locales/fr/pipelines.json';
import frContacts from './locales/fr/contacts.json';
import frChat from './locales/fr/chat.json';
import frLayout from './locales/fr/layout.json';
import frCommon from './locales/fr/common.json';
import frAccountSettings from './locales/fr/accountSettings.json';
import frCannedResponses from './locales/fr/cannedResponses.json';
import frProducts from './locales/fr/products.json';
import frTemplates from './locales/fr/templates.json';
import frCustomAttributes from './locales/fr/customAttributes.json';
import frLabels from './locales/fr/labels.json';
import frMacros from './locales/fr/macros.json';
import frTeams from './locales/fr/teams.json';
import frUsers from './locales/fr/users.json';
import frMarketplace from './locales/fr/marketplace.json';
import frDocumentation from './locales/fr/documentation.json';
import frAiAgents from './locales/fr/aiAgents.json';
import frApiKeys from './locales/fr/apiKeys.json';
import frAccessTokens from './locales/fr/accessTokens.json';
import frIntegrations from './locales/fr/integrations.json';
import frAttachments from './locales/fr/attachments.json';
import frWebWidget from './locales/fr/webWidget.json';
import frWhatsapp from './locales/fr/whatsapp.json';
import frTelegram from './locales/fr/telegram.json';
import frEmail from './locales/fr/email.json';
import frSms from './locales/fr/sms.json';
import frApi from './locales/fr/api.json';
import frInstagram from './locales/fr/instagram.json';
import frMessenger from './locales/fr/messenger.json';
import frCustomerDashboard from './locales/fr/customerDashboard.json';
import frAdminSettings from './locales/fr/adminSettings.json';
import frRoles from './locales/fr/roles.json';
import frTutorials from './locales/fr/tutorials.json';
import itAuth from './locales/it/auth.json';
import itChangePassword from './locales/it/changePassword.json';
import itMcpServers from './locales/it/mcpServers.json';
import itCustomerMcpServers from './locales/it/customerMcpServers.json';
import itCustomMcpServers from './locales/it/customMcpServers.json';
import itCustomTools from './locales/it/customTools.json';
import itTools from './locales/it/tools.json';
import itAgents from './locales/it/agents.json';
import itChannels from './locales/it/channels.json';
import itNotFound from './locales/it/notFound.json';
import itUnauthorized from './locales/it/unauthorized.json';
import itOAuth from './locales/it/oauth.json';
import itProfile from './locales/it/profile.json';
import itOnboarding from './locales/it/onboarding.json';
import itSetup from './locales/it/setup.json';
import itWidget from './locales/it/widget.json';
import itPipelines from './locales/it/pipelines.json';
import itContacts from './locales/it/contacts.json';
import itChat from './locales/it/chat.json';
import itLayout from './locales/it/layout.json';
import itCommon from './locales/it/common.json';
import itAccountSettings from './locales/it/accountSettings.json';
import itCannedResponses from './locales/it/cannedResponses.json';
import itProducts from './locales/it/products.json';
import itTemplates from './locales/it/templates.json';
import itCustomAttributes from './locales/it/customAttributes.json';
import itLabels from './locales/it/labels.json';
import itMacros from './locales/it/macros.json';
import itTeams from './locales/it/teams.json';
import itUsers from './locales/it/users.json';
import itMarketplace from './locales/it/marketplace.json';
import itDocumentation from './locales/it/documentation.json';
import itAiAgents from './locales/it/aiAgents.json';
import itApiKeys from './locales/it/apiKeys.json';
import itAccessTokens from './locales/it/accessTokens.json';
import itIntegrations from './locales/it/integrations.json';
import itAttachments from './locales/it/attachments.json';
import itWebWidget from './locales/it/webWidget.json';
import itWhatsapp from './locales/it/whatsapp.json';
import itTelegram from './locales/it/telegram.json';
import itEmail from './locales/it/email.json';
import itSms from './locales/it/sms.json';
import itApi from './locales/it/api.json';
import itInstagram from './locales/it/instagram.json';
import itMessenger from './locales/it/messenger.json';
import itCustomerDashboard from './locales/it/customerDashboard.json';
import itAdminSettings from './locales/it/adminSettings.json';
import itRoles from './locales/it/roles.json';
import ptBRTours from './locales/pt-BR/tours.json';
import ptTours from './locales/pt/tours.json';
import enTours from './locales/en/tours.json';
import esTours from './locales/es/tours.json';
import frTours from './locales/fr/tours.json';
import itTours from './locales/it/tours.json'
import itTutorials from './locales/it/tutorials.json';

// Segments / Journey / Campaigns namespaces
import ptBRSegments from './locales/pt-BR/segments.json';
import ptBRJourney from './locales/pt-BR/journey.json';
import ptBRCampaigns from './locales/pt-BR/campaigns.json';
import ptBREvents from './locales/pt-BR/events.json';
import ptSegments from './locales/pt/segments.json';
import ptJourney from './locales/pt/journey.json';
import ptCampaigns from './locales/pt/campaigns.json';
import ptEvents from './locales/pt/events.json';
import enSegments from './locales/en/segments.json';
import enJourney from './locales/en/journey.json';
import enCampaigns from './locales/en/campaigns.json';
import enEvents from './locales/en/events.json';
import esSegments from './locales/es/segments.json';
import esJourney from './locales/es/journey.json';
import esCampaigns from './locales/es/campaigns.json';
import esEvents from './locales/es/events.json';
import frSegments from './locales/fr/segments.json';
import frJourney from './locales/fr/journey.json';
import frCampaigns from './locales/fr/campaigns.json';
import frEvents from './locales/fr/events.json';
import itSegments from './locales/it/segments.json';
import itJourney from './locales/it/journey.json';
import itCampaigns from './locales/it/campaigns.json';
import itEvents from './locales/it/events.json';
export const locales = ['en', 'pt-BR', 'pt', 'fr', 'it', 'es'] as const;
export const defaultLocale = 'en' as const;

export type Locale = (typeof locales)[number];

const detectLanguage = (): Locale => {
  const savedLang = localStorage.getItem('i18nextLng');
  if (savedLang && locales.includes(savedLang as Locale)) {
    return savedLang as Locale;
  }

  const browserLang = navigator.language;
  if (browserLang === 'pt-BR' || browserLang === 'pt_BR') {
    return 'pt-BR';
  }
  if (browserLang === 'pt') {
    return 'pt';
  }
  if (browserLang === 'fr' || browserLang.startsWith('fr-')) {
    return 'fr';
  }
  if (browserLang === 'it' || browserLang.startsWith('it-')) {
    return 'it';
  }
  if (browserLang === 'es' || browserLang.startsWith('es-')) {
    return 'es';
  }
  if (browserLang === 'en' || browserLang.startsWith('en-')) {
    return 'en';
  }

  return defaultLocale;
};

const resources = {
  'pt-BR': {
    auth: ptBRAuth,
    changePassword: ptBRChangePassword,
    mcpServers: ptBRMcpServers,
    customerMcpServers: ptBRCustomerMcpServers,
    customMcpServers: ptBRCustomMcpServers,
    customTools: ptBRCustomTools,
    tools: ptBRTools,
    agents: ptBRAgents,
    channels: ptBRChannels,
    notFound: ptBRNotFound,
    unauthorized: ptBRUnauthorized,
    oauth: ptBROAuth,
    profile: ptBRProfile,
    onboarding: ptBROnboarding,
    setup: ptBRSetup,
    widget: ptBRWidget,
    pipelines: ptBRPipelines,
    contacts: ptBRContacts,
    chat: ptBRChat,
    layout: ptBRLayout,
    common: ptBRCommon,
    accountSettings: ptBRAccountSettings,
    cannedResponses: ptBRCannedResponses,
    products: ptBRProducts,
    templates: ptBRTemplates,
    customAttributes: ptBRCustomAttributes,
    labels: ptBRLabels,
    macros: ptBRMacros,
    automation: ptBRAutomation,
    teams: ptBRTeams,
    users: ptBRUsers,
    marketplace: ptBRMarketplace,
    documentation: ptBRDocumentation,
    aiAgents: ptBRAiAgents,
    apiKeys: ptBRApiKeys,
    accessTokens: ptBRAccessTokens,
    integrations: ptBRIntegrations,
    attachments: ptBRAttachments,
    webWidget: ptBRWebWidget,
    whatsapp: ptBRWhatsapp,
    telegram: ptBRTelegram,
    email: ptBREmail,
    sms: ptBRSms,
    api: ptBRApi,
    instagram: ptBRInstagram,
    messenger: ptBRMessenger,
    customerDashboard: ptBRCustomerDashboard,
    adminSettings: ptBRAdminSettings,
    roles: ptBRRoles,
    tours: ptBRTours,
    tutorials: ptBRTutorials,
    segments: ptBRSegments,
    journey: ptBRJourney,
    campaigns: ptBRCampaigns,
    events: ptBREvents,
  },
  pt: {
    auth: ptAuth,
    changePassword: ptChangePassword,
    mcpServers: ptMcpServers,
    customerMcpServers: ptCustomerMcpServers,
    customMcpServers: ptCustomMcpServers,
    customTools: ptCustomTools,
    tools: ptTools,
    agents: ptAgents,
    channels: ptChannels,
    notFound: ptNotFound,
    unauthorized: ptUnauthorized,
    oauth: ptOAuth,
    profile: ptProfile,
    onboarding: ptOnboarding,
    setup: ptSetup,
    widget: ptWidget,
    pipelines: ptPipelines,
    contacts: ptContacts,
    chat: ptChat,
    layout: ptLayout,
    common: ptCommon,
    accountSettings: ptAccountSettings,
    cannedResponses: ptCannedResponses,
    products: ptProducts,
    templates: ptTemplates,
    customAttributes: ptCustomAttributes,
    labels: ptLabels,
    macros: ptMacros,
    teams: ptTeams,
    users: ptUsers,
    marketplace: ptMarketplace,
    documentation: ptDocumentation,
    aiAgents: ptAiAgents,
    apiKeys: ptApiKeys,
    accessTokens: ptAccessTokens,
    integrations: ptIntegrations,
    attachments: ptAttachments,
    webWidget: ptWebWidget,
    whatsapp: ptWhatsapp,
    telegram: ptTelegram,
    email: ptEmail,
    sms: ptSms,
    api: ptApi,
    instagram: ptInstagram,
    messenger: ptMessenger,
    customerDashboard: ptCustomerDashboard,
    adminSettings: ptAdminSettings,
    roles: ptRoles,
    tours: ptTours,
    tutorials: ptTutorials,
    segments: ptSegments,
    journey: ptJourney,
    campaigns: ptCampaigns,
    events: ptEvents,
  },
  en: {
    auth: enAuth,
    changePassword: enChangePassword,
    mcpServers: enMcpServers,
    customerMcpServers: enCustomerMcpServers,
    customMcpServers: enCustomMcpServers,
    customTools: enCustomTools,
    tools: enTools,
    agents: enAgents,
    channels: enChannels,
    notFound: enNotFound,
    unauthorized: enUnauthorized,
    oauth: enOAuth,
    profile: enProfile,
    onboarding: enOnboarding,
    setup: enSetup,
    widget: enWidget,
    pipelines: enPipelines,
    contacts: enContacts,
    chat: enChat,
    layout: enLayout,
    common: enCommon,
    accountSettings: enAccountSettings,
    cannedResponses: enCannedResponses,
    products: enProducts,
    templates: enTemplates,
    customAttributes: enCustomAttributes,
    labels: enLabels,
    macros: enMacros,
    automation: enAutomation,
    teams: enTeams,
    users: enUsers,
    marketplace: enMarketplace,
    documentation: enDocumentation,
    aiAgents: enAiAgents,
    apiKeys: enApiKeys,
    accessTokens: enAccessTokens,
    integrations: enIntegrations,
    attachments: enAttachments,
    webWidget: enWebWidget,
    whatsapp: enWhatsapp,
    telegram: enTelegram,
    email: enEmail,
    sms: enSms,
    api: enApi,
    instagram: enInstagram,
    messenger: enMessenger,
    customerDashboard: enCustomerDashboard,
    adminSettings: enAdminSettings,
    roles: enRoles,
    tours: enTours,
    tutorials: enTutorials,
    segments: enSegments,
    journey: enJourney,
    campaigns: enCampaigns,
    events: enEvents,
  },
  es: {
    auth: esAuth,
    changePassword: esChangePassword,
    mcpServers: esMcpServers,
    customerMcpServers: esCustomerMcpServers,
    customMcpServers: esCustomMcpServers,
    customTools: esCustomTools,
    tools: esTools,
    agents: esAgents,
    channels: esChannels,
    notFound: esNotFound,
    unauthorized: esUnauthorized,
    oauth: esOAuth,
    profile: esProfile,
    onboarding: esOnboarding,
    setup: esSetup,
    widget: esWidget,
    pipelines: esPipelines,
    contacts: esContacts,
    chat: esChat,
    layout: esLayout,
    common: esCommon,
    accountSettings: esAccountSettings,
    cannedResponses: esCannedResponses,
    products: esProducts,
    templates: esTemplates,
    customAttributes: esCustomAttributes,
    labels: esLabels,
    macros: esMacros,
    teams: esTeams,
    users: esUsers,
    marketplace: esMarketplace,
    documentation: esDocumentation,
    aiAgents: esAiAgents,
    apiKeys: esApiKeys,
    accessTokens: esAccessTokens,
    integrations: esIntegrations,
    attachments: esAttachments,
    webWidget: esWebWidget,
    whatsapp: esWhatsapp,
    telegram: esTelegram,
    email: esEmail,
    sms: esSms,
    api: esApi,
    instagram: esInstagram,
    messenger: esMessenger,
    customerDashboard: esCustomerDashboard,
    adminSettings: esAdminSettings,
    roles: esRoles,
    tours: esTours,
    tutorials: esTutorials,
    segments: esSegments,
    journey: esJourney,
    campaigns: esCampaigns,
    events: esEvents,
  },
  fr: {
    auth: frAuth,
    changePassword: frChangePassword,
    mcpServers: frMcpServers,
    customerMcpServers: frCustomerMcpServers,
    customMcpServers: frCustomMcpServers,
    customTools: frCustomTools,
    tools: frTools,
    agents: frAgents,
    channels: frChannels,
    notFound: frNotFound,
    unauthorized: frUnauthorized,
    oauth: frOAuth,
    profile: frProfile,
    onboarding: frOnboarding,
    setup: frSetup,
    widget: frWidget,
    pipelines: frPipelines,
    contacts: frContacts,
    chat: frChat,
    layout: frLayout,
    common: frCommon,
    accountSettings: frAccountSettings,
    cannedResponses: frCannedResponses,
    products: frProducts,
    templates: frTemplates,
    customAttributes: frCustomAttributes,
    labels: frLabels,
    macros: frMacros,
    teams: frTeams,
    users: frUsers,
    marketplace: frMarketplace,
    documentation: frDocumentation,
    aiAgents: frAiAgents,
    apiKeys: frApiKeys,
    accessTokens: frAccessTokens,
    integrations: frIntegrations,
    attachments: frAttachments,
    webWidget: frWebWidget,
    whatsapp: frWhatsapp,
    telegram: frTelegram,
    email: frEmail,
    sms: frSms,
    api: frApi,
    instagram: frInstagram,
    messenger: frMessenger,
    customerDashboard: frCustomerDashboard,
    adminSettings: frAdminSettings,
    roles: frRoles,
    tours: frTours,
    tutorials: frTutorials,
    segments: frSegments,
    journey: frJourney,
    campaigns: frCampaigns,
    events: frEvents,
  },
  it: {
    auth: itAuth,
    changePassword: itChangePassword,
    mcpServers: itMcpServers,
    customerMcpServers: itCustomerMcpServers,
    customMcpServers: itCustomMcpServers,
    customTools: itCustomTools,
    tools: itTools,
    agents: itAgents,
    channels: itChannels,
    notFound: itNotFound,
    unauthorized: itUnauthorized,
    oauth: itOAuth,
    profile: itProfile,
    onboarding: itOnboarding,
    setup: itSetup,
    widget: itWidget,
    pipelines: itPipelines,
    contacts: itContacts,
    chat: itChat,
    layout: itLayout,
    common: itCommon,
    accountSettings: itAccountSettings,
    cannedResponses: itCannedResponses,
    products: itProducts,
    templates: itTemplates,
    customAttributes: itCustomAttributes,
    labels: itLabels,
    macros: itMacros,
    teams: itTeams,
    users: itUsers,
    marketplace: itMarketplace,
    documentation: itDocumentation,
    aiAgents: itAiAgents,
    apiKeys: itApiKeys,
    accessTokens: itAccessTokens,
    integrations: itIntegrations,
    attachments: itAttachments,
    webWidget: itWebWidget,
    whatsapp: itWhatsapp,
    telegram: itTelegram,
    email: itEmail,
    sms: itSms,
    api: itApi,
    instagram: itInstagram,
    messenger: itMessenger,
    customerDashboard: itCustomerDashboard,
    adminSettings: itAdminSettings,
    roles: itRoles,
    tours: itTours,
    tutorials: itTutorials,
    segments: itSegments,
    journey: itJourney,
    campaigns: itCampaigns,
    events: itEvents,
  },
};

const initialLanguage = detectLanguage();

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: defaultLocale,
  debug: false, // Set to true for debugging
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
  // Ensure immediate loading
  initImmediate: false,
  // Key separator for nested keys
  keySeparator: '.',
  // Namespace separator
  nsSeparator: ':',
});

export default i18n;
