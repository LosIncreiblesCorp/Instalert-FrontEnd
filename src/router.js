import { createRouter, createWebHistory } from "vue-router";
import { i18n } from "./i18n.js";
import PageNotFound from "./shared/presentation/views/page-not-found.vue";
import { paymentsRoutes } from "./payments/presentation/payments-routes.js";
import businessRoutes from "./business/presentation/business-routes.js";
import alertRoutes from "./alert/presentation/alert-routes.js";
import contactsRoutes from "./contacts/presentation/contacts-routes.js";

const EmptyRouteView = { render: () => null };

const employeeAlertRoutes = alertRoutes.map((route) => ({
  ...route,
  path: `/employee/${route.path}`,
  meta: {
    ...route.meta,
    role: "employee",
    menuKey: "alerts",
    panicActionAvailable: true,
  },
}));

// Define lazy-loaded components
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
  { path: "/admin/alerts", redirect: { name: "admin-alerts-history" } },
  {
    path: "/admin/alerts/active",
    name: "admin-alerts-active",
    redirect: { name: "admin-alerts-history" },
  },
  {
    path: "/admin/alerts/history",
    name: "admin-alerts-history",
    component: () => import("./alert/presentation/views/employee-alerts.vue"),
    meta: { role: "administrator", menuKey: "alerts", alertView: "history", historyOnly: true, title: "navigation.alertHistory" },
  },
  ...paymentsRoutes,
  ...businessRoutes,
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
  ...employeeAlertRoutes,
  ...contactsRoutes,
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

/** Updates the document title on each navigation. @param {import('vue-router').RouteLocationNormalized} to - Target route. @param {import('vue-router').RouteLocationNormalized} from - Current route. @returns {void} */
router.beforeEach((to) => {
  // Set the page title
  document.title = `InstAlert | ${i18n.global.t(to.meta.title ?? "common.appName")}`;
});

export default router;
