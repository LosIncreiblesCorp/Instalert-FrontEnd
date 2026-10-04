<script setup>
/** Create/edit form for one emergency contact. */
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { EmergencyContact } from '../../domain/model/emergency-contact.entity.js';
import useContactsStore from '../../application/contacts.store.js';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const store = useContactsStore();
const draft = reactive({ fullName: '', relationship: '', phone: '', email: '', notes: '' });
const touched = ref(false);
const ready = ref(false);
const fieldRefs = {};
const isEditing = computed(() => route.name === 'employee-contact-edit');
const busy = computed(() => store.isLoading || store.isSaving);
// Placeholder owner is used only for local field validation; the store assigns ownership.
const errors = computed(() => new EmergencyContact({ ...draft, employeeId: 'validation-only' }).validationErrors());
const title = computed(() => t(isEditing.value ? 'contacts.form.editTitle' : 'contacts.form.createTitle'));
const fields = ['fullName', 'relationship', 'phone', 'email', 'notes'];

watch(() => route.fullPath, async (_, __, onCleanup) => {
    let stale = false;
    onCleanup(() => { stale = true; });
    touched.value = false;
    ready.value = false;
    store.clearMessages();
    Object.assign(draft, { fullName: '', relationship: '', phone: '', email: '', notes: '' });
    if (isEditing.value) {
        if (!await store.loadContact(route.params.id) || stale) return;
        for (const field of fields) draft[field] = store.selectedContact[field];
    }
    if (!stale) ready.value = true;
}, { immediate: true });

/** Validates the draft and creates or updates the contact.
* @returns {Promise<void>} Resolves after save and navigation. */
async function saveContact() {
    touched.value = true;
    const invalidField = fields.find(field => errors.value[field]);
    if (invalidField) {
        await nextTick();
        fieldRefs[invalidField]?.$el?.focus();
        return;
    }
    const success = isEditing.value
        ? await store.updateContact(route.params.id, draft)
        : await store.createContact(draft);
    if (success) await router.push({ name: 'employee-contacts' });
}
</script>

