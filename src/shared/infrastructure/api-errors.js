import i18n from '../../i18n.js';

/** Retains the original HTTP response for module-specific validation. */
export function normalizeApiError(error) {
    const status = error.response?.status;
    const problem = error.response?.data;
    const code = typeof problem?.code === 'string' ? problem.code : null;
    const messages = { 400: 'validation', 401: 'unauthenticated', 403: 'forbidden', 404: 'notFound', 405: 'notFound', 409: 'conflict', 429: 'busy', 502: 'unavailable', 503: 'unavailable', 504: 'timeout' };
    const kind = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' ? 'timeout'
        : !error.response ? 'unavailable' : messages[status] ?? 'unexpected';
    const fields = problem?.errors && typeof problem.errors === 'object' && !Array.isArray(problem.errors)
        ? Object.fromEntries(Object.entries(problem.errors).filter(([, value]) => Array.isArray(value) && value.every(item => typeof item === 'string'))) : {};
    error.apiError = { status: status ?? null, code, field: typeof problem?.field === 'string' ? problem.field : null,
        fieldErrors: fields, messageKey: 'api.errors.' + kind };
    error.userMessage = getApiErrorMessage(error);
    return error;
}

export function getApiErrorMessage(error) {
    return i18n.global.t(error?.apiError?.messageKey ?? 'api.errors.unexpected');
}
