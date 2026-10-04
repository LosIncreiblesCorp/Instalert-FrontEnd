/** Billing invoice issued for a subscription period. @class Invoice */
export class Invoice {
    /** Creates an invoice value object. @param {Object} params - Invoice attributes. */
    constructor({ id, folio, issuedAt, amount, currency, status }) {
        this.id = id;
        this.folio = folio;
        this.issuedAt = issuedAt;
        this.amount = amount;
        this.currency = currency;
        this.status = status;
    }
}
