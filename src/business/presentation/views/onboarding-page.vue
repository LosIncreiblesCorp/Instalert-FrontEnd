<script setup>
import { computed, nextTick, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useIamStore } from '../../../iam/application/iam.store.js';
import LanguageSwitcher from '../../../shared/presentation/components/language-switcher.vue';
import BusinessProfile from './business-profile.vue';
import UserProfile from '../../../profiles/presentation/views/user-profile.vue';
import SubscriptionPage from '../../../payments/presentation/views/subscription-page.vue';
const { t } = useI18n(), router = useRouter(), iam = useIamStore();
const refreshing = ref(false), heading = ref(null);
const steps = ['business', 'personal-profile', 'subscription'];
const step = computed(() => iam.user.onboardingStep);
const stepIndex = computed(() => Math.max(0, steps.indexOf(step.value)));
async function refresh() {
  if (refreshing.value) return;
  refreshing.value = true;
  try {
    if (await iam.refreshSession()) {
      if (iam.user.hasApplicationAccess) await router.replace('/');
      await nextTick(); heading.value?.focus();
    }
  } finally { refreshing.value = false; }
}
async function signOut() { try { await iam.signOut(); } catch {} await router.replace('/sign-in'); }
</script>
<template>
  <div class="onboarding-page">
    <header class="onboarding-header">
      <RouterLink to="/" aria-label="InstAlert"><img src="../../../assets/instalert-logo.svg" width="42" height="42" alt="InstAlert"></RouterLink>
      <div class="header-actions"><LanguageSwitcher /><pv-button text icon="pi pi-sign-out" :label="t('common.signOut')" @click="signOut" /></div>
    </header>
    <main class="onboarding-main">
      <section class="setup-intro"><p class="eyebrow">{{ t('onboarding.eyebrow') }}</p>
        <h1 ref="heading" tabindex="-1">{{ t('onboarding.title') }}</h1><p>{{ t('onboarding.description') }}</p>
        <span class="account-email"><i class="pi pi-user" aria-hidden="true" /> {{ iam.user.email }}</span>
      </section>
      <ol class="setup-steps" :aria-label="t('onboarding.stepsLabel')">
        <li v-for="(item,index) in steps" :key="item" :class="{ current:index===stepIndex, completed:index<stepIndex }" :aria-current="index===stepIndex ? 'step' : undefined">
          <span class="step-number"><i v-if="index<stepIndex" class="pi pi-check" aria-hidden="true" /><template v-else>{{ index+1 }}</template></span>
          <span>{{ t('onboarding.steps.'+item) }}</span>
        </li>
      </ol>
      <pv-message v-if="iam.error" severity="error" :closable="false" role="alert">{{ t(iam.error) }}</pv-message>
      <p v-if="refreshing" role="status">{{ t('onboarding.checking') }}</p>
      <BusinessProfile v-if="step==='business'" @saved="refresh" />
      <UserProfile v-else-if="step==='personal-profile'" @saved="refresh" />
      <SubscriptionPage v-else-if="step==='subscription'" onboarding @verified="refresh" />
      <section v-else class="subscription-step"><p>{{ t('onboarding.resume') }}</p><pv-button :label="t('onboarding.checkStatus')" @click="refresh" /></section>
      <p class="saved-note"><i class="pi pi-lock" aria-hidden="true" /> {{ t('onboarding.savedNote') }}</p>
    </main>
  </div>
</template>
<style scoped>
.onboarding-page { min-height:100svh; background:#f4f7fb; color:#172033; }
.onboarding-header { display:flex; justify-content:space-between; align-items:center; gap:16px; padding:18px clamp(18px,5vw,68px); background:#fff; border-bottom:1px solid #e2e8f0; }
.header-actions { display:flex; align-items:center; gap:14px; }
.onboarding-main { max-width:1080px; margin:auto; padding:38px 24px 60px; }
.setup-intro .eyebrow { font-size:12px; letter-spacing:.08em; font-weight:700; color:#2563eb; text-transform:uppercase; }
.setup-intro h1 { margin:10px 0; font-size:clamp(28px,4vw,38px); letter-spacing:-.035em; }
.setup-intro p { color:#52657b; line-height:1.6; }
.account-email { display:inline-flex; align-items:center; gap:8px; font-size:14px; padding:8px 12px; background:#eaf1ff; color:#164c9a; border-radius:8px; word-break:break-word; }
.setup-steps { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; list-style:none; padding:0; margin:30px 0; }
.setup-steps li { display:flex; align-items:center; gap:10px; padding:14px; border:1px solid #dce5ef; border-radius:12px; color:#64748b; background:#fff; font-size:14px; }
.setup-steps .current { border-color:#2563eb; color:#1d4ed8; background:#eff6ff; }
.setup-steps .completed { color:#047857; }
.step-number { width:30px; height:30px; border-radius:50%; background:#edf2f7; display:grid; place-items:center; flex-shrink:0; font-weight:700; }
.current .step-number { color:white; background:#2563eb; }
.completed .step-number { color:white; background:#059669; }
.subscription-step { padding:44px 28px; border:1px solid #dce5ef; background:white; border-radius:16px; text-align:center; }
.subscription-step p { max-width:560px; margin:16px auto; line-height:1.65; color:#52657b; }
.success-icon { width:54px; height:54px; display:grid; place-items:center; border-radius:50%; margin:auto; background:#d1fae5; color:#047857; font-size:25px; }
.saved-business { display:flex; gap:10px; justify-content:center; margin:22px 0; font-weight:600; }
.saved-note { display:flex; justify-content:center; gap:8px; margin-top:28px; color:#52657b; font-size:13px; line-height:1.5; }
@media(max-width:600px) { .onboarding-main { padding:26px 14px 40px; } .setup-steps { gap:6px; } .setup-steps li { flex-direction:column; text-align:center; padding:12px 5px; font-size:12px; gap:8px; } .header-actions { gap:6px; } .onboarding-header { padding:14px; } }
</style>
