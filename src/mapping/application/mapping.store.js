import { defineStore } from 'pinia';
import { MappingApi } from '../infrastructure/mapping-api.js';
import { RiskZoneAssembler } from '../infrastructure/risk-zone.assembler.js';
import { IncidentMarkerAssembler } from '../infrastructure/incident-marker.assembler.js';
import { BusinessLocationAssembler } from '../infrastructure/business-location.assembler.js';

export const useMappingStore = defineStore('mapping', {
    state: () => ({
        riskZones: [],
        incidents: [],
        businesses: [],
        isLoading: false,
        error: null,
        selectedZone: null
    }),
    actions: {
        async fetchMapData() {
            this.isLoading = true;
            this.error = null;
            const api = new MappingApi();
            try {

                const zonesResponse = await api.getAllRiskZones();
                this.riskZones = RiskZoneAssembler.toDomainList(zonesResponse.data);

                const incidentsResponse = await api.getNearbyIncidents();
                this.incidents = IncidentMarkerAssembler.toDomainList(incidentsResponse.data);

                const businessesResponse = await api.getNearbyVerifiedBusinesses();
                this.businesses = BusinessLocationAssembler.toDomainList(
                    businessesResponse.data.filter(b => b.isVerified)
                );
            } catch (err) {
                this.error = 'Failed to load map data.';
                console.error(err);
            } finally {
                this.isLoading = false;
            }
        },
        selectRiskZone(zoneId) {
            this.selectedZone = this.riskZones.find(z => z.id === zoneId) || null;
        }
    }
});
