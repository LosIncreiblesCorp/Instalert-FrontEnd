<template>
  <div class="risk-map-page" :class="{ 'inspector-open': selectedItem }" @keydown.esc="closeInspector">
    <risk-map :inert="selectedItem && narrowScreen ? true : undefined" ref="mapView" :key="mapKey" :risk-zones="mappingStore.riskZones" :incidents="filteredIncidents" :businesses="mappingStore.businesses"
      :selected-item-id="selection?.id ?? null" :selected-type="selection?.type ?? ''"
      @zone-selected="selectItem('zone', $event)" @incident-selected="selectItem('incident', $event)" @business-selected="selectItem('business', $event)"
      @map-ready="mapReady = true; mapError = false" @map-error="mapError = true" />
    <div class="floating-top-bar">
      <div class="filters-card" role="group" :aria-label="t('mapping.filters.label')">
        <div class="time-filters" role="group" :aria-label="t('mapping.filters.period')">
          <button v-for="period in periods" :key="period" type="button" :class="{ active: timeFilter === period }" :aria-pressed="timeFilter === period" @click="timeFilter = period">{{ t('mapping.filters.' + period) }}</button>
        </div>
        <div class="divider" aria-hidden="true"></div>
        <pv-select v-model="incidentTypeFilter" class="type-filter" :options="incidentTypeOptions" option-label="label" option-value="value" :aria-label="t('mapping.filters.incidentCategory')" :pt="{ overlay: { class: 'mapping-incident-options' } }">
          <template #value><span class="selected-incident-type" :title="selectedIncidentTypeLabel">{{ selectedIncidentTypeLabel }}</span></template>
        </pv-select>
        <button type="button" class="tool-button" @click="clearFilters">{{ t('mapping.actions.clear') }}</button>
        <button type="button" class="tool-button" :disabled="mappingStore.isLoading" @click="reloadData">{{ t('mapping.actions.refresh') }}</button>
      </div>
      <div class="map-feedback" aria-live="polite" aria-atomic="true">
        <p v-if="mappingStore.isLoading" role="status"><i class="pi pi-spin pi-spinner" aria-hidden="true"></i> {{ t('mapping.feedback.loading') }}</p>
        <p v-if="mappingStore.error" role="alert">{{ t(mappingStore.error) }} <button type="button" :disabled="mappingStore.isLoading" @click="reloadData">{{ t('mapping.actions.retry') }}</button></p>
        <p v-if="mapError" role="alert">{{ t('mapping.feedback.mapError') }} <button type="button" @click="retryMap">{{ t('mapping.actions.retryMap') }}</button></p>
        <p v-else-if="!mapReady" role="status">{{ t('mapping.feedback.mapLoading') }}</p>
        <p v-if="mappingStore.hasLoaded && !filteredIncidents.length">{{ t('mapping.feedback.noResults') }}</p>
        <p v-if="unlocatedCount">{{ t('mapping.feedback.unlocated', { count: unlocatedCount }) }}</p>
        <p v-if="selectionMessage">{{ t(selectionMessage) }}</p>
      </div>
      <div class="explorer">
        <button ref="explorerButton" type="button" class="explorer-toggle" :aria-expanded="explorerOpen" aria-controls="mapping-results" @click="explorerOpen = !explorerOpen">
          <i class="pi pi-list mr-1" aria-hidden="true"></i>{{ t('mapping.actions.explore') }} <span>({{ filteredIncidents.length }})</span>
        </button>
        <div v-if="explorerOpen" id="mapping-results" class="explorer-results">
          <h2>{{ t('mapping.legend.incident') }}</h2>
          <ul v-if="filteredIncidents.length"><li v-for="incident in filteredIncidents" :key="incident.id"><button type="button" @click="selectItem('incident', incident.id)">{{ incident.title || t('mapping.notRecorded') }}</button></li></ul>
          <p v-else>{{ t('mapping.feedback.noResults') }}</p>
          <h2>{{ t('mapping.inspector.riskZone') }}</h2>
          <ul v-if="mappingStore.riskZones.length"><li v-for="zone in mappingStore.riskZones" :key="zone.id"><button type="button" @click="selectItem('zone', zone.id)">{{ zone.name || t('mapping.notRecorded') }}</button></li></ul>
          <p v-else>{{ t('mapping.feedback.noZones') }}</p>
          <h2>{{ t('mapping.inspector.registeredBusiness') }}</h2>
          <ul v-if="mappingStore.businesses.length"><li v-for="business in mappingStore.businesses" :key="business.id"><button type="button" @click="selectItem('business', business.id)">{{ business.name || t('mapping.notRecorded') }}</button></li></ul>
          <p v-else>{{ t('mapping.inspector.noBusinesses') }}</p>
        </div>
      </div>
    </div>
    <div class="floating-legend">
      <div class="legend-card">
        <h2 class="legend-title">{{ t('mapping.legend.title') }} <i class="pi pi-info-circle" aria-hidden="true"></i></h2>
        <h3 class="legend-section-title">{{ t('mapping.legend.riskZones') }}</h3>
        <div class="legend-grid">
          <div v-for="risk in ['low', 'medium', 'high', 'unknown']" :key="risk" class="legend-item"><span class="color-box" :class="'risk-' + risk" aria-hidden="true"></span>{{ t('mapping.risk.' + risk) }}</div>
        </div>
        <p class="legend-hint">{{ t('mapping.legend.lowRiskHint') }}</p>
        <div class="legend-grid">
          <div class="legend-item"><span class="color-box bg-blue" aria-hidden="true"></span>{{ t('mapping.inspector.registeredBusiness') }}</div>
          <div class="legend-item"><i class="pi pi-exclamation-triangle text-red" aria-hidden="true"></i>{{ t('mapping.legend.incident') }}</div>
        </div>
      </div>
    </div>
    <div v-if="selectedItem" class="floating-inspector">
      <tactical-inspector ref="inspector" :item="selectedItem" :type="selection.type" :incidents="filteredIncidents" :zones="mappingStore.riskZones" :businesses="mappingStore.businesses" :filter-label="filterLabel"
        @close="closeInspector" @incident-selected="selectItem('incident', $event)" @business-selected="selectItem('business', $event)" />
    </div>
  </div>
