import { ref } from 'vue';
import { defineStore } from 'pinia';
import { EmergencyContact } from '../domain/model/emergency-contact.entity.js';
import { EmergencyContactAssembler } from '../infrastructure/emergency-contact.assembler.js';
import { ContactsApi } from '../infrastructure/contacts-api.js';

const contactsApi = new ContactsApi();
// Same employee used by Alert preferences; not an authentication or authorization boundary.
const demoEmployeeId = 'demo-employee';
const editableFields = values => ({ fullName: values.fullName, relationship: values.relationship,
    phone: values.phone, email: values.email, notes: values.notes });

/** Application service store for employee emergency contacts.
* @returns {Object} Contacts store state and actions. */
const useContactsStore = defineStore('contacts', () => {
/** @type {import('vue').Ref<Array<import('../domain/model/emergency-contact.entity.js').EmergencyContact>>} Contact list. */
    const contacts = ref([]);
/** @type {import('vue').Ref<import('../domain/model/emergency-contact.entity.js').EmergencyContact|null>} Selected contact. */
    const selectedContact = ref(null);
/** @type {import('vue').Ref<boolean>} List/detail loading flag. */
    const isLoading = ref(false);
/** @type {import('vue').Ref<boolean>} Create/update/delete saving flag. */
    const isSaving = ref(false);
/** @type {import('vue').Ref<string|null>} Localized error key. */
    const errorMessage = ref(null);
/** @type {import('vue').Ref<string|null>} Localized notice key. */
    const noticeMessage = ref(null);

/** Clears store feedback messages. */
    function clearMessages() { errorMessage.value = null; noticeMessage.value = null; }
    const errorKey = (error, fallback) => error.message?.startsWith('contacts.errors.') ? error.message : fallback;

/** Fetches one owned contact or rejects foreign records.
* @param {string|number} id - Contact identifier.
* @returns {Promise<import('../domain/model/emergency-contact.entity.js').EmergencyContact>} Owned contact. */
    async function getOwnContact(id) {
        const response = await contactsApi.getContact(id);
        const contact = EmergencyContactAssembler.toEntityFromResource(response.data);
        if (contact.employeeId !== demoEmployeeId) throw new Error('contacts.errors.notFound');
        return contact;
    }

/** Loads demo employee contacts into the store.
* @returns {Promise<boolean>} True when loading succeeds. */
    async function loadContacts() {
        isLoading.value = true;
        errorMessage.value = null;
        try {
            const response = await contactsApi.getContacts(demoEmployeeId);
            contacts.value = EmergencyContactAssembler.toEntitiesFromResponse(response)
                .filter(contact => contact.employeeId === demoEmployeeId);
            return true;
        } catch (error) {
            errorMessage.value = errorKey(error, 'contacts.errors.load');
            return false;
        } finally { isLoading.value = false; }
    }

/** Loads one owned contact into the selection.
* @param {string|number} id - Contact identifier.
* @returns {Promise<boolean>} True when loading succeeds. */
    async function loadContact(id) {
        isLoading.value = true;
        selectedContact.value = null;
        errorMessage.value = null;
        try {
            selectedContact.value = await getOwnContact(id);
            return true;
        } catch (error) {
            errorMessage.value = error.response?.status === 404 ? 'contacts.errors.notFound' : errorKey(error, 'contacts.errors.load');
            return false;
        } finally { isLoading.value = false; }
    }

/** Runs a write command with shared saving and feedback state.
* @param {Function} command - Async mutation to execute.
* @param {string} successKey - Localized success message key.
* @returns {Promise<boolean>} True when the command succeeds. */
    async function runCommand(command, successKey) {
        if (isLoading.value || isSaving.value) return false;
        clearMessages();
        isSaving.value = true;
        try {
            await command();
            noticeMessage.value = successKey;
            return true;
        } catch (error) {
            errorMessage.value = error.response?.status === 404 ? 'contacts.errors.notFound' : errorKey(error, 'contacts.errors.save');
            return false;
        } finally { isSaving.value = false; }
    }

/** Creates one contact for the demo employee.
* @param {Object} values - Editable contact fields.
* @returns {Promise<boolean>} True when creation succeeds. */
    function createContact(values) {
        return runCommand(async () => {
            const now = new Date().toISOString();
            const contact = new EmergencyContact({ ...editableFields(values), employeeId: demoEmployeeId,
                createdAt: now, updatedAt: now }).validate();
            const response = await contactsApi.createContact(EmergencyContactAssembler.toResourceFromEntity(contact));
            contacts.value.unshift(EmergencyContactAssembler.toEntityFromResource(response.data));
        }, 'contacts.messages.created');
    }

/** Updates one owned contact with editable fields.
* @param {string|number} id - Contact identifier.
* @param {Object} values - Editable contact fields.
* @returns {Promise<boolean>} True when update succeeds. */
    function updateContact(id, values) {
        return runCommand(async () => {
            const current = await getOwnContact(id);
            const contact = new EmergencyContact({ ...current, ...editableFields(values), updatedAt: new Date().toISOString() }).validate();
            const response = await contactsApi.updateContact(EmergencyContactAssembler.toResourceFromEntity(contact));
            selectedContact.value = EmergencyContactAssembler.toEntityFromResource(response.data);
            contacts.value = contacts.value.map(item => String(item.id) === String(id) ? selectedContact.value : item);
        }, 'contacts.messages.updated');
    }

/** Deletes one owned contact and clears its selection.
* @param {string|number} id - Contact identifier.
* @returns {Promise<boolean>} True when deletion succeeds. */
    function deleteContact(id) {
        return runCommand(async () => {
            await getOwnContact(id);
            await contactsApi.deleteContact(id);
            contacts.value = contacts.value.filter(contact => String(contact.id) !== String(id));
            if (String(selectedContact.value?.id) === String(id)) selectedContact.value = null;
        }, 'contacts.messages.deleted');
    }

    return { contacts, selectedContact, isLoading, isSaving, errorMessage, noticeMessage,
        clearMessages, loadContacts, loadContact, createContact, updateContact, deleteContact };
});

export default useContactsStore;
