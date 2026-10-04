import { BusinessMember } from '../domain/model/business-member.entity.js';

/** Maps between business member resources and domain entities. @class BusinessMemberAssembler */
export class BusinessMemberAssembler {
    /** Builds a member entity from a plain resource. @param {Object} resource - Raw member resource. @returns {BusinessMember} The member entity. */
    static toEntityFromResource(resource) { return new BusinessMember({ ...resource }); }

    /** Builds member entities from an API response. @param {import('axios').AxiosResponse} response - API response with members. @returns {BusinessMember[]} The member entities. */
    static toEntitiesFromResponse(response) {
        const resources = Array.isArray(response.data) ? response.data : response.data?.members;
        if (!Array.isArray(resources)) throw new Error('business.errors.load');
        return resources.map(resource => this.toEntityFromResource(resource));
    }

    /** Builds a plain resource from a member entity. @param {BusinessMember} entity - Member entity. @returns {Object} The plain member resource. */
    static toResourceFromEntity(entity) {
        const { id, businessId, userId, displayName, email, role, status, createdAt, updatedAt } = entity;
        return { ...(id == null ? {} : { id }), businessId, userId, displayName, email, role, status, createdAt, updatedAt };
    }
}
