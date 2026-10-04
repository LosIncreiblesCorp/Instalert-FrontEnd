import { BaseApi } from '../../shared/infrastructure/base-api.js';
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js';

export class ContactsApi extends BaseApi {
    constructor() {
        super();
        this.contactsEndpoint = new BaseEndpoint(this, import.meta.env.VITE_EMERGENCY_CONTACTS_ENDPOINT_PATH || 'emergency-contacts');
    }

    getContacts(employeeId) { return this.http.get(this.contactsEndpoint.endpointPath, { params: { employeeId } }); }
    getContact(id) { return this.contactsEndpoint.getById(id); }
    createContact(resource) { return this.contactsEndpoint.create(resource); }
    updateContact(resource) { return this.contactsEndpoint.update(resource.id, resource); }
    deleteContact(id) { return this.contactsEndpoint.delete(id); }
}
