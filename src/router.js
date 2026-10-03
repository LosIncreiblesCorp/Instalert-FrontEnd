import { createRouter, createWebHistory } from 'vue-router';
import alertRoutes from './alert/presentation/alert-routes.js';
import i18n from './i18n.js';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        { path: '/', redirect: { name: 'employee-alerts' } },
        { path: '/employee', redirect: { name: 'employee-alerts' }, children: alertRoutes },
    ],
});

router.afterEach((to) => {
    document.title = `InstAlert - ${i18n.global.t(to.meta.title ?? 'alerts.title')}`;
});

export default router;