</template>

<script setup>
/** Filters, accessible selection and loading states for the geographical projection. */
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMappingStore } from '../../application/mapping.store.js';
import { IncidentCategory } from '../../domain/model/incident-marker.entity.js';
import RiskMap from '../components/risk-map.vue';
import TacticalInspector from '../components/tactical-inspector.vue';
const mappingStore = useMappingStore();
const { t } = useI18n();
const selection = ref(null);
const selectionMessage = ref('');
const timeFilter = ref('24h');
const incidentTypeFilter = ref('all');
const periods = ['24h', '7d', '30d', 'all'];
const now = ref(Date.now());
const mapView = ref(null), inspector = ref(null), explorerButton = ref(null);
const mapReady = ref(false), mapError = ref(false), mapKey = ref(0), explorerOpen = ref(false);
const narrowScreen = ref(false);
let mediaQuery = null;
const updateScreen = event => { narrowScreen.value = event.matches; };
let timer = null, returnFocus = null;
const incidentTypeOptions = computed(() => [
  { value: 'all', label: t('mapping.filters.allIncidents') },
  ...Object.values(IncidentCategory).map(value => ({ value, label: t('mapping.incidentCategories.' + value) })),
]);
const selectedIncidentTypeLabel = computed(() => incidentTypeOptions.value.find(option => option.value === incidentTypeFilter.value)?.label ?? t('mapping.filters.allIncidents'));
const filterLabel = computed(() => t('mapping.filters.' + timeFilter.value) + ' · ' + selectedIncidentTypeLabel.value);
const filteredIncidents = computed(() => {
  const duration = { '24h': 86400000, '7d': 604800000, '30d': 2592000000 }[timeFilter.value];
  return mappingStore.incidents.filter(incident => incident.matchesFilters({ category: incidentTypeFilter.value,
    since: duration ? now.value - duration : null, until: duration ? now.value : null }));
});
const selectedItem = computed(() => {
  if (!selection.value) return null;
  const resources = { zone: mappingStore.riskZones, incident: filteredIncidents.value, business: mappingStore.businesses }[selection.value.type] ?? [];
  return resources.find(item => String(item.id) === String(selection.value.id)) ?? null;
});
const unlocatedCount = computed(() => filteredIncidents.value.filter(item => !item.hasLocation).length
  + mappingStore.businesses.filter(item => !item.hasLocation).length + mappingStore.riskZones.filter(item => !item.hasGeometry).length);
