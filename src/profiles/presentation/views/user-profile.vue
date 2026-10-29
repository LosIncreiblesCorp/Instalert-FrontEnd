<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { UserProfile } from '../../domain/model/user-profile.entity.js';
import { useProfilesStore } from '../../application/profiles.store.js';

const route = useRoute();
const store = useProfilesStore();
const { t } = useI18n();
const form = reactive({ firstName: '', lastName: '', dni: '', phone: '' });
const touched = ref(false);
const selectedLocale = ref('en_US');
const languageChoices = [
  { label: 'English (United States)', value: 'en_US' },
  { label: 'Español (Latinoamérica)', value: 'es_419' }
];
const profileBusy = computed(() => store.isProfileLoading || store.isProfileSaving);
const preferencesBusy = computed(() => store.isPreferencesLoading || store.isPreferencesSaving);
const errors = computed(() => new UserProfile(form).validationErrors);
const profileDirty = computed(() => store.profile && JSON.stringify(form) !== JSON.stringify(profileValues()));
const preferencesDirty = computed(() => store.preferences && selectedLocale.value !== store.preferences.locale);

function profileValues() {
  const profile = store.profile;
  return { firstName: profile?.firstName ?? '', lastName: profile?.lastName ?? '', dni: profile?.dni ?? '', phone: profile?.phone ?? '' };
}
function resetProfile() {
  Object.assign(form, profileValues());
  touched.value = false;
  store.profileSaved = false;
}
function resetPreferences() {
  selectedLocale.value = store.preferences?.locale ?? 'en_US';
  store.preferencesSaved = false;
}
async function saveProfile() {
  touched.value = true;
  const firstError = Object.keys(errors.value)[0];
  if (firstError) {
    await nextTick();
    document.getElementById(`profile-${firstError}`)?.focus();
    return;
  }
  await store.updateProfile({ ...form });
}
async function savePreferences() { await store.updatePreferences(selectedLocale.value); }

watch(() => route.meta.role, role => {
  store.setContext(role);
  store.loadProfile();
}, { immediate: true });
watch(() => store.profile, () => {
  Object.assign(form, profileValues());
  touched.value = false;
}, { immediate: true });
watch(() => store.preferences, () => {
  selectedLocale.value = store.preferences?.locale ?? 'en_US';
}, { immediate: true });

function canLeave() {
  if (store.isProfileSaving || store.isPreferencesSaving) return false;
  return (!profileDirty.value && !preferencesDirty.value) || window.confirm(t('profiles.unsavedChanges'));
}
onBeforeRouteLeave(canLeave);
onBeforeRouteUpdate(canLeave);
</script>

