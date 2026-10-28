/** PayPal Sandbox subscription approval adapter. No server credentials belong here. */
let sdkPromise;

const planIds = {
    'demo-basic': import.meta.env.VITE_PAYPAL_ESSENTIAL_MONTHLY_PLAN_ID,
    'demo-standard': import.meta.env.VITE_PAYPAL_PROFESSIONAL_MONTHLY_PLAN_ID,
    'demo-extended': import.meta.env.VITE_PAYPAL_BUSINESS_MONTHLY_PLAN_ID
};

export function paypalPlanId(planId) {
    return planIds[planId]?.trim() ?? '';
}

export function isPayPalConfigured(planId) {
    return import.meta.env.VITE_PAYPAL_ENVIRONMENT === 'sandbox'
        && Boolean(import.meta.env.VITE_PAYPAL_CLIENT_ID?.trim())
        && Boolean(paypalPlanId(planId));
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
        const url = new URL('https://www.sandbox.paypal.com/sdk/js');
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

/** Adapts SDK callbacks to application callbacks without treating approval as payment verification. */
export async function createPayPalButtons({ planId, beforeApprove, onApproved, onCancel, onError, onBusy }) {
    if (!isPayPalConfigured(planId)) throw new Error('Missing PayPal Sandbox plan configuration.');
    const sdk = await loadPayPalSdk();
    return sdk.Buttons({
        fundingSource: sdk.FUNDING.PAYPAL,
        style: { layout: 'vertical', label: 'subscribe' },
        onClick: async (_data, actions) => {
            try {
                return await beforeApprove() ? actions.resolve() : actions.reject();
            } catch {
                onError();
                return actions.reject();
            }
        },
        createSubscription: (_data, actions) => {
            onBusy(true);
            return actions.subscription.create({ plan_id: paypalPlanId(planId) });
        },
        onApprove: data => {
            onBusy(false);
            if (!data.subscriptionID) return onError();
            return onApproved({ providerSubscriptionId: data.subscriptionID, planId });
        },
        onCancel: () => { onBusy(false); onCancel(); },
        onError: () => { onBusy(false); onError(); }
    });
}
