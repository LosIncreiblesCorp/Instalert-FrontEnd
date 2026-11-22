import axios from "axios";
import i18n from '../../i18n.js';
import { currentContextRevision, setAuthenticatedContext } from './api-context.js';
import { accessToken, clearSession } from '../../iam/infrastructure/session.js';
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
            config.contextRevision = currentContextRevision();
            config.sessionToken = accessToken();
            config.headers.delete('User-Id');
            config.headers.delete('Authorization');
            if (config.sessionToken) config.headers.set('Authorization', 'Bearer ' + config.sessionToken);
            config.headers.set('Accept-Language', i18n.global.locale.value === 'es' ? 'es-419' : 'en-US');
            return config;
        }, undefined, { synchronous: true });
        const stale = config => config?.contextRevision !== undefined
            && (config.contextRevision !== currentContextRevision() || config.sessionToken !== accessToken());
        this.#http.interceptors.response.use(response => {
            if (stale(response.config)) throw new axios.CanceledError('The account or commerce changed.', response.config);
            return response;
        }, error => {
            if (stale(error.config)) return Promise.reject(new axios.CanceledError('The account or commerce changed.', error.config));
            if (error.response?.status === 401 && !error.config?.credentialRequest && error.config?.sessionToken) {
                clearSession('expired');
                setAuthenticatedContext();
            }
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
