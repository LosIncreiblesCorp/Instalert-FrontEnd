import { Invoice } from "../domain/model/invoice.entity.js";

/** Maps invoice API resources to domain entities. @class InvoiceAssembler */
export class InvoiceAssembler {
    /** Converts an invoice DTO to domain. @param {Object} dto - Invoice resource. @returns {import('../domain/model/invoice.entity.js').Invoice} Domain invoice. */
    static toDomain(dto) {
        return new Invoice({
            id: dto.id,
            folio: dto.folio,
            issuedAt: dto.issuedAt,
            amount: dto.amount,
            currency: dto.currency,
            status: dto.status
        });
    }

    /** Converts an invoice DTO list to domain. @param {Array<Object>} dtos - Invoice resources. @returns {Array<import('../domain/model/invoice.entity.js').Invoice>} Domain invoices. */
    static toDomainList(dtos) {
        return (dtos ?? []).map((dto) => this.toDomain(dto));
    }
}
