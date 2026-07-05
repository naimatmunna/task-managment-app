import teamRepository from '../repositories/team.repository.js';
import membershipRepository from '../repositories/membership.repository.js';
import ApiError from '../utils/ApiError.js';

/**
 * Team use-cases, all scoped to a single organization. Rosters (memberIds,
 * leadId) are validated against the org's active membership set so a team can
 * never reference a user outside the tenant.
 */
class TeamService {
  /** Keep only user ids that are active members of this org; throw if none valid. */
  async validateRoster(orgId, { memberIds = [], leadId }) {
    const active = await membershipRepository.activeUserIds(orgId);
    const cleanMembers = [...new Set((memberIds || []).map(String))].filter((id) => active.has(id));
    const cleanLead = leadId ? String(leadId) : null;
    if (cleanLead && !active.has(cleanLead)) {
      throw ApiError.badRequest('Team lead must be a member of this organization', { code: 'INVALID_LEAD' });
    }
    // The lead is implicitly a member.
    if (cleanLead && !cleanMembers.includes(cleanLead)) cleanMembers.push(cleanLead);
    return { memberIds: cleanMembers, leadId: cleanLead };
  }

  async list(orgId) {
    return teamRepository.listByOrg(orgId);
  }

  async get(orgId, id) {
    const team = await teamRepository.findByIdInOrg(id, orgId);
    if (!team) throw ApiError.notFound('Team not found');
    return team;
  }

  async create(orgId, payload) {
    const roster = await this.validateRoster(orgId, payload);
    return teamRepository.create({
      organizationId: orgId,
      name: payload.name,
      description: payload.description || '',
      color: payload.color || '#6366f1',
      memberIds: roster.memberIds,
      leadId: roster.leadId,
    });
  }

  async update(orgId, id, patch) {
    const team = await teamRepository.findByIdInOrg(id, orgId);
    if (!team) throw ApiError.notFound('Team not found');

    if (patch.name !== undefined) team.name = patch.name;
    if (patch.description !== undefined) team.description = patch.description;
    if (patch.color !== undefined) team.color = patch.color;

    if (patch.memberIds !== undefined || patch.leadId !== undefined) {
      const roster = await this.validateRoster(orgId, {
        memberIds: patch.memberIds ?? team.memberIds,
        leadId: patch.leadId !== undefined ? patch.leadId : team.leadId,
      });
      team.memberIds = roster.memberIds;
      team.leadId = roster.leadId;
    }

    await team.save();
    return team;
  }

  async remove(orgId, id) {
    const team = await teamRepository.findByIdInOrg(id, orgId);
    if (!team) throw ApiError.notFound('Team not found');
    await teamRepository.deleteById(id);
    return { id };
  }
}

export default new TeamService();
