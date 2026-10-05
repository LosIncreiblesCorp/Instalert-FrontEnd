// Lazy-loaded components
export const paymentsRoutes = [
    {
        path: "/admin/subscription",
        name: "admin-subscription",
        component: () => import("./views/subscription-page.vue"),
        meta: { role: "administrator", menuKey: "subscription", title: "navigation.subscription" }
    }
];
