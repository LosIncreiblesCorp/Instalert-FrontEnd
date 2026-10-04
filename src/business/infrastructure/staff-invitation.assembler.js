import { StaffInvitation } from '../domain/model/staff-invitation.entity.js';

/** Maps between staff invitation resources and domain entities. @class StaffInvitationAssembler */
export class StaffInvitationAssembler {
    /** Builds an invitation entity from a plain resource. @param {Object} resource - Raw invitation resource. @returns {StaffInvitation} The invitation entity. */
    static toEntityFromResource(resource) { return new StaffInvitation({ ...resource }); }

    /** Builds invitation entities from an API response. @param {import('axios').AxiosResponse} response - API response with invitations. @returns {StaffInvitation[]} The invitation entities. */
    static toEntitiesFromResponse(response) {
        const resources = Array.isArray(response.data) ? response.data : response.data?.invitations;
        if (!Array.isArray(resources)) throw new Error('business.errors.load');
        return resources.map(resource => this.toEntityFromResource(resource));
    }

    /** Builds a plain resource from an invitation entity. @param {StaffInvitation} entity - Invitation entity. @returns {Object} The plain invitation resource. */
    static toResourceFromEntity(entity) {
        const { id, businessId, displayName, email, status, createdAt, updatedAt, lastResentAt } = entity;
        return { ...(id == null ? {} : { id }), businessId, displayName, email, status, createdAt, updatedAt, lastResentAt };
    }
}
