<template>
  <tactical-inspector v-if="zoneModel" :item="zoneModel" type="zone" :incidents="incidents" :zones="[zoneModel]" @close="$emit('close')" @incident-selected="$emit('incident-selected', $event)" />
</template>

<script setup>
/** Compatibility wrapper using the same zone details as the map inspector. */
import { computed } from 'vue';
import { RiskZone } from '../../domain/model/risk-zone.entity.js';
import TacticalInspector from './tactical-inspector.vue';
const props = defineProps({ zone: { type: Object, default: null }, incidents: { type: Array, default: () => [] } });
defineEmits(['close', 'incident-selected']);
const zoneModel = computed(() => props.zone ? (props.zone instanceof RiskZone ? props.zone : new RiskZone(props.zone)) : null);
</script>
