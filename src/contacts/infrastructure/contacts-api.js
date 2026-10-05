import { BaseApi } from '../../shared/infrastructure/base-api.js';
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js';

/** Infrastructure gateway for emergency-contact resources.
* @class ContactsApi
* @extends BaseApi */
export class ContactsApi extends BaseApi {
    constructor() {
        super();
        this.contactsEndpoint = new BaseEndpoint(this, import.meta.env.VITE_EMERGENCY_CONTACTS_ENDPOINT_PATH || 'emergency-contacts');
    }

/** Fetches contacts owned by one employee.
* @param {string} employeeId - Owner identifier.
* @returns {Promise<import('axios').AxiosResponse>} HTTP response with contacts. */
    getContacts(employeeId) { return this.http.get(this.contactsEndpoint.endpointPath, { params: { employeeId } }); }
/** Fetches one contact by id.
* @param {string|number} id - Resource identifier.
* @returns {Promise<import('axios').AxiosResponse>} HTTP response with one contact. */
    getContact(id) { return this.contactsEndpoint.getById(id); }
/** Creates one contact resource.
* @param {Object} resource - Contact payload.
* @returns {Promise<import('axios').AxiosResponse>} HTTP response with created contact. */
    createContact(resource) { return this.contactsEndpoint.create(resource); }
/** Updates one contact resource.
* @param {Object} resource - Contact payload with id.
* @returns {Promise<import('axios').AxiosResponse>} HTTP response with updated contact. */
    updateContact(resource) { return this.contactsEndpoint.update(resource.id, resource); }
/** Deletes one contact by id.
* @param {string|number} id - Resource identifier.
* @returns {Promise<import('axios').AxiosResponse>} HTTP response for delete operation. */
    deleteContact(id) { return this.contactsEndpoint.delete(id); }
}
