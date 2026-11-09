import { BaseApi } from '../../shared/infrastructure/base-api.js';

/** Contact ownership is derived by the server from the current caller. */
export class ContactsApi extends BaseApi {
    getContacts() { return this.http.get('emergency-contacts'); }
    getContact(id) { return this.http.get(`emergency-contacts/${encodeURIComponent(id)}`); }
    createContact(resource) { return this.http.post('emergency-contacts', resource); }
    updateContact(id, resource) { return this.http.put(`emergency-contacts/${encodeURIComponent(id)}`, resource); }
    deleteContact(id) { return this.http.delete(`emergency-contacts/${encodeURIComponent(id)}`); }
}
