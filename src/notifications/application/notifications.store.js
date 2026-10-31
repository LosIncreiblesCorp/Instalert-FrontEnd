import { defineStore } from 'pinia';
import { NotificationPreferences } from '../domain/model/notification-preferences.entity.js';
import { NotificationAssembler } from '../infrastructure/notification.assembler.js';
import { NotificationPreferencesAssembler } from '../infrastructure/notification-preferences.assembler.js';
import { NotificationsApi } from '../infrastructure/notifications-api.js';

const demoUsers = { administrator: 'demo-admin', employee: 'demo-employee' };

export const useNotificationsStore = defineStore('notifications', {
    state: () => ({ userId: null, businessId: null, revision: 0, settingsRevision: 0, preferences: null,
        notifications: [], notices: [], center: null, observedAlertIds: [], feedLoaded: false,
        isRefreshing: false, isPreferencesLoading: false, isPreferencesSaving: false, readingIds: [],
        feedError: null, preferencesError: null, readError: null, preferencesSaved: false }),
    getters: {
        unreadCount: state => state.notifications.filter(notification => notification.isUnread).length,
        currentNotice: state => state.notices[0] ?? null,
    },
    actions: {
        setContext(role) {
            const userId = demoUsers[role] ?? null;
            if (this.userId === userId) return;
            const revision = this.revision + 1;
            this.$reset();
            this.userId = userId;
            this.businessId = userId ? 'bus-1' : null;
            this.revision = revision;
        },
        async loadPreferences() {
            if (!this.userId || this.isPreferencesLoading || this.isPreferencesSaving) return false;
            const { userId, businessId, revision } = this;
            this.isPreferencesLoading = true;
            this.preferencesError = null;
            try {
                const response = await new NotificationsApi().getPreferences(userId);
                const preferences = NotificationPreferencesAssembler.toDomain(response.data);
                if (this.revision !== revision) return false;
                if (preferences.userId !== userId || preferences.businessId !== businessId) throw new Error('Preferences scope mismatch.');
                this.preferences = preferences;
                return true;
            } catch {
                if (this.revision === revision) this.preferencesError = 'notifications.errors.preferencesLoad';
                return false;
            } finally { if (this.revision === revision) this.isPreferencesLoading = false; }
        },
        async savePreferences(values) {
            if (!this.preferences || this.isPreferencesLoading || this.isPreferencesSaving) return false;
            const { userId, businessId, revision } = this;
            const preferences = new NotificationPreferences({ ...values, userId, businessId });
            this.preferencesSaved = false;
            if (!preferences.isValid) { this.preferencesError = 'notifications.errors.invalidPreferences'; return false; }
            this.isPreferencesSaving = true;
            this.settingsRevision++;
            this.preferencesError = null;
            try {
                const response = await new NotificationsApi().updatePreferences(userId, NotificationPreferencesAssembler.toChanges(preferences));
                const saved = NotificationPreferencesAssembler.toDomain(response.data);
                if (this.revision !== revision) return false;
                if (saved.userId !== userId || saved.businessId !== businessId
                    || saved.nearbyRadiusMeters !== preferences.nearbyRadiusMeters
                    || saved.nearbyAlertsEnabled !== preferences.nearbyAlertsEnabled) throw new Error('Saved preferences mismatch.');
                this.preferences = saved;
                this.notices = this.notices.filter(notice => notice.type !== 'NEARBY_ALERT');
                this.preferencesSaved = true;
                return true;
            } catch {
                if (this.revision === revision) this.preferencesError = 'notifications.errors.preferencesSave';
                return false;
            } finally { if (this.revision === revision) this.isPreferencesSaving = false; }
        },
        async refresh() {
            if (!this.userId || this.isRefreshing || this.isPreferencesSaving || this.readingIds.length) return false;
            const { userId, businessId, revision, settingsRevision } = this;
            const current = () => this.revision === revision && this.settingsRevision === settingsRevision;
            this.isRefreshing = true;
            this.feedError = null;
            const api = new NotificationsApi();
            try {
                const response = await api.getNotifications(userId);
                if (!Array.isArray(response.data)) throw new Error('Invalid notification list.');
                const received = response.data.filter(item => item.recipientUserId === userId
                    && (item.targetBusinessId == null || item.targetBusinessId === businessId)).map(NotificationAssembler.toDomain)
                    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
                if (!current()) return false;
                // Inbox reading remains available even when the nearby-delivery projection fails.
                const previouslyReceived = new Set(this.notifications.map(item => String(item.id)));
                const wasLoaded = this.feedLoaded;
                this.notifications = received;
                const snapshot = await api.getDeliverySnapshot(businessId);
                if (!current()) return false;
                this.center = snapshot.center;
                const observed = new Set(this.observedAlertIds);
                const pendingNotices = [];
                const createdIds = new Set();
                if (this.preferences) {
                    for (const candidate of snapshot.candidates) {
                        if (!this.preferences.allowsNearbyAlert(candidate.distanceMeters)) continue;
                        const resource = NotificationAssembler.nearbyResource(userId, businessId, candidate);
                        if (received.some(item => String(item.id) === resource.id
                            || (item.type === 'NEARBY_ALERT' && String(item.sourceAlertId) === String(candidate.id)))) continue;
                        if (!current()) return false;
                        const created = NotificationAssembler.toDomain((await api.createNearbyNotification(resource)).data);
                        if (!current()) return false;
                        if (created.recipientUserId !== userId || created.targetBusinessId !== businessId || String(created.id) !== resource.id) throw new Error('Notification scope mismatch.');
                        received.push(created);
                        createdIds.add(String(created.id));
                        if (wasLoaded && !observed.has(String(candidate.id)) && created.isUnread) pendingNotices.push(created);
                    }
                }
                if (!current()) return false;
                if (wasLoaded) {
                    pendingNotices.push(...received.filter(item => item.isUnread && !createdIds.has(String(item.id))
                        && !previouslyReceived.has(String(item.id))
                        && (item.type === 'GENERAL' || this.preferences?.allowsNearbyAlert(
                            snapshot.candidates.find(candidate => String(candidate.id) === String(item.sourceAlertId))?.distanceMeters))));
                }
                for (const item of pendingNotices) {
                    if (!this.notices.some(notice => String(notice.id) === String(item.id))) this.notices.push(item);
                }
                this.observedAlertIds = [...new Set([...this.observedAlertIds, ...snapshot.candidates.map(item => String(item.id))])];
                this.notifications = [...received].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
                const unreadIds = new Set(this.notifications.filter(item => item.isUnread).map(item => String(item.id)));
                this.notices = this.notices.filter(item => unreadIds.has(String(item.id)));
                this.feedLoaded = true;
                return true;
            } catch {
                if (current()) this.feedError = 'notifications.errors.feedLoad';
                return false;
            } finally { if (this.revision === revision) this.isRefreshing = false; }
        },
        async markAsRead(id) {
            const notification = this.notifications.find(item => String(item.id) === String(id));
            if (!notification?.isUnread || this.readingIds.includes(String(id)) || this.isRefreshing) return false;
            const { revision, userId } = this;
            this.readingIds.push(String(id));
            this.readError = null;
            try {
                const response = await new NotificationsApi().markAsRead(id, new Date().toISOString());
                const saved = NotificationAssembler.toDomain(response.data);
                if (this.revision !== revision) return false;
                if (saved.recipientUserId !== userId || saved.targetBusinessId !== notification.targetBusinessId
                    || String(saved.id) !== String(id) || saved.isUnread) throw new Error('Read state mismatch.');
                this.notifications = this.notifications.map(item => String(item.id) === String(id) ? saved : item);
                this.notices = this.notices.filter(item => String(item.id) !== String(id));
                return true;
            } catch {
                if (this.revision === revision) this.readError = 'notifications.errors.markRead';
                return false;
            } finally { if (this.revision === revision) this.readingIds = this.readingIds.filter(item => item !== String(id)); }
        },
        dismissNotice() { this.notices.shift(); },
    },
});
