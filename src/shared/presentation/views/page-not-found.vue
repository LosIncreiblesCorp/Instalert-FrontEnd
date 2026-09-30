<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink, useRoute } from "vue-router";

const route = useRoute();
const { t } = useI18n();
const isAdministrator = computed(() => route.meta.role !== "employee");
const homeRouteName = computed(() =>
  isAdministrator.value ? "admin-dashboard" : "employee-dashboard",
);
</script>

<template>
  <section class="not-found-page">
    <section class="not-found-content" aria-labelledby="not-found-title">
      <img class="not-found-logo" src="/instalert-logo.svg" alt="" />
      <p class="not-found-code">{{ t("common.notFoundCode") }}</p>
      <h1 id="not-found-title">{{ t("common.notFoundTitle") }}</h1>
      <p class="not-found-description">{{ t("common.notFoundDescription") }}</p>
      <RouterLink :to="{ name: homeRouteName }" custom v-slot="{ href, navigate }">
        <pv-button as="a" :href="href" class="not-found-link" @click="navigate">
          {{ t("common.goBack") }}
        </pv-button>
      </RouterLink>
    </section>
  </section>
</template>

<style scoped>
.not-found-page {
  display: grid;
  min-height: 100svh;
  padding: 24px;
  place-items: center;
  color: #172033;
  background: #f4f7fb;
}

.not-found-content {
  width: min(100%, 470px);
  padding: 42px 34px;
  border: 1px solid #e6ebf2;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 16px 42px rgb(15 23 42 / 7%);
  text-align: center;
}

.not-found-logo {
  width: 42px;
  height: 42px;
  object-fit: contain;
}

.not-found-code {
  margin: 16px 0 4px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

h1 {
  margin: 0;
  color: #111c32;
  font-size: clamp(24px, 5vw, 32px);
  line-height: 1.2;
}

.not-found-description {
  margin: 12px 0 24px;
  color: #68758a;
  font-size: 14px;
  line-height: 1.6;
}

.not-found-link {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  padding: 0 15px;
  border: 1px solid #111c32;
  border-radius: 8px;
  color: #fff;
  background: #111c32;
  font-size: 13px;
  font-weight: 650;
  text-decoration: none;
}

.not-found-link:focus-visible {
  outline: 3px solid #60a5fa;
  outline-offset: 3px;
}
</style>
