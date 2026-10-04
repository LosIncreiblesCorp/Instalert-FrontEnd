<script setup>
import { computed, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import LanguageSwitcher from "./language-switcher.vue";
import instalertLogo from "../../../assets/instalert-logo.svg";

const route = useRoute();
const { locale, t } = useI18n();
const mobileNavigationOpen = ref(false);

const isAdministrator = computed(() => route.meta.role === "administrator");
const currentRoleLabel = computed(() =>
  isAdministrator.value ? t("roles.administrator") : t("roles.employee"),
);
const homeRouteName = computed(() =>
  isAdministrator.value ? "admin-dashboard" : "employee-dashboard",
);
const profileRouteName = computed(() =>
  isAdministrator.value ? "admin-profile" : "employee-profile",
);

const administratorItems = [
  { key: "dashboard", label: "navigation.adminDashboard", icon: "pi pi-home", routeName: "admin-dashboard" },
  { key: "risk-map", label: "navigation.riskMap", icon: "pi pi-map", routeName: "admin-risk-map" },
  { key: "alerts", label: "navigation.alerts", icon: "pi pi-bell", routeName: "admin-alerts-history" },
  { key: "personnel", label: "navigation.personnel", icon: "pi pi-users", routeName: "admin-personnel" },
  { key: "subscription", label: "navigation.subscription", icon: "pi pi-credit-card", routeName: "admin-subscription" },
];

const employeeItems = [
  { key: "dashboard", label: "navigation.employeeDashboard", icon: "pi pi-home", routeName: "employee-dashboard" },
  { key: "risk-map", label: "navigation.riskMap", icon: "pi pi-map", routeName: "employee-risk-map" },
  { key: "alerts", label: "navigation.alerts", icon: "pi pi-bell", routeName: "employee-alerts" },
];

const navigationItems = computed(() =>
  isAdministrator.value ? administratorItems : employeeItems,
);
const activeMenuKey = computed(() => route.meta.menuKey);

watch(
  () => route.fullPath,
  () => {
    mobileNavigationOpen.value = false;
  },
);

watch(
  [locale, () => route.meta.title],
  ([currentLocale, titleKey]) => {
    document.documentElement.lang = currentLocale === "es" ? "es-419" : "en-US";
    document.title = `InstAlert | ${t(titleKey ?? "common.appName")}`;
  },
  { immediate: true },
);

function closeMobileNavigation() {
  mobileNavigationOpen.value = false;
}
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--nav-open': mobileNavigationOpen }">
    <a class="skip-link" href="#main-content">{{ t("common.skipToContent") }}</a>

    <header class="app-header">
      <div class="header-brand-area">
        <pv-button
          class="mobile-menu-button"
          type="button"
          :aria-label="mobileNavigationOpen ? t('common.closeNavigation') : t('common.openNavigation')"
          :aria-expanded="mobileNavigationOpen"
          aria-controls="primary-navigation"
          @click="mobileNavigationOpen = !mobileNavigationOpen"
        >
          <i :class="mobileNavigationOpen ? 'pi pi-times' : 'pi pi-bars'" aria-hidden="true"></i>
        </pv-button>

        <RouterLink class="brand-link" :to="{ name: homeRouteName }" :aria-label="t('common.appName')">
          <img class="brand-logo" :src="instalertLogo" alt="" />
          <span class="brand-name">{{ t("common.appName") }}</span>
        </RouterLink>
      </div>

      <div class="header-context">
        <RouterLink class="profile-link" :to="{ name: profileRouteName }" :aria-label="t('common.profile')">
          <span class="role-mark" aria-hidden="true"><i class="pi pi-user"></i></span>
          <span class="role-copy">
            <span class="role-name">{{ currentRoleLabel }}</span>
          </span>
          <span class="profile-label">{{ t("common.profile") }}</span>
        </RouterLink>
        <LanguageSwitcher />
      </div>
    </header>

    <pv-button
      v-if="mobileNavigationOpen"
      class="navigation-backdrop"
      type="button"
      :aria-label="t('common.closeNavigation')"
      @click="closeMobileNavigation"
    />

    <aside
      id="primary-navigation"
      class="app-sidebar"
      :class="{ 'app-sidebar--open': mobileNavigationOpen }"
    >
      <nav class="primary-navigation" :aria-label="t('navigation.mainLabel')">
        <p class="navigation-section-title">{{ t("navigation.sectionTitle") }}</p>

        <ul class="navigation-list">
          <li v-for="item in navigationItems" :key="item.key" class="navigation-list-item">
            <RouterLink
              class="navigation-link"
              :class="{ 'navigation-link--active': activeMenuKey === item.key }"
              :to="{ name: item.routeName }"
              @click="closeMobileNavigation"
            >
              <i :class="item.icon" aria-hidden="true"></i>
              <span class="navigation-link-label">{{ t(item.label) }}</span>
            </RouterLink>
          </li>
        </ul>
      </nav>

      <div class="sidebar-role-note">
        <i class="pi pi-shield" aria-hidden="true"></i>
        <span>{{ currentRoleLabel }}</span>
      </div>
    </aside>

    <main id="main-content" class="workspace-main" tabindex="-1">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  --header-height: 64px;
  --sidebar-width: clamp(180px, 22vw, 250px);
  --ink: #172033;
  --muted: #68758a;
  --line: #e6ebf2;
  --navy: #111c32;
  --blue: #2563eb;

  min-height: 100svh;
  color: var(--ink);
  background: #f4f7fb;
}

