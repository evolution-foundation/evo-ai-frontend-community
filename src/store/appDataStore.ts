import { create } from 'zustand';
import { accountService } from '@/services/account/accountService';
import usersService from '@/services/users/usersService';
import InboxesService from '@/services/channels/inboxesService';
import { labelsService } from '@/services/contacts/labelsService';
import TeamsService from '@/services/teams/teamsService';
import type { Account } from '@/types/settings';
import type { User } from '@/types/users';
import type { Inbox } from '@/types/channels/inbox';
import type { Label } from '@/types/settings';
import type { Team } from '@/types/users';

interface AppDataState {
  // Data
  account: Account | null;
  agents: User[];
  inboxes: Inbox[];
  labels: Label[];
  teams: Team[];

  // Loading states
  isLoadingAccount: boolean;
  isLoadingAgents: boolean;
  isLoadingInboxes: boolean;
  isLoadingLabels: boolean;
  isLoadingTeams: boolean;

  // Cache timestamps
  initialized: boolean;
  lastFetchTimestamps: {
    account: number;
    agents: number;
    inboxes: number;
    labels: number;
    teams: number;
  };

  // Actions
  fetchAccount: (forceRefresh?: boolean) => Promise<void>;
  fetchAgents: (forceRefresh?: boolean) => Promise<void>;
  fetchInboxes: (forceRefresh?: boolean) => Promise<void>;
  fetchLabels: (forceRefresh?: boolean) => Promise<void>;
  fetchTeams: (forceRefresh?: boolean) => Promise<void>;
  initializeAppData: () => Promise<void>;
  initializeAppDataDeferred: (
    options?: {
      agents?: boolean;
      inboxes?: boolean;
      labels?: boolean;
      teams?: boolean;
      forceRefresh?: boolean;
    },
  ) => Promise<void>;
  removeInbox: (inboxId: string) => void;
  addInbox: (inbox: Inbox) => void;
  clearAppData: () => void;
}

// Cache duration - 15 minutes
const CACHE_DURATION = 15 * 60 * 1000;

export const useAppDataStore = create<AppDataState>((set, get) => ({
  account: null,
  agents: [],
  inboxes: [],
  labels: [],
  teams: [],

  isLoadingAccount: false,
  isLoadingAgents: false,
  isLoadingInboxes: false,
  isLoadingLabels: false,
  isLoadingTeams: false,

  initialized: false,
  lastFetchTimestamps: {
    account: 0,
    agents: 0,
    inboxes: 0,
    labels: 0,
    teams: 0,
  },

  fetchAccount: async (forceRefresh = false) => {
    const state = get();
    const now = Date.now();
    const timeSinceLastFetch = now - state.lastFetchTimestamps.account;

    if (!forceRefresh && state.account && timeSinceLastFetch < CACHE_DURATION) {
      return;
    }

    set({ isLoadingAccount: true });
    try {
      const result = await accountService.getAccount();
      set({
        account: result,
        isLoadingAccount: false,
        lastFetchTimestamps: { ...state.lastFetchTimestamps, account: now }
      });
    } catch (error) {
      console.error('Failed to fetch account:', error);
      set({ isLoadingAccount: false });
      throw error;
    }
  },

  fetchAgents: async (forceRefresh = false) => {
    const state = get();
    const now = Date.now();
    const timeSinceLastFetch = now - state.lastFetchTimestamps.agents;

    if (!forceRefresh && state.agents.length > 0 && timeSinceLastFetch < CACHE_DURATION) {
      return;
    }

    set({ isLoadingAgents: true });
    try {
      const agents = await usersService.getAccountUsers();
      set({
        agents,
        isLoadingAgents: false,
        lastFetchTimestamps: { ...state.lastFetchTimestamps, agents: now }
      });
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      set({ isLoadingAgents: false });
      throw error;
    }
  },

  fetchInboxes: async (forceRefresh = false) => {
    const state = get();
    const now = Date.now();
    const timeSinceLastFetch = now - state.lastFetchTimestamps.inboxes;

    if (!forceRefresh && state.inboxes.length > 0 && timeSinceLastFetch < CACHE_DURATION) {
      return;
    }

    set({ isLoadingInboxes: true });
    try {
      const inboxes = await InboxesService.list();
      set({
        inboxes: inboxes.data,
        isLoadingInboxes: false,
        lastFetchTimestamps: { ...state.lastFetchTimestamps, inboxes: now }
      });
    } catch (error) {
      console.error('Failed to fetch inboxes:', error);
      set({ isLoadingInboxes: false });
      throw error;
    }
  },

  fetchLabels: async (forceRefresh = false) => {
    const state = get();
    const now = Date.now();
    const timeSinceLastFetch = now - state.lastFetchTimestamps.labels;

    if (!forceRefresh && state.labels.length > 0 && timeSinceLastFetch < CACHE_DURATION) {
      return;
    }

    set({ isLoadingLabels: true });
    try {
      const response = await labelsService.getLabels();
      set({
        labels: response.data,
        isLoadingLabels: false,
        lastFetchTimestamps: { ...state.lastFetchTimestamps, labels: now }
      });
    } catch (error) {
      console.error('Failed to fetch labels:', error);
      set({ isLoadingLabels: false });
      throw error;
    }
  },

  fetchTeams: async (forceRefresh = false) => {
    const state = get();
    const now = Date.now();
    const timeSinceLastFetch = now - state.lastFetchTimestamps.teams;

    if (!forceRefresh && state.teams.length > 0 && timeSinceLastFetch < CACHE_DURATION) {
      return;
    }

    set({ isLoadingTeams: true });
    try {
      const response = await TeamsService.getTeams();
      set({
        teams: response.data,
        isLoadingTeams: false,
        lastFetchTimestamps: { ...state.lastFetchTimestamps, teams: now }
      });
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      set({ isLoadingTeams: false });
      throw error;
    }
  },

  initializeAppData: async () => {
    set({ initialized: true });
    await get().initializeAppDataDeferred();
  },

  initializeAppDataDeferred: async (options = {}) => {
    const forceRefresh = options.forceRefresh ?? false;
    const shouldLoadAgents = options.agents ?? true;
    const shouldLoadInboxes = options.inboxes ?? true;
    const shouldLoadLabels = options.labels ?? true;
    const shouldLoadTeams = options.teams ?? true;

    const tasks: Promise<void>[] = [];
    tasks.push(get().fetchAccount(forceRefresh));
    if (shouldLoadAgents) tasks.push(get().fetchAgents(forceRefresh));
    if (shouldLoadInboxes) tasks.push(get().fetchInboxes(forceRefresh));
    if (shouldLoadLabels) tasks.push(get().fetchLabels(forceRefresh));
    if (shouldLoadTeams) tasks.push(get().fetchTeams(forceRefresh));

    await Promise.allSettled(tasks);
  },

  removeInbox: inboxId => {
    set(state => ({
      inboxes: state.inboxes.filter(inbox => inbox.id !== inboxId),
    }));
  },

  addInbox: inbox => {
    set(state => ({
      inboxes: [...state.inboxes, inbox],
    }));
  },

  clearAppData: () => {
    set({
      account: null,
      agents: [],
      inboxes: [],
      labels: [],
      teams: [],
      initialized: false,
      lastFetchTimestamps: {
        account: 0,
        agents: 0,
        inboxes: 0,
        labels: 0,
        teams: 0,
      },
    });
  },
}));
