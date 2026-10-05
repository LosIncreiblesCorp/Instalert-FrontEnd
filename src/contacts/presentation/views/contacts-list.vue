<script setup>
/** Searchable list of employee emergency contacts. */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useConfirm } from 'primevue/useconfirm';
import useContactsStore from '../../application/contacts.store.js';

const store = useContactsStore();
const router = useRouter();
const { t } = useI18n();
const confirm = useConfirm();
const search = ref('');
const busy = computed(() => store.isLoading || store.isSaving);
const visibleContacts = computed(() => {
    const query = search.value.trim().toLocaleLowerCase();
    return store.contacts.filter(contact => [contact.fullName, contact.phone, contact.relationship, contact.email]
        .some(value => value.toLocaleLowerCase().includes(query)));
});

onMounted(() => store.loadContacts());

/** Asks for confirmation before deleting a contact.
* @param {import('../../domain/model/emergency-contact.entity.js').EmergencyContact} contact - Contact to delete.
* @returns {void} No return value. */
function confirmDeletion(contact) {
    confirm.require({
        header: t('contacts.actions.deleteTitle'),
        message: t('contacts.actions.deleteMessage', { name: contact.fullName }),
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: t('contacts.actions.delete'),
        rejectLabel: t('contacts.actions.cancel'),
        accept: () => store.deleteContact(contact.id),
    });
}
</script>

<template>
    <section class="contacts-page" aria-labelledby="contacts-title" :aria-busy="busy">
        <header class="page-heading">
            <div>
                <p class="eyebrow"><i class="pi pi-shield" aria-hidden="true" /> {{ t('contacts.eyebrow') }}</p>
                <h1 id="contacts-title">{{ t('contacts.title') }}</h1>
                <p class="subtitle">{{ t('contacts.description') }}</p>
            </div>
            <pv-button class="primary-action" icon="pi pi-user-plus" :label="t('contacts.actions.add')" :disabled="busy"
                @click="store.clearMessages(); router.push({ name: 'employee-contact-new' })" />
        </header>

        <pv-message v-if="store.noticeMessage" severity="success" :closable="false" role="status">{{ t(store.noticeMessage) }}</pv-message>
        <pv-message v-if="store.errorMessage" severity="error" :closable="false" role="alert">{{ t(store.errorMessage) }}</pv-message>

        <div class="contacts-toolbar">
            <div class="search-field">
                <i class="pi pi-search" aria-hidden="true" />
                <pv-input-text v-model="search" :placeholder="t('contacts.search')" :aria-label="t('contacts.search')" />
            </div>
            <div class="toolbar-actions">
                <span class="contact-count">{{ t('contacts.total', { count: store.contacts.length }) }}</span>
                <pv-button text icon="pi pi-refresh" :label="t('contacts.actions.refresh')" :disabled="busy" @click="store.loadContacts()" />
            </div>
        </div>

        <p v-if="store.isLoading" class="loading-state" role="status">{{ t('contacts.loading') }}</p>
        <div v-else-if="!visibleContacts.length" class="empty-state">
            <span class="empty-icon"><i class="pi pi-address-book" aria-hidden="true" /></span>
            <h2>{{ t(search.trim() ? 'contacts.noResults' : 'contacts.emptyTitle') }}</h2>
            <p>{{ t(search.trim() ? 'contacts.noResultsHelp' : 'contacts.emptyHelp') }}</p>
        </div>
        <ul v-else class="contact-list" :aria-label="t('contacts.title')">
            <li v-for="contact in visibleContacts" :key="contact.id" class="contact-card">
                <span class="contact-avatar" aria-hidden="true">{{ contact.initials }}</span>
                <div class="contact-content">
                    <div class="contact-heading"><h2>{{ contact.fullName }}</h2><span class="relationship">{{ contact.relationship }}</span></div>
                    <div class="contact-details">
                        <span><i class="pi pi-phone" aria-hidden="true" /> {{ contact.phone }}</span>
                        <span v-if="contact.email"><i class="pi pi-envelope" aria-hidden="true" /> {{ contact.email }}</span>
                    </div>
                    <p v-if="contact.notes" class="contact-notes">{{ contact.notes }}</p>
                </div>
                <div class="contact-actions">
                    <pv-button text icon="pi pi-pencil" :aria-label="t('contacts.actions.editContact', { name: contact.fullName })"
                        :disabled="busy" @click="store.clearMessages(); router.push({ name: 'employee-contact-edit', params: { id: contact.id } })" />
                    <pv-button text icon="pi pi-trash" severity="danger" :aria-label="t('contacts.actions.deleteContact', { name: contact.fullName })"
                        :disabled="busy" @click="confirmDeletion(contact)" />
                </div>
            </li>
        </ul>
    </section>
