import { BaseApi } from '../../shared/infrastructure/base-api.js';

export class PaymentsApi extends BaseApi {
    subscriptionPath(businessId) { return `businesses/${encodeURIComponent(businessId)}/subscription`; }
    getPlans() { return this.http.get('plans'); }
    getSubscription(businessId) { return this.http.get(this.subscriptionPath(businessId)); }
    getSeatUsage(businessId) { return this.http.get(`businesses/${encodeURIComponent(businessId)}/seats`); }
    getBillingHistory(businessId) { return this.http.get(`businesses/${encodeURIComponent(businessId)}/billing-history`); }
    beginCheckout(businessId, planId, change) {
        return this.http.post(this.subscriptionPath(businessId) + (change ? '/plan-change' : '/checkout'), { planId });
    }
    verify(businessId, approval) {
        return approval.subscriptionId
            ? this.http.post(this.subscriptionPath(businessId) + '/plan-change/verification', { checkoutId: approval.checkoutId })
            : this.http.post(this.subscriptionPath(businessId) + '/verification', {
                checkoutId: approval.checkoutId, subscriptionId: approval.providerSubscriptionId,
            });
    }
    cancel(businessId) { return this.http.post(this.subscriptionPath(businessId) + '/cancellation'); }
}
