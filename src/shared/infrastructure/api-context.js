import { reactive, readonly } from 'vue';

const demoUsers = Object.freeze({ administrator: 'synthetic-admin', employee: 'synthetic-employee' });
const state = reactive({ role: null, userId: null, businessId: null, businessLocation: null, status: 'idle', error: null });
export const apiContext = readonly(state);
let revision = 0;
let pending;

/** The profile selector chooses a fixed demonstration actor, without authentication. */
export function configureRole(role) {
    const selected = Object.hasOwn(demoUsers, role) ? role : null;
    if (state.role === selected) return;
    revision++;
    pending = null;
    Object.assign(state, { role: selected, userId: demoUsers[selected] ?? null, businessId: null, businessLocation: null, status: 'idle', error: null });
}

export const currentApiContext = () => ({ ...state });
export const currentContextRevision = () => revision;

/** Resolve the commerce through Business, retaining its database-generated ID. */
export async function prepareBusinessContext(http, { refresh = false } = {}) {
    if (!state.userId) return null;
    if (!refresh && state.status === 'ready') return state.businessId;
    if (pending?.revision === revision) return pending.request;
    const requestRevision = revision;
    const current = () => revision === requestRevision;
    if (state.status !== 'ready') Object.assign(state, { status: 'loading', error: null, businessId: null, businessLocation: null });
    const request = (async () => {
        try {
            const { data } = await http.get('businesses');
            if (!current()) return null;
            if (!Array.isArray(data) || data.some(item => typeof item?.id !== 'string' || !item.id)) throw new Error('Invalid business context response.');
            if (data.length > 1) {
                Object.assign(state, { businessId: null, businessLocation: null, status: 'ambiguous', error: 'api.connection.ambiguous' });
                return null;
            }
            const business = data[0];
            if (business) {
                const coordinates = Number.isFinite(business.latitude) && Math.abs(business.latitude) <= 90
                    && Number.isFinite(business.longitude) && Math.abs(business.longitude) <= 180;
                Object.assign(state, { businessId: business.id, businessLocation: coordinates
                    ? { latitude: business.latitude, longitude: business.longitude, location: business.address ?? '' } : null,
                    status: 'ready', error: null });
                return business.id;
            }
            let status = 'missing';
            if (state.role === 'employee') {
                const memberships = (await http.get('business-members/me')).data;
                if (!current()) return null;
                if (!Array.isArray(memberships) || memberships.some(item => typeof item?.businessId !== 'string' || !['active', 'inactive'].includes(item.status))) throw new Error('Invalid membership response.');
                if (memberships.length > 1) status = 'ambiguous';
                else if (memberships[0]?.status === 'inactive') status = 'inactive';
            }
            Object.assign(state, { businessId: null, businessLocation: null, status, error: 'api.connection.' + status });
            return null;
        } catch (error) {
            if (current()) Object.assign(state, { businessId: null, businessLocation: null, status: 'unavailable', error: error.apiError?.messageKey ?? 'api.errors.unavailable' });
            return null;
        } finally {
            if (pending?.revision === requestRevision) pending = null;
        }
    })();
    pending = { revision: requestRevision, request };
    return request;
}

export function requireBusinessId() {
    if (state.status !== 'ready' || !state.businessId) {
        const error = new Error(state.error ?? 'api.connection.missing');
        error.apiError = { messageKey: error.message, status: state.status === 'inactive' ? 403 : 503 };
        throw error;
    }
    return state.businessId;
}
