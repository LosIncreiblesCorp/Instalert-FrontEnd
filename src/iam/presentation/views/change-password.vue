<script setup>
import '../identity.css';
import LanguageSwitcher from '../../../shared/presentation/components/language-switcher.vue';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useIamStore } from '../../application/iam.store.js';
const { t } = useI18n(), router = useRouter(), iam = useIamStore();
const currentPassword = ref(''), newPassword = ref(''), confirmation = ref(''), error = ref(null);
async function submit() {
    error.value = null;
    if (newPassword.value !== confirmation.value) { error.value = 'iam.errors.passwordMismatch'; return; }
    if (await iam.changePassword(currentPassword.value, newPassword.value)) await router.replace('/');
}
async function signOut() {
    try { await iam.signOut(); } catch { /* The local session is cleared by the store. */ }
    await router.replace({ name: 'sign-in' });
}
</script>
<template>
    <main class="identity-page">
        <section class="identity-card" aria-labelledby="password-title">
            <div class="identity-brand"><RouterLink to="/" aria-label="InstAlert"><img src="../../../assets/instalert-logo.svg" alt="InstAlert" width="42" height="42"></RouterLink><LanguageSwitcher /></div>
            <h1 id="password-title">{{ t(iam.user.mustChangePassword ? 'iam.changePasswordTitle' : 'iam.changePasswordAction') }}</h1>
            <p>{{ t(iam.user.mustChangePassword ? 'iam.changePasswordDescription' : 'iam.personalPasswordDescription') }}</p>
            <form @submit.prevent="submit" :aria-busy="iam.isBusy">
                <label for="current-password">{{ t('iam.currentPassword') }}</label>
                <pv-input-text id="current-password" v-model="currentPassword" type="password" autocomplete="current-password" required />
                <label for="new-password">{{ t('iam.newPassword') }}</label>
                <pv-input-text id="new-password" v-model="newPassword" type="password" autocomplete="new-password" minlength="10" maxlength="72" required />
                <small>{{ t('iam.passwordHint') }}</small>
                <label for="confirm-new-password">{{ t('iam.confirmPassword') }}</label>
                <pv-input-text id="confirm-new-password" v-model="confirmation" type="password" autocomplete="new-password" required />
                <pv-message v-if="error || iam.error" severity="error" role="alert">{{ t(error || iam.error) }}</pv-message>
                <pv-button type="submit" :label="t('iam.savePassword')" :loading="iam.isBusy" :disabled="iam.isBusy" />
            </form>
            <p class="identity-footer"><RouterLink v-if="!iam.user.mustChangePassword" to="/">{{ t('iam.returnToApplication') }}</RouterLink><pv-button v-else text :label="t('common.signOut')" @click="signOut" /></p>
        </section>
    </main>
</template>
