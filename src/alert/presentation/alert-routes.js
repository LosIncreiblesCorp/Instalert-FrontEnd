const employeeAlerts = () => import('./views/employee-alerts.vue');

const alertRoutes = [
    { path: 'alerts', name: 'employee-alerts', component: employeeAlerts, meta: { title: 'alerts.title' } },
];

export default alertRoutes;
