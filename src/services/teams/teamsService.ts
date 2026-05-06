import api from '@/services/core/api';
import { extractData, extractResponse } from '@/utils/apiHelpers';
import type {
  Team,
  TeamMember,
  TeamFormData,
  TeamsResponse,
  TeamResponse,
  TeamDeleteResponse,
  TeamsListParams,
} from '@/types/users';

const TeamsService = {
  /**
   * Get teams with pagination support
   */
  async getTeams(params?: TeamsListParams): Promise<TeamsResponse> {
    try {
      const response = await api.get('/teams', {
        params,
      });

      return extractResponse<Team>(response) as TeamsResponse;
    } catch (error) {
      console.error('TeamsService.getTeams error:', error);
      throw error;
    }
  },

  /**
   * Get a single team
   */
  async getTeam(teamId: string): Promise<Team> {
    try {
      const response = await api.get(`/teams/${teamId}`);
      return extractData<Team>(response);
    } catch (error) {
      console.error('TeamsService.getTeam error:', error);
      throw error;
    }
  },

  /**
   * Create a new team
   */
  async createTeam(teamData: TeamFormData): Promise<TeamResponse> {
    try {
      const response = await api.post('/teams', teamData);
      return extractData<TeamResponse>(response);
    } catch (error) {
      console.error('TeamsService.createTeam error:', error);
      throw error;
    }
  },

  /**
   * Update a team
   */
  async updateTeam(teamId: string, teamData: Partial<TeamFormData>): Promise<TeamResponse> {
    try {
      const response = await api.patch(`/teams/${teamId}`, teamData);
      return extractData<TeamResponse>(response);
    } catch (error) {
      console.error('TeamsService.updateTeam error:', error);
      throw error;
    }
  },

  /**
   * Delete a team
   */
  async deleteTeam(teamId: string): Promise<TeamDeleteResponse> {
    try {
      const response = await api.delete(`/teams/${teamId}`);
      return extractData<TeamDeleteResponse>(response);
    } catch (error) {
      console.error('TeamsService.deleteTeam error:', error);
      throw error;
    }
  },

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    try {
      const response = await api.get(`/teams/${teamId}/team_members`);
      const result = extractResponse<TeamMember>(response);
      return result.data;
    } catch (error) {
      console.error('TeamsService.getTeamMembers error:', error);
      throw error;
    }
  },

  /**
   * Add users to team
   */
  async addUsersToTeam(teamId: string, userIds: string[]): Promise<TeamMember[]> {
    try {
      const response = await api.post(`/teams/${teamId}/team_members`, {
        user_ids: userIds,
      });
      return extractData<TeamMember[]>(response);
    } catch (error) {
      console.error('TeamsService.addUsersToTeam error:', error);
      throw error;
    }
  },

  /**
   * Update team users
   */
  async updateTeamUsers(teamId: string, userIds: string[]): Promise<TeamMember[]> {
    try {
      const response = await api.patch(`/teams/${teamId}/team_members`, {
        user_ids: userIds,
      });
      return extractData<TeamMember[]>(response);
    } catch (error) {
      console.error('TeamsService.updateTeamUsers error:', error);
      throw error;
    }
  },

  /**
   * Remove users from team
   *
   * The collection-level DELETE consumes a `user_ids` body, mirroring the
   * shape used by addUsersToTeam(POST). axios moves the body to `data` for
   * DELETE requests.
   */
  async removeUsersFromTeam(teamId: string, userIds: string[]): Promise<void> {
    try {
      await api.delete(`/teams/${teamId}/team_members`, {
        data: { user_ids: userIds },
      });
    } catch (error) {
      console.error('TeamsService.removeUsersFromTeam error:', error);
      throw error;
    }
  },
};

export default TeamsService;
