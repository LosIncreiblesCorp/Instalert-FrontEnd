const profileView = () => import('./views/user-profile.vue');

export const profilesRoutes = [
    { path: '/admin/profile', name: 'admin-profile', component: profileView,
        meta: { role: 'administrator', menuKey: 'profile', title: 'common.profile' } },
    { path: '/employee/profile', name: 'employee-profile', component: profileView,
        meta: { role: 'employee', menuKey: 'profile', title: 'common.profile' } }
];
