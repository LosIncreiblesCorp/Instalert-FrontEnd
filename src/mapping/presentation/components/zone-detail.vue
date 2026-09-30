<template>
  <pv-card v-if="zone" class="zone-detail-card">
    <template #title>
      Zone Details
    </template>
    <template #content>
      <h3>{{ zone.name }}</h3>
      <p><strong>Risk Level:</strong> <span :class="riskClass">{{ zone.riskLevel.toUpperCase() }}</span></p>
      
      <h4>Recent Incidents in Zone</h4>
      <ul v-if="incidentsInZone.length > 0">
        <li v-for="incident in incidentsInZone" :key="incident.id">
          <strong>{{ incident.title }}</strong> ({{ incident.type }})
          <br>
          <small>{{ incident.reportedAt.toLocaleString() }}</small>
        </li>
      </ul>
      <p v-else class="text-secondary">No recent incidents recorded in this zone.</p>
    </template>
    <template #footer>
      <pv-button label="Close" icon="pi pi-times" class="p-button-text" @click="$emit('close')" />
    </template>
  </pv-card>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  zone: {
    type: Object,
    default: null
  },
  incidents: {
    type: Array,
    default: () => []
  }
});

defineEmits(['close']);

const incidentsInZone = computed(() => {
  if (!props.zone) return [];
  // For the sake of the mock, filter incidents that are physically near the zone's center.
  // We'll use a rough lat/lng bounding box or distance formula.
  return props.incidents.filter(inc => {
    // very simplistic distance check for mock purposes
    const dLat = Math.abs(inc.latitude - props.zone.latitude);
    const dLng = Math.abs(inc.longitude - props.zone.longitude);
    return dLat < 0.01 && dLng < 0.01;
  });
});

const riskClass = computed(() => {
  return props.zone?.riskLevel === 'high' ? 'text-red-500 font-bold' : 'text-orange-500 font-bold';
});
</script>

<style scoped>
.zone-detail-card {
  width: 100%;
  max-width: 350px;
}
</style>