<template>
  <div class="profile-page">
    <header>
      <h1>{{ t('profiles.title') }}</h1>
      <p class="profile-intro">{{ t('profiles.subtitle') }}</p>
    </header>

    <section class="profile-panel" aria-labelledby="personal-data-title" :aria-busy="profileBusy">
      <div class="panel-heading">
        <span class="panel-icon" aria-hidden="true"><i class="pi pi-user" /></span>
        <div><h2 id="personal-data-title">{{ t('profiles.personalData') }}</h2><p>{{ t('profiles.personalHelp') }}</p></div>
      </div>
      <p v-if="store.isProfileLoading" role="status">{{ t('profiles.loadingProfile') }}</p>
      <pv-message v-if="store.profileError" severity="error" :closable="false" role="alert">{{ t(store.profileError) }}</pv-message>
      <pv-button v-if="!store.profile && !store.isProfileLoading" :label="t('profiles.retry')" @click="store.loadProfile()" />
      <form v-if="store.profile" novalidate @submit.prevent="saveProfile">
        <fieldset :disabled="profileBusy">
          <legend class="sr-only">{{ t('profiles.personalData') }}</legend>
          <div class="profile-fields">
            <div v-for="field in ['firstName', 'lastName', 'dni', 'phone']" :key="field" class="profile-field">
              <label :for="`profile-${field}`">{{ t(`profiles.fields.${field}`) }}<span v-if="field !== 'phone'" aria-hidden="true"> *</span></label>
              <pv-input-text
                  :id="`profile-${field}`" v-model="form[field]"
                  :type="field === 'phone' ? 'tel' : 'text'"
                  :inputmode="field === 'dni' ? 'numeric' : undefined"
                  :maxlength="field === 'dni' ? 8 : field === 'phone' ? 30 : 100"
                  :autocomplete="field === 'firstName' ? 'given-name' : field === 'lastName' ? 'family-name' : field === 'phone' ? 'tel' : 'off'"
                  :required="field !== 'phone'"
                  :aria-invalid="touched && Boolean(errors[field])"
                  :aria-describedby="touched && errors[field] ? `profile-${field}-error` : field === 'dni' ? 'profile-dni-help' : undefined"
                  @input="store.profileSaved = false"
              />
              <small v-if="field === 'dni'" id="profile-dni-help">{{ t('profiles.dniHelp') }}</small>
              <small v-if="touched && errors[field]" :id="`profile-${field}-error`" class="field-error">{{ t(errors[field]) }}</small>
            </div>
          </div>
          <div class="profile-actions">
            <pv-button type="button" severity="secondary" outlined :label="t('profiles.discard')" :disabled="!profileDirty" @click="resetProfile" />
            <pv-button type="submit" :label="store.isProfileSaving ? t('profiles.saving') : t('profiles.saveProfile')" :loading="store.isProfileSaving" :disabled="!profileDirty" />
          </div>
        </fieldset>
      </form>
      <pv-message v-if="store.profileSaved" severity="success" :closable="false" role="status">{{ t('profiles.profileSaved') }}</pv-message>
    </section>

    <section class="profile-panel" aria-labelledby="preferences-title" :aria-busy="preferencesBusy">
      <div class="panel-heading">
        <span class="panel-icon" aria-hidden="true"><i class="pi pi-sliders-h" /></span>
        <div><h2 id="preferences-title">{{ t('profiles.preferences') }}</h2><p>{{ t('profiles.preferencesHelp') }}</p></div>
      </div>
      <p v-if="store.isPreferencesLoading" role="status">{{ t('profiles.loadingPreferences') }}</p>
      <pv-message v-if="store.preferencesError" severity="error" :closable="false" role="alert">{{ t(store.preferencesError) }}</pv-message>
      <pv-button v-if="!store.preferences && !store.isPreferencesLoading" :label="t('profiles.retry')" @click="store.loadPreferences()" />
      <form v-if="store.preferences" @submit.prevent="savePreferences">
        <fieldset :disabled="preferencesBusy">
          <legend class="sr-only">{{ t('profiles.preferences') }}</legend>
          <div class="profile-field language-field">
            <label for="profile-language">{{ t('profiles.language') }}</label>
            <pv-select input-id="profile-language" v-model="selectedLocale" :options="languageChoices" option-label="label" option-value="value" :disabled="preferencesBusy" :aria-label="t('profiles.language')" aria-describedby="profile-language-help" @change="store.preferencesSaved = false" />
            <small id="profile-language-help">{{ t('profiles.languageHelp') }}</small>
          </div>
          <div class="profile-actions">
            <pv-button type="button" severity="secondary" outlined :label="t('profiles.discard')" :disabled="!preferencesDirty" @click="resetPreferences" />
            <pv-button type="submit" :label="store.isPreferencesSaving ? t('profiles.saving') : t('profiles.savePreferences')" :loading="store.isPreferencesSaving" :disabled="!preferencesDirty" />
          </div>
        </fieldset>
      </form>
      <pv-message v-if="store.preferencesSaved" severity="success" :closable="false" role="status">{{ t('profiles.preferencesSaved') }}</pv-message>
    </section>
  </div>
</template>

<style scoped>
.profile-page { display: grid; gap: 24px; max-width: 960px; margin: 0 auto; padding: 24px; }
h1 { margin: 0; font-size: clamp(26px, 4vw, 32px); color: #172033; }
.profile-intro { color: #475569; margin: 10px 0 0; line-height: 1.6; }
.profile-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; display: grid; gap: 16px; min-width: 0; }
.panel-heading { display: flex; align-items: flex-start; gap: 14px; }
.panel-heading h2 { margin: 0; font-size: 20px; color: #172033; }
.panel-heading p { margin: 6px 0 0; color: #475569; line-height: 1.6; }
.panel-icon { display: grid; place-items: center; width: 44px; height: 44px; flex-shrink: 0; border-radius: 12px; color: #1d4ed8; background: #eff6ff; font-size: 20px; }
fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
.profile-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; }
.profile-field { display: grid; align-content: start; gap: 8px; min-width: 0; }
.profile-field label { font-weight: 600; color: #172033; }
.profile-field :deep(input), .profile-field :deep(.p-select) { width: 100%; min-width: 0; }
small { color: #475569; line-height: 1.5; }
.field-error { color: #b91c1c; }
.language-field { max-width: 460px; }
.profile-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
@media (max-width: 640px) { .profile-page { padding: 16px; } .profile-panel { padding: 18px; } .profile-fields { grid-template-columns: 1fr; } .profile-actions { justify-content: stretch; } .profile-actions :deep(button) { flex: 1; } }
</style>
