<script setup>
import '../identity.css';
import { useI18n } from 'vue-i18n';
import { useIamStore } from '../../application/iam.store.js';
import { useRouter } from 'vue-router';
import LanguageSwitcher from '../../../shared/presentation/components/language-switcher.vue';
const { t } = useI18n(), iam = useIamStore(), router = useRouter();
async function retry() { if (await iam.refreshSession()) await router.replace('/'); }
async function signOut() { try { await iam.signOut(); } catch {} await router.replace('/sign-in'); }
</script>
<template><main class="identity-page"><section class="identity-card" aria-labelledby="setup-title">
  <div class="identity-brand"><img src="../../../assets/instalert-logo.svg" alt="InstAlert" width="48" height="48"><LanguageSwitcher /></div>
  <h1 id="setup-title">{{ t('iam.setupTitle') }}</h1><p>{{ iam.user.email }}</p>
  <pv-message v-if="iam.error" severity="error" :closable="false" role="alert">{{ t(iam.error) }}</pv-message>
  <p v-else>{{ t('iam.setupDescription') }}</p>
  <pv-button :label="t('iam.retrySession')" @click="retry" /><pv-button text :label="t('common.signOut')" @click="signOut" />
</section></main></template>
