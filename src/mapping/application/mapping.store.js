import { defineStore } from 'pinia';
import { MappingApi } from '../infrastructure/mapping-api.js';
import { RiskZoneAssembler } from '../infrastructure/risk-zone.assembler.js';
import { IncidentMarkerAssembler } from '../infrastructure/incident-marker.assembler.js';
import { BusinessLocationAssembler } from '../infrastructure/business-location.assembler.js';

/** Application service for the geographical read projection. */
export const useMappingStore = defineStore('mapping', {
    state: () => ({
        riskZones: [], incidents: [], businesses: [],
        isLoading: false, hasLoaded: false, error: null, selectedZone: null,
    }),
    actions: {
        /** Replaces one complete snapshot; a failed refresh preserves the previous data. */
        async fetchMapData() {
            if (this.isLoading) return false;
            this.isLoading = true;
            this.error = null;
            try {
                const api = new MappingApi();
                const [zonesResponse, incidentsResponse, businessesResponse] = await Promise.all([
                    api.getAllRiskZones(), api.getNearbyIncidents(), api.getNearbyBusinesses(),
                ]);
                const riskZones = RiskZoneAssembler.toDomainList(zonesResponse.data);
                const incidents = IncidentMarkerAssembler.toDomainList(incidentsResponse.data);
                const businesses = BusinessLocationAssembler.toDomainList(businessesResponse.data);
                this.riskZones = riskZones;
                this.incidents = incidents;
                this.businesses = businesses;
                if (this.selectedZone) this.selectRiskZone(this.selectedZone.id);
                this.hasLoaded = true;
                return true;
            } catch {
                this.error = 'mapping.feedback.loadError';
                return false;
            } finally {
                this.isLoading = false;
            }
        },
        selectRiskZone(zoneId) {
            this.selectedZone = this.riskZones.find(zone => String(zone.id) === String(zoneId)) ?? null;
        },
    },
});
