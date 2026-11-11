import { computed, onScopeDispose, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { NotificationPreferences } from '../domain/model/notification-preferences.entity.js';
import { NotificationAssembler } from '../infrastructure/notification.assembler.js';
import { NotificationPreferencesAssembler } from '../infrastructure/notification-preferences.assembler.js';
import { NotificationsApi } from '../infrastructure/notifications-api.js';
import { apiContext, currentContextRevision, requireBusinessId } from '../../shared/infrastructure/api-context.js';

const api = new NotificationsApi();
const pageSize = 100;
const pollingInterval = 15000;

/** Received notifications and preferences for the current account and commerce. */
export const useNotificationsStore = defineStore('notifications', () => {
    const preferences = ref(null);
    const notifications = ref([]);
    const notices = ref([]);
    const feedLoaded = ref(false);
    const isRefreshing = ref(false);
    const isPreferencesLoading = ref(false);
    const isPreferencesSaving = ref(false);
    const readingIds = ref([]);
    const feedError = ref(null);
    const preferencesError = ref(null);
    const readError = ref(null);
    const preferencesSaved = ref(false);
    const unreadCount = computed(() => notifications.value.filter(item => item.isUnread).length);
    const currentNotice = computed(() => notices.value[0] ?? null);
    const center = computed(() => apiContext.businessLocation);
    let generation = 0;
    let polling = 0;
    let timer;
    let visibilityListener;
    const scope = () => ({ generation, revision: currentContextRevision(), userId: apiContext.userId, businessId: apiContext.businessId });
    const current = captured => captured.generation === generation && captured.revision === currentContextRevision()
        && captured.userId === apiContext.userId && captured.businessId === apiContext.businessId;
    const errorKey = (error, fallback) => error.apiError?.messageKey
        ?? (error.message?.startsWith('notifications.errors.') ? error.message : fallback);
    function owned(resource, captured) {
        const notification = NotificationAssembler.toDomain(resource);
        if (notification.recipientUserId !== captured.userId || notification.targetBusinessId !== captured.businessId)
            throw new Error('notifications.errors.invalidResponse');
        return notification;
    }
    function ownedPreferences(resource, captured) {
        const saved = NotificationPreferencesAssembler.toDomain(resource);
        if (saved.userId !== captured.userId || saved.businessId !== captured.businessId)
            throw new Error('notifications.errors.invalidResponse');
        return saved;
    }
    function stopPolling() {
        polling++;
        clearTimeout(timer);
        if (visibilityListener) document.removeEventListener('visibilitychange', visibilityListener);
        visibilityListener = null;
    }
    function resetContext() {
        stopPolling(); generation++;
        preferences.value = null; notifications.value = []; notices.value = []; readingIds.value = [];
        feedLoaded.value = false; isRefreshing.value = false;
        isPreferencesLoading.value = false; isPreferencesSaving.value = false;
        feedError.value = null; preferencesError.value = null; readError.value = null; preferencesSaved.value = false;
    }
    watch(() => [apiContext.userId, apiContext.businessId, apiContext.status], resetContext, { flush: 'sync' });

    async function loadPreferences() {
        if (isPreferencesLoading.value || isPreferencesSaving.value) return false;
        const captured = scope(); isPreferencesLoading.value = true; preferencesError.value = null;
        try {
            requireBusinessId();
            const response = await api.getPreferences(captured.userId, captured.businessId);
            if (!current(captured)) return false;
            preferences.value = ownedPreferences(response.data, captured); return true;
        } catch (error) {
            if (current(captured)) preferencesError.value = errorKey(error, 'notifications.errors.preferencesLoad');
            return false;
        } finally { if (current(captured)) isPreferencesLoading.value = false; }
    }
    async function savePreferences(values) {
        if (!preferences.value || isPreferencesLoading.value || isPreferencesSaving.value) return false;
        const captured = scope(); preferencesSaved.value = false; preferencesError.value = null;
        const draft = new NotificationPreferences(values);
        if (!draft.isValid) { preferencesError.value = 'notifications.errors.invalidPreferences'; return false; }
        isPreferencesSaving.value = true;
        try {
            requireBusinessId();
            const response = await api.updatePreferences(captured.userId, captured.businessId, NotificationPreferencesAssembler.toChanges(draft));
            if (!current(captured)) return false;
            const saved = ownedPreferences(response.data, captured);
            if (saved.nearbyAlertsEnabled !== draft.nearbyAlertsEnabled || saved.nearbyRadiusMeters !== draft.nearbyRadiusMeters)
                throw new Error('notifications.errors.invalidResponse');
            preferences.value = saved; preferencesSaved.value = true; return true;
        } catch (error) {
            if (current(captured)) preferencesError.value = errorKey(error, 'notifications.errors.preferencesSave');
            return false;
        } finally { if (current(captured)) isPreferencesSaving.value = false; }
    }
    async function refresh() {
        if (isRefreshing.value || readingIds.value.length) return false;
        const captured = scope(); isRefreshing.value = true; feedError.value = null;
        try {
            requireBusinessId();
            const received = new Map();
            for (let page = 1; ; page++) {
                const response = await api.getNotifications(captured.businessId, page, pageSize);
                if (!current(captured)) return false;
                if (!Array.isArray(response.data) || response.data.length > pageSize) throw new Error('notifications.errors.invalidResponse');
                const previousSize = received.size;
                for (const resource of response.data) {
                    const item = owned(resource, captured); received.set(item.id, item);
                }
                if (response.data.length < pageSize) break;
                if (received.size === previousSize) throw new Error('notifications.errors.invalidResponse');
            }
            const previousIds = new Set(notifications.value.map(item => item.id));
            const records = [...received.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id));
            if (feedLoaded.value) {
                for (const item of records) {
                    if (item.isUnread && !previousIds.has(item.id)) notices.value.push(item);
                }
            }
            notifications.value = records;
            notices.value = notices.value.filter(item => received.get(item.id)?.isUnread);
            feedLoaded.value = true; return true;
        } catch (error) {
            if (current(captured)) feedError.value = errorKey(error, 'notifications.errors.feedLoad');
            return false;
        } finally { if (current(captured)) isRefreshing.value = false; }
    }
    async function markAsRead(id) {
        const notification = notifications.value.find(item => item.id === String(id));
        if (!notification?.isUnread || readingIds.value.includes(String(id)) || isRefreshing.value) return false;
        const captured = scope(); readingIds.value.push(String(id)); readError.value = null;
        try {
            requireBusinessId();
            const response = await api.markAsRead(id);
            if (!current(captured)) return false;
            const saved = owned(response.data, captured);
            if (saved.id !== String(id) || saved.isUnread) throw new Error('notifications.errors.invalidResponse');
            notifications.value = notifications.value.map(item => item.id === saved.id ? saved : item);
            notices.value = notices.value.filter(item => item.id !== saved.id); return true;
        } catch (error) {
            if (current(captured)) readError.value = errorKey(error, 'notifications.errors.markRead');
            return false;
        } finally { if (current(captured)) readingIds.value = readingIds.value.filter(item => item !== String(id)); }
    }
    function dismissNotice() { notices.value.shift(); }
    function startPolling() {
        stopPolling();
        if (typeof document === 'undefined' || apiContext.status !== 'ready') return;
        const run = polling;
        let pending = false;
        async function poll() {
            if (run !== polling || document.hidden || pending) return;
            clearTimeout(timer); pending = true;
            try { await refresh(); }
            finally {
                pending = false;
                if (run === polling && !document.hidden) timer = setTimeout(poll, pollingInterval);
            }
        }
        visibilityListener = () => { clearTimeout(timer); if (!document.hidden) void poll(); };
        document.addEventListener('visibilitychange', visibilityListener);
        void loadPreferences(); void poll();
    }
    onScopeDispose(stopPolling);
    return { preferences, notifications, notices, feedLoaded, isRefreshing, isPreferencesLoading, isPreferencesSaving,
        readingIds, feedError, preferencesError, readError, preferencesSaved, unreadCount, currentNotice, center,
        loadPreferences, savePreferences, refresh, markAsRead, dismissNotice, resetContext, startPolling, stopPolling };
});
