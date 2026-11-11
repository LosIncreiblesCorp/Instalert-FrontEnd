import { BaseApi } from '../../shared/infrastructure/base-api.js';

/** Geographical queries are scoped and filtered by the backend. */
export class MappingApi extends BaseApi {
    getRiskZones(params) { return this.http.get('mapping/risk-zones', { params }); }
    getIncidents(params) { return this.http.get('mapping/incidents', { params }); }
    getBusinesses({ businessId, radiusMeters }) {
        return this.http.get('mapping/businesses', { params: { businessId, radiusMeters } });
    }
}
