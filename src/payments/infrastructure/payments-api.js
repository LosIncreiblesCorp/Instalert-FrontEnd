export class PaymentsApi {
    constructor() {
        const baseApi = new BaseApi();
        this.plansEndpoint = new BaseEndpoint(baseApi, "plans");
        this.subscriptionsEndpoint = new BaseEndpoint(baseApi, "subscriptions");
        this.paymentMethodsEndpoint = new BaseEndpoint(baseApi, "payment-methods");
    }

    getPlans() {
        return this.plansEndpoint.getAll();
    }

    getSubscriptionById(id) {
        return this.subscriptionsEndpoint.getById(id);
    }

    updateSubscription(id, resource) {
        return this.subscriptionsEndpoint.update(id, resource);
    }
}