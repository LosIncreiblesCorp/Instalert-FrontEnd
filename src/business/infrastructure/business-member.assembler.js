import { BusinessMember } from '../domain/model/business-member.entity.js';

export class BusinessMemberAssembler {
    static toEntityFromResource(resource) { return new BusinessMember({ ...resource }); }

    static toEntitiesFromResponse(response) {
        const resources = Array.isArray(response.data) ? response.data : response.data?.members;
        if (!Array.isArray(resources)) throw new Error('business.errors.load');
        return resources.map(resource => this.toEntityFromResource(resource));
    }

    static toResourceFromEntity(entity) {
        const { id, businessId, userId, displayName, email, role, status, createdAt, updatedAt } = entity;
        return { ...(id == null ? {} : { id }), businessId, userId, displayName, email, role, status, createdAt, updatedAt };
    }
}
