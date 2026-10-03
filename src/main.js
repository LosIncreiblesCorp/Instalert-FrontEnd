import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Material from '@primeuix/themes/material'
import 'primeicons/primeicons.css'
import './style.css'
import App from './App.vue'
import i18n from './i18n'
import pinia from './pinia'
import router from './router'
import { Button, SelectButton } from 'primevue'

const primeUiLicenseKey = import.meta.env.VITE_PRIME_UI_LICENSE_KEY;

createApp(App)
    .use(i18n)
    .use(PrimeVue, {
        theme: { preset: Material },
        ripple: true,
        license: primeUiLicenseKey
    })
    .use(router)
    .use(pinia)
    .component('pv-button', Button)
    .component('pv-select-button', SelectButton)
    .mount('#app')
