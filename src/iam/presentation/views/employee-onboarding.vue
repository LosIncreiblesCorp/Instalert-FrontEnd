<script setup>
import '../identity.css';
import { nextTick, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useIamStore } from '../../application/iam.store.js';
import { InvitationsApi } from '../../infrastructure/invitations-api.js';
import UserProfile from '../../../profiles/presentation/views/user-profile.vue';
import LanguageSwitcher from '../../../shared/presentation/components/language-switcher.vue';
const iam=useIamStore(), router=useRouter(), {t}=useI18n();
const invitations=ref([]), busy=ref(false), error=ref(null), heading=ref(null);
const api=new InvitationsApi();
async function refresh() {
  if(busy.value)return;
  busy.value=true;error.value=null;
  try {
    if(!await iam.refreshSession())return;
    if(iam.user.hasApplicationAccess){await router.replace({name:'employee-dashboard'});return;}
    if(iam.user.onboardingStep==='invitation'){
      const {data}=await api.own();
      if(!Array.isArray(data)||data.some(x=>!x.id||x.status!=='pending'))throw new Error();
      invitations.value=data;
    }
  } catch {error.value='iam.employeeSetup.error';}
  finally {busy.value=false;await nextTick();heading.value?.focus();}
}
async function accept(id) {
  if(busy.value)return;
  busy.value=true;error.value=null;
  try {await api.accept(id);}
  catch(errorValue){error.value=errorValue.apiError?.messageKey??'iam.employeeSetup.error';}
  finally {busy.value=false;}
  if(!error.value)await refresh();
}
async function signOut(){try{await iam.signOut();}catch{}await router.replace({name:'sign-in'});}
onMounted(refresh);
</script>
<template>
  <main class="employee-setup">
    <header><img src="../../../assets/instalert-logo.svg" alt="InstAlert" width="42" height="42"><div><LanguageSwitcher/><pv-button text :label="t('common.signOut')" @click="signOut"/></div></header>
    <section class="setup-content" :aria-busy="busy">
      <h1 ref="heading" tabindex="-1">{{t('iam.employeeSetup.title')}}</h1><p>{{iam.user.email}}</p>
      <pv-message v-if="error||iam.error" severity="error" :closable="false" role="alert">{{t(error||iam.error)}}</pv-message>
      <UserProfile v-if="iam.user.onboardingStep==='personal-profile'" @saved="refresh"/>
      <template v-else-if="iam.user.onboardingStep==='invitation'">
        <p>{{t('iam.employeeSetup.help')}}</p>
        <p v-if="!busy&&!invitations.length" role="status">{{t('iam.employeeSetup.empty')}}</p>
        <article v-for="invitation in invitations" :key="invitation.id"><h2>{{invitation.businessName}}</h2><p>{{invitation.displayName}}</p><pv-button :label="t('iam.employeeSetup.accept')" :disabled="busy" @click="accept(invitation.id)"/></article>
      </template>
      <p v-else-if="iam.user.onboardingStep==='membership-inactive'" role="status">{{t('iam.employeeSetup.inactive')}}</p>
      <p v-else-if="iam.user.onboardingStep==='subscription-inactive'" role="status">{{t('iam.employeeSetup.subscriptionInactive')}}</p>
      <pv-button outlined :label="t('iam.retrySession')" :loading="busy" :disabled="busy" @click="refresh"/>
    </section>
  </main>
</template>
<style scoped>
.employee-setup{min-height:100svh;background:#f4f7fb;color:#172033}.employee-setup header{display:flex;justify-content:space-between;align-items:center;padding:18px clamp(16px,5vw,60px);background:white;border-bottom:1px solid #e2e8f0}.employee-setup header div{display:flex;align-items:center;gap:14px}.setup-content{max-width:1080px;padding:32px 20px;margin:auto}.setup-content article{background:white;border:1px solid #dce5ef;border-radius:12px;padding:24px;margin:18px 0}.setup-content p{line-height:1.65;overflow-wrap:anywhere}@media(max-width:600px){.setup-content{padding:24px 14px}.employee-setup header div{gap:4px}}
</style>
