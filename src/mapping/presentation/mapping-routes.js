/** Risk map routes for admin and employee roles. */
// Lazy-loaded components
export const mappingRoutes = [
    {
        path: 'risk-map',
        name: 'admin-risk-map',
        component: () => import('./views/risk-map-page.vue'),
        meta: { role: 'admin' }
    },
    {
        path: 'risk-map',
        name: 'employee-risk-map',
        component: () => import('./views/risk-map-page.vue'),
        meta: { role: 'employee' }
    }
];
