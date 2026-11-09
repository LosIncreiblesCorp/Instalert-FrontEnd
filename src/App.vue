<template>
  <pv-confirm-dialog />
  <RouterView v-if="isStandaloneRoute" />
  <Layout v-else-if="route.meta.role" />
</template>

<script setup>
import { computed, onUnmounted, watch } from "vue";
import { RouterView, useRoute } from "vue-router";
import Layout from "./shared/presentation/components/layout.vue";

import { apiContext } from './shared/infrastructure/api-context.js';
import useAlertStore from './alert/application/alert.store.js';
import { useProfilesStore } from './profiles/application/profiles.store.js';
import { useNotificationsStore } from './notifications/application/notifications.store.js';

const profiles = useProfilesStore();
useAlertStore();
watch(() => apiContext.userId, () => profiles.setContext(apiContext.role), { immediate: true, flush: 'sync' });
const route = useRoute();
const notifications = useNotificationsStore();
watch(() => [apiContext.userId, apiContext.businessId, apiContext.status, route.meta.role, route.meta.standalone], () => {
  notifications.stopPolling();
  if (route.meta.role && !route.meta.standalone && apiContext.status === 'ready') notifications.startPolling();
}, { immediate: true });
onUnmounted(() => notifications.stopPolling());
const isStandaloneRoute = computed(() => route.meta.standalone === true);
</script>
