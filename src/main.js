import { createApp, watch } from 'vue'
import PrimeVue from 'primevue/config'
import { Button, Card, Column, ConfirmationService, ConfirmDialog, DataTable, Message, ProgressBar, SelectButton, Tag } from 'primevue'
import Material from '@primeuix/themes/material'
import 'primeicons/primeicons.css'
import './style.css'
import App from './App.vue'
import i18n, { localeStorageKey, supportedLocales } from './i18n'
import pinia from './pinia'
import router from './router'

const primeUiLicenseKey = import.meta.env.VITE_PRIME_UI_LICENSE_KEY;

const app = createApp(App)

app
    .use(i18n)
    .use(PrimeVue, {
        theme: { preset: Material },
        ripple: true,
        license: primeUiLicenseKey
    })
    .use(ConfirmationService)
    .component('pv-button', Button)
    .component('pv-card', Card)
    .component('pv-tag', Tag)
    .component('pv-progress-bar', ProgressBar)
    .component('pv-message', Message)
    .component('pv-data-table', DataTable)
    .component('pv-column', Column)
    .component('pv-confirm-dialog', ConfirmDialog)
    .component('pv-select-button', SelectButton)
    .use(router)
    .use(pinia)

watch(i18n.global.locale, (locale) => {
    const selectedLocale = supportedLocales.includes(locale) ? locale : 'en'

    document.documentElement.lang = selectedLocale === 'es' ? 'es-419' : 'en-US'

    try {
        window.localStorage.setItem(localeStorageKey, selectedLocale)
    } catch {
        // The app can still run when browser storage is unavailable.
    }
}, { immediate: true })

app.mount('#app')
