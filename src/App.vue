<template>
  <pv-confirm-dialog />
  <RouterView v-if="isStandaloneRoute" />
  <Layout v-else-if="route.meta.role" />
</template>

<script setup>
import { computed, watch } from "vue";
import { RouterView, useRoute } from "vue-router";
import Layout from "./shared/presentation/components/layout.vue";

import { apiContext } from './shared/infrastructure/api-context.js';
import { useProfilesStore } from './profiles/application/profiles.store.js';

const profiles = useProfilesStore();
watch(() => apiContext.userId, () => profiles.setContext(apiContext.role), { immediate: true, flush: 'sync' });
const route = useRoute();
const isStandaloneRoute = computed(() => route.meta.standalone === true);
</script>