.skip-link {
  position: fixed;
  z-index: 20;
  top: 8px;
  left: 8px;
  padding: 10px 14px;
  transform: translateY(-150%);
  border-radius: 8px;
  color: #fff;
  background: var(--navy);
  text-decoration: none;
}

.skip-link:focus {
  transform: translateY(0);
}

.app-header {
  position: fixed;
  z-index: 12;
  inset: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  padding: 0 26px;
  border-bottom: 1px solid var(--line);
  background: #fff;
}

.header-brand-area,
.brand-link,
.header-context {
  display: flex;
  align-items: center;
}

.header-brand-area {
  gap: 12px;
}

.brand-link {
  gap: 9px;
  color: var(--ink);
  text-decoration: none;
}

.brand-logo {
  display: block;
  width: 34px;
  height: 34px;
  object-fit: contain;
}

.brand-name {
  font-size: 17px;
  font-weight: 750;
  letter-spacing: -0.035em;
}

.header-context {
  gap: 11px;
}

.profile-link {
  display: flex;
  min-height: 42px;
  align-items: center;
  gap: 9px;
  padding: 4px 11px 4px 5px;
  border-radius: 999px;
  color: var(--ink);
  background: #f0f4ff;
  text-decoration: none;
  transition: background-color 140ms ease;
}

.profile-link:hover {
  background: #e7edff;
}

.role-mark {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid #d8e5ff;
  border-radius: 50%;
  color: var(--blue);
  background: #f2f6ff;
}

.role-copy {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 104px;
}

.profile-label {
  font-size: 12px;
  font-weight: 650;
}

.role-name {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
}

.mobile-menu-button {
  display: none;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 9px;
  color: var(--ink);
  background: #fff;
  cursor: pointer;
}

.mobile-menu-button.p-button {
  min-width: 40px;
  padding: 0;
}

.app-sidebar {
  position: fixed;
  z-index: 10;
  top: var(--header-height);
  bottom: 0;
  left: 0;
  display: flex;
  width: var(--sidebar-width);
  flex-direction: column;
  justify-content: space-between;
  padding: 17px 12px 15px;
  border-right: 1px solid var(--line);
  background: #fff;
}

.primary-navigation {
  min-width: 0;
}

.navigation-section-title {
  margin: 0 8px 13px;
  color: #788398;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.09em;
  line-height: 1.4;
  text-transform: uppercase;
}

.navigation-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.navigation-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.navigation-list-item {
  min-width: 0;
}

.navigation-link {
  display: flex;
  width: 100%;
  min-height: 42px;
  align-items: center;
  gap: 11px;
  padding: 0 11px;
  border: 0;
  border-radius: 8px;
  color: #465267;
  background: transparent;
  font-size: 13px;
  font-weight: 550;
  line-height: 1.2;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 140ms ease, color 140ms ease;
}

.navigation-link > i:first-child {
  width: 17px;
  color: #6c7789;
  font-size: 14px;
  text-align: center;
}

.navigation-link:hover {
  color: var(--navy);
  background: #f1f4f9;
}

.navigation-link--active {
  color: #fff;
  background: var(--navy);
}

.navigation-link--active > i:first-child,
.navigation-link--active:hover {
  color: #fff;
}

.navigation-link--active:hover {
  background: var(--navy);
}

.navigation-link-label {
  flex: 1;
}

.sidebar-role-note {
  display: flex;
  min-height: 39px;
  align-items: center;
  gap: 9px;
  padding: 0 10px;
  border-radius: 8px;
  color: #516078;
  background: #f4f7fb;
  font-size: 11px;
  font-weight: 600;
}

.sidebar-role-note i {
  color: var(--blue);
  font-size: 13px;
}

.workspace-main {
  min-height: 100svh;
  margin-left: var(--sidebar-width);
  padding-top: var(--header-height);
  background: #f4f7fb;
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

.navigation-backdrop {
  display: none;
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
}

.navigation-backdrop.p-button {
  display: none;
}

button:focus-visible,
a:focus-visible,
select:focus-visible {
  outline: 3px solid #60a5fa;
  outline-offset: 2px;
}

@media (max-width: 760px) {
  .app-header {
    padding: 0 14px;
  }

  .mobile-menu-button {
    display: inline-flex;
  }

  .header-brand-area {
    gap: 8px;
  }

  .header-context {
    gap: 8px;
  }

  .profile-link {
    gap: 7px;
    padding-right: 8px;
  }

  .profile-label {
    font-size: 11px;
  }

  .role-copy {
    min-width: auto;
  }

  .app-sidebar {
    z-index: 15;
    width: min(82vw, 288px);
    transform: translateX(-105%);
    transition: transform 180ms ease;
  }

  .app-sidebar--open {
    transform: translateX(0);
  }

  .navigation-backdrop {
    position: fixed;
    z-index: 14;
    inset: var(--header-height) 0 0;
    display: block;
    border: 0;
    background: rgb(15 23 42 / 38%);
  }

  .navigation-backdrop.p-button {
    display: block;
  }

  .workspace-main {
    margin-left: 0;
  }
}

@media (max-width: 430px) {
  .app-header {
    padding: 0 10px;
  }

  .brand-name {
    font-size: 15px;
  }

  .brand-logo {
    width: 30px;
    height: 30px;
  }

  .role-mark {
    display: none;
  }

  .role-name {
    max-width: 102px;
    font-size: 10px;
    text-align: right;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
