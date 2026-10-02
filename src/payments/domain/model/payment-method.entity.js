export class PaymentMethod {
    constructor({ brand, last4, holderName, expiry }) {
        this.brand = brand;
        this.last4 = last4;
        this.holderName = holderName;
        this.expiry = expiry;
    }
}
