import { BaseApi } from '../../shared/infrastructure/base-api.js';
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js';

/** Replaceable HTTP adapter. Payments data is consumed as resources, not private entities. */
export class BusinessApi extends BaseApi {
    constructor() {
        super();
        this.membersEndpoint = new BaseEndpoint(this, import.meta.env.VITE_BUSINESS_MEMBERS_ENDPOINT_PATH || 'business-members');
        this.invitationsEndpoint = new BaseEndpoint(this, import.meta.env.VITE_STAFF_INVITATIONS_ENDPOINT_PATH || 'staff-invitations');
        this.plansEndpoint = new BaseEndpoint(this, 'plans');
        this.subscriptionsEndpoint = new BaseEndpoint(this, 'subscriptions');
    }

    getMembers(businessId) { return this.http.get(this.membersEndpoint.endpointPath, { params: { businessId } }); }
    getInvitations(businessId) { return this.http.get(this.invitationsEndpoint.endpointPath, { params: { businessId } }); }
    createInvitation(resource) { return this.invitationsEndpoint.create(resource); }
    updateInvitation(resource) { return this.invitationsEndpoint.update(resource.id, resource); }
    deleteInvitation(id) { return this.invitationsEndpoint.delete(id); }
    updateMember(resource) { return this.membersEndpoint.update(resource.id, resource); }
    deleteMember(id) { return this.membersEndpoint.delete(id); }

    /** Proposed PlanLimits contract, backed by mock Payments resources for this delivery. */
    async getPlanLimits(businessId) {
        const response = await this.http.get(this.subscriptionsEndpoint.endpointPath, { params: { businessId } });
        const subscriptions = Array.isArray(response.data) ? response.data : response.data?.subscriptions;
        if (!Array.isArray(subscriptions)) throw new Error('business.errors.limitsUnavailable');
        const active = subscriptions.filter(subscription => String(subscription.businessId) === String(businessId)
            && subscription.status === 'active');
        if (active.length > 1) throw new Error('business.errors.limitsUnavailable');
        if (!active.length) return { maxEmployees: 0, planName: null, subscriptionActive: false };
        const planResponse = await this.plansEndpoint.getById(active[0].planId);
        const plan = planResponse.data;
        if (!Number.isInteger(plan.maxEmployees) || plan.maxEmployees < 0) throw new Error('business.errors.limitsUnavailable');
        return { maxEmployees: plan.maxEmployees, planName: plan.name, subscriptionActive: true };
    }
}
