<template>
  <section class="tactical-inspector h-full flex flex-column bg-white" :aria-label="t('mapping.inspector.title')">
    <div class="inspector-header flex align-items-center justify-content-between p-3 border-bottom-1 surface-border">
      <span class="font-bold text-sm text-gray-700">{{ t('mapping.inspector.title') }} <i class="pi pi-circle-fill text-blue-500 text-xs ml-1" aria-hidden="true"></i></span>
      <button ref="closeButton" type="button" class="icon-button" :aria-label="t('mapping.actions.close')" @click="$emit('close')"><i class="pi pi-times" aria-hidden="true"></i></button>
    </div>
    <div v-if="type !== 'incident'" class="flex px-3 pt-3 gap-2 border-bottom-1 surface-border" role="group" :aria-label="t('mapping.inspector.sections')">
      <button type="button" class="tab-btn flex-1 py-2 border-round-top" :class="{ active: activeTab === 'business' }" :aria-pressed="activeTab === 'business'" @click="activeTab = 'business'">
        <i class="pi pi-shop mr-1" aria-hidden="true"></i>{{ t('mapping.inspector.business') }}
      </button>
      <button type="button" class="tab-btn flex-1 py-2 border-round-top" :class="{ active: activeTab === 'zone' }" :aria-pressed="activeTab === 'zone'" @click="activeTab = 'zone'">
        <i class="pi pi-bullseye mr-1" aria-hidden="true"></i>{{ t('mapping.inspector.riskZone') }}
      </button>
    </div>
    <div class="inspector-content flex-1 overflow-auto p-4">
      <div v-if="type === 'incident'">
        <button type="button" class="text-button mb-3" @click="$emit('close')"><i class="pi pi-arrow-left mr-1" aria-hidden="true"></i>{{ t('mapping.actions.back') }}</button>
        <div class="bg-red-50 border-round p-4 mb-3 border-left-3 border-red-500">
          <p class="text-xs font-bold text-red-700 mb-1"><i class="pi pi-exclamation-triangle mr-2" aria-hidden="true"></i>{{ categoryLabel(item.type) }}</p>
          <h2 class="text-xl font-bold m-0 mb-2 text-gray-900">{{ item.title || t('mapping.notRecorded') }}</h2>
          <p class="text-sm text-gray-600 m-0 mb-3"><i class="pi pi-clock mr-1" aria-hidden="true"></i>{{ formatDate(item.reportedAt) }}</p>
          <span class="status-badge" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
        </div>
        <h3 class="text-sm font-bold text-gray-700 border-bottom-1 surface-border pb-2 mb-3 mt-4">{{ t('mapping.inspector.reportDetails') }}</h3>
        <p class="text-sm text-gray-700 bg-gray-50 p-3 border-round line-height-3 m-0 border-1 surface-border">{{ item.description || t('mapping.notRecorded') }}</p>
        <p v-if="!item.hasLocation" class="text-sm text-gray-600">{{ t('mapping.feedback.noLocation') }}</p>
      </div>
      <div v-else-if="activeTab === 'business'">
        <template v-if="type === 'business'">
          <div class="flex align-items-start justify-content-between mb-4 gap-2">
            <div>
              <p class="text-xs font-bold text-blue-600 mb-1">{{ t('mapping.inspector.registeredBusiness') }}</p>
              <h2 class="text-xl font-bold m-0 mb-1">{{ item.name || t('mapping.notRecorded') }}</h2>
              <p class="text-sm text-gray-600 m-0">{{ item.address || t('mapping.notRecorded') }}</p>
            </div>
            <i class="pi pi-shop text-xl text-blue-600 bg-blue-50 border-round p-2" aria-hidden="true"></i>
          </div>
          <p v-if="!item.hasLocation" class="text-sm text-gray-600">{{ t('mapping.feedback.noLocation') }}</p>
          <p v-else-if="!applicableZones.length" class="text-sm text-gray-600">{{ t('mapping.inspector.noAssociatedZone') }}</p>
          <template v-if="applicableZones.length">
            <div class="bg-gray-50 border-round p-3 mb-4">
              <p class="text-xs font-bold text-gray-600 m-0 mb-1">{{ t('mapping.inspector.filteredReports') }}</p>
              <h3 class="text-xl font-bold m-0 mb-1">{{ localIncidents.length }}</h3>
              <p class="text-xs text-gray-600 m-0">{{ filterLabel }}</p>
            </div>
            <div v-if="recentIncident" class="border-left-2 border-blue-500 pl-3 py-1 mb-4">
              <p class="text-xs font-bold text-blue-600 mb-1">{{ t('mapping.inspector.latestReport') }}</p>
              <button type="button" class="text-button font-bold" @click="$emit('incident-selected', recentIncident.id)">{{ recentIncident.title || t('mapping.notRecorded') }}</button>
              <p class="text-xs text-gray-600">{{ formatDate(recentIncident.reportedAt) }}</p>
              <p class="text-xs text-gray-600 line-height-3">{{ recentIncident.description || t('mapping.notRecorded') }}</p>
              <span class="status-badge" :class="statusClass(recentIncident.status)">{{ statusLabel(recentIncident.status) }}</span>
            </div>
            <div class="mb-4">
              <h3 class="text-xs font-bold text-gray-600 mb-2">{{ t('mapping.inspector.hourlyDistribution') }}</h3>
              <p class="text-xs text-gray-600">{{ t('mapping.inspector.localTime') }}</p>
              <div class="hourly-chart" aria-hidden="true"><div v-for="bucket in hourlyCounts" :key="bucket.label" class="hourly-column"><span>{{ bucket.count }}</span><div class="hourly-bar" :style="{ height: (maxHourlyCount ? bucket.count / maxHourlyCount * 48 : 0) + 'px' }"></div></div></div>
              <ul class="hourly-labels"><li v-for="bucket in hourlyCounts" :key="bucket.label"><span>{{ bucket.label }}</span><span class="sr-only">: {{ bucket.count }}</span></li></ul>
              <p v-if="undatedCount" class="text-xs text-gray-600">{{ t('mapping.inspector.undatedReports', { count: undatedCount }) }}</p>
            </div>
            <button type="button" class="zone-action" @click="activeTab = 'zone'"><i class="pi pi-map mr-2" aria-hidden="true"></i>{{ t('mapping.inspector.viewZoneReports') }}</button>
          </template>
        </template>
        <template v-else>
          <h2 class="text-lg mt-0">{{ t('mapping.inspector.businessesInZone') }}</h2>
          <ul v-if="zoneBusinesses.length" class="record-list"><li v-for="business in zoneBusinesses" :key="business.id"><button type="button" class="text-button" @click="$emit('business-selected', business.id)">{{ business.name || t('mapping.notRecorded') }}</button><p class="text-xs text-gray-600">{{ business.address || t('mapping.notRecorded') }}</p></li></ul>
          <p v-else class="text-sm text-gray-600">{{ t('mapping.inspector.noBusinesses') }}</p>
        </template>
      </div>
      <div v-else>
        <p v-if="!applicableZones.length" class="text-sm text-gray-600">{{ t('mapping.inspector.noAssociatedZone') }}</p>
        <section v-for="zone in applicableZones" :key="zone.id" class="zone-section">
          <h2 class="text-xl font-bold m-0 mb-1">{{ zone.name || t('mapping.notRecorded') }}</h2>
          <p class="text-sm font-bold mb-4" :class="riskClass(zone.riskLevel)">{{ t('mapping.inspector.riskLabel') }}: {{ riskLabel(zone.riskLevel) }}</p>
          <p v-if="!zone.hasGeometry" class="text-sm text-gray-600">{{ t('mapping.inspector.noZoneGeometry') }}</p>
          <template v-else>
            <h3 class="text-sm font-bold text-gray-700 border-bottom-1 surface-border pb-2 mb-2">{{ t('mapping.inspector.zoneReports') }}</h3>
            <p class="text-xs text-gray-600">{{ filterLabel }}</p>
            <ul v-if="reportsForZone(zone).length" class="record-list"><li v-for="incident in reportsForZone(zone)" :key="incident.id" class="border-left-2 pl-3" :class="incident.status === 'active' ? 'border-red-500' : 'border-gray-300'">
              <button type="button" class="text-button font-bold text-sm" @click="$emit('incident-selected', incident.id)">{{ incident.title || t('mapping.notRecorded') }}</button>
              <p class="m-0 text-xs text-gray-600 mb-1">{{ formatDate(incident.reportedAt) }}</p>
              <p class="m-0 text-xs text-gray-600">{{ incident.description || t('mapping.notRecorded') }}</p>
            </li></ul>
            <p v-else class="text-sm text-gray-600">{{ t('mapping.inspector.noZoneReports') }}</p>
          </template>
        </section>
      </div>
    </div>
    <div class="p-3 border-top-1 surface-border flex justify-content-between align-items-center gap-2 bg-gray-50 inspector-footer">
      <span class="text-xs text-gray-600">{{ t('mapping.inspector.readOnly') }}</span><span class="text-xs text-gray-600">ID: {{ item.id }}</span>
    </div>
  </section>