watch([selectedItem, selection], ([item, current]) => {
  if (!item && current) {
    selectionMessage.value = selection.value.type === 'incident' && mappingStore.incidents.some(incident => String(incident.id) === String(selection.value.id))
      ? 'mapping.feedback.selectionFiltered' : 'mapping.feedback.unavailable';
    closeInspector();
  }
});
async function selectItem(type, id) {
  if (!selection.value) returnFocus = document.activeElement;
  selection.value = { type, id };
  if (!selectedItem.value) { selectionMessage.value = 'mapping.feedback.unavailable'; closeInspector(); return; }
  selectionMessage.value = '';
  mapView.value?.focusItem(selectedItem.value, type);
  await nextTick();
  inspector.value?.focus();
}
async function closeInspector() {
  if (!selection.value) return;
  selection.value = null;
  await nextTick();
  if (returnFocus?.isConnected) returnFocus.focus();
  else explorerButton.value?.focus();
}
function clearFilters() { timeFilter.value = 'all'; incidentTypeFilter.value = 'all'; }
function reloadData() { now.value = Date.now(); return mappingStore.fetchMapData(); }
function retryMap() { mapReady.value = false; mapError.value = false; mapKey.value++; }
onMounted(() => {
  mediaQuery = window.matchMedia('(max-width: 1000px)');
  updateScreen(mediaQuery);
  mediaQuery.addEventListener('change', updateScreen);
  void reloadData();
  timer = window.setInterval(() => { now.value = Date.now(); }, 60000);
});
onUnmounted(() => { window.clearInterval(timer); mediaQuery?.removeEventListener('change', updateScreen); });
</script>

