import { defineStore } from 'pinia';
import { IamApi } from '../infrastructure/iam-api.js';
import { accessToken, currentSession, restoreSessionToken, applySession, clearSession } from '../infrastructure/session.js';
import { currentApiContext, setAuthenticatedContext } from '../../shared/infrastructure/api-context.js';

let initialization;
export const useIamStore = defineStore('iam', {
    state: () => ({ initialized: false, isBusy: false, error: null, revision: 0 }),
    getters: { user: () => currentSession(), isAuthenticated: () => Boolean(currentSession().userId && accessToken()) },
    actions: {
        async initialize() {
            if (this.initialized) return;
            if (initialization) return initialization;
            initialization = (async () => {
                restoreSessionToken();
                if (currentSession().accessToken) {
                    try { await this.refreshSession(); }
                    catch (error) {
                        if (error.response?.status === 401) { clearSession('expired'); setAuthenticatedContext(); }
                        else this.error = 'iam.errors.unavailable';
                    }
                }
                this.initialized = true;
            })();
            try { await initialization; } finally { initialization = null; }
        },
        async refreshSession() {
            this.error = null;
            try {
                const response = await new IamApi().current();
                applySession(response.data);
                const previous = currentApiContext();
                setAuthenticatedContext({ role: this.user.role, userId: this.user.userId, businessId: this.user.businessId,
                    businessLocation: previous.businessId === this.user.businessId ? previous.businessLocation : null });
                return true;
            } catch (error) {
                if (error.response?.status === 401) { clearSession('expired'); setAuthenticatedContext(); }
                else this.error = 'iam.errors.unavailable';
                return false;
            }
        },
        async authenticate({ email, password, register = false }) {
            if (this.isBusy) return false;
            const revision = ++this.revision;
            this.isBusy = true; this.error = null;
            try {
                const api = new IamApi();
                const response = await (register ? api.register(email, password) : api.signIn(email, password));
                if (revision !== this.revision) return false;
                applySession(response.data); this.initialized = true;
                setAuthenticatedContext({ userId: this.user.userId, role: this.user.role });
                await this.refreshSession();
                return true;
            } catch (error) {
                if (revision === this.revision) this.error = error.apiError?.code === 'email_registered' ? 'iam.errors.emailRegistered'
                    : error.response?.status === 401 ? 'iam.errors.credentials'
                    : error.response?.status === 400 ? 'iam.errors.validation' : 'iam.errors.unavailable';
                return false;
            } finally { if (revision === this.revision) this.isBusy = false; }
        },
        async changePassword(currentPassword, newPassword) {
            if (this.isBusy) return false;
            this.isBusy = true; this.error = null;
            try {
                applySession((await new IamApi().changePassword(currentPassword, newPassword)).data);
                return true;
            } catch (error) {
                this.error = error.response?.status === 400 ? 'iam.errors.validation'
                    : error.response?.status === 401 ? 'iam.errors.credentials' : 'iam.errors.unavailable';
                return false;
            } finally { this.isBusy = false; }
        },
        async signOut() {
            this.revision++;
            try { if (this.isAuthenticated) await new IamApi().signOut(); }
            finally { clearSession(); setAuthenticatedContext({}); this.isBusy = false; this.error = null; }
        }
    }
});
