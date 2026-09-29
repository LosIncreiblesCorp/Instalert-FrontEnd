import {createRouter, createWebHistory} from "vue-router";

const routes = [
    //{ path: '/home',            name: 'home',       component: Home,        meta: { title: 'Home' } },

    //{ path: '/',                redirect: '/home' },
    //{ path: '/:pathMatch(.*)*', name: 'not-found', component: pageNotFound, meta: { title: 'Page Not Found' } }
];
const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: routes
});

router.beforeEach((to, from) => {
    console.log(`Navigating to ${to.name} from ${from.name}`);
    let baseTitle = 'InstAlert';
    document.title = `${baseTitle} - ${to.meta['title']}`;
    return true;
});

export default router;