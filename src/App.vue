<template>
  <pv-confirm-dialog />
  <RouterView v-if="isStandaloneRoute" />
  <Layout v-else-if="route.meta.role" />
</template>

<script setup>
import { computed, onUnmounted, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import Layout from "./shared/presentation/components/layout.vue";

import { apiContext, setAuthenticatedContext } from './shared/infrastructure/api-context.js';
import useAlertStore from './alert/application/alert.store.js';
import { useProfilesStore } from './profiles/application/profiles.store.js';
import { useNotificationsStore } from './notifications/application/notifications.store.js';

import { currentSession } from './iam/infrastructure/session.js';
const router = useRouter();
watch(() => currentSession().accessToken, (token, previous) => {
  if (!token && previous) { setAuthenticatedContext(); router.replace({ name: 'sign-in', query: currentSession().reason === 'expired' ? { expired: '1' } : {} }); }
});
const profiles = useProfilesStore();
useAlertStore();
watch(() => apiContext.userId, () => profiles.setContext(apiContext.role), { immediate: true, flush: 'sync' });
const route = useRoute();
watch(() => currentSession().hasApplicationAccess, (allowed, previous) => {
  if (!allowed && previous && route.meta.role && !route.meta.standalone) router.replace({ name: 'session-setup' });
});
const notifications = useNotificationsStore();
watch(() => [apiContext.userId, apiContext.businessId, apiContext.status, route.meta.role, route.meta.standalone, currentSession().hasApplicationAccess], () => {
  notifications.stopPolling();
  if (route.meta.role && !route.meta.standalone && apiContext.status === 'ready' && currentSession().hasApplicationAccess) notifications.startPolling();
}, { immediate: true });
onUnmounted(() => notifications.stopPolling());
const isStandaloneRoute = computed(() => route.meta.standalone === true);
</script>
