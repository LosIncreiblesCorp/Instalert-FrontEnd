/** PayPal Sandbox subscription approval adapter. No server credentials belong here. */
let sdkPromise;

export function isPayPalConfigured() {
    return import.meta.env.VITE_PAYPAL_ENVIRONMENT === 'sandbox'
        && Boolean(import.meta.env.VITE_PAYPAL_CLIENT_ID?.trim());
}

/** Loads the subscription SDK once; failed loads can be retried. */
export function loadPayPalSdk() {
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
        const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID?.trim();
        if (!clientId || import.meta.env.VITE_PAYPAL_ENVIRONMENT !== 'sandbox') {
            reject(new Error('PayPal Sandbox is not configured.'));
            return;
        }
        const script = document.createElement('script');
        const url = new URL('https://www.paypal.com/sdk/js');
        url.search = new URLSearchParams({
            'client-id': clientId, components: 'buttons', currency: 'USD',
            intent: 'subscription', vault: 'true'
        }).toString();
        script.src = url.toString();
        script.async = true;
        script.dataset.namespace = 'instalertPayPal';
        const timer = setTimeout(() => fail(), 20000);
        function fail() {
            clearTimeout(timer);
            script.remove();
            reject(new Error('Unable to load PayPal Sandbox.'));
        }
        script.onerror = fail;
        script.onload = () => {
            clearTimeout(timer);
            if (!window.instalertPayPal?.Buttons) return fail();
            resolve(window.instalertPayPal);
        };
        document.head.appendChild(script);
    }).catch(error => {
        sdkPromise = undefined;
        throw error;
    });
    return sdkPromise;
}


/** The backend supplies the provider plan and correlation for each checkout. */
export async function createPayPalButtons({ getCheckout, beforeApprove, onApproved, onCancel, onError, isCurrent }) {
    if (!isPayPalConfigured()) throw new Error('Missing PayPal Sandbox configuration.');
    const sdk = await loadPayPalSdk();
    let checkout;
    return sdk.Buttons({
        fundingSource: sdk.FUNDING.PAYPAL,
        style: { layout: 'vertical', label: 'subscribe' },
        onClick: async (_data, actions) => {
            try { return isCurrent() && await beforeApprove() ? actions.resolve() : actions.reject(); }
            catch { if (isCurrent()) onError(); return actions.reject(); }
        },
        createSubscription: async (_data, actions) => {
            checkout = await getCheckout();
            if (!isCurrent()) throw new Error('The selected account changed.');
            return checkout.subscriptionId
                ? actions.subscription.revise(checkout.subscriptionId, { plan_id: checkout.paypalPlanId })
                : actions.subscription.create({ plan_id: checkout.paypalPlanId, custom_id: checkout.customId });
        },
        onApprove: async data => {
            if (!isCurrent()) return;
            if (!checkout || !data.subscriptionID) return onError();
            return onApproved({ providerSubscriptionId: data.subscriptionID, checkoutId: checkout.checkoutId });
        },
        onCancel: () => { if (isCurrent()) onCancel(); },
        onError: () => { if (isCurrent()) onError(); },
    });
}
