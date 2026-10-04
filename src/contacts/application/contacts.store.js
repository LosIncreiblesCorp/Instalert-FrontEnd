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

const useContactsStore = defineStore('contacts', () => {
    const contacts = ref([]);
    const selectedContact = ref(null);
    const isLoading = ref(false);
    const isSaving = ref(false);
    const errorMessage = ref(null);
    const noticeMessage = ref(null);

    function clearMessages() { errorMessage.value = null; noticeMessage.value = null; }
    const errorKey = (error, fallback) => error.message?.startsWith('contacts.errors.') ? error.message : fallback;

    async function getOwnContact(id) {
        const response = await contactsApi.getContact(id);
        const contact = EmergencyContactAssembler.toEntityFromResource(response.data);
        if (contact.employeeId !== demoEmployeeId) throw new Error('contacts.errors.notFound');
        return contact;
    }

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

    function createContact(values) {
        return runCommand(async () => {
            const now = new Date().toISOString();
            const contact = new EmergencyContact({ ...editableFields(values), employeeId: demoEmployeeId,
                createdAt: now, updatedAt: now }).validate();
            const response = await contactsApi.createContact(EmergencyContactAssembler.toResourceFromEntity(contact));
            contacts.value.unshift(EmergencyContactAssembler.toEntityFromResource(response.data));
        }, 'contacts.messages.created');
    }

    function updateContact(id, values) {
        return runCommand(async () => {
            const current = await getOwnContact(id);
            const contact = new EmergencyContact({ ...current, ...editableFields(values), updatedAt: new Date().toISOString() }).validate();
            const response = await contactsApi.updateContact(EmergencyContactAssembler.toResourceFromEntity(contact));
            selectedContact.value = EmergencyContactAssembler.toEntityFromResource(response.data);
            contacts.value = contacts.value.map(item => String(item.id) === String(id) ? selectedContact.value : item);
        }, 'contacts.messages.updated');
    }

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
