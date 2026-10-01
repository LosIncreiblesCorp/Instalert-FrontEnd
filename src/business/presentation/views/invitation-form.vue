<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const { t } = useI18n();
const router = useRouter();
const email = ref("");
const emailField = ref(null);
const touched = ref(false);
const validationComplete = ref(false);

// Native email validity checks format only; it does not verify an account or delivery.
const validationError = ref("");
const errorText = computed(() => validationError.value ? t(validationError.value) : "");

function validateEmail() {
  const input = emailField.value?.$el;
  validationError.value = !email.value.trim()
    ? "business.invitation.required"
    : input?.validity.typeMismatch ? "business.invitation.invalid" : "";
  return !validationError.value;
}

function onBlur() {
  touched.value = true;
  validateEmail();
}

function onInput() {
  validationComplete.value = false;
  if (touched.value) validateEmail();
}

function checkEmail() {
  touched.value = true;
  validationComplete.value = false;
  if (!validateEmail()) {
    emailField.value?.$el?.focus();
    return;
  }
  validationComplete.value = true;
}
</script>

<template>
  <section class="invitation-page" aria-labelledby="invitation-title">
    <header class="page-heading">
      <h2 id="invitation-title">{{ t("business.invitation.title") }}</h2>
      <p>{{ t("business.invitation.description") }}</p>
    </header>

    <form class="invitation-surface" novalidate @submit.prevent="checkEmail">
      <div class="availability-note" id="invitation-availability">
        <i class="pi pi-info-circle" aria-hidden="true"></i>
        <p>{{ t("business.invitation.unavailable") }}</p>
      </div>

      <div class="email-field">
        <label for="invitation-email">{{ t("business.invitation.email") }}</label>
        <pv-input-text
          id="invitation-email"
          ref="emailField"
          v-model="email"
          type="email"
          autocomplete="email"
          required
          :invalid="!!validationError"
          :aria-invalid="!!validationError"
          aria-describedby="email-help email-error"
          @input="onInput"
          @blur="onBlur"
        />
        <small id="email-help">{{ t("business.invitation.emailHelp") }}</small>
        <p id="email-error" class="field-error" aria-live="polite">{{ errorText }}</p>
      </div>

      <p class="validation-result" role="status">{{ validationComplete ? t("business.invitation.validFormat") : "" }}</p>

      <div class="form-actions">
        <pv-button type="submit" class="primary-action" :label="t('business.invitation.checkEmail')" />
        <pv-button type="button" outlined severity="secondary" :label="t('business.invitation.back')" @click="router.push({ name: 'admin-personnel' })" />
      </div>
    </form>
  </section>
</template>

<style scoped>
.invitation-page { padding: clamp(20px, 3vw, 40px); }
.page-heading { margin-bottom: 32px; }
h2 { margin: 0; color: var(--ink); font-size: clamp(26px, 3vw, 32px); font-weight: 700; letter-spacing: -0.035em; }
.page-heading p { margin: 10px 0 0; color: var(--muted); line-height: 1.6; }
.invitation-surface { max-width: 720px; padding: clamp(20px, 3vw, 32px); border: 1px solid var(--line); border-radius: 12px; background: white; }
.availability-note { display: flex; align-items: flex-start; gap: 12px; padding: 16px; margin-bottom: 28px; border-radius: 8px; background: #f0f4ff; }
.availability-note i { margin-top: 4px; color: var(--blue); }
.availability-note p { margin: 0; color: var(--ink); font-size: 14px; line-height: 1.6; }
.email-field { display: flex; flex-direction: column; gap: 8px; }
label { color: var(--ink); font-size: 14px; font-weight: 600; }
.email-field input { width: 100%; min-height: 44px; }
small { color: var(--muted); line-height: 1.5; }
.field-error { margin: 0; color: #dc2626; font-size: 14px; line-height: 1.5; }
.validation-result { margin: 16px 0; color: var(--ink); line-height: 1.6; }
.validation-result:empty { margin: 0; }
.form-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
.form-actions button { min-height: 44px; }
.primary-action { color: white; background: var(--navy); border-color: var(--navy); }
.primary-action:hover { background: var(--ink); border-color: var(--ink); }
@media (max-width: 480px) { .form-actions { flex-direction: column; } .form-actions button { width: 100%; } }
</style>
