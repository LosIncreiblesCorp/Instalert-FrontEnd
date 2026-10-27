<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Business } from '../../domain/model/business.entity.js';
import useBusinessStore from '../../application/business.store.js';

const store = useBusinessStore();
const { t, locale } = useI18n();
const form = reactive({ taxId: '', name: '', address: '', latitude: null, longitude: null });
const touched = ref(false);
const nameField = ref(null);
const taxIdField = ref(null);
const addressField = ref(null);
const locationField = ref(null);
const mapElement = ref(null);
const mapReady = ref(false);
const mapError = ref(false);
let map = null;
let marker = null;
let disposed = false;

const registering = computed(() => store.profile == null);
const busy = computed(() => store.isProfileLoading || store.isProfileSaving);
const errors = computed(() => new Business(form).validationErrors);
const hasLocation = computed(() => !errors.value.location);
const dirty = computed(() => JSON.stringify(form) !== JSON.stringify(draftFromProfile()));

function draftFromProfile() {
  const profile = store.profile;
  return { taxId: profile?.taxId ?? '', name: profile?.name ?? '', address: profile?.address ?? '',
    latitude: profile?.latitude ?? null, longitude: profile?.longitude ?? null };
}

function resetForm() {
  Object.assign(form, draftFromProfile());
  touched.value = false;
  if (map) {
    if (hasLocation.value) map.jumpTo({ center: [form.longitude, form.latitude] });
    updateMarker();
  }
}

function updateMarker() {
  if (!map) return;
  if (!hasLocation.value) {
    marker?.remove();
    marker = null;
    return;
  }
  if (!marker) {
    marker = new mapboxgl.Marker({ color: '#2563eb', draggable: !busy.value })
      .setLngLat([form.longitude, form.latitude]).addTo(map);
    marker.getElement().setAttribute('aria-label', t('business.profile.markerLabel'));
    marker.on('dragend', () => {
      if (busy.value) return;
      const point = marker.getLngLat();
      selectLocation(point.lng, point.lat);
    });
  } else marker.setLngLat([form.longitude, form.latitude]);
}

function selectLocation(longitude, latitude) {
  if (busy.value) return;
  form.longitude = Number((((longitude + 180) % 360 + 360) % 360 - 180).toFixed(6));
  form.latitude = Number(latitude.toFixed(6));
  updateMarker();
}

function selectMapCenter() {
  if (!mapReady.value || !map || busy.value) return;
  const point = map.getCenter();
  selectLocation(point.lng, point.lat);
}

function destroyMap() {
  marker?.remove();
  marker = null;
  map?.remove();
  map = null;
  mapReady.value = false;
}

function initializeMap() {
  destroyMap();
  mapError.value = false;
  if (!mapElement.value || disposed) return;
  const token = import.meta.env.VITE_MAPBOX_API_KEY;
  if (!token) {
    mapError.value = true;
    return;
  }
  try {
    map = new mapboxgl.Map({ container: mapElement.value, accessToken: token,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: hasLocation.value ? [form.longitude, form.latitude] : [-77.0428, -12.0464],
      zoom: 15, keyboard: true });
    map.getCanvas().setAttribute('aria-label', t('business.profile.mapLabel'));
    map.on('load', () => { mapReady.value = true; mapError.value = false; });
    map.on('error', () => { if (!mapReady.value) mapError.value = true; });
    map.on('click', event => {
      if (mapReady.value) selectLocation(event.lngLat.lng, event.lngLat.lat);
    });
    updateMarker();
  } catch {
    destroyMap();
    mapError.value = true;
  }
}

async function loadProfile() {
  destroyMap();
  if (await store.loadProfile()) {
    if (disposed) return;
    resetForm();
    await nextTick();
    initializeMap();
  }
}

async function saveProfile() {
  if (busy.value) return;
  touched.value = true;
  const invalid = Object.keys(errors.value)[0];
  if (invalid) {
    const fields = { taxId: taxIdField, name: nameField, address: addressField, location: locationField };
    await nextTick();
    const field = fields[invalid]?.value;
    (field?.$el ?? field)?.focus();
    return;
  }
  if (await store.saveProfile({ ...form })) resetForm();
}

function discardChanges() {
  resetForm();
  store.profileNotice = null;
  store.profileError = null;
}

