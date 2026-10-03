<script setup>
import { useI18n } from "vue-i18n";

const { locale, availableLocales, t } = useI18n();
</script>

<template>
  <div class="language-switcher">
    <span class="visually-hidden">{{ t("common.language") }}</span>
    <pv-select-button
      v-model="locale"
      :options="availableLocales"
      :aria-label="t('common.language')"
      :allow-empty="false"
    >
      <template #option="{ option }">
        {{ option.toUpperCase() }}
      </template>
    </pv-select-button>
  </div>
</template>

<style scoped>
.language-switcher {
  display: inline-flex;
  align-items: center;
}

.language-switcher :deep(.p-selectbutton) {
  display: inline-flex;
}

.language-switcher :deep(.p-togglebutton) {
  min-width: 42px;
  min-height: 34px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 700;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}
</style>