</template>

<script setup>
/** Read-only inspector. All counts refer to the same filtered map projection. */
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
const { t, te, locale } = useI18n();
const props = defineProps({
  item: { type: Object, required: true }, type: { type: String, required: true },
  incidents: { type: Array, default: () => [] }, zones: { type: Array, default: () => [] },
  businesses: { type: Array, default: () => [] }, filterLabel: { type: String, default: '' },
});
defineEmits(['close', 'incident-selected', 'business-selected']);
const closeButton = ref(null);
defineExpose({ focus: () => closeButton.value?.focus() });
const activeTab = ref('business');
watch(() => [props.type, props.item.id], () => { activeTab.value = props.type === 'zone' ? 'zone' : 'business'; }, { immediate: true });
const applicableZones = computed(() => props.type === 'zone' ? [props.item]
  : props.type === 'business' ? props.zones.filter(zone => zone.containsLocation(props.item)) : []);
const reportsForZone = zone => props.incidents.filter(incident => zone.containsLocation(incident));
const localIncidents = computed(() => props.incidents.filter(incident => applicableZones.value.some(zone => zone.containsLocation(incident))));
const zoneBusinesses = computed(() => props.type === 'zone' ? props.businesses.filter(business => props.item.containsLocation(business)) : []);
const validTime = incident => incident.reportedAt instanceof Date && Number.isFinite(incident.reportedAt.getTime());
const recentIncident = computed(() => [...localIncidents.value].filter(validTime).sort((a, b) => b.reportedAt - a.reportedAt)[0] ?? null);
const hourlyCounts = computed(() => Array.from({ length: 6 }, (_, index) => ({
  label: String(index * 4).padStart(2, '0') + '–' + String((index + 1) * 4).padStart(2, '0'),
  count: localIncidents.value.filter(incident => validTime(incident) && Math.floor(incident.reportedAt.getHours() / 4) === index).length,
})));
const maxHourlyCount = computed(() => Math.max(0, ...hourlyCounts.value.map(bucket => bucket.count)));
const undatedCount = computed(() => localIncidents.value.filter(incident => !validTime(incident)).length);
function formatDate(value) {
  const date = value == null ? null : new Date(value);
  return date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(locale.value === 'es' ? 'es-419' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : t('mapping.notRecorded');
}
function categoryLabel(category) { const key = 'mapping.incidentCategories.' + category; return te(key) ? t(key) : t('mapping.incidentCategories.other'); }
function statusLabel(status) { return t('mapping.status.' + (['active', 'resolved'].includes(status) ? status : 'unknown')); }
function statusClass(status) { return status === 'active' ? 'bg-red-100 text-red-700' : status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'; }
function riskLabel(risk) { return t('mapping.risk.' + (['low', 'medium', 'high'].includes(risk) ? risk : 'unknown')); }
function riskClass(risk) { return risk === 'high' ? 'text-red-700' : risk === 'medium' ? 'text-yellow-700' : risk === 'low' ? 'text-green-700' : 'text-gray-600'; }
</script>

<style scoped>
.tactical-inspector { min-height: 0; color: #172033; }
.inspector-content { min-height: 0; overflow-wrap: anywhere; }
.inspector-header, .inspector-footer { flex-shrink: 0; }
.inspector-footer { overflow-wrap: anywhere; }
.icon-button { border: none; background: transparent; color: #475569; width: 36px; height: 36px; cursor: pointer; }
.tab-btn { background: white; border: 1px solid transparent; border-bottom: 2px solid transparent; color: #536179; font-weight: 600; font-size: 13px; cursor: pointer; }
.tab-btn:hover { background: #f8fafc; }
.tab-btn.active { color: #1d4ed8; border-bottom: 2px solid #2563eb; background: #f0f4ff; }
.text-button { background: transparent; border: none; color: #1d4ed8; text-align: left; padding: 0; cursor: pointer; font: inherit; line-height: 1.5; text-decoration: underline; text-underline-offset: 3px; }
.zone-action { width: 100%; border: none; border-radius: 6px; background: #eff6ff; color: #1d4ed8; padding: 12px; font-weight: 600; cursor: pointer; }
.status-badge { display: inline-block; font-size: 12px; border-radius: 4px; padding: 4px 8px; }
.record-list { list-style: none; padding: 0; margin: 0; }
.record-list li { margin-bottom: 16px; }
.zone-section + .zone-section { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
.hourly-chart { height: 72px; display: flex; align-items: end; gap: 8px; }
.hourly-column { flex: 1; text-align: center; font-size: 11px; }
.hourly-bar { background: #3b82f6; border-radius: 3px 3px 0 0; margin-top: 4px; }
.hourly-labels { list-style: none; display: flex; padding: 0; gap: 8px; font-size: 10px; color: #475569; }
.hourly-labels li { flex: 1; text-align: center; }
button:focus-visible { outline: 3px solid #2563eb; outline-offset: 3px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
</style>
