// Single place for Payments display formatting.
// Catalog conversion uses the agreed fixed prices, not a live exchange rate.

export const PEN_CURRENCY = "PEN";

const ANNUAL_MONTHS = 12;
const ANNUAL_DISCOUNT = 0.8;
const CATALOG_USD_PER_SOL = 15 / 50;

export function annualPrice(monthly) {
    return Math.round((monthly ?? 0) * ANNUAL_MONTHS * ANNUAL_DISCOUNT);
}

export function planPrice(plan, currency = PEN_CURRENCY, billingCycle = "monthly") {
    const monthly = currency === "USD"
        ? (plan.priceUsd ?? (plan.price ?? 0) * CATALOG_USD_PER_SOL)
        : (plan.price ?? 0);
    return billingCycle === "annual" ? annualPrice(monthly) : monthly;
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
