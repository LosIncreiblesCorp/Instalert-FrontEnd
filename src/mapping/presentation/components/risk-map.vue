<template>
  <div ref="mapElement" class="map-container"></div>
</template>

<script setup>
/** Mapbox presentation of heat zones supplied by Mapping and individual incident markers. */
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const props = defineProps({
  riskZones: { type: Array, required: true },
  incidents: { type: Array, required: true },
  businesses: { type: Array, required: true },
  selectedItemId: { type: [String, Number], default: null },
  selectedType: { type: String, default: '' },
});
const emit = defineEmits(['zone-selected', 'incident-selected', 'business-selected', 'map-ready', 'map-error']);
const { t, locale } = useI18n();
const mapElement = ref(null);
let map = null;
let ready = false;
let resizeObserver = null;
let disposed = false;
const markers = new Map();
const collection = features => ({ type: 'FeatureCollection', features });
const riskColor = ['match', ['get', 'riskLevel'], 'low', '#10b981', 'medium', '#f59e0b', 'high', '#ef4444', '#64748b'];

function zoneData() {
  return collection(props.riskZones.filter(zone => zone.hasGeometry).map(zone => ({
    type: 'Feature', properties: { id: String(zone.id), riskLevel: zone.riskLevel ?? '' },
    geometry: { type: 'Polygon', coordinates: [zone.bounds] },
  })));
}
function updateSelection() {
  if (!ready) return;
  map.setPaintProperty('mapping-zone-border', 'line-width', [
    'case', ['all', ['==', props.selectedType, 'zone'], ['==', ['get', 'id'], String(props.selectedItemId)]], 5, 2,
  ]);
  for (const { id, type, element } of markers.values()) {
    const selected = props.selectedType === type && String(id) === String(props.selectedItemId);
    element.classList.toggle('selected', selected);
    element.setAttribute('aria-pressed', String(selected));
  }
}
function drawMapData() {
  if (!ready || disposed) return;
  map.getSource('mapping-zones').setData(zoneData());
  const activeKeys = new Set();
  for (const [type, resources] of [['incident', props.incidents], ['business', props.businesses]]) {
    for (const resource of resources.filter(item => item.hasLocation)) {
      const key = type + ':' + resource.id;
      activeKeys.add(key);
      let entry = markers.get(key);
      if (!entry) {
        const element = document.createElement('button');
        element.type = 'button';
        element.className = 'mapping-marker marker-' + type;
        const icon = document.createElement('i');
        icon.className = type === 'incident' ? 'pi pi-exclamation-triangle' : 'pi pi-shop';
        icon.setAttribute('aria-hidden', 'true');
        element.append(icon);
        element.addEventListener('click', event => {
          event.stopPropagation();
          emit(type + '-selected', resource.id);
        });
        entry = { id: resource.id, type, element, marker: new mapboxgl.Marker({ element }).setLngLat([resource.longitude, resource.latitude]).addTo(map) };
        markers.set(key, entry);
      }
      const label = t('mapping.actions.openItem', { name: resource.title || resource.name || t('mapping.notRecorded') });
      entry.element.setAttribute('role', 'button');
      entry.element.setAttribute('aria-label', label);
      entry.element.title = label;
      entry.marker.setLngLat([resource.longitude, resource.latitude]);
    }
  }
  for (const [key, entry] of markers) {
    if (!activeKeys.has(key)) { entry.marker.remove(); markers.delete(key); }
  }
  updateSelection();
}
function updateLabels() {
  if (!map) return;
  map.getCanvas().setAttribute('aria-label', t('mapping.mapLabel'));
  const attribution = map.getContainer().querySelector('.mapboxgl-ctrl-attrib-button');
  attribution?.setAttribute('aria-label', t('mapping.actions.attribution'));
  attribution?.setAttribute('title', t('mapping.actions.attribution'));
}
function onLoad() {
  if (disposed) return;
  map.addSource('mapping-zones', { type: 'geojson', data: zoneData() });
  map.addLayer({ id: 'mapping-zone-fill', type: 'fill', source: 'mapping-zones', minzoom: 14,
    paint: { 'fill-color': riskColor, 'fill-opacity': 0.15 } });
  map.addLayer({ id: 'mapping-zone-border', type: 'line', source: 'mapping-zones', minzoom: 14,
    paint: { 'line-color': riskColor, 'line-width': 2, 'line-dasharray': [2, 2] } });
  map.on('click', 'mapping-zone-fill', event => {
    const id = event.features?.[0]?.properties?.id;
    if (id != null) emit('zone-selected', id);
  });
  map.on('mouseenter', 'mapping-zone-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'mapping-zone-fill', () => { map.getCanvas().style.cursor = ''; });
  ready = true;
  updateLabels();
  drawMapData();
  map.resize();
  emit('map-ready');
}
function focusItem(item, type) {
  if (!ready || !item) return;
  if (type === 'zone' && item.hasGeometry) {
    const bounds = item.bounds.reduce((result, point) => result.extend(point), new mapboxgl.LngLatBounds());
    map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: 0 });
  } else if (item.hasLocation) {
    map.easeTo({ center: [item.longitude, item.latitude], duration: 0 });
  }
}
defineExpose({ focusItem });
watch(() => [props.riskZones, props.incidents, props.businesses], drawMapData, { deep: true });
watch(() => [props.selectedItemId, props.selectedType], updateSelection);
watch(locale, () => {
  updateLabels();
  drawMapData();
});
onMounted(() => {
  try {
    const token = import.meta.env.VITE_MAPBOX_API_KEY?.trim();
    if (!token) { emit('map-error'); return; }
    mapboxgl.accessToken = token;
    map = new mapboxgl.Map({ container: mapElement.value, style: 'mapbox://styles/mapbox/streets-v12',
      center: [-77.0428, -12.0464], zoom: 13, locale: {
        'AttributionControl.ToggleAttribution': t('mapping.actions.attribution'), 'Map.Title': t('mapping.mapLabel'),
      } });
    updateLabels();
    map.on('load', onLoad);
    map.on('error', () => { if (!disposed) emit('map-error'); });
    resizeObserver = new ResizeObserver(() => { if (!disposed) map.resize(); });
    resizeObserver.observe(mapElement.value);
  } catch { emit('map-error'); }
});
onUnmounted(() => {
  disposed = true;
  ready = false;
  resizeObserver?.disconnect();
  for (const entry of markers.values()) entry.marker.remove();
  markers.clear();
  map?.remove();
});
</script>

<style>
.map-container { height: 100%; width: 100%; }
.mapping-marker { display: flex; justify-content: center; align-items: center; cursor: pointer; padding: 0;
  border-radius: 50%; box-shadow: 0 2px 4px #0005; }
.mapping-marker.marker-incident { background: white; border: 2px solid #dc2626; color: #dc2626; width: 28px; height: 28px; }
.mapping-marker.marker-business { background: #2563eb; color: white; border: 2px solid white; width: 32px; height: 32px; }
.mapping-marker.selected { outline: 3px solid #172033; outline-offset: 3px; z-index: 1; }
.mapping-marker:focus-visible { outline: 3px solid #172033; outline-offset: 4px; }
</style>
