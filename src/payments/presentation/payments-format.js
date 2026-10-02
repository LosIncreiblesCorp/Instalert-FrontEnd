// Single place for Payments display formatting.
// Amounts and catalog prices are simulated (PEN); no real charge.

export const PEN_CURRENCY = "PEN";

const ANNUAL_MONTHS = 12;
const ANNUAL_DISCOUNT = 0.8;

export function annualPrice(monthly) {
    return Math.round((monthly ?? 0) * ANNUAL_MONTHS * ANNUAL_DISCOUNT);
}

function localeTag(locale) {
    return locale === "es" ? "es-PE" : "en-US";
}

export function formatMoney(amount, currency = PEN_CURRENCY, locale = "es") {
    return new Intl.NumberFormat(localeTag(locale), {
        style: "currency",
        currency,
        maximumFractionDigits: 0
    }).format(amount ?? 0);
}

export function formatDate(iso, locale = "es") {
    if (!iso) return "";
    return new Intl.DateTimeFormat(localeTag(locale), {
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(new Date(iso));
}
