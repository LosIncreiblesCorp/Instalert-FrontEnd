<script setup>
import '../identity.css';
import { computed, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useIamStore } from '../../application/iam.store.js';
import LanguageSwitcher from '../../../shared/presentation/components/language-switcher.vue';
const props = defineProps({ register: Boolean });
const { t } = useI18n();
const router = useRouter();
const iam = useIamStore();
const email = ref(''), password = ref(''), confirmation = ref(''), formError = ref(null);
const title = computed(() => props.register ? 'iam.registerTitle' : 'iam.signInTitle');
watch(() => props.register, () => { iam.error = null; formError.value = null; });
async function submit() {
    formError.value = null;
    if (props.register && (password.value.length < 10 || new TextEncoder().encode(password.value).length > 72 || !/\p{L}/u.test(password.value) || !/\p{N}/u.test(password.value))) { formError.value = 'iam.errors.validation'; return; }
    if (props.register && password.value !== confirmation.value) { formError.value = 'iam.errors.passwordMismatch'; return; }
    if (await iam.authenticate({ email: email.value.trim(), password: password.value, register: props.register }))
        await router.replace({ name: iam.user.mustChangePassword ? 'change-password' : 'session-setup' });
}
</script>

<template>
    <main class="identity-page">
        <section class="identity-card" aria-labelledby="identity-title">
            <div class="identity-brand"><img src="../../../assets/instalert-logo.svg" alt="InstAlert" width="48" height="48"><LanguageSwitcher /></div>
            <p class="identity-eyebrow">{{ t('iam.brandMessage') }}</p>
            <h1 id="identity-title">{{ t(title) }}</h1>
            <pv-message v-if="$route.query.expired" severity="warn" :closable="false" role="status">{{ t('iam.sessionExpired') }}</pv-message>
            <p class="identity-description">{{ t(register ? 'iam.registerDescription' : 'iam.signInDescription') }}</p>
            <form @submit.prevent="submit" :aria-busy="iam.isBusy">
                <label for="account-email">{{ t('iam.email') }}</label>
                <pv-input-text id="account-email" v-model="email" type="email" autocomplete="username" maxlength="254" required />
                <label for="account-password">{{ t('iam.password') }}</label>
                <pv-input-text id="account-password" v-model="password" type="password" :autocomplete="register ? 'new-password' : 'current-password'" :minlength="register ? 10 : undefined" maxlength="72" required :aria-describedby="register ? 'password-hint' : undefined" />
                <small v-if="register" id="password-hint">{{ t('iam.passwordHint') }}</small>
                <template v-if="register">
                    <label for="password-confirmation">{{ t('iam.confirmPassword') }}</label>
                    <pv-input-text id="password-confirmation" v-model="confirmation" type="password" autocomplete="new-password" maxlength="72" required />
                </template>
                <pv-message v-if="formError || iam.error" severity="error" role="alert">{{ t(formError || iam.error) }}</pv-message>
                <pv-button type="submit" :label="t(register ? 'iam.createAccount' : 'iam.signIn')" :loading="iam.isBusy" :disabled="iam.isBusy" />
            </form>
            <p class="identity-footer"><RouterLink :to="{ name: register ? 'sign-in' : 'sign-up' }">{{ t(register ? 'iam.existingAccount' : 'iam.newAccount') }}</RouterLink></p>
            <p class="identity-note">{{ t('iam.employeeInvitation') }}</p>
        </section>
    </main>
</template>
