import {createI18n} from "vue-i18n";
import en from "./locales/en.json";
import es from "./locales/es.json";

export const supportedLocales = ["en", "es"];
export const localeStorageKey = "instalert-locale";

function getInitialLocale() {
    try {
        const savedLocale = window.localStorage.getItem(localeStorageKey);
        return supportedLocales.includes(savedLocale) ? savedLocale : "en";
    } catch {
        return "en";
    }
}

export const i18n = createI18n({
    legacy: false,
    locale: getInitialLocale(),
    fallbackLocale: 'en',
    messages: { en, es }
});

export default i18n;
