/**
 * Services Export Hub
 * Organized by functional domains
 */

// Authentication & User Management
export * from './auth';

// Account Management
export * from './account';

// Contact Management
export * from './contacts';

// Conversation Management
export * from './conversations';

// Channel Management (WhatsApp, Email, etc.)
export * from './channels';

// AI Agents & Tools
export * from './agents';

// Automation Rules
export * from './automation';

// Pipeline Management
export * from './pipelines';

// Core Infrastructure
export * from './core';

// Legacy default exports for backward compatibility
// DEPRECATED: Use named imports from categories instead
export { default as api } from './core/api';
export { actionCableService } from './core/websocket/actionCableService';
export { accountService } from './account/accountService';
export { contactsService } from './contacts/contactsService';
export { labelsService } from './contacts/labelsService';
export { conversationAPI } from './conversations/conversationService';
export { default as InboxesService } from './channels/inboxesService';
export { default as ChannelsService } from './channels/channelsService';
export { default as WhatsappService } from './channels/whatsappService';
export { default as EvolutionService } from './channels/evolutionService';
export { default as EvolutionGoService } from './channels/evolutionGoService';
export { default as EmailOauthService } from './channels/emailOauthService';
// Removed coreServiceApi - now using standard API through Evolution
export { automationService } from './automation/automationService';
export { pipelinesService } from './pipelines/pipelinesService';
export { segmentsService } from './segments/segmentsService';
export { journeyService } from './journeys/journeyService';