</template>

<style scoped>
.contacts-page { max-width: 1250px; margin: auto; padding: clamp(20px, 3vw, 40px); }
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
.eyebrow { display: flex; align-items: center; gap: 7px; color: var(--blue); margin: 0 0 10px; font-size: 11px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }
h1 { color: var(--ink); margin: 0; font-size: clamp(25px, 3vw, 32px); letter-spacing: -.035em; }
.subtitle { color: var(--muted); margin: 10px 0 0; line-height: 1.6; }
.primary-action { background: var(--navy); border-color: var(--navy); color: white; }
.primary-action:not(:disabled):hover { background: var(--ink); border-color: var(--ink); }
.contacts-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin: 28px 0 20px; }
.search-field { display: flex; align-items: center; gap: 10px; padding: 0 12px; background: white; border: 1px solid var(--line); border-radius: 9px; width: min(100%, 430px); }
.search-field > i { color: var(--muted); font-size: 14px; }
.search-field > input { flex: 1; width: 100%; min-width: 0; min-height: 44px; border: 0; background: transparent; }
.search-field:focus-within { outline: 2px solid #93c5fd; outline-offset: 2px; }
.search-field > input:focus { outline: none; box-shadow: none; }
.toolbar-actions { display: flex; align-items: center; gap: 12px; }
.contact-count { color: var(--muted); font-size: 13px; }
.contact-list { list-style: none; display: grid; gap: 14px; margin: 0; padding: 0; }
.contact-card { display: flex; align-items: center; gap: 16px; background: white; border: 1px solid var(--line); border-radius: 12px; padding: 20px; }
.contact-avatar { display: grid; place-items: center; flex-shrink: 0; width: 46px; height: 46px; border-radius: 50%; background: #e0eaff; color: #1e40af; font-size: 15px; font-weight: 700; }
.contact-content { flex: 1; min-width: 0; }
.contact-heading, .contact-details { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 14px; }
.contact-heading h2 { color: var(--ink); font-size: 16px; margin: 0; overflow-wrap: anywhere; }
.relationship { color: #475569; background: #f0f4ff; border-radius: 5px; padding: 4px 8px; font-size: 12px; overflow-wrap: anywhere; }
.contact-details { margin-top: 10px; color: var(--muted); font-size: 13px; }
.contact-details span { overflow-wrap: anywhere; }
.contact-details i { margin-right: 4px; font-size: 12px; }
.contact-notes { color: var(--muted); font-size: 13px; line-height: 1.5; margin: 10px 0 0; overflow-wrap: anywhere; }
.contact-actions { display: flex; flex-shrink: 0; gap: 4px; }
.contact-actions button { min-width: 44px; min-height: 44px; }
.empty-state { background: white; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 52px 24px; text-align: center; }
.empty-icon { display: inline-grid; place-items: center; width: 56px; height: 56px; border-radius: 14px; background: #eff6ff; color: var(--blue); font-size: 26px; }
.empty-state h2 { font-size: 19px; color: var(--ink); margin: 20px 0 10px; }
.empty-state p, .loading-state { color: var(--muted); line-height: 1.6; font-size: 14px; }
@media (max-width: 650px) {
    .page-heading { align-items: flex-start; flex-direction: column; }
    .contacts-toolbar, .search-field { width: 100%; }
    .contact-card { gap: 12px; padding: 16px; flex-wrap: wrap; align-items: flex-start; }
    .contact-content { flex-basis: calc(100% - 60px); }
    .contact-actions { margin-left: auto; }
}
</style>
