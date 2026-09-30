import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";
import { BaseApi } from "../../shared/infrastructure/base-api.js";

export class MappingApi {
    constructor() {
        const baseApi = new BaseApi();
        this.riskZonesEndpoint = new BaseEndpoint(baseApi, 'risk_zones');
        this.incidentsEndpoint = new BaseEndpoint(baseApi, 'incidents');
        this.businessesEndpoint = new BaseEndpoint(baseApi, 'businesses');
    }

    getAllRiskZones() {
        return this.riskZonesEndpoint.getAll();
    }

    getNearbyIncidents(latitude, longitude, radius) {
        return this.incidentsEndpoint.getAll();
    }

    getNearbyVerifiedBusinesses(latitude, longitude, radius) {

        return this.businessesEndpoint.getAll();
    }
}
