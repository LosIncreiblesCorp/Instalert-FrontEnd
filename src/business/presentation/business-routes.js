// Lazy-loaded components
const businessRoutes = [
  {
    path: "/admin/business",
    name: "admin-business-profile",
    component: () => import("./views/business-profile.vue"),
    meta: { role: "administrator", menuKey: "business-profile", title: "business.profile.title" },
  },
  {
    path: "/admin/personnel",
    name: "admin-personnel",
    component: () => import("./views/personnel-list.vue"),
    meta: { role: "administrator", menuKey: "personnel", title: "navigation.personnel" },
  },
  {
    path: "/admin/personnel/invitations/new",
    name: "business-invitation-new",
    component: () => import("./views/invitation-form.vue"),
    meta: { role: "administrator", menuKey: "personnel", title: "business.invitation.title" },
  },
];

export default businessRoutes;
