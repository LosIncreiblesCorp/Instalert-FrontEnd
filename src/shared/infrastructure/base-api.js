import axios from "axios";
import i18n from '../../i18n.js';
import { currentApiContext, currentContextRevision } from './api-context.js';
import { normalizeApiError } from './api-errors.js';

const platformApi = import.meta.env.VITE_INSTALERT_PLATFORM_API_URL?.trim();

/**
 * Shared infrastructure base class that configures the HTTP client.
 *
 * @class BaseApi
 */
export class BaseApi {
    /**
     * @private
     * Axios HTTP client instance
     * @type {import('axios').AxiosInstance}
     */
    #http;

    /**
     * Initializes the Axios HTTP client with the base URL from environment variables
     */
    constructor() {
        if (!platformApi) {
            throw new Error('VITE_INSTALERT_PLATFORM_API_URL must be configured.');
        }
        this.#http = axios.create({
            baseURL: platformApi.replace(/\/+$/, '') + '/',
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json'
            },
        });
        this.#http.interceptors.request.use(config => {
            config.demoContextRevision = currentContextRevision();
            const { userId } = currentApiContext();
            config.headers.delete('User-Id');
            if (userId) config.headers.set('User-Id', userId);
            config.headers.set('Accept-Language', i18n.global.locale.value === 'es' ? 'es-419' : 'en-US');
            return config;
        });
        const stale = config => config?.demoContextRevision !== undefined && config.demoContextRevision !== currentContextRevision();
        this.#http.interceptors.response.use(response => {
            if (stale(response.config)) throw new axios.CanceledError('The selected demo account changed.', response.config);
            return response;
        }, error => {
            if (stale(error.config)) return Promise.reject(new axios.CanceledError('The selected demo account changed.', error.config));
            return Promise.reject(axios.isCancel(error) ? error : normalizeApiError(error));
        });
    }

    /**
     * Returns the configured Axios HTTP client.
     * @returns {import('axios').AxiosInstance}
     */
    get http() {
        return this.#http;
    }

}
