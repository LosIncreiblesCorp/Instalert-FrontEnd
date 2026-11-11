// Single place for Payments display formatting.
export const USD_CURRENCY = 'USD';

/** Prices retain the currency provided by the server catalog. */
export function planPrice(plan, currency = 'USD') {
    return plan.currency === currency ? plan.price : null;
}

function localeTag(locale) {
    return locale === "es" ? "es-PE" : "en-US";
}

/** Formats an amount as currency. @param {number} amount - Amount to format. @param {string} currency - Currency code. @param {string} locale - Locale code. @returns {string} Formatted amount. */
export function formatMoney(amount, currency = USD_CURRENCY, locale = "es") {
    return new Intl.NumberFormat(localeTag(locale), {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
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
