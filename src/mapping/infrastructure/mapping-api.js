import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";
import { BaseApi } from "../../shared/infrastructure/base-api.js";

/** Infrastructure gateway for risk map resources.
* @class MappingApi */
export class MappingApi {
    constructor() {
        const baseApi = new BaseApi();
        this.riskZonesEndpoint = new BaseEndpoint(baseApi, 'risk_zones');
        this.incidentsEndpoint = new BaseEndpoint(baseApi, 'incidents');
        this.businessesEndpoint = new BaseEndpoint(baseApi, 'businesses');
    }

/** Fetches all risk zone resources.
* @returns {Promise<import('axios').AxiosResponse>} HTTP response with risk zones. */
    getAllRiskZones() {
        return this.riskZonesEndpoint.getAll();
    }

/** Fetches nearby incident resources.
* @param {number} [latitude] - Center latitude.
* @param {number} [longitude] - Center longitude.
* @param {number} [radius] - Search radius.
* @returns {Promise<import('axios').AxiosResponse>} HTTP response with incidents. */
    getNearbyIncidents(latitude, longitude, radius) {
        return this.incidentsEndpoint.getAll();
    }

/** Fetches nearby verified business resources.
* @param {number} [latitude] - Center latitude.
* @param {number} [longitude] - Center longitude.
* @param {number} [radius] - Search radius.
* @returns {Promise<import('axios').AxiosResponse>} HTTP response with businesses. */
    getNearbyVerifiedBusinesses(latitude, longitude, radius) {

        return this.businessesEndpoint.getAll();
    }
}
