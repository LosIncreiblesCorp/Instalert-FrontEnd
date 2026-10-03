<template>
  <pv-confirm-dialog />
  <RouterView v-if="isStandaloneRoute" />
  <Layout v-else />
</template>

<script setup>
import { computed } from "vue";
import { RouterView, useRoute } from "vue-router";
import Layout from "./shared/presentation/components/layout.vue";

const route = useRoute();
const isStandaloneRoute = computed(() => route.meta.standalone === true);
</script>