watch(busy, value => marker?.setDraggable(!value));
watch(locale, () => {
  map?.getCanvas().setAttribute('aria-label', t('business.profile.mapLabel'));
  marker?.getElement().setAttribute('aria-label', t('business.profile.markerLabel'));
});
onMounted(loadProfile);
onBeforeUnmount(() => { disposed = true; destroyMap(); });
</script>

<template>
  <section class="business-profile-page" aria-labelledby="business-profile-title" :aria-busy="busy">
    <header class="page-heading">
      <p class="eyebrow">{{ t('business.profile.eyebrow') }}</p>
      <h1 id="business-profile-title">{{ t('business.profile.title') }}</h1>
      <p>{{ t('business.profile.description') }}</p>
    </header>

    <p v-if="store.isProfileLoading" class="feedback" role="status">{{ t('business.profile.loading') }}</p>
    <pv-message v-if="store.profileError" severity="error" :closable="false" role="alert">
      {{ t(store.profileError) }}
    </pv-message>
    <pv-button v-if="!store.profileLoaded && !store.isProfileLoading" class="retry-load" type="button"
      icon="pi pi-refresh" :label="t('business.actions.refresh')" @click="loadProfile" />
    <p v-if="store.profileNotice" class="feedback success" role="status">{{ t(store.profileNotice) }}</p>

    <form v-if="store.profileLoaded" class="profile-surface" novalidate @submit.prevent="saveProfile">
      <header class="surface-heading">
        <span class="surface-icon" aria-hidden="true"><i class="pi pi-building" /></span>
        <div>
          <h2>{{ t(registering ? 'business.profile.registerTitle' : 'business.profile.detailsTitle') }}</h2>
          <p>{{ t('business.profile.requiredFields') }}</p>
        </div>
      </header>
      <div class="details-grid">
        <div class="form-field">
          <label for="business-name">{{ t('business.profile.name') }}</label>
          <pv-input-text id="business-name" ref="nameField" v-model="form.name" required maxlength="150"
            autocomplete="organization" :disabled="busy" :invalid="touched && !!errors.name"
            :aria-invalid="touched && !!errors.name" aria-describedby="business-name-error" />
          <p id="business-name-error" class="field-error" aria-live="polite">{{ touched && errors.name ? t(errors.name) : '' }}</p>
        </div>
        <div class="form-field">
          <label for="business-tax-id">{{ t('business.profile.taxId') }}</label>
          <pv-input-text id="business-tax-id" ref="taxIdField" v-model="form.taxId" required maxlength="11"
            inputmode="numeric" :readonly="!registering" :disabled="busy"
            :invalid="touched && !!errors.taxId" :aria-invalid="touched && !!errors.taxId"
            aria-describedby="business-tax-id-help business-tax-id-error" />
          <small id="business-tax-id-help">{{ t(registering ? 'business.profile.taxIdHelp' : 'business.profile.taxIdReadOnly') }}</small>
          <p id="business-tax-id-error" class="field-error" aria-live="polite">{{ touched && errors.taxId ? t(errors.taxId) : '' }}</p>
        </div>
      </div>
      <div class="form-field">
        <label for="business-address">{{ t('business.profile.address') }}</label>
        <pv-input-text id="business-address" ref="addressField" v-model="form.address" required maxlength="250"
          autocomplete="street-address" :disabled="busy" :invalid="touched && !!errors.address"
          :aria-invalid="touched && !!errors.address" aria-describedby="business-address-help business-address-error" />
        <small id="business-address-help">{{ t('business.profile.addressHelp') }}</small>
        <p id="business-address-error" class="field-error" aria-live="polite">{{ touched && errors.address ? t(errors.address) : '' }}</p>
      </div>

      <section class="location-section" aria-labelledby="business-location-title">
        <div class="location-heading">
          <h2 id="business-location-title" ref="locationField" tabindex="-1" aria-describedby="business-location-help business-location-error">
            {{ t('business.profile.location') }}
          </h2>
          <span class="location-status" :class="{ selected: hasLocation }" role="status">
            <i :class="hasLocation ? 'pi pi-check-circle' : 'pi pi-map-marker'" aria-hidden="true" />
            {{ t(hasLocation ? 'business.profile.locationSelected' : 'business.profile.locationPending') }}
          </span>
        </div>
        <p id="business-location-help" class="location-help">{{ t('business.profile.locationHelp') }}</p>
        <div class="map-frame">
          <div ref="mapElement" class="location-map" role="region" :aria-label="t('business.profile.mapLabel')" />
          <span v-if="mapReady" class="map-crosshair" aria-hidden="true">+</span>
        </div>
        <p v-if="!mapReady && !mapError" role="status" class="map-feedback">{{ t('business.profile.mapLoading') }}</p>
        <pv-message v-if="mapError" severity="warn" :closable="false" role="alert">
          {{ t('business.profile.mapError') }}
        </pv-message>
        <div class="map-actions">
          <pv-button type="button" outlined icon="pi pi-map-marker" :label="t('business.profile.useMapCenter')"
            :disabled="busy || !mapReady" @click="selectMapCenter" />
          <pv-button v-if="mapError" type="button" text icon="pi pi-refresh" :disabled="busy"
            :label="t('business.profile.retryMap')" @click="initializeMap" />
        </div>
        <p id="business-location-error" class="field-error" aria-live="polite">{{ touched && errors.location ? t(errors.location) : '' }}</p>
      </section>
      <footer class="form-actions">
        <pv-button type="submit" icon="pi pi-check" :loading="store.isProfileSaving"
          :disabled="busy || (!registering && !dirty)"
          :label="t(registering ? 'business.profile.register' : 'business.actions.save')" />
        <pv-button type="button" outlined :disabled="busy || !dirty" :label="t('business.profile.discard')" @click="discardChanges" />
      </footer>
    </form>
  </section>
