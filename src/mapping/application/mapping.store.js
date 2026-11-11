import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { MappingApi } from '../infrastructure/mapping-api.js';
import { RiskZoneAssembler } from '../infrastructure/risk-zone.assembler.js';
import { IncidentMarkerAssembler } from '../infrastructure/incident-marker.assembler.js';
import { BusinessLocationAssembler } from '../infrastructure/business-location.assembler.js';
import { apiContext, currentContextRevision, requireBusinessId } from '../../shared/infrastructure/api-context.js';

/** A complete geographical snapshot for the selected account, commerce and filters. */
export const useMappingStore = defineStore('mapping', () => {
    const riskZones = ref([]), incidents = ref([]), businesses = ref([]);
    const isLoading = ref(false), hasLoaded = ref(false), error = ref(null), selectedZone = ref(null);
    const center = computed(() => apiContext.businessLocation);
    let request = 0, queryKey = '';
    function resetContext() {
        request++; queryKey = '';
        riskZones.value = []; incidents.value = []; businesses.value = []; selectedZone.value = null;
        isLoading.value = false; hasLoaded.value = false; error.value = null;
    }
    watch(() => [apiContext.userId, apiContext.businessId, apiContext.status], resetContext, { flush: 'sync' });
    async function fetchMapData({ radiusMeters = 1000, category = 'all', period = '24h' } = {}) {
        const revision = currentContextRevision(), currentRequest = ++request;
        const current = () => currentRequest === request && revision === currentContextRevision();
        const key = JSON.stringify([apiContext.businessId, radiusMeters, category, period]);
        if (key !== queryKey) {
            riskZones.value = []; incidents.value = []; businesses.value = []; selectedZone.value = null; hasLoaded.value = false;
            queryKey = key;
        }
        isLoading.value = true; error.value = null;
        try {
            const businessId = requireBusinessId();
            if (![100, 500, 1000].includes(radiusMeters) || !['24h', '7d', '30d', 'all'].includes(period))
                throw new Error('Invalid map query.');
            if (!center.value) throw new Error('mapping.feedback.noBusinessLocation');
            const days = { '24h': 1, '7d': 7, '30d': 30 }[period];
            const params = { businessId, radiusMeters, category: category === 'all' ? undefined : category,
                since: days ? new Date(Date.now() - days * 86400000).toISOString() : undefined };
            const api = new MappingApi();
            const [zones, points, locations] = await Promise.all([
                api.getRiskZones(params), api.getIncidents(params), api.getBusinesses(params),
            ]);
            const snapshot = [RiskZoneAssembler.toDomainList(zones.data), IncidentMarkerAssembler.toDomainList(points.data),
                BusinessLocationAssembler.toDomainList(locations.data)];
            if (!current()) return false;
            [riskZones.value, incidents.value, businesses.value] = snapshot;
            if (selectedZone.value) selectRiskZone(selectedZone.value.id);
            hasLoaded.value = true; return true;
        } catch (failure) {
            if (current()) error.value = failure.apiError?.messageKey
                ?? (failure.message?.startsWith('mapping.feedback.') ? failure.message : 'mapping.feedback.loadError');
            return false;
        } finally { if (current()) isLoading.value = false; }
    }
    function selectRiskZone(id) { selectedZone.value = riskZones.value.find(zone => String(zone.id) === String(id)) ?? null; }
    return { riskZones, incidents, businesses, isLoading, hasLoaded, error, selectedZone, center, fetchMapData, selectRiskZone, resetContext };
});
