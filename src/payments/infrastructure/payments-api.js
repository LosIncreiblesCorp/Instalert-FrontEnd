import { BaseApi } from "../../shared/infrastructure/base-api.js";
import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";

export class PaymentsApi {
    constructor() {
        const baseApi = new BaseApi();
        this.plansEndpoint = new BaseEndpoint(baseApi, "plans");
        this.subscriptionsEndpoint = new BaseEndpoint(baseApi, "subscriptions");
        this.paymentMethodsEndpoint = new BaseEndpoint(baseApi, "payment-methods");
        this.invoicesEndpoint = new BaseEndpoint(baseApi, "invoices");
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

    getPaymentMethods() {
        return this.paymentMethodsEndpoint.getAll();
    }

    getInvoices() {
        return this.invoicesEndpoint.getAll();
    }
}
