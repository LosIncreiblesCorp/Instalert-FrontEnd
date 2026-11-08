import { defineStore } from 'pinia';
import { apiContext, currentApiContext, currentContextRevision } from '../../shared/infrastructure/api-context.js';
import { i18n } from '../../i18n.js';
import { UserProfile } from '../domain/model/user-profile.entity.js';
import { UserPreferences } from '../domain/model/user-preferences.entity.js';
import { UserProfileAssembler } from '../infrastructure/user-profile.assembler.js';
import { UserPreferencesAssembler } from '../infrastructure/user-preferences.assembler.js';
import { ProfilesApi } from '../infrastructure/profiles-api.js';

function profileError(error, fallback) {
    if (error.response?.status === 400) return 'api.errors.validation';
    return error.apiError?.messageKey ?? fallback;
}
const uiLocales = { en_US: 'en', es_419: 'es' };

export const useProfilesStore = defineStore('profiles', {
    state: () => ({ userId: null, revision: 0, profile: null, preferences: null,
        isProfileLoading: false, isPreferencesLoading: false, isProfileSaving: false, isPreferencesSaving: false,
        profileError: null, preferencesError: null, profileSaved: false, preferencesSaved: false }),
    actions: {
        /** UI role selection is a demo identity boundary, not authentication. */
        setContext(role) {
            const userId = currentApiContext().role === role ? apiContext.userId : null;
            if (this.userId === userId && this.revision === currentContextRevision()) return;
            const revision = currentContextRevision();
            this.$reset();
            this.userId = userId;
            this.revision = revision;
        },
        async loadProfile() {
            if (!this.userId || this.isProfileLoading || this.isProfileSaving) return false;
            const userId = this.userId;
            const revision = this.revision;
            this.isProfileLoading = true;
            this.profileError = null;
            this.profileSaved = false;
            try {
                const response = await new ProfilesApi().getProfile(userId);
                const profile = UserProfileAssembler.toDomain(response.data);
                if (this.userId !== userId || this.revision !== revision || currentContextRevision() !== revision) return false;
                if (profile.userId !== userId) throw new Error('Profile identity mismatch.');
                this.profile = profile;
                return true;
            } catch (error) {
                if (this.userId === userId && this.revision === revision && currentContextRevision() === revision) this.profileError = error.response?.status === 404 ? 'profiles.errors.profileMissing' : profileError(error, 'profiles.errors.profileLoad');
                return false;
            } finally {
                if (this.userId === userId && this.revision === revision && currentContextRevision() === revision) this.isProfileLoading = false;
            }
        },
        async loadPreferences() {
            if (!this.userId || this.isPreferencesLoading || this.isPreferencesSaving) return false;
            const userId = this.userId;
            const revision = this.revision;
            this.isPreferencesLoading = true;
            this.preferencesError = null;
            this.preferencesSaved = false;
            try {
                const response = await new ProfilesApi().getPreferences(userId);
                const preferences = UserPreferencesAssembler.toDomain(response.data);
                if (this.userId !== userId || this.revision !== revision || currentContextRevision() !== revision) return false;
                if (preferences.userId !== userId) throw new Error('Preferences identity mismatch.');
                this.preferences = preferences;
                i18n.global.locale.value = uiLocales[preferences.locale];
                return true;
            } catch (error) {
                if (this.userId === userId && this.revision === revision && currentContextRevision() === revision) this.preferencesError = profileError(error, 'profiles.errors.preferencesLoad');
                return false;
            } finally {
                if (this.userId === userId && this.revision === revision && currentContextRevision() === revision) this.isPreferencesLoading = false;
            }
        },
        async updateProfile(values) {
            if (!this.profile || this.isProfileSaving || this.isProfileLoading) return false;
            const userId = this.userId;
            const revision = this.revision;
            const profile = new UserProfile({ ...values, userId });
            if (Object.keys(profile.validationErrors).length) return false;
            this.isProfileSaving = true;
            this.profileError = null;
            this.profileSaved = false;
            try {
                const response = await new ProfilesApi().updateProfile(userId, UserProfileAssembler.toChanges(profile));
                const saved = UserProfileAssembler.toDomain(response.data);
                if (this.userId !== userId || this.revision !== revision || currentContextRevision() !== revision) return false;
                if (saved.userId !== userId || Object.keys(saved.validationErrors).length) throw new Error('Invalid saved profile.');
                this.profile = saved;
                this.profileSaved = true;
                return true;
            } catch (error) {
                if (this.userId === userId && this.revision === revision && currentContextRevision() === revision) this.profileError = profileError(error, 'profiles.errors.profileSave');
                return false;
            } finally {
                if (this.userId === userId && this.revision === revision && currentContextRevision() === revision) this.isProfileSaving = false;
            }
        },
        async updatePreferences(locale) {
            if (!this.preferences || this.isPreferencesSaving || this.isPreferencesLoading) return false;
            const userId = this.userId;
            const revision = this.revision;
            const preferences = new UserPreferences({ userId, locale });
            if (!preferences.isValid) return false;
            this.isPreferencesSaving = true;
            this.preferencesError = null;
            this.preferencesSaved = false;
            try {
                const response = await new ProfilesApi().updatePreferences(userId, UserPreferencesAssembler.toChanges(preferences));
                const saved = UserPreferencesAssembler.toDomain(response.data);
                if (this.userId !== userId || this.revision !== revision || currentContextRevision() !== revision) return false;
                if (saved.userId !== userId || saved.locale !== locale) throw new Error('Invalid saved preferences.');
                this.preferences = saved;
                i18n.global.locale.value = uiLocales[saved.locale];
                this.preferencesSaved = true;
                return true;
            } catch (error) {
                if (this.userId === userId && this.revision === revision && currentContextRevision() === revision) this.preferencesError = profileError(error, 'profiles.errors.preferencesSave');
                return false;
            } finally {
                if (this.userId === userId && this.revision === revision && currentContextRevision() === revision) this.isPreferencesSaving = false;
            }
        }
    }
});
