export const dashboardRoutes = [
    { path: '/admin/dashboard', name: 'admin-dashboard', component: () => import('./views/dashboard-page.vue'),
        meta: { role: 'administrator', menuKey: 'dashboard', title: 'navigation.adminDashboard' } },
    { path: '/employee/dashboard', name: 'employee-dashboard', component: () => import('./views/dashboard-page.vue'),
        meta: { role: 'employee', menuKey: 'dashboard', title: 'navigation.employeeDashboard' } },
    { path: '/admin/monthly-reports', name: 'admin-monthly-reports', component: () => import('./views/monthly-reports.vue'),
        meta: { role: 'administrator', menuKey: 'dashboard', title: 'dashboard.monthly.title' } },
    { path: '/admin/monthly-reports/:reportId', name: 'admin-monthly-report', component: () => import('./views/monthly-reports.vue'),
        meta: { role: 'administrator', menuKey: 'dashboard', title: 'dashboard.monthly.detailTitle' } },
];
