<template>
  <div class="risk-map-page">
    <risk-map 
      :risk-zones="mappingStore.riskZones"
      :incidents="filteredIncidents"
      :businesses="mappingStore.businesses"
      :selected-item-id="selectedItem ? selectedItem.id : null"
      @zone-selected="handleZoneSelected"
      @incident-selected="handleIncidentSelected"
      @business-selected="handleBusinessSelected"
    />

    <div class="floating-top-bar">
      <div class="filters-card">
        <div class="time-filters">
          <button :class="{ active: timeFilter === '24h' }" @click="timeFilter = '24h'">Últimas 24h</button>
          <button :class="{ active: timeFilter === '7d' }" @click="timeFilter = '7d'">7 días</button>
          <button :class="{ active: timeFilter === '30d' }" @click="timeFilter = '30d'">30 días</button>
        </div>
        <div class="divider"></div>
        <pv-select
          v-model="incidentTypeFilter"
          class="type-filter"
          :options="incidentTypeOptions"
          option-label="label"
          option-value="value"
          :aria-label="t('mapping.filters.incidentCategory')"
          :pt="{ overlay: { class: 'mapping-incident-options' } }"
        >
          <template #value>
            <span class="selected-incident-type" :title="selectedIncidentTypeLabel">{{ selectedIncidentTypeLabel }}</span>
          </template>
        </pv-select>
      </div>
    </div>

    <div class="floating-legend">
      <div class="legend-card">
        <p class="legend-title">SIMBOLOGÍA CUADRANTE <i class="pi pi-info-circle"></i></p>
        <div class="legend-grid">
          <div class="legend-item"><span class="color-box bg-green"></span> Riesgo Bajo</div>
          <div class="legend-item"><span class="color-box bg-yellow"></span> Riesgo Medio</div>
          <div class="legend-item"><span class="color-box bg-red"></span> Riesgo Alto</div>
          <div class="legend-item"><span class="color-box bg-blue"></span> Tu Local</div>
          <div class="legend-item"><i class="pi pi-exclamation-triangle text-red"></i> Incidente</div>
        </div>
      </div>
    </div>

    <div v-if="selectedItem" class="floating-inspector">
      <tactical-inspector 
        :item="selectedItem"
        :type="selectedType"
        :incidents="mappingStore.incidents"
        :zones="mappingStore.riskZones"
        @close="selectedItem = null"
      />
    </div>
  </div>
</template>

<script setup>
/** Full-page risk map with filters and tactical inspector. */
import { ref, onMounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMappingStore } from '../../application/mapping.store.js';
import { IncidentCategory } from '../../domain/model/incident-marker.entity.js';
import RiskMap from '../components/risk-map.vue';
import TacticalInspector from '../components/tactical-inspector.vue';

const mappingStore = useMappingStore();
const { t } = useI18n();

const selectedItem = ref(null);
const selectedType = ref('');
const timeFilter = ref('24h');
const incidentTypeFilter = ref('all');
const incidentTypeOptions = computed(() => [
  { value: 'all', label: t('mapping.filters.allIncidents') },
  ...Object.values(IncidentCategory).map(value => ({
    value,
    label: t(`mapping.incidentCategories.${value}`),
  })),
]);
const selectedIncidentTypeLabel = computed(() =>
  incidentTypeOptions.value.find(option => option.value === incidentTypeFilter.value)?.label
  ?? t('mapping.filters.allIncidents')
);

const filteredIncidents = computed(() => {
  if (!mappingStore.incidents) return [];
  
  const now = new Date();
  let timeLimit = new Date();
  
  if (timeFilter.value === '24h') {
    timeLimit.setHours(now.getHours() - 24);
  } else if (timeFilter.value === '7d') {
    timeLimit.setDate(now.getDate() - 7);
  } else if (timeFilter.value === '30d') {
    timeLimit.setDate(now.getDate() - 30);
  }

  return mappingStore.incidents.filter(inc =>
    new Date(inc.reportedAt) >= timeLimit &&
    (incidentTypeFilter.value === 'all' || inc.type === incidentTypeFilter.value)
  );
});

