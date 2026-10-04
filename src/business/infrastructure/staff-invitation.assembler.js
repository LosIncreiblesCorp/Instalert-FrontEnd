import { StaffInvitation } from '../domain/model/staff-invitation.entity.js';

export class StaffInvitationAssembler {
    static toEntityFromResource(resource) { return new StaffInvitation({ ...resource }); }

    static toEntitiesFromResponse(response) {
        const resources = Array.isArray(response.data) ? response.data : response.data?.invitations;
        if (!Array.isArray(resources)) throw new Error('business.errors.load');
        return resources.map(resource => this.toEntityFromResource(resource));
    }

    static toResourceFromEntity(entity) {
        const { id, businessId, displayName, email, status, createdAt, updatedAt, lastResentAt } = entity;
        return { ...(id == null ? {} : { id }), businessId, displayName, email, status, createdAt, updatedAt, lastResentAt };
    }
}
