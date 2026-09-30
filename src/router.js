import { createRouter, createWebHistory } from "vue-router";
import { i18n } from "./i18n.js";
import PageNotFound from "./shared/presentation/views/page-not-found.vue";

const EmptyRouteView = { render: () => null };

const routes = [
  { path: "/", redirect: { name: "admin-dashboard" } },
  { path: "/admin", redirect: { name: "admin-dashboard" } },
  {
    path: "/admin/dashboard",
    name: "admin-dashboard",
    component: EmptyRouteView,
    meta: { role: "administrator", menuKey: "dashboard", title: "navigation.adminDashboard" },
  },
  {
    path: "/admin/risk-map",
    name: "admin-risk-map",
    component: () => import('./mapping/presentation/views/risk-map-page.vue'),
    meta: { role: "administrator", menuKey: "risk-map", title: "navigation.riskMap" },
  },
  { path: "/admin/alerts", redirect: { name: "admin-alerts-active" } },
  {
    path: "/admin/alerts/active",
    name: "admin-alerts-active",
    component: EmptyRouteView,
    meta: { role: "administrator", menuKey: "alerts", alertView: "active", title: "navigation.activeAlerts" },
  },
  {
    path: "/admin/alerts/history",
    name: "admin-alerts-history",
    component: EmptyRouteView,
    meta: { role: "administrator", menuKey: "alerts", alertView: "history", title: "navigation.alertHistory" },
  },
  {
    path: "/admin/personnel",
    name: "admin-personnel",
    component: EmptyRouteView,
    meta: { role: "administrator", menuKey: "personnel", title: "navigation.personnel" },
  },
  {
    path: "/admin/subscription",
    name: "admin-subscription",
    component: EmptyRouteView,
    meta: { role: "administrator", menuKey: "subscription", title: "navigation.subscription" },
  },
  {
    path: "/admin/profile",
    name: "admin-profile",
    component: EmptyRouteView,
    meta: { role: "administrator", title: "common.profile" },
  },
  {
    path: "/admin/:pathMatch(.*)*",
    name: "admin-not-found",
    component: PageNotFound,
    meta: { role: "administrator", standalone: true, title: "common.notFoundTitle" },
  },
  { path: "/employee", redirect: { name: "employee-dashboard" } },
  {
    path: "/employee/dashboard",
    name: "employee-dashboard",
    component: EmptyRouteView,
    meta: { role: "employee", menuKey: "dashboard", title: "navigation.employeeDashboard" },
  },
  {
    path: "/employee/risk-map",
    name: "employee-risk-map",
    component: () => import('./mapping/presentation/views/risk-map-page.vue'),
    meta: { role: "employee", menuKey: "risk-map", title: "navigation.riskMap" },
  },
  {
    path: "/employee/alerts",
    name: "employee-alerts",
    component: EmptyRouteView,
    meta: { role: "employee", menuKey: "alerts", panicActionAvailable: true, title: "navigation.alerts" },
  },
  {
    path: "/employee/profile",
    name: "employee-profile",
    component: EmptyRouteView,
    meta: { role: "employee", title: "common.profile" },
  },
  {
    path: "/employee/:pathMatch(.*)*",
    name: "employee-not-found",
    component: PageNotFound,
    meta: { role: "employee", standalone: true, title: "common.notFoundTitle" },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "page-not-found",
    component: PageNotFound,
    meta: { role: "administrator", standalone: true, title: "common.notFoundTitle" },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to) => {
  document.title = `InstAlert | ${i18n.global.t(to.meta.title ?? "common.appName")}`;
});

export default router;
