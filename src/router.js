import { createRouter, createWebHistory } from "vue-router";
import { i18n } from "./i18n.js";
import PageNotFound from "./shared/presentation/views/page-not-found.vue";
import { paymentsRoutes } from "./payments/presentation/payments-routes.js";
import businessRoutes from "./business/presentation/business-routes.js";
import alertRoutes from "./alert/presentation/alert-routes.js";
import contactsRoutes from "./contacts/presentation/contacts-routes.js";
import { profilesRoutes } from "./profiles/presentation/profiles-routes.js";
import { notificationsRoutes } from "./notifications/presentation/notifications-routes.js";
import { dashboardRoutes } from "./dashboard/presentation/dashboard-routes.js";
import { useIamStore } from './iam/application/iam.store.js';
import { accessToken } from './iam/infrastructure/session.js';
import pinia from './pinia.js';
import { configureRole, prepareBusinessContext } from './shared/infrastructure/api-context.js';
import { BaseApi } from './shared/infrastructure/base-api.js';


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
  {
    path: "/",
    redirect: '/sign-in',
  },
  { path: '/sign-in', name: 'sign-in', component: () => import('./iam/presentation/views/sign-in.vue'), meta: { standalone: true, guest: true, title: 'iam.signInTitle' } },
  { path: '/sign-up', name: 'sign-up', component: () => import('./iam/presentation/views/sign-up.vue'), meta: { standalone: true, guest: true, title: 'iam.registerTitle' } },
  { path: '/change-password', name: 'change-password', component: () => import('./iam/presentation/views/change-password.vue'), meta: { standalone: true, requiresAuth: true, title: 'iam.changePasswordAction' } },
  { path: '/employee/onboarding', name: 'employee-onboarding', component: () => import('./iam/presentation/views/employee-onboarding.vue'), meta: { standalone: true, requiresAuth: true, onboarding: true, role: 'employee', title: 'iam.employeeSetup.title' } },
  { path: '/account/setup', name: 'session-setup', component: () => import('./iam/presentation/views/session-setup.vue'), meta: { standalone: true, requiresAuth: true, onboarding: true, title: 'iam.setupTitle' } },
  { path: "/admin", redirect: { name: "admin-dashboard" } },
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
  ...dashboardRoutes,
  ...paymentsRoutes,
  ...businessRoutes,
  ...profilesRoutes,
  ...notificationsRoutes,
  {
    path: "/admin/:pathMatch(.*)*",
    name: "admin-not-found",
    component: PageNotFound,
    meta: { role: "administrator", standalone: true, title: "common.notFoundTitle" },
  },
  { path: "/employee", redirect: { name: "employee-dashboard" } },
  {
    path: "/employee/risk-map",
    name: "employee-risk-map",
    component: () => import('./mapping/presentation/views/risk-map-page.vue'),
    meta: { role: "employee", menuKey: "risk-map", title: "navigation.riskMap" },
  },
  ...employeeAlertRoutes,
  ...contactsRoutes,
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
router.beforeEach(async (to) => {
  const iam = useIamStore(pinia);
  await iam.initialize();
  document.title = `InstAlert | ${i18n.global.t(to.meta.title ?? "common.appName")}`;
  const signedIn = Boolean(accessToken());
  const setup = () => ({ name: iam.error ? 'session-setup' : iam.user.role === 'employee' ? 'employee-onboarding' : router.hasRoute('onboarding') ? 'onboarding' : 'session-setup' });
  const home = () => ({ name: iam.user.role === 'administrator' ? 'admin-dashboard' : 'employee-dashboard' });
  if (to.meta.guest) {
    if (!signedIn) return true;
    return iam.user.mustChangePassword ? { name: 'change-password' } : iam.user.hasApplicationAccess ? home() : setup();
  }
  if (!signedIn) return { name: 'sign-in' };
  if (to.name === 'change-password') return true;
  if (!(await iam.refreshSession())) return accessToken() ? to.name === 'session-setup' || { name: 'session-setup' } : { name: 'sign-in' };
  if (iam.user.mustChangePassword) return { name: 'change-password' };
  if (to.meta.role && to.meta.role !== iam.user.role) return iam.user.hasApplicationAccess ? home() : setup();
  if (!iam.user.hasApplicationAccess) {
    if (!to.meta.onboarding) return setup();
    if (to.name === 'session-setup' && iam.user.role === 'employee' && !iam.error) return { name: 'employee-onboarding' };
    if (to.name === 'session-setup' && iam.user.role === 'administrator' && router.hasRoute('onboarding') && !iam.error) return { name: 'onboarding' };
    return true;
  }
  if (to.meta.onboarding) return home();
  if (to.meta.role && to.meta.role !== iam.user.role) return home();
  configureRole(iam.user.role);
  if (to.meta.role) await prepareBusinessContext(new BaseApi().http);
  return true;
});

export default router;
