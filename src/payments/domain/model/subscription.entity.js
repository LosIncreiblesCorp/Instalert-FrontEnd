/** Business subscription to a plan. @class Subscription */
export class Subscription {
    /** Creates a subscription entity. @param {Object} params - Subscription attributes. */
    constructor({ id, businessId, planId, status, currentPeriodEnd, cancelAtPeriodEnd, maxEmployees }) {
        this.id = id;
        this.businessId = businessId;
        this.planId = planId;
        this.status = status;
        this.currentPeriodEnd = currentPeriodEnd;
        this.cancelAtPeriodEnd = cancelAtPeriodEnd ?? false;
        this.maxEmployees = maxEmployees;
    }

    get isActive() {
        return this.status === 'active';
    }
}
