<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Dialog from 'primevue/dialog';
import { useNotificationsStore } from '../../application/notifications.store.js';
import { receptionRadiiMeters } from '../../domain/model/notification-preferences.entity.js';

const store = useNotificationsStore();
const { t, locale } = useI18n();
const form = reactive({ nearbyAlertsEnabled: true, nearbyRadiusMeters: 500 });
const filter = ref('all');
const preferencesOpen = ref(false);
const preferencesTrigger = ref(null);
const busy = computed(() => store.isPreferencesLoading || store.isPreferencesSaving);
const dirty = computed(() => store.preferences && (form.nearbyAlertsEnabled !== store.preferences.nearbyAlertsEnabled || form.nearbyRadiusMeters !== store.preferences.nearbyRadiusMeters));
const visibleNotifications = computed(() => store.notifications.filter(item => filter.value !== 'unread' || item.isUnread));
const radiusChoices = computed(() => receptionRadiiMeters.map(value => ({ value, label: t('notifications.meters', { value }) })));
function reset() {
  if (store.preferences) Object.assign(form, { nearbyAlertsEnabled: store.preferences.nearbyAlertsEnabled, nearbyRadiusMeters: store.preferences.nearbyRadiusMeters });
  if (store.preferences) store.preferencesError = null;
  store.preferencesSaved = false;
}
watch(() => store.preferences, preferences => {
  if (preferences) Object.assign(form, { nearbyAlertsEnabled: preferences.nearbyAlertsEnabled, nearbyRadiusMeters: preferences.nearbyRadiusMeters });
}, { immediate: true });
async function save() { if (await store.savePreferences({ ...form })) await store.refresh(); }
async function retryPreferences() { if (await store.loadPreferences()) await store.refresh(); }
function openPreferences() {
  store.preferencesSaved = false;
  preferencesOpen.value = true;
}
function closePreferences() {
  if (!canLeave()) return;
  reset();
  preferencesOpen.value = false;
}
function updatePreferencesVisibility(visible) { if (!visible) closePreferences(); }
function restorePreferencesFocus() { preferencesTrigger.value?.focus({ preventScroll: true }); }
function formatDate(value) { return new Intl.DateTimeFormat(locale.value === 'es' ? 'es-419' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
function canLeave() { return !store.isPreferencesSaving && (!dirty.value || window.confirm(t('notifications.unsavedChanges'))); }
onBeforeRouteLeave(canLeave);
onBeforeRouteUpdate(canLeave);
</script>

<template>
  <div class="notifications-page">
    <header class="page-heading">
      <span class="heading-icon" aria-hidden="true"><i class="pi pi-bell" /></span>
      <div class="page-heading-copy"><h1>{{ t('notifications.title') }}</h1><p>{{ t('notifications.subtitle') }}</p></div>
      <button ref="preferencesTrigger" class="preferences-button" type="button"
          :aria-label="t('notifications.preferences')" :title="t('notifications.preferences')"
          aria-haspopup="dialog" aria-controls="notification-preferences-dialog" :aria-expanded="preferencesOpen"
          @click="openPreferences"><i class="pi pi-cog" aria-hidden="true" /></button>
    </header>
    <pv-message v-if="store.preferencesError && !preferencesOpen" severity="error" :closable="false" role="alert">{{ t(store.preferencesError) }}</pv-message>
    <Dialog id="notification-preferences-dialog" :visible="preferencesOpen" modal block-scroll
        :draggable="false" :closable="!store.isPreferencesSaving" :close-on-escape="!store.isPreferencesSaving"
        :dismissable-mask="false" :header="t('notifications.preferences')" aria-describedby="notification-preferences-help"
        :close-button-props="{ 'aria-label': t('notifications.closePreferences') }"
        :style="{ width: '36rem', maxWidth: 'calc(100vw - 2rem)', maxHeight: 'calc(100dvh - 2rem)' }"
        :pt="{ mask: { style: { backgroundColor: 'rgb(15 23 42 / 55%)', backdropFilter: 'blur(2px)' } } }"
        @update:visible="updatePreferencesVisibility" @after-hide="restorePreferencesFocus">
      <div class="notification-preferences-content" :aria-busy="busy">
      <p id="notification-preferences-help">{{ t('notifications.preferencesHelp') }}</p>
      <p v-if="store.isPreferencesLoading" role="status">{{ t('notifications.loadingPreferences') }}</p>
      <pv-message v-if="store.preferencesError" severity="error" :closable="false" role="alert">{{ t(store.preferencesError) }}</pv-message>
      <pv-button v-if="!store.preferences && !store.isPreferencesLoading" :label="t('notifications.retry')" @click="retryPreferences" />
      <form v-if="store.preferences" @submit.prevent="save">
        <fieldset :disabled="busy">
          <legend class="sr-only">{{ t('notifications.preferences') }}</legend>
          <label class="notification-toggle" for="nearby-alerts-enabled"><span><strong>{{ t('notifications.nearbyAlerts') }}</strong><small>{{ t('notifications.nearbyHelp') }}</small></span><input id="nearby-alerts-enabled" type="checkbox" v-model="form.nearbyAlertsEnabled" @change="store.preferencesSaved = false" /></label>
          <div class="radius-field"><label for="notification-radius">{{ t('notifications.radius') }}</label><pv-select input-id="notification-radius" v-model="form.nearbyRadiusMeters" :options="radiusChoices" option-label="label" option-value="value" :disabled="busy" :aria-label="t('notifications.radius')" aria-describedby="notification-radius-help" @change="store.preferencesSaved = false" /><small id="notification-radius-help">{{ t('notifications.radiusHelp') }}</small></div>
          <p v-if="store.center" class="business-center"><i class="pi pi-map-marker" aria-hidden="true" /> {{ t('notifications.businessCenter', { name: store.center.name }) }}</p>
          <pv-message v-else-if="store.feedLoaded" severity="warn" :closable="false">{{ t('notifications.centerUnavailable') }}</pv-message>
          <div class="preferences-actions"><pv-button type="button" severity="secondary" outlined :label="t('notifications.discard')" :disabled="!dirty" @click="reset" /><pv-button type="submit" :label="t('notifications.save')" :loading="store.isPreferencesSaving" :disabled="!dirty" /></div>
        </fieldset>
      </form>
      <pv-message v-if="store.preferencesSaved" severity="success" :closable="false" role="status">{{ t('notifications.saved') }}</pv-message>
      </div>
    </Dialog>
    <section class="notifications-panel" aria-labelledby="notification-inbox-heading" :aria-busy="store.isRefreshing">
      <div class="inbox-heading"><div><h2 id="notification-inbox-heading">{{ t('notifications.inbox') }}</h2><p aria-live="polite">{{ t('notifications.unreadCount', { count: store.unreadCount }) }}</p></div><pv-button type="button" icon="pi pi-refresh" severity="secondary" outlined :label="t('notifications.refresh')" :disabled="store.isRefreshing || store.readingIds.length > 0" @click="store.refresh()" /></div>
      <div class="inbox-filters" role="group" :aria-label="t('notifications.filterLabel')"><button v-for="value in ['all', 'unread']" :key="value" type="button" :aria-pressed="filter === value" @click="filter = value">{{ t(`notifications.filters.${value}`) }}</button></div>
      <pv-message v-if="store.feedError" severity="error" :closable="false" role="alert">{{ t(store.feedError) }}</pv-message>
      <pv-message v-if="store.readError" severity="error" :closable="false" role="alert">{{ t(store.readError) }}</pv-message>
      <p v-if="!store.feedLoaded && store.isRefreshing" role="status">{{ t('notifications.loadingInbox') }}</p>
      <ul v-if="visibleNotifications.length" class="notification-list">
        <li v-for="notification in visibleNotifications" :key="notification.id" class="notification-item" :class="{ 'notification-item--unread': notification.isUnread }">
          <span class="item-icon" aria-hidden="true"><i :class="notification.type === 'NEARBY_ALERT' ? 'pi pi-map-marker' : 'pi pi-bell'" /></span>
          <div class="notification-content"><div class="notification-title"><h3>{{ notification.type === 'NEARBY_ALERT' ? t('notifications.nearbyTitle') : notification.title || t('notifications.generalTitle') }}</h3><span v-if="notification.isUnread" class="unread-label">{{ t('notifications.unread') }}</span></div><p>{{ notification.type === 'NEARBY_ALERT' ? t('notifications.nearbyMessage') : notification.message }}</p><time :datetime="notification.createdAt">{{ formatDate(notification.createdAt) }}</time><small v-if="notification.type === 'NEARBY_ALERT' && Number.isFinite(notification.distanceMeters)">{{ t('notifications.deliveryDistance', { value: notification.distanceMeters }) }}</small></div>
          <pv-button v-if="notification.isUnread" type="button" severity="secondary" outlined :label="t('notifications.markRead')" :loading="store.readingIds.includes(String(notification.id))" :disabled="store.isRefreshing || store.readingIds.includes(String(notification.id))" @click="store.markAsRead(notification.id)" /><span v-else class="read-label"><i class="pi pi-check" aria-hidden="true" /> {{ t('notifications.read') }}</span>
        </li>
      </ul>
      <div v-else-if="store.feedLoaded && !store.feedError" class="empty-inbox"><i class="pi pi-inbox" aria-hidden="true" /><h3>{{ filter === 'unread' ? t('notifications.emptyUnread') : t('notifications.empty') }}</h3><p>{{ t('notifications.emptyHelp') }}</p></div>
    </section>
  </div>
</template>

<style scoped>
.notifications-page { max-width: 1100px; margin: 0 auto; padding: 28px; display: grid; gap: 24px; color: #172033; }
.page-heading { display: flex; gap: 16px; align-items: center; }.heading-icon { display: grid; place-items: center; width: 54px; height: 54px; flex-shrink: 0; color: #2563eb; background: #e8efff; border-radius: 16px; font-size: 24px; }
.page-heading-copy { flex: 1; min-width: 0; }
.preferences-button { display: grid; place-items: center; flex-shrink: 0; width: 44px; height: 44px; border: 1px solid #cbd5e1; border-radius: 50%; background: #fff; color: #334155; font-size: 20px; cursor: pointer; }
.preferences-button:hover, .preferences-button[aria-expanded="true"] { color: #1d4ed8; border-color: #93b4f4; background: #eff6ff; }
.notification-preferences-content { display: grid; gap: 14px; color: #172033; }
h1 { margin: 0; font-size: clamp(26px, 4vw, 32px); }h2 { margin: 0; font-size: 21px; }h3 { margin: 0; font-size: 16px; }p { margin: 8px 0; color: #475569; line-height: 1.6; }
.notifications-panel { padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; min-width: 0; display: grid; gap: 14px; }
fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }.notification-toggle { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 18px 0; cursor: pointer; }.notification-toggle span { display: grid; gap: 6px; }.notification-toggle input { width: 24px; height: 24px; flex-shrink: 0; accent-color: #2563eb; }
small { display: block; color: #475569; line-height: 1.6; }.radius-field { max-width: 430px; display: grid; gap: 8px; margin: 16px 0; }.radius-field label { font-weight: 600; }.radius-field :deep(.p-select) { width: 100%; }.business-center { display: flex; align-items: center; gap: 8px; }.preferences-actions { margin-top: 20px; display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 12px; }
.inbox-heading { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; }.inbox-heading p { margin-bottom: 0; }.inbox-filters { display: flex; gap: 8px; }.inbox-filters button { min-height: 44px; padding: 8px 18px; border: 1px solid #cbd5e1; border-radius: 22px; color: #475569; background: #fff; cursor: pointer; font-weight: 600; }.inbox-filters button[aria-pressed="true"] { color: #1d4ed8; border-color: #2563eb; background: #eff6ff; }
.notification-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }.notification-item { display: flex; gap: 16px; align-items: flex-start; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; min-width: 0; }.notification-item--unread { border-color: #c6d9fc; background: #f8fbff; }.item-icon { display: grid; place-items: center; width: 40px; height: 40px; flex-shrink: 0; background: #e8efff; color: #2563eb; border-radius: 12px; }.notification-content { flex: 1; min-width: 0; overflow-wrap: anywhere; }.notification-title { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }.unread-label { padding: 3px 9px; border-radius: 12px; background: #dbeafe; color: #1e40af; font-size: 11px; font-weight: 600; }.read-label, time { font-size: 12px; color: #475569; }.read-label { white-space: nowrap; }.notification-content p { margin: 6px 0; }
.empty-inbox { text-align: center; padding: 34px 16px; }.empty-inbox > i { display: inline-block; margin-bottom: 16px; font-size: 32px; color: #64748b; }.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }button:focus-visible, input:focus-visible { outline: 3px solid #2563eb; outline-offset: 3px; }
@media (max-width: 640px) { .notifications-page { padding: 16px; }.notifications-panel { padding: 18px; }.notification-item { flex-wrap: wrap; padding: 14px; gap: 10px; }.notification-content { flex-basis: calc(100% - 50px); }.notification-item > :deep(button) { margin-left: 50px; }.notification-item > .read-label { margin-left: 50px; }.preferences-actions { justify-content: stretch; } }
@media (max-width: 640px) { .heading-icon { display: none; }.page-heading { gap: 12px; } }
</style>
