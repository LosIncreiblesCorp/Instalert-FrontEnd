<script setup>
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const { t } = useI18n();
// These shortcuts compose navigation only; each context owns its data and rules.
const shortcuts = [
  { key: 'map', title: 'navigation.riskMap', icon: 'pi pi-map', routeName: 'admin-risk-map' },
  { key: 'history', title: 'navigation.alertHistory', icon: 'pi pi-history', routeName: 'admin-alerts-history' },
  { key: 'staff', title: 'navigation.personnel', icon: 'pi pi-users', routeName: 'admin-personnel' },
  { key: 'subscription', title: 'navigation.subscription', icon: 'pi pi-credit-card', routeName: 'admin-subscription' },
];
</script>

<template>
  <section class="home-page" aria-labelledby="admin-home-title">
    <header class="welcome-panel">
      <div class="welcome-copy">
        <p class="eyebrow"><i class="pi pi-shield" aria-hidden="true" /> {{ t('roles.administrator') }}</p>
        <h1 id="admin-home-title">{{ t('home.admin.title') }}</h1>
        <p class="welcome-description">{{ t('home.admin.description') }}</p>
      </div>
      <div class="welcome-symbol" aria-hidden="true"><i class="pi pi-building" /></div>
    </header>

    <nav class="quick-access" :aria-label="t('home.quickAccess')">
      <div class="section-heading">
        <h2>{{ t('home.quickAccess') }}</h2>
        <p>{{ t('home.admin.shortcutsHelp') }}</p>
      </div>
      <div class="shortcut-grid">
        <article v-for="shortcut in shortcuts" :key="shortcut.key" class="shortcut-card">
          <span class="shortcut-icon" aria-hidden="true"><i :class="shortcut.icon" /></span>
          <h3>{{ t(shortcut.title) }}</h3>
          <p>{{ t(`home.descriptions.${shortcut.key}`) }}</p>
          <pv-button type="button" outlined icon="pi pi-arrow-right" icon-pos="right"
            :label="t(`home.actions.${shortcut.key}`)"
            @click="router.push({ name: shortcut.routeName })" />
        </article>
      </div>
    </nav>
  </section>
</template>

<style scoped>
.home-page { max-width: 1250px; margin: auto; padding: clamp(20px, 3vw, 40px); }
.welcome-panel { display: flex; align-items: center; justify-content: space-between; gap: 28px; padding: clamp(24px, 4vw, 40px); border: 1px solid var(--line); border-radius: 18px; background: linear-gradient(115deg, #fff 40%, #edf3ff); }
.welcome-copy { max-width: 670px; }
.eyebrow { display: flex; align-items: center; gap: 8px; margin: 0 0 16px; color: var(--blue); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
h1 { margin: 0; color: var(--ink); font-size: clamp(27px, 3.4vw, 38px); line-height: 1.25; letter-spacing: -.04em; }
.welcome-description { margin: 16px 0 0; color: var(--muted); font-size: 15px; line-height: 1.7; }
.welcome-symbol { display: grid; place-items: center; flex-shrink: 0; width: 90px; height: 90px; border: 1px solid #d9e5ff; border-radius: 24px; color: var(--blue); background: #e8efff; }
.welcome-symbol i { font-size: 36px; }
.quick-access { margin-top: 34px; }
.section-heading { margin-bottom: 20px; }
.section-heading h2 { margin: 0; color: var(--ink); font-size: 19px; }
.section-heading p { margin: 8px 0 0; color: var(--muted); font-size: 14px; line-height: 1.6; }
.shortcut-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.shortcut-card { display: flex; align-items: flex-start; flex-direction: column; padding: 26px; border: 1px solid var(--line); border-radius: 14px; background: white; }
.shortcut-icon { display: grid; place-items: center; width: 44px; height: 44px; margin-bottom: 20px; border-radius: 12px; background: #eff4ff; color: var(--blue); font-size: 20px; }
.shortcut-card h3 { margin: 0; color: var(--ink); font-size: 17px; }
.shortcut-card p { flex: 1; margin: 10px 0 22px; color: var(--muted); font-size: 14px; line-height: 1.6; }
.shortcut-card button { min-height: 44px; color: var(--navy); border-color: #cbd5e1; }
.shortcut-card button:focus-visible { outline: 3px solid #60a5fa; outline-offset: 3px; }
@media (max-width: 600px) {
  .shortcut-grid { grid-template-columns: 1fr; }
  .welcome-symbol { display: none; }
  .shortcut-card { padding: 22px; }
}
</style>
