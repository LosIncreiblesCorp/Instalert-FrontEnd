<script setup>
/** Staff invitation creation view. */
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import useBusinessStore from '../../application/business.store.js';

const { t } = useI18n();
const router = useRouter();
const store = useBusinessStore();
const displayName = ref('');
const email = ref('');
const touched = ref(false);
const nameField = ref(null);
const emailField = ref(null);
const busy = computed(() => store.isLoading || store.isSaving);
const nameInvalid = computed(() => !displayName.value.trim() || displayName.value.trim().length > 100);
const emailInvalid = computed(() => email.value.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()));

onMounted(() => { store.clearMessages(); store.loadPersonnel(); });

/** Validates the form and creates a staff invitation. @returns {Promise<void>} */
async function createInvitation() {
    touched.value = true;
    if (nameInvalid.value || emailInvalid.value) {
        (nameInvalid.value ? nameField : emailField).value?.$el?.focus();
        return;
    }
    if (await store.createInvitation({ displayName: displayName.value, email: email.value })) {
        await router.push({ name: 'admin-personnel', query: { tab: 'invitations' } });
    }
}
</script>

<template>
    <section class="invitation-page" aria-labelledby="invitation-title" :aria-busy="busy">
        <pv-button text icon="pi pi-arrow-left" :label="t('business.invitation.back')" :disabled="store.isSaving"
            @click="router.push({ name: 'admin-personnel' })" />
        <header class="page-heading">
            <h1 id="invitation-title">{{ t('business.invitation.title') }}</h1>
            <p>{{ t('business.invitation.description') }}</p>
        </header>

        <form class="invitation-surface" novalidate @submit.prevent="createInvitation">
            <p class="quota-summary">{{ t('business.invitation.quotaSummary', {
                available: store.availableSeats ?? '—', limit: store.planLimits?.maxEmployees ?? '—'
            }) }}</p>
            <p v-if="store.errorMessage" class="feedback error" role="alert">{{ t(store.errorMessage) }}</p>
            <p v-if="store.availableSeats === 0" class="feedback error" role="status">{{ t('business.errors.noSeats') }}</p>

            <div class="form-field">
                <label for="invitation-name">{{ t('business.personnel.name') }}</label>
                <pv-input-text id="invitation-name" ref="nameField" v-model="displayName" maxlength="100" required
                    autocomplete="off" :disabled="busy" :invalid="touched && nameInvalid" :aria-invalid="touched && nameInvalid"
                    aria-describedby="name-help name-error" />
                <small id="name-help">{{ t('business.invitation.nameHelp') }}</small>
                <p id="name-error" class="field-error" aria-live="polite">{{ touched && nameInvalid ? t('business.errors.nameInvalid') : '' }}</p>
            </div>
            <div class="form-field">
                <label for="invitation-email">{{ t('business.invitation.email') }}</label>
                <pv-input-text id="invitation-email" ref="emailField" v-model="email" type="email" maxlength="254" required
                    autocomplete="off" :disabled="busy" :invalid="touched && emailInvalid" :aria-invalid="touched && emailInvalid"
                    aria-describedby="email-help email-error" />
                <small id="email-help">{{ t('business.invitation.emailHelp') }}</small>
                <p id="email-error" class="field-error" aria-live="polite">{{ touched && emailInvalid ? t('business.errors.emailInvalid') : '' }}</p>
            </div>

            <div class="form-actions">
                <pv-button type="submit" icon="pi pi-plus" :label="t('business.invitation.create')" :loading="store.isSaving"
                    :disabled="busy || store.availableSeats === null || store.availableSeats === 0" />
                <pv-button type="button" outlined :label="t('business.actions.cancel')" :disabled="store.isSaving"
                    @click="router.push({ name: 'admin-personnel' })" />
                <pv-button v-if="store.errorMessage" type="button" text :label="t('business.actions.refresh')"
                    :disabled="busy" @click="store.loadPersonnel()" />
            </div>
        </form>
    </section>
</template>

<style scoped>
.invitation-page { padding: clamp(20px, 3vw, 40px); max-width: 1100px; margin: auto; }
.page-heading { margin: 22px 0 28px; }
h1 { margin: 0; color: var(--ink); font-size: clamp(26px, 3vw, 32px); letter-spacing: -.035em; }
.page-heading p { margin: 10px 0 0; color: var(--muted); line-height: 1.6; }
.invitation-surface { max-width: 720px; padding: clamp(20px, 3vw, 32px); border: 1px solid var(--line); border-radius: 12px; background: white; }
.quota-summary { color: #1d4ed8; font-size: 14px; font-weight: 600; margin: 20px 0 28px; }
.form-field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
label { color: var(--ink); font-size: 14px; font-weight: 600; }
.form-field input { width: 100%; min-height: 44px; }
small { color: var(--muted); line-height: 1.5; }
.field-error { margin: 0; color: #b91c1c; font-size: 14px; line-height: 1.5; }
.field-error:empty { display: none; }
.feedback { padding: 14px 16px; border-radius: 8px; font-size: 14px; line-height: 1.5; }
.error { color: #991b1b; background: #fff1f2; border: 1px solid #fecdd3; }
.form-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
.form-actions button { min-height: 44px; }
@media (max-width: 480px) { .form-actions { flex-direction: column; } .form-actions button { width: 100%; } }
</style>
