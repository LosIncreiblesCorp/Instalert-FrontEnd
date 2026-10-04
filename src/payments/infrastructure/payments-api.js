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

    getSubscriptions(businessId) {
        return this.subscriptionsEndpoint.http.get(this.subscriptionsEndpoint.endpointPath, { params: { businessId } });
    }

    /** Mock projection of the Business seat-usage contract; no private domain imports. */
    async getSeatUsage(businessId) {
        const http = this.subscriptionsEndpoint.http;
        const [membersResponse, invitationsResponse] = await Promise.all([
            http.get('business-members', { params: { businessId } }),
            http.get('staff-invitations', { params: { businessId } })
        ]);
        const members = Array.isArray(membersResponse.data) ? membersResponse.data : membersResponse.data?.members;
        const invitations = Array.isArray(invitationsResponse.data) ? invitationsResponse.data : invitationsResponse.data?.invitations;
        if (!Array.isArray(members) || !Array.isArray(invitations)) throw new Error('Invalid seat usage response');
        const belongsToBusiness = record => String(record.businessId) === String(businessId);
        return {
            activeEmployees: members.filter(member => belongsToBusiness(member)
                && member.role === 'Operative' && member.status === 'active').length,
            reservedSeats: invitations.filter(invitation => belongsToBusiness(invitation) && invitation.status === 'pending').length
        };
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