</template>

<style scoped>
.business-profile-page { max-width: 1120px; margin: auto; padding: clamp(20px, 3vw, 40px); color: var(--ink, #172033); }
.page-heading { margin-bottom: 28px; }
.eyebrow { margin: 0 0 10px; color: #2563eb; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; }
h1 { margin: 0; font-size: clamp(26px, 3vw, 34px); letter-spacing: -.035em; }
.page-heading > p:last-child { margin: 12px 0 0; color: var(--muted, #68758a); line-height: 1.6; }
.profile-surface { margin-top: 20px; padding: clamp(20px, 3vw, 32px); border: 1px solid var(--line, #e6ebf2); border-radius: 12px; background: #fff; }
.surface-heading { display: flex; align-items: center; gap: 16px; margin-bottom: 30px; }
.surface-icon { display: grid; place-items: center; width: 48px; height: 48px; flex-shrink: 0; border-radius: 12px; background: #eff6ff; color: #2563eb; font-size: 22px; }
h2 { margin: 0; font-size: 18px; }
.surface-heading p { margin: 6px 0 0; color: var(--muted, #68758a); font-size: 13px; }
.details-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 24px; }
.form-field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; min-width: 0; }
label { font-size: 14px; font-weight: 600; }
.form-field input { width: 100%; min-height: 44px; }
.form-field input[readonly] { background: #f8fafc; color: #475569; }
small, .location-help { color: var(--muted, #68758a); font-size: 13px; line-height: 1.65; }
.location-section { margin-top: 8px; padding-top: 26px; border-top: 1px solid var(--line, #e6ebf2); }
.location-heading { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; }
.location-status { display: inline-flex; align-items: center; gap: 7px; padding: 7px 10px; border-radius: 6px; background: #f1f5f9; color: #475569; font-size: 12px; }
.location-status.selected { color: #166534; background: #f0fdf4; }
.location-help { margin: 12px 0 16px; }
.map-frame { position: relative; overflow: hidden; border: 1px solid var(--line, #e6ebf2); border-radius: 10px; background: #f1f5f9; }
.location-map { height: clamp(280px, 38vw, 380px); width: 100%; }
.map-crosshair { position: absolute; inset: 50% auto auto 50%; transform: translate(-50%, -50%); color: #172033; font-size: 32px; line-height: 1; pointer-events: none; text-shadow: 0 0 3px #fff; }
.map-actions, .form-actions { display: flex; flex-wrap: wrap; gap: 12px; }
.map-actions { margin: 16px 0 12px; }
.map-feedback { font-size: 13px; color: var(--muted, #68758a); }
.form-actions { margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--line, #e6ebf2); }
.form-actions button, .map-actions button { min-height: 44px; }
.field-error { margin: 0; color: #b91c1c; font-size: 13px; line-height: 1.5; }
.field-error:empty { display: none; }
.feedback { padding: 16px; border-radius: 8px; background: #eff6ff; }
.success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
.retry-load { margin-top: 16px; }
@media (max-width: 640px) {
  .details-grid { grid-template-columns: 1fr; gap: 0; }
  .form-actions { flex-direction: column; }
  .form-actions button, .map-actions button { width: 100%; }
}
</style>
