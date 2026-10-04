export class Invoice {
    constructor({ id, folio, issuedAt, amount, currency, status }) {
        this.id = id;
        this.folio = folio;
        this.issuedAt = issuedAt;
        this.amount = amount;
        this.currency = currency;
        this.status = status;
    }
}
