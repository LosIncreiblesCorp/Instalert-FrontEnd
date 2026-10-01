<script setup>
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const { t } = useI18n();
const router = useRouter();
</script>

<template>
  <section class="personnel-page" aria-labelledby="personnel-title">
    <header class="page-heading">
      <div>
        <h2 id="personnel-title">{{ t("business.personnel.title") }}</h2>
        <p>{{ t("business.personnel.description") }}</p>
      </div>
      <pv-button
        class="primary-action"
        icon="pi pi-user-plus"
        :label="t('business.invitation.title')"
        @click="router.push({ name: 'business-invitation-new' })"
      />
    </header>

    <div class="personnel-surface">
      <pv-data-table :value="[]" :aria-label="t('business.personnel.title')">
        <pv-column field="displayName" :header="t('business.personnel.name')" />
        <pv-column field="email" :header="t('business.invitation.email')" />
        <pv-column field="status" :header="t('business.personnel.status')" />
        <template #empty>
          <div class="unavailable-state">
            <span class="state-icon" aria-hidden="true"><i class="pi pi-users"></i></span>
            <h3>{{ t("business.personnel.unavailableTitle") }}</h3>
            <p>{{ t("business.personnel.unavailableDescription") }}</p>
          </div>
        </template>
      </pv-data-table>
    </div>
  </section>
</template>

<style scoped>
.personnel-page { padding: clamp(20px, 3vw, 40px); }
.page-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 32px; }
h2 { margin: 0; color: var(--ink); font-size: clamp(26px, 3vw, 32px); font-weight: 700; letter-spacing: -0.035em; }
.page-heading p { margin: 10px 0 0; color: var(--muted); line-height: 1.6; }
.primary-action { flex-shrink: 0; color: white; background: var(--navy); border-color: var(--navy); min-height: 44px; }
.primary-action:hover { background: var(--ink); border-color: var(--ink); }
.personnel-surface { overflow: hidden; border: 1px solid var(--line); border-radius: 12px; background: white; }
.personnel-surface :deep(.p-datatable-header-cell) { background: #f0f4ff; color: var(--muted); padding: 18px 20px; font-size: 14px; font-weight: 600; }
.unavailable-state { padding: 48px 16px; text-align: center; }
.state-icon { display: inline-grid; place-items: center; width: 52px; height: 52px; border-radius: 12px; color: var(--blue); background: #f0f4ff; font-size: 22px; }
h3 { margin: 20px 0 8px; font-size: 18px; color: var(--ink); }
.unavailable-state p { max-width: 460px; margin: 0 auto; color: var(--muted); line-height: 1.6; }
@media (max-width: 760px) {
  .page-heading { flex-direction: column; }
  .primary-action { width: 100%; }
  .personnel-surface :deep(.p-datatable-header-cell) { padding: 14px 10px; }
}
</style>
