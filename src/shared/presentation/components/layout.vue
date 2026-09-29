<script lang="js" setup>
import { ref } from "vue";
import {
  Button as PvButton,
  Menubar as PvMenubar,
  Drawer as PvDrawer
} from "primevue";

import LanguageSwitcher from "./language-switcher.vue";

const drawerVisible = ref(false);

const toggleDrawer = () => {
  drawerVisible.value = !drawerVisible.value;
};

const items = [
  {
    label: "option.home",
    to: "/home",
    icon: "pi pi-home"
  },
  {
    label: "option.map",
    to: "/map",
    icon: "pi pi-map"
  },
  {
    label: "option.alert",
    to: "/alert",
    icon: "pi pi-exclamation-triangle"
  },
  {
    label: "option.business",
    to: "/business",
    icon: "pi pi-building"
  },
  {
    label: "option.subscription",
    to: "/subscription",
    icon: "pi pi-credit-card"
  }
];
</script>

<template>
  <div class="layout-container">

    <!-- Header -->
    <header class="sticky-header">
      <pv-menubar>
        <template #start>
          <div class="flex align-items-center gap-2">

            <pv-button
                icon="pi pi-bars"
                text
                @click="toggleDrawer"
            />

            <img
                src="../../../assets/instalert-logo.svg"
                alt="InstAlert logo"
                class="w-3rem h-auto"
            />

            <h3>InstAlert</h3>

          </div>
        </template>

        <template #end>
          <language-switcher />
        </template>
      </pv-menubar>
    </header>

    <!-- Menú hamburguesa -->
    <pv-drawer
        v-model:visible="drawerVisible"
        position="left"
    >
      <template #header>
        <div class="flex align-items-center gap-2">
          <img
              src="../../../assets/instalert-logo.svg"
              alt="InstAlert logo"
              class="w-3rem h-auto"
          />

          <strong>InstAlert</strong>
        </div>
      </template>

      <nav class="drawer-menu">
        <router-link
            v-for="item in items"
            :key="item.to"
            :to="item.to"
            class="menu-item"
            @click="drawerVisible = false"
        >
          <i :class="item.icon"></i>

          <span>
            {{ $t(item.label) }}
          </span>
        </router-link>
      </nav>

    </pv-drawer>

    <!-- Contenido -->
    <main class="content-padding">
      <router-view />
    </main>

  </div>
</template>

<style scoped>
.layout-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 1000;
}

.content-padding {
  padding: 1rem;
  flex: 1;
}

.drawer-menu {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 1rem;

  padding: 0.9rem 1rem;

  color: inherit;
  text-decoration: none;

  border-radius: 8px;
  transition: background-color 0.2s;
}

.menu-item:hover {
  background-color: #3c9ec1;
}

.menu-item i {
  font-size: 1.2rem;
}

.router-link-active {
  background-color: blue;
  color: var(--p-primary-600);
}

@media screen and (min-width: 768px) {
  .content-padding {
    padding: 2rem;
  }
}
</style>