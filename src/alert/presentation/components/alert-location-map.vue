<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const props = defineProps({ latitude: Number, longitude: Number, disabled: Boolean });
const emit = defineEmits(['select']);
const { t, locale } = useI18n();
const container = ref(null), ready = ref(false), failed = ref(false);
let map, marker, resizeObserver;
const hasPoint = () => Number.isFinite(props.latitude) && Number.isFinite(props.longitude);
function select(longitude, latitude) {
  if (props.disabled) return;
  emit('select', { latitude: Number(latitude.toFixed(6)),
    longitude: Number((((longitude + 180) % 360 + 360) % 360 - 180).toFixed(6)) });
}
function syncMarker() {
  if (!map || !hasPoint()) return;
  if (!marker) {
    marker = new mapboxgl.Marker({ color: '#2563eb', draggable: !props.disabled })
      .setLngLat([props.longitude, props.latitude]).addTo(map);
    marker.on('dragend', () => { const point = marker.getLngLat(); select(point.lng, point.lat); });
  } else marker.setLngLat([props.longitude, props.latitude]);
  marker.getElement().setAttribute('aria-label', t('alerts.workflow.location.markerLabel'));
}
function destroy() {
  resizeObserver?.disconnect(); marker?.remove(); map?.remove();
  marker = null; map = null; ready.value = false;
}
function initialize() {
  destroy(); failed.value = false;
  const token = import.meta.env.VITE_MAPBOX_API_KEY;
  if (!token || !container.value) { failed.value = true; return; }
  try {
    map = new mapboxgl.Map({ container: container.value, accessToken: token,
      style: 'mapbox://styles/mapbox/streets-v12', zoom: 16, keyboard: true,
      center: hasPoint() ? [props.longitude, props.latitude] : [-77.0428, -12.0464] });
    map.getCanvas().setAttribute('aria-label', t('alerts.workflow.location.mapLabel'));
    map.on('load', () => { ready.value = true; failed.value = false; map.resize(); });
    map.on('error', () => { if (!ready.value) failed.value = true; });
    map.on('click', event => { if (ready.value) select(event.lngLat.lng, event.lngLat.lat); });
    resizeObserver = new ResizeObserver(() => map?.resize()); resizeObserver.observe(container.value);
    syncMarker();
  } catch { destroy(); failed.value = true; }
}
function useCenter() {
  if (!ready.value || !map) return;
  const point = map.getCenter(); select(point.lng, point.lat);
}
watch(() => [props.latitude, props.longitude], () => {
  syncMarker();
  if (hasPoint()) map?.easeTo({ center: [props.longitude, props.latitude], duration: 200 });
});
watch(() => props.disabled, value => marker?.setDraggable(!value));
watch(locale, () => {
  map?.getCanvas().setAttribute('aria-label', t('alerts.workflow.location.mapLabel')); syncMarker();
});
onMounted(initialize);
onBeforeUnmount(destroy);
</script>

<template>
  <div class="alert-location-picker">
    <p>{{ t('alerts.workflow.location.mapHelp') }}</p>
    <div class="map-frame">
      <div ref="container" class="location-map" role="region" :aria-label="t('alerts.workflow.location.mapLabel')" />
      <span v-if="ready" class="crosshair" aria-hidden="true">+</span>
    </div>
    <p v-if="!ready && !failed" role="status">{{ t('business.profile.mapLoading') }}</p>
    <p v-if="failed" role="alert">{{ t('business.profile.mapError') }}</p>
    <div class="map-actions">
      <pv-button type="button" outlined :disabled="disabled || !ready" :label="t('business.profile.useMapCenter')" @click="useCenter" />
      <pv-button v-if="failed" type="button" text :disabled="disabled" :label="t('business.profile.retryMap')" @click="initialize" />
    </div>
  </div>
</template>

<style scoped>
.alert-location-picker { min-width: 0; width: 100%; }
.alert-location-picker p { font-size: .875rem; line-height: 1.5; }
.map-frame { position: relative; overflow: hidden; border: 1px solid #cbd5e1; border-radius: 12px; }
.location-map { width: 100%; height: 300px; }
.crosshair { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); pointer-events: none; font-size: 28px; color: #0f172a; text-shadow: 0 0 3px white; }
.map-actions { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .75rem; }
</style>
