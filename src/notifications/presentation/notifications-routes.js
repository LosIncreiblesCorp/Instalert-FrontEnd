const notificationsView = () => import('./views/notifications.vue');

export const notificationsRoutes = [
    { path: '/admin/notifications', name: 'admin-notifications', component: notificationsView,
        meta: { role: 'administrator', menuKey: 'notifications', title: 'notifications.title' } },
    { path: '/employee/notifications', name: 'employee-notifications', component: notificationsView,
        meta: { role: 'employee', menuKey: 'notifications', title: 'notifications.title' } },
];
