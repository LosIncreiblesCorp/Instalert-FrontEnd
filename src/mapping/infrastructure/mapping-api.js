import { useIamStore } from '../../iam/application/iam.store.js';
import { BaseApi } from '../../shared/infrastructure/base-api.js';

/** Geographical queries are scoped and filtered by the backend. */
export class MappingApi extends BaseApi {
    constructor() {
        super();
        this.http.interceptors.response.use(undefined, async error => {
            if (error.response?.status === 403) await useIamStore().refreshSession();
            throw error;
        });
    }

    getRiskZones(params) { return this.http.get('mapping/risk-zones', { params }); }
    getIncidents(params) { return this.http.get('mapping/incidents', { params }); }
    getBusinesses({ businessId, radiusMeters }) {
        return this.http.get('mapping/businesses', { params: { businessId, radiusMeters } });
    }
}
