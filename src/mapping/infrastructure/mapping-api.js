import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";
import { BaseApi } from "../../shared/infrastructure/base-api.js";

/** Development projection; the production geospatial query belongs to backend services. */
function nearbyResources(resources, latitude, longitude, radius) {
    if (!Array.isArray(resources)) throw new Error('Invalid geographical collection.');
    if ([latitude, longitude, radius].every(value => value === undefined)) return resources;
    if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude)
        || Math.abs(longitude) > 180 || !Number.isFinite(radius) || radius < 0) throw new Error('Invalid geographical query.');
    const rad = value => value * Math.PI / 180;
    return resources.filter(resource => {
        if (!Number.isFinite(resource.latitude) || Math.abs(resource.latitude) > 90
            || !Number.isFinite(resource.longitude) || Math.abs(resource.longitude) > 180) return false;
        const a = Math.sin(rad(resource.latitude - latitude) / 2) ** 2 + Math.cos(rad(latitude))
            * Math.cos(rad(resource.latitude)) * Math.sin(rad(resource.longitude - longitude) / 2) ** 2;
        return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a)))) <= radius;
    });
}

/** Infrastructure gateway for risk map resources.
* @class MappingApi */
export class MappingApi {
    constructor() {
        const baseApi = new BaseApi();
        this.riskZonesEndpoint = new BaseEndpoint(baseApi, import.meta.env.VITE_RISK_ZONES_ENDPOINT_PATH);
        this.incidentsEndpoint = new BaseEndpoint(baseApi, import.meta.env.VITE_INCIDENTS_ENDPOINT_PATH);
        this.businessesEndpoint = new BaseEndpoint(baseApi, import.meta.env.VITE_BUSINESSES_ENDPOINT_PATH);
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
    async getNearbyIncidents(latitude, longitude, radius) {
        const response = await this.incidentsEndpoint.getAll();
        return { ...response, data: nearbyResources(response.data, latitude, longitude, radius) };
    }

/** Fetches registered businesses with valid map coordinates.
* @param {number} [latitude] - Center latitude.
* @param {number} [longitude] - Center longitude.
* @param {number} [radius] - Search radius.
* @returns {Promise<import('axios').AxiosResponse>} HTTP response with businesses. */
    async getNearbyBusinesses(latitude, longitude, radius) {
        const response = await this.businessesEndpoint.getAll();
        const data = nearbyResources(response.data, latitude, longitude, radius).filter(business =>
            Number.isFinite(business.latitude) && Math.abs(business.latitude) <= 90
            && Number.isFinite(business.longitude) && Math.abs(business.longitude) <= 180);
        return { ...response, data };
    }
}
