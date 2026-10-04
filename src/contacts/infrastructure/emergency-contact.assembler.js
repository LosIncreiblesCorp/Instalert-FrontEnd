import { EmergencyContact } from '../domain/model/emergency-contact.entity.js';

/** Maps emergency-contact resources to domain entities.
* @class EmergencyContactAssembler */
export class EmergencyContactAssembler {
/** Converts one resource into a domain entity.
* @param {Object} resource - Emergency-contact resource.
* @returns {EmergencyContact} Mapped entity. */
    static toEntityFromResource(resource) { return new EmergencyContact(resource); }

/** Converts an HTTP response into an entity list.
* @param {import('axios').AxiosResponse} response - Contacts collection response.
* @returns {EmergencyContact[]} Mapped entities. */
    static toEntitiesFromResponse(response) {
        const resources = Array.isArray(response.data) ? response.data : response.data?.contacts;
        if (!Array.isArray(resources)) throw new Error('contacts.errors.load');
        return resources.map(resource => this.toEntityFromResource(resource));
    }

/** Converts a domain entity into a persistence resource.
* @param {EmergencyContact} entity - Emergency-contact entity.
* @returns {Object} Writable resource. */
    static toResourceFromEntity(entity) {
        const { id, employeeId, fullName, relationship, phone, email, notes, createdAt, updatedAt } = entity;
        return { ...(id == null ? {} : { id }), employeeId, fullName, relationship, phone, email, notes, createdAt, updatedAt };
    }
}
