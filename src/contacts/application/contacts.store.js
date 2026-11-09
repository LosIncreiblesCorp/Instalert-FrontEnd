import { ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { EmergencyContact } from '../domain/model/emergency-contact.entity.js';
import { EmergencyContactAssembler } from '../infrastructure/emergency-contact.assembler.js';
import { ContactsApi } from '../infrastructure/contacts-api.js';
import { apiContext, currentContextRevision, requireBusinessId } from '../../shared/infrastructure/api-context.js';

const api = new ContactsApi();
const editableFields = values => ({ fullName: values.fullName, relationship: values.relationship,
    phone: values.phone, email: values.email, notes: values.notes });
const validationKeys = { fullName: 'nameInvalid', relationship: 'relationshipInvalid', phone: 'phoneInvalid', email: 'emailInvalid', notes: 'notesInvalid' };

/** Personal contacts scoped to the selected operational employee. */
export default defineStore('contacts', () => {
    const contacts = ref([]);
    const selectedContact = ref(null);
    const isLoading = ref(false);
    const isSaving = ref(false);
    const loaded = ref(false);
    const errorMessage = ref(null);
    const noticeMessage = ref(null);
    const fieldErrors = ref({});
    let generation = 0;
    let readRequest = 0;
    const scope = () => ({ generation, revision: currentContextRevision(), userId: apiContext.userId, businessId: apiContext.businessId });
    const current = value => value.generation === generation && value.revision === currentContextRevision()
        && value.userId === apiContext.userId && value.businessId === apiContext.businessId;
    function clearValidation() { fieldErrors.value = {}; }
    function clearMessages() { errorMessage.value = null; noticeMessage.value = null; clearValidation(); }
    function resetContext() {
        generation++; readRequest++; contacts.value = []; selectedContact.value = null;
        isLoading.value = false; isSaving.value = false; loaded.value = false; clearMessages();
    }
    watch(() => [apiContext.userId, apiContext.businessId], resetContext, { flush: 'sync' });
    function requireEmployee() {
        if (apiContext.role !== 'employee' || !apiContext.userId) throw new Error('api.errors.forbidden');
        requireBusinessId();
    }
    function owned(resource, captured) {
        const contact = EmergencyContactAssembler.toEntityFromResource(resource);
        if (contact.employeeId !== captured.userId) throw new Error('contacts.errors.invalidResponse');
        return contact;
    }
    function errorKey(error, fallback) {
        if (error.response?.status === 404) return 'contacts.errors.notFound';
        if (error.response?.status === 409) return 'contacts.errors.conflict';
        if (error.response?.status === 400) {
            const fields = [error.apiError?.field, ...Object.keys(error.apiError?.fieldErrors ?? {})];
            fieldErrors.value = Object.fromEntries(fields.filter(field => typeof field === 'string')
                .map(field => field.charAt(0).toLowerCase() + field.slice(1))
                .filter(field => validationKeys[field]).map(field => [field, 'contacts.errors.' + validationKeys[field]]));
            return 'api.errors.validation';
        }
        return error.apiError?.messageKey ?? (/^(contacts\.errors\.|api\.)/.test(error.message) ? error.message : fallback);
    }
    async function loadContacts() {
        if (isSaving.value) return false;
        const captured = scope(); const request = ++readRequest;
        isLoading.value = true; errorMessage.value = null; clearValidation();
        try {
            requireEmployee();
            const response = await api.getContacts();
            if (!current(captured) || request !== readRequest) return false;
            const records = EmergencyContactAssembler.toEntitiesFromResponse(response);
            if (records.some(contact => contact.employeeId !== captured.userId)) throw new Error('contacts.errors.invalidResponse');
            contacts.value = records; loaded.value = true; return true;
        } catch (error) {
            if (current(captured) && request === readRequest) errorMessage.value = errorKey(error, 'contacts.errors.load');
            return false;
        } finally { if (current(captured) && request === readRequest) isLoading.value = false; }
    }
    async function loadContact(id) {
        if (isSaving.value) return false;
        const captured = scope(); const request = ++readRequest;
        isLoading.value = true; selectedContact.value = null; errorMessage.value = null; clearValidation();
        try {
            requireEmployee();
            const response = await api.getContact(id);
            if (!current(captured) || request !== readRequest) return false;
            const contact = owned(response.data, captured);
            if (contact.id !== String(id)) throw new Error('contacts.errors.invalidResponse');
            selectedContact.value = contact; return true;
        } catch (error) {
            if (current(captured) && request === readRequest) errorMessage.value = errorKey(error, 'contacts.errors.load');
            return false;
        } finally { if (current(captured) && request === readRequest) isLoading.value = false; }
    }
    async function runCommand(command, successKey) {
        if (isLoading.value || isSaving.value) return false;
        const captured = scope(); clearMessages(); isSaving.value = true;
        try {
            requireEmployee();
            const result = await command(captured);
            if (!current(captured)) return false;
            result(); noticeMessage.value = successKey; return true;
        } catch (error) {
            if (current(captured)) errorMessage.value = errorKey(error, 'contacts.errors.save');
            return false;
        } finally { if (current(captured)) isSaving.value = false; }
    }
    function createContact(values) {
        return runCommand(async captured => {
            const draft = new EmergencyContact(editableFields(values)).validate();
            const response = await api.createContact(EmergencyContactAssembler.toResourceFromEntity(draft));
            const saved = owned(response.data, captured);
            return () => { contacts.value.unshift(saved); selectedContact.value = saved; };
        }, 'contacts.messages.created');
    }
    function updateContact(id, values) {
        return runCommand(async captured => {
            const draft = new EmergencyContact(editableFields(values)).validate();
            const response = await api.updateContact(id, EmergencyContactAssembler.toResourceFromEntity(draft));
            const saved = owned(response.data, captured);
            if (saved.id !== String(id)) throw new Error('contacts.errors.invalidResponse');
            return () => { selectedContact.value = saved; contacts.value = contacts.value.map(item => item.id === saved.id ? saved : item); };
        }, 'contacts.messages.updated');
    }
    function deleteContact(id) {
        return runCommand(async () => {
            await api.deleteContact(id);
            return () => { contacts.value = contacts.value.filter(item => item.id !== String(id));
                if (selectedContact.value?.id === String(id)) selectedContact.value = null; };
        }, 'contacts.messages.deleted');
    }
    return { contacts, selectedContact, isLoading, isSaving, loaded, errorMessage, noticeMessage, fieldErrors,
        clearMessages, clearValidation, resetContext, loadContacts, loadContact, createContact, updateContact, deleteContact };
});
