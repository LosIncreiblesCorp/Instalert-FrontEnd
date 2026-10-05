/** Saved payment method showing only the last 4 digits. @class PaymentMethod */
export class PaymentMethod {
    /** Creates a payment method value object. @param {Object} params - Payment method attributes. */
    constructor({ brand, last4, holderName, expiry }) {
        this.brand = brand;
        this.last4 = last4;
        this.holderName = holderName;
        this.expiry = expiry;
    }
}
