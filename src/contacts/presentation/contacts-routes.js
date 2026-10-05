// Lazy-loaded components
const contactForm = () => import('./views/contact-form.vue');
const contactMeta = { role: 'employee', menuKey: 'contacts' };

const contactsRoutes = [
    { path: '/employee/contacts', name: 'employee-contacts', component: () => import('./views/contacts-list.vue'),
        meta: { ...contactMeta, title: 'navigation.emergencyContacts' } },
    { path: '/employee/contacts/new', name: 'employee-contact-new', component: contactForm,
        meta: { ...contactMeta, title: 'contacts.form.createTitle' } },
    { path: '/employee/contacts/:id/edit', name: 'employee-contact-edit', component: contactForm,
        meta: { ...contactMeta, title: 'contacts.form.editTitle' } },
];

export default contactsRoutes;
