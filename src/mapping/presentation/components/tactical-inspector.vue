<template>
  <div class="tactical-inspector h-full flex flex-column bg-white">

    <div class="inspector-header flex align-items-center justify-content-between p-3 border-bottom-1 surface-border">
      <span class="font-bold text-sm text-gray-700">INSPECTOR TÁCTICO <i class="pi pi-circle-fill text-blue-500 text-xs ml-1"></i></span>
      <button class="p-link text-gray-500 hover:text-gray-900 bg-transparent border-none cursor-pointer" @click="$emit('close')">
        <i class="pi pi-times"></i>
      </button>
    </div>

    <div class="flex px-3 pt-3 gap-2 border-bottom-1 surface-border" v-if="type !== 'incident'">
      <button 
        class="tab-btn flex-1 flex justify-content-center align-items-center gap-2 py-2 border-round-top"
        :class="{'active': activeTab === 'comercio'}"
        @click="activeTab = 'comercio'"
      >
        <i class="pi pi-shop"></i> Comercio
      </button>
      <button 
        class="tab-btn flex-1 flex justify-content-center align-items-center gap-2 py-2 border-round-top"
        :class="{'active': activeTab === 'zona'}"
        @click="activeTab = 'zona'"
      >
        <i class="pi pi-bullseye text-red-500"></i> Zona de Riesgo
      </button>
    </div>

    <div class="flex-1 overflow-auto p-4">
      
      <div v-if="type === 'incident'">
        <button class="p-link text-gray-500 mb-3 bg-transparent border-none cursor-pointer p-0 font-medium" @click="$emit('close')"><i class="pi pi-arrow-left"></i> Volver al mapa</button>
        
        <div class="bg-red-50 border-round p-4 mb-3 border-left-3 border-red-500">
          <p class="text-xs font-bold text-red-500 mb-1 flex align-items-center"><i class="pi pi-exclamation-triangle mr-2"></i> {{ item.type.toUpperCase() }}</p>
          <h2 class="text-xl font-bold m-0 mb-2 text-gray-900">{{ item.title }}</h2>
          <p class="text-sm text-gray-600 m-0 mb-3"><i class="pi pi-clock mr-1"></i> {{ new Date(item.reportedAt).toLocaleString() }}</p>
          <span class="bg-red-100 text-red-700 text-xs px-2 py-1 border-round font-medium" v-if="item.status === 'active'"><i class="pi pi-spin pi-spinner text-xs mr-1"></i> En progreso</span>
          <span class="bg-green-100 text-green-700 text-xs px-2 py-1 border-round font-medium" v-else><i class="pi pi-check text-xs mr-1"></i> Resuelto</span>
        </div>

        <h3 class="text-sm font-bold text-gray-700 border-bottom-1 surface-border pb-2 mb-3 mt-4">Detalles del Reporte</h3>
        <p class="text-sm text-gray-700 bg-gray-50 p-3 border-round line-height-3 m-0 border-1 surface-border">{{ item.description }}</p>
      </div>

      <div v-else-if="activeTab === 'comercio'">
        <template v-if="type === 'business'">
          <div class="flex align-items-start justify-content-between mb-4">
            <div>
              <p class="text-xs font-bold text-blue-500 mb-1">SECTOR 4B <span class="text-gray-500 font-normal">A 120m de ti</span></p>
              <h2 class="text-xl font-bold m-0 mb-1">{{ item.name }}</h2>
              <p class="text-sm text-gray-500 m-0">{{ item.address }}</p>
            </div>
            <div class="bg-blue-50 text-blue-600 border-round p-2 flex align-items-center justify-content-center">
              <i class="pi pi-shop text-xl"></i>
            </div>
          </div>

          <div class="bg-gray-50 border-round p-3 mb-4">
            <p class="text-xs font-bold text-gray-600 m-0 mb-1">INCIDENTES EN LA ZONA (24H)</p>
            <h3 class="text-xl font-bold m-0 mb-1">{{ localIncidents.length }} eventos</h3>
            <p class="text-sm m-0 font-medium" :class="dynamicMetrics.trend < 0 ? 'text-green-600' : 'text-red-500'">
              <i class="pi" :class="dynamicMetrics.trend < 0 ? 'pi-arrow-down-right' : 'pi-arrow-up-right'"></i> 
              {{ Math.abs(dynamicMetrics.trend) }}% vs mes anterior
            </p>
          </div>

          <div class="border-left-2 border-blue-500 pl-3 py-1 mb-4" v-if="dynamicMetrics.recentIncident">
            <div class="flex justify-content-between align-items-center mb-1">
              <span class="text-xs font-bold text-red-500"><i class="pi pi-bell"></i> EVENTO RECIENTE</span>
              <span class="text-xs text-gray-500">Hace {{ dynamicMetrics.recentMinutes }} min</span>
            </div>
            <h4 class="text-sm font-bold m-0 mb-2">{{ dynamicMetrics.recentIncident.title }}</h4>
            <p class="text-xs text-gray-600 m-0 mb-3 line-height-3">
              {{ dynamicMetrics.recentIncident.description }}
            </p>
            <span class="text-xs px-2 py-1 border-round font-medium" :class="dynamicMetrics.recentIncident.status === 'active' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'">
              <i class="pi" :class="dynamicMetrics.recentIncident.status === 'active' ? 'pi-spin pi-spinner' : 'pi-check'"></i> 
              {{ dynamicMetrics.recentIncident.status === 'active' ? 'En progreso' : 'Resuelto' }}
            </span>
            <span class="text-xs text-gray-500 ml-2">Patrulla Cuadrante informada</span>
          </div>

          <div class="mb-4">
            <p class="text-xs font-bold text-gray-600 flex justify-content-between mb-2">
              DISTRIBUCIÓN HORARIA DE RIESGO
              <span class="text-blue-500 font-normal">Pico: {{ dynamicMetrics.peakHour }}:00 - {{ dynamicMetrics.peakHour + 2 }}:30</span>
            </p>
            <div class="flex align-items-end justify-content-between h-3rem gap-1">
              <div v-for="(height, idx) in dynamicMetrics.hourlyBars" :key="idx" class="flex-1 border-round" :class="height >= 80 ? 'bg-red-600 h-full' : (height >= 50 ? 'bg-blue-500 h-2rem' : 'bg-blue-100 h-1rem')"></div>
            </div>
            <div class="flex justify-content-between text-xs text-gray-500 mt-1">
              <span>09h</span>
              <span>13h</span>
              <span :class="dynamicMetrics.isCritical ? 'text-red-500 font-bold' : 'text-blue-500 font-medium'">
                {{ dynamicMetrics.peakHour }}h <template v-if="dynamicMetrics.isCritical">(Crítico)</template>
              </span>
              <span>22h</span>
            </div>
          </div>

          <button class="w-full bg-blue-50 text-blue-600 border-none border-round py-3 font-bold cursor-pointer hover:bg-blue-100 transition-colors">
            <i class="pi pi-history mr-2"></i> Ver Bitácora Completa del Local
          </button>
        </template>
        <template v-else>
          <div class="text-center text-gray-500 mt-5">
            <i class="pi pi-shop text-4xl mb-3"></i>
            <p>Seleccione un negocio en el mapa para ver sus estadísticas.</p>
          </div>
        </template>
      </div>

      <div v-else-if="activeTab === 'zona'">
        <template v-if="type === 'zone'">
          <h2 class="text-xl font-bold m-0 mb-1">{{ item.name }}</h2>
          <p class="text-sm font-bold mb-4" :class="item.riskLevel === 'high' ? 'text-red-500' : (item.riskLevel === 'medium' ? 'text-yellow-500' : 'text-green-500')">
            RIESGO {{ item.riskLevel === 'high' ? 'ALTO' : (item.riskLevel === 'medium' ? 'MEDIO' : 'BAJO') }}
          </p>

          <h3 class="text-sm font-bold text-gray-700 border-bottom-1 surface-border pb-2 mb-3">Incidentes en la zona</h3>
          <ul class="list-none p-0 m-0" v-if="localIncidents.length > 0">
            <li v-for="inc in localIncidents" :key="inc.id" class="mb-3 border-left-2 pl-3" :class="inc.status === 'active' ? 'border-red-500' : 'border-green-500'">
              <p class="m-0 font-bold text-sm">{{ inc.title }}</p>
              <p class="m-0 text-xs text-gray-500 mb-1">{{ new Date(inc.reportedAt).toLocaleString() }}</p>
              <p class="m-0 text-xs text-gray-600">{{ inc.description }}</p>
            </li>
          </ul>
          <p v-else class="text-sm text-gray-500">No hay incidentes reportados cerca.</p>
        </template>
        <template v-else>
          <div class="text-center text-gray-500 mt-5">
            <i class="pi pi-map text-4xl mb-3"></i>
            <p>Seleccione una zona de riesgo en el mapa.</p>
          </div>
        </template>
      </div>

    </div>

    <div class="p-3 border-top-1 surface-border flex justify-content-between align-items-center bg-gray-50">
      <span class="text-xs text-gray-600"><i class="pi pi-circle-fill text-green-500 text-xs mr-1"></i> Sincronizado con Central Operativa</span>
      <span class="text-xs text-gray-500">ID: CUAD-4B-9982</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  incidents: {
    type: Array,
    default: () => []
  },
  zones: {
    type: Array,
    default: () => []
  }
});

defineEmits(['close']);

const activeTab = ref('comercio');

watch(() => props.type, (newType) => {
  if (newType === 'business') activeTab.value = 'comercio';
  else if (newType === 'zone') activeTab.value = 'zona';
}, { immediate: true });

const localIncidents = computed(() => {
  let bounds = null;

  if (props.type === 'zone' && props.item.bounds) {
    bounds = props.item.bounds;
  } else if (props.type === 'business' && props.item.latitude && props.zones) {
    const parentZone = props.zones.find(z => {
      const lats = z.bounds.map(b => b[1]);
      const lngs = z.bounds.map(b => b[0]);
      return props.item.latitude >= Math.min(...lats) && props.item.latitude <= Math.max(...lats) &&
             props.item.longitude >= Math.min(...lngs) && props.item.longitude <= Math.max(...lngs);
    });
    if (parentZone) bounds = parentZone.bounds;
  }

  if (!bounds) return [];

  const lats = bounds.map(b => b[1]);
  const lngs = bounds.map(b => b[0]);
  
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return props.incidents.filter(inc => 
    inc.latitude >= minLat && inc.latitude <= maxLat &&
    inc.longitude >= minLng && inc.longitude <= maxLng
  );
});

const dynamicMetrics = computed(() => {
  if (props.type !== 'business' || !props.item) return {};
  
  const seedId = props.item.id.charCodeAt(props.item.id.length - 1) || 0;
  
  const trend = -60 + (seedId % 80); 
  
  const sortedIncidents = [...localIncidents.value].sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));
  const recentIncident = sortedIncidents.length > 0 ? sortedIncidents[0] : null;
  
  let recentMinutes = 0;
  if (recentIncident) {
    const diffMs = new Date() - new Date(recentIncident.reportedAt);
    recentMinutes = Math.max(1, Math.floor(diffMs / 60000));
  }

  const hourlyBars = [20, 20, 20, 20, 20, 20, 20];
  const peakIndex = (seedId % 5) + 1;
  const isCritical = localIncidents.value.length > 0;

  if (isCritical) {
    hourlyBars[peakIndex] = 100;
    if (peakIndex > 0) hourlyBars[peakIndex - 1] = 60;
    if (peakIndex < 6) hourlyBars[peakIndex + 1] = 60;
  } else {
    hourlyBars[peakIndex] = 50;
    if (peakIndex > 0) hourlyBars[peakIndex - 1] = 30;
    if (peakIndex < 6) hourlyBars[peakIndex + 1] = 30;
  }
  
  const hourMapping = [9, 11, 13, 16, 18, 20, 22];
  const peakHour = hourMapping[peakIndex];

  return {
    trend,
    recentIncident,
    recentMinutes,
    hourlyBars,
    peakHour,
    isCritical
  };
});

</script>

<style scoped>
.tab-btn {
  background: white;
  border: 1px solid transparent;
  border-bottom: 2px solid transparent;
  color: #68758a;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: #f8fafc;
}

.tab-btn.active {
  color: #2563eb;
  border-bottom: 2px solid #2563eb;
  background: #f0f4ff;
}
</style>
