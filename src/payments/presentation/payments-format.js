// Single place for Payments display formatting.
// Catalog conversion uses the agreed fixed prices, not a live exchange rate.

export const PEN_CURRENCY = "PEN";

const ANNUAL_MONTHS = 12;
const ANNUAL_DISCOUNT = 0.8;
const CATALOG_USD_PER_SOL = 15 / 50;

/** Computes the discounted annual price from a monthly amount. @param {number} monthly - Monthly price. @returns {number} Annual price. */
export function annualPrice(monthly) {
    return Math.round((monthly ?? 0) * ANNUAL_MONTHS * ANNUAL_DISCOUNT);
}

/** Resolves the display price for a plan and billing cycle. @param {Object} plan - Plan entity. @param {string} currency - Currency code. @param {string} billingCycle - Billing cycle. @returns {number} Display price. */
export function planPrice(plan, currency = PEN_CURRENCY, billingCycle = "monthly") {
    const monthly = currency === "USD"
        ? (plan.priceUsd ?? (plan.price ?? 0) * CATALOG_USD_PER_SOL)
        : (plan.price ?? 0);
    return billingCycle === "annual" ? annualPrice(monthly) : monthly;
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
