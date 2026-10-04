import { EmergencyContact } from '../domain/model/emergency-contact.entity.js';

export class EmergencyContactAssembler {
    static toEntityFromResource(resource) { return new EmergencyContact(resource); }

    static toEntitiesFromResponse(response) {
        const resources = Array.isArray(response.data) ? response.data : response.data?.contacts;
        if (!Array.isArray(resources)) throw new Error('contacts.errors.load');
        return resources.map(resource => this.toEntityFromResource(resource));
    }

    static toResourceFromEntity(entity) {
        const { id, employeeId, fullName, relationship, phone, email, notes, createdAt, updatedAt } = entity;
        return { ...(id == null ? {} : { id }), employeeId, fullName, relationship, phone, email, notes, createdAt, updatedAt };
    }
}
