import { EmergencyContact } from '../domain/model/emergency-contact.entity.js';

/** Maps owned contact resources and sends only editable fields. */
export class EmergencyContactAssembler {
    static toEntityFromResource(resource) {
        if (!resource || typeof resource.id !== 'string' || !resource.id || typeof resource.employeeId !== 'string'
            || !resource.employeeId || !['fullName', 'relationship', 'phone', 'notes'].every(key => typeof resource[key] === 'string')
            || (resource.email != null && typeof resource.email !== 'string')) throw new Error('contacts.errors.invalidResponse');
        return new EmergencyContact(resource);
    }
    static toEntitiesFromResponse(response) {
        if (!Array.isArray(response.data)) throw new Error('contacts.errors.invalidResponse');
        return response.data.map(resource => this.toEntityFromResource(resource));
    }
    static toResourceFromEntity(entity) {
        const { fullName, relationship, phone, email, notes } = entity;
        return { fullName, relationship, phone, email: email || null, notes };
    }
}
