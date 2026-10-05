<script setup>
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const { t } = useI18n();
// This choice only opens a view; it does not authenticate or assign a user role.
</script>

<template>
  <main class="profile-selection-page" aria-labelledby="profile-selection-title">
    <section class="profile-selection-content">
      <h1 id="profile-selection-title">{{ t('common.chooseProfile') }}</h1>
      <div class="profile-actions">
        <pv-button class="profile-choice" type="button" outlined icon="pi pi-user"
          :label="t('roles.employee')" @click="router.push({ name: 'employee-dashboard' })" />
        <pv-button class="profile-choice" type="button" outlined icon="pi pi-building"
          :label="t('roles.administrator')" @click="router.push({ name: 'admin-dashboard' })" />
      </div>
    </section>
  </main>
</template>

<style scoped>
.profile-selection-page {
  display: grid;
  min-height: 100svh;
  padding: 24px;
  place-items: center;
  background: #f4f7fb;
}
.profile-selection-content {
  width: min(100%, 540px);
  padding: clamp(28px, 5vw, 44px);
  border: 1px solid #e6ebf2;
  border-radius: 16px;
  background: #fff;
  text-align: center;
}
h1 {
  margin: 0 0 28px;
  color: #172033;
  font-size: clamp(24px, 4vw, 30px);
  line-height: 1.3;
  letter-spacing: -.03em;
}
.profile-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.profile-choice {
  min-height: 52px;
  padding: 12px;
  border-color: #cbd5e1;
  color: #111c32;
}
.profile-choice:not(:disabled):hover {
  border-color: #2563eb;
  background: #eff4ff;
  color: #111c32;
}
.profile-choice:focus-visible {
  outline: 3px solid #60a5fa;
  outline-offset: 3px;
}
@media (max-width: 540px) {
  .profile-actions { grid-template-columns: 1fr; }
}
</style>