watch(filteredIncidents, (incidents) => {
  if (selectedType.value === 'incident' && selectedItem.value &&
      !incidents.some(incident => incident.id === selectedItem.value.id)) {
    selectedItem.value = null;
  }
});

onMounted(() => {
  mappingStore.fetchMapData();
});

/** Shows the selected risk zone in the inspector.
* @param {string|number} zoneId - Risk zone identifier.
* @returns {void} No return value. */
const handleZoneSelected = (zoneId) => {
  const zone = mappingStore.riskZones.find(z => z.id === zoneId);
  if (zone) {
    selectedItem.value = zone;
    selectedType.value = 'zone';
  }
};

/** Shows the selected incident in the inspector.
* @param {string|number} incidentId - Incident identifier.
* @returns {void} No return value. */
const handleIncidentSelected = (incidentId) => {
  const incident = mappingStore.incidents.find(i => i.id === incidentId);
  if (incident) {
    selectedItem.value = incident;
    selectedType.value = 'incident';
  }
};

/** Shows the selected business in the inspector.
* @param {string|number} businessId - Business identifier.
* @returns {void} No return value. */
const handleBusinessSelected = (businessId) => {
  const business = mappingStore.businesses.find(b => b.id === businessId);
  if (business) {
    selectedItem.value = business;
    selectedType.value = 'business';
  }
};
</script>

<style scoped>
.risk-map-page {
  position: relative;
  width: 100%;
  height: calc(100vh - 64px); /* Assuming 64px header */
  overflow: hidden;
}

.floating-top-bar {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
}

.filters-card {
  background: white;
  border-radius: 8px;
  padding: 8px;
  display: flex;
  align-items: center;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.time-filters button {
  border: none;
  background: transparent;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  color: #555;
}

.time-filters button.active {
  background: #111c32;
  color: white;
}

.divider {
  width: 1px;
  height: 20px;
  background: #e6ebf2;
  margin: 0 12px;
}

.type-filter {
  min-width: 175px;
  max-width: 240px;
  border: none;
  background: #fff;
  font-weight: 500;
  font-size: 13px;
  color: #172033;
  color-scheme: light;
  cursor: pointer;
  outline: none;
}

.type-filter :deep(.p-select-label) {
  padding: 6px 8px;
  font-size: 13px;
  color: #172033;
  background: transparent;
}

.selected-incident-type {
  display: block;
  overflow: hidden;
  color: #172033;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-filter :deep(.p-select-dropdown) {
  width: 28px;
  color: #536179;
}

:global(.mapping-incident-options) { color: #172033; background: #fff; color-scheme: light; }
:global(.mapping-incident-options .p-select-option) { color: #172033; }
:global(.mapping-incident-options .p-select-option:not(.p-select-option-selected):not(.p-disabled):hover) { background: #f1f5fc; }
:global(.mapping-incident-options .p-select-option-selected) { color: #174ba2; background: #e7efff; }

.floating-legend {
  position: absolute;
  bottom: 20px;
  left: 20px;
  z-index: 10;
}

.legend-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  width: 240px;
}

.legend-title {
  font-size: 11px;
  font-weight: 700;
  color: #68758a;
  margin: 0 0 12px 0;
}

.legend-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  font-size: 12px;
  color: #333;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-box {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.bg-green { background: #10b981; }
.bg-yellow { background: #f59e0b; }
.bg-red { background: #ef4444; }
.bg-blue { background: #2563eb; }
.text-red { color: #ef4444; }

.floating-inspector {
  position: absolute;
  top: 0;
  right: 0;
  width: 400px;
  z-index: 20;
  background: white;
  box-shadow: -4px 0 15px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
}
</style>
