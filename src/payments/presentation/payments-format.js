// Single place for Payments display formatting.
// Catalog conversion uses the agreed fixed prices, not a live exchange rate.

export const PEN_CURRENCY = "PEN";

const CATALOG_USD_PER_SOL = 15 / 50;

/** Resolves the monthly display price for a plan. @param {Object} plan - Plan entity. @param {string} currency - Currency code. @returns {number} Display price. */
export function planPrice(plan, currency = PEN_CURRENCY) {
    return currency === "USD"
        ? (plan.priceUsd ?? (plan.price ?? 0) * CATALOG_USD_PER_SOL)
        : (plan.price ?? 0);
}

function localeTag(locale) {
    return locale === "es" ? "es-PE" : "en-US";
}

/** Formats an amount as currency. @param {number} amount - Amount to format. @param {string} currency - Currency code. @param {string} locale - Locale code. @returns {string} Formatted amount. */
export function formatMoney(amount, currency = PEN_CURRENCY, locale = "es") {
    return new Intl.NumberFormat(localeTag(locale), {
        style: "currency",
        currency,
        maximumFractionDigits: 0
    }).format(amount ?? 0);
}

/** Formats an ISO date for display. @param {string} iso - ISO date string. @param {string} locale - Locale code. @returns {string} Formatted date. */
export function formatDate(iso, locale = "es") {
    if (!iso) return "";
    return new Intl.DateTimeFormat(localeTag(locale), {
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(new Date(iso));
}
