/** Subscription plan offered in the catalog. @class Plan */
export class Plan {
    /** Creates a plan value object. @param {Object} params - Plan attributes. */
    constructor({ id, name, price, priceUsd, currency, billingCycle, maxEmployees, features }) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.priceUsd = priceUsd;
        this.currency = currency;
        this.billingCycle = billingCycle;
        this.maxEmployees = maxEmployees;
        this.features = features ?? [];
    }
}