<template>
    <section class="contact-form-page" aria-labelledby="contact-form-title" :aria-busy="busy">
        <pv-button text icon="pi pi-arrow-left" :label="t('contacts.actions.back')" :disabled="store.isSaving"
            @click="router.push({ name: 'employee-contacts' })" />
        <div class="form-surface">
            <header class="form-heading">
                <span class="form-icon"><i class="pi pi-user-plus" aria-hidden="true" /></span>
                <p class="eyebrow">{{ t('contacts.eyebrow') }}</p>
                <h1 id="contact-form-title">{{ title }}</h1>
                <p>{{ t('contacts.form.description') }}</p>
            </header>
            <pv-message v-if="store.errorMessage" severity="error" :closable="false" role="alert">{{ t(store.errorMessage) }}</pv-message>
            <p v-if="!ready && busy" role="status">{{ t('contacts.loading') }}</p>
            <pv-button v-if="!ready && !busy" text :label="t('contacts.actions.refresh')"
                @click="router.replace({ name: route.name, params: route.params, query: { ...route.query, retry: Date.now() } })" />
            <form v-if="ready" novalidate @submit.prevent="saveContact">
                <div class="form-field">
                    <label for="contact-name">{{ t('contacts.fields.fullName') }} <span aria-hidden="true">*</span></label>
                    <pv-input-text id="contact-name" :ref="el => fieldRefs.fullName = el" v-model="draft.fullName" maxlength="100" required
                        autocomplete="off" :disabled="busy" :invalid="touched && !!errors.fullName" :aria-invalid="touched && !!errors.fullName"
                        aria-describedby="contact-name-error" />
                    <small v-if="touched && errors.fullName" id="contact-name-error" class="field-error">{{ t(errors.fullName) }}</small>
                </div>
                <div class="form-grid">
                    <div class="form-field">
                        <label for="contact-relationship">{{ t('contacts.fields.relationship') }} <span aria-hidden="true">*</span></label>
                        <pv-input-text id="contact-relationship" :ref="el => fieldRefs.relationship = el" v-model="draft.relationship" maxlength="60" required
                            :placeholder="t('contacts.form.relationshipPlaceholder')" :disabled="busy" :invalid="touched && !!errors.relationship"
                            :aria-invalid="touched && !!errors.relationship" aria-describedby="contact-relationship-error" />
                        <small v-if="touched && errors.relationship" id="contact-relationship-error" class="field-error">{{ t(errors.relationship) }}</small>
                    </div>
                    <div class="form-field">
                        <label for="contact-email">{{ t('contacts.fields.email') }} <span class="optional">{{ t('contacts.form.optional') }}</span></label>
                        <pv-input-text id="contact-email" :ref="el => fieldRefs.email = el" v-model="draft.email" type="email" maxlength="254"
                            autocomplete="off" :disabled="busy" :invalid="touched && !!errors.email" :aria-invalid="touched && !!errors.email"
                            aria-describedby="contact-email-error" />
                        <small v-if="touched && errors.email" id="contact-email-error" class="field-error">{{ t(errors.email) }}</small>
                    </div>
                </div>
                <div class="form-field">
                    <label for="contact-phone">{{ t('contacts.fields.phone') }} <span aria-hidden="true">*</span></label>
                    <pv-input-text id="contact-phone" :ref="el => fieldRefs.phone = el" v-model="draft.phone" type="tel" maxlength="30" required
                        autocomplete="off" placeholder="+51 987 654 321" :disabled="busy" :invalid="touched && !!errors.phone"
                        :aria-invalid="touched && !!errors.phone" aria-describedby="contact-phone-help contact-phone-error" />
                    <small id="contact-phone-help">{{ t('contacts.form.phoneHelp') }}</small>
                    <small v-if="touched && errors.phone" id="contact-phone-error" class="field-error">{{ t(errors.phone) }}</small>
                </div>
                <div class="form-field">
                    <label for="contact-notes">{{ t('contacts.fields.notes') }} <span class="optional">{{ t('contacts.form.optional') }}</span></label>
                    <pv-textarea id="contact-notes" :ref="el => fieldRefs.notes = el" v-model="draft.notes" rows="3" maxlength="140"
                        :disabled="busy" :invalid="touched && !!errors.notes" :aria-invalid="touched && !!errors.notes"
                        aria-describedby="contact-notes-count contact-notes-error" />
                    <small id="contact-notes-count" class="character-count">{{ t('contacts.form.characters', { count: draft.notes.length, max: 140 }) }}</small>
                    <small v-if="touched && errors.notes" id="contact-notes-error" class="field-error">{{ t(errors.notes) }}</small>
                </div>
                <p class="required-help">{{ t('contacts.form.requiredHelp') }}</p>
                <div class="form-actions">
                    <pv-button type="button" outlined :label="t('contacts.actions.cancel')" :disabled="store.isSaving"
                        @click="router.push({ name: 'employee-contacts' })" />
                    <pv-button class="primary-action" type="submit" icon="pi pi-check" :label="t(isEditing ? 'contacts.actions.saveChanges' : 'contacts.actions.save')"
                        :disabled="busy" :loading="store.isSaving" />
                </div>
            </form>
        </div>
    </section>
</template>

<style scoped>
.contact-form-page { max-width: 1000px; margin: auto; padding: clamp(20px, 3vw, 40px); }
.form-surface { margin-top: 20px; max-width: 720px; padding: clamp(22px, 3vw, 32px); background: white; border: 1px solid var(--line); border-radius: 14px; }
.form-heading { margin-bottom: 28px; }
.form-icon { display: inline-grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; background: #eff6ff; color: var(--blue); margin-bottom: 20px; font-size: 20px; }
.eyebrow { margin: 0 0 8px; color: var(--blue); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
h1 { color: var(--ink); margin: 0; font-size: clamp(24px, 3vw, 29px); letter-spacing: -.03em; }
.form-heading > p:last-child { color: var(--muted); font-size: 14px; line-height: 1.6; margin: 12px 0 0; }
.form-field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 22px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
label { display: flex; align-items: center; gap: 5px; color: var(--ink); font-size: 13px; font-weight: 600; }
label > span:not(.optional) { color: #b91c1c; }
.optional { margin-left: auto; color: var(--muted); font-weight: 400; font-size: 11px; }
.form-field > input { min-height: 44px; width: 100%; }
.form-field > textarea { resize: vertical; min-height: 95px; width: 100%; }
small { color: var(--muted); font-size: 12px; line-height: 1.5; }
.field-error { color: #b91c1c; }
.character-count { text-align: right; }
.required-help { color: var(--muted); font-size: 12px; }
.form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 26px; }
.form-actions button { min-height: 44px; }
.primary-action { background: var(--navy); border-color: var(--navy); color: white; }
.primary-action:not(:disabled):hover { background: var(--ink); border-color: var(--ink); }
@media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; gap: 0; } }
@media (max-width: 430px) { .form-actions { flex-direction: column-reverse; } }
</style>