<style scoped>
.risk-map-page { position: relative; isolation: isolate; width: 100%; height: calc(100dvh - 64px); min-height: 360px; overflow: hidden; background: #e2e8f0; color: #172033; }
.floating-top-bar { position: absolute; top: 20px; left: 20px; right: 20px; z-index: 2; pointer-events: none; }
.floating-top-bar > * { pointer-events: auto; }
.filters-card { background: white; border-radius: 8px; padding: 8px; display: flex; align-items: center; flex-wrap: wrap; gap: 4px; box-shadow: 0 4px 6px #0002; width: fit-content; max-width: 100%; }
.time-filters { display: flex; flex-wrap: wrap; gap: 2px; }
.time-filters button, .tool-button { border: none; background: transparent; padding: 8px; cursor: pointer; border-radius: 4px; font-size: 13px; font-weight: 500; color: #475569; }
.time-filters button.active { background: #111c32; color: white; }
.tool-button { color: #1d4ed8; }
button:disabled { opacity: .55; cursor: wait; }
button:focus-visible { outline: 3px solid #2563eb; outline-offset: 2px; }
.divider { width: 1px; height: 20px; background: #e6ebf2; margin: 0 6px; }
.type-filter { min-width: 175px; max-width: 240px; border: none; background: white; font-weight: 500; font-size: 13px; color: #172033; color-scheme: light; }
.type-filter :deep(.p-select-label) { padding: 6px 8px; font-size: 13px; color: #172033; }
.type-filter :deep(.p-select-dropdown) { width: 28px; color: #536179; }
.selected-incident-type { display: block; overflow: hidden; color: #172033; text-overflow: ellipsis; white-space: nowrap; }
:global(.mapping-incident-options) { color: #172033; background: white; color-scheme: light; }
:global(.mapping-incident-options .p-select-option) { color: #172033; }
:global(.mapping-incident-options .p-select-option:not(.p-select-option-selected):not(.p-disabled):hover) { background: #f1f5fc; }
:global(.mapping-incident-options .p-select-option-selected) { color: #174ba2; background: #e7efff; }
.map-feedback { width: fit-content; max-width: 100%; font-size: 13px; }
.map-feedback:empty { display: none; }
.map-feedback p { margin: 6px 0 0; padding: 10px; border-radius: 6px; background: white; box-shadow: 0 2px 5px #0002; }
.map-feedback button { background: none; border: none; color: #1d4ed8; text-decoration: underline; cursor: pointer; font: inherit; }
.explorer { margin-top: 8px; width: min(300px, 100%); border-radius: 8px; background: white; box-shadow: 0 4px 6px #0002; }
.explorer-toggle { padding: 10px 12px; background: transparent; color: #172033; border: none; cursor: pointer; width: 100%; text-align: left; border-radius: 8px; }
.explorer-results { padding: 0 12px 12px; max-height: min(42dvh, 320px); overflow: auto; font-size: 13px; }
.explorer-results h2 { font-size: 13px; margin: 14px 0 8px; }
.explorer-results ul { list-style: none; padding: 0; margin: 0; }
.explorer-results button { background: transparent; border: none; padding: 8px 2px; color: #1d4ed8; text-align: left; cursor: pointer; line-height: 1.4; overflow-wrap: anywhere; }
.floating-legend { position: absolute; bottom: 44px; left: 20px; z-index: 1; }
.legend-card { background: white; border-radius: 8px; padding: 16px; box-shadow: 0 4px 6px #0002; width: 260px; }
.legend-title { font-size: 11px; font-weight: 700; color: #536179; margin: 0 0 12px; }
.legend-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; }
.legend-item { display: flex; align-items: center; gap: 6px; }
.color-box { flex-shrink: 0; width: 12px; height: 12px; border-radius: 50%; }
.risk-low { background: #10b981; } .risk-medium { background: #f59e0b; } .risk-high { background: #ef4444; } .risk-unknown { background: #64748b; }
.bg-blue { background: #2563eb; } .text-red { color: #dc2626; }
.legend-section-title { margin: 0 0 8px; font-size: 12px; color: #334155; }
.legend-hint { margin: 8px 0 12px; font-size: 11px; line-height: 1.4; color: #475569; }
.floating-inspector { position: absolute; inset: 0 0 0 auto; width: 400px; max-width: 100%; z-index: 3; background: white; box-shadow: -4px 0 15px #0002; display: flex; flex-direction: column; }
.floating-inspector > * { width: 100%; }
.inspector-open .floating-top-bar { right: 420px; }
@media (max-width: 1000px) { .inspector-open .floating-top-bar { display: none; } }
@media (max-width: 600px) { .floating-top-bar { top: 12px; left: 12px; right: 12px; } .divider { display: none; } .filters-card { gap: 2px; } .type-filter { min-width: 150px; flex: 1; } .floating-legend { left: 12px; bottom: 40px; } .legend-card { padding: 12px; width: 250px; } .floating-inspector { width: 100%; } .inspector-open .floating-legend { display: none; } }
@media (max-height: 650px) { .floating-legend { display: none; } .explorer-results { max-height: 25dvh; } }
</style>
