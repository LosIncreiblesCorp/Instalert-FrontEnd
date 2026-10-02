export class Plan {
    constructor({ id, name, price, currency, billingCycle, maxEmployees, features }) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.currency = currency;
        this.billingCycle = billingCycle;
        this.maxEmployees = maxEmployees;
        this.features = features ?? [];
    }
}
