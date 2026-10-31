import { BaseApi } from "../../shared/infrastructure/base-api.js";
import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";

/**
 * @typedef {Object} BusinessSeatUsageSnapshot
 * @property {number} activeEmployees - Active operational memberships; excludes administrators.
 * @property {number} reservedSeats - Pending invitations reserving a seat.
 */

export class PaymentsApi {
    constructor() {
        const baseApi = new BaseApi();
        this.plansEndpoint = new BaseEndpoint(baseApi, import.meta.env.VITE_PLANS_ENDPOINT_PATH);
        this.subscriptionsEndpoint = new BaseEndpoint(baseApi, import.meta.env.VITE_SUBSCRIPTIONS_ENDPOINT_PATH);
        this.paymentMethodsEndpoint = new BaseEndpoint(baseApi, import.meta.env.VITE_PAYMENT_METHODS_ENDPOINT_PATH);
        this.membersEndpoint = new BaseEndpoint(baseApi, import.meta.env.VITE_BUSINESS_MEMBERS_ENDPOINT_PATH);
        this.invitationsEndpoint = new BaseEndpoint(baseApi, import.meta.env.VITE_STAFF_INVITATIONS_ENDPOINT_PATH);
        this.invoicesEndpoint = new BaseEndpoint(baseApi, import.meta.env.VITE_INVOICES_ENDPOINT_PATH);
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

    /**
     * Builds the frontend seat-usage projection from mock Business resources.
     * @param {string|number} businessId - Commerce identifier.
     * @returns {Promise<BusinessSeatUsageSnapshot>} Counts consumed by Payments without a Business store dependency.
     */
    async getSeatUsage(businessId) {
        const http = this.subscriptionsEndpoint.http;
        const [membersResponse, invitationsResponse] = await Promise.all([
            http.get(this.membersEndpoint.endpointPath, { params: { businessId } }),
            http.get(this.invitationsEndpoint.endpointPath, { params: { businessId } })
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
