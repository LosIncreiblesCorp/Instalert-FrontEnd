// Lazy-loaded components
const businessRoutes = [
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
