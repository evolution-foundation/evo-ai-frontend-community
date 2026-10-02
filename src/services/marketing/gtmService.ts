import api from '@/services/core/api';
import { extractData } from '@/utils/apiHelpers';

export interface GtmAccount {
  accountId: string;
  name: string;
}

export interface GtmContainer {
  containerId: string;
  accountId: string;
  name: string;
  publicId: string;
  usageContext?: string[];
}

export interface GtmParameter {
  type: string;
  key: string;
  value?: string;
}

export interface GtmResource {
  name?: string;
  type: string;
  notes?: string;
  tagId?: string;
  triggerId?: string;
  variableId?: string;
  folderId?: string;
  templateId?: string;
  parentFolderId?: string;
  firingTriggerId?: string[];
  parameter?: GtmParameter[];
  fingerprint?: string;
}

export interface GtmWorkspaceData {
  workspace_id: string;
  tags: GtmResource[];
  triggers: GtmResource[];
  variables: GtmResource[];
  folders: GtmResource[];
  templates: GtmResource[];
}

export type GtmResourceKind = 'tags' | 'triggers' | 'variables' | 'folders';

export interface GtmPermission {
  path?: string;
  accountId: string;
  emailAddress: string;
  accountAccess?: { permission: string };
  containerAccess?: { containerId: string; permission: string }[];
}

class GtmService {
  private readonly baseUrl = '/marketing/gtm';

  async getAccounts(): Promise<GtmAccount[]> {
    const response = await api.get(`${this.baseUrl}/accounts`);
    return extractData<GtmAccount[]>(response);
  }

  async getContainers(accountId: string): Promise<GtmContainer[]> {
    const response = await api.get(`${this.baseUrl}/accounts/${accountId}/containers`);
    return extractData<GtmContainer[]>(response);
  }

  async createContainer(accountId: string, name: string, usageContext: 'web' | 'server'): Promise<GtmContainer> {
    const response = await api.post(`${this.baseUrl}/accounts/${accountId}/containers`, { name, usage_context: usageContext });
    return extractData<GtmContainer>(response);
  }

  async getWorkspace(accountId: string, containerId: string): Promise<GtmWorkspaceData> {
    const response = await api.get(`${this.baseUrl}/accounts/${accountId}/containers/${containerId}/workspace`);
    return extractData<GtmWorkspaceData>(response);
  }

  async createResource(
    accountId: string,
    containerId: string,
    resource: GtmResourceKind,
    payload: Partial<GtmResource>,
  ): Promise<GtmResource> {
    const response = await api.post(`${this.baseUrl}/accounts/${accountId}/containers/${containerId}/${resource}`, {
      resource_payload: payload,
    });
    return extractData<GtmResource>(response);
  }

  async updateResource(
    accountId: string,
    containerId: string,
    resource: GtmResourceKind,
    resourceId: string,
    payload: Partial<GtmResource>,
  ): Promise<GtmResource> {
    const response = await api.put(`${this.baseUrl}/accounts/${accountId}/containers/${containerId}/${resource}/${resourceId}`, {
      resource_payload: payload,
    });
    return extractData<GtmResource>(response);
  }

  async deleteResource(accountId: string, containerId: string, resource: GtmResourceKind, resourceId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/accounts/${accountId}/containers/${containerId}/${resource}/${resourceId}`);
  }

  async importContainer(accountId: string, containerId: string, containerVersionJson: string): Promise<void> {
    await api.post(`${this.baseUrl}/accounts/${accountId}/containers/${containerId}/import`, {
      container_version: containerVersionJson,
    });
  }

  async getPermissions(accountId: string): Promise<GtmPermission[]> {
    const response = await api.get(`${this.baseUrl}/accounts/${accountId}/permissions`);
    return extractData<GtmPermission[]>(response);
  }

  async invitePermission(
    accountId: string,
    email: string,
    accountPermission: string,
    containerId?: string,
    containerPermission?: string,
  ): Promise<GtmPermission> {
    const response = await api.post(`${this.baseUrl}/accounts/${accountId}/permissions`, {
      email,
      account_permission: accountPermission,
      container_id: containerId,
      container_permission: containerPermission,
    });
    return extractData<GtmPermission>(response);
  }

  async removePermission(accountId: string, permissionId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/accounts/${accountId}/permissions/${encodeURIComponent(permissionId)}`);
  }
}

export const gtmService = new GtmService();
