import { Invoice } from "../domain/model/invoice.entity.js";

/** Maps invoice API resources to domain entities. @class InvoiceAssembler */
export class InvoiceAssembler {
    /** Converts an invoice DTO to domain. @param {Object} dto - Invoice resource. @returns {import('../domain/model/invoice.entity.js').Invoice} Domain invoice. */
    static toDomain(dto) {
        if (!dto || typeof dto.id !== 'string' || !Number.isFinite(dto.amount) || dto.amount < 0
            || typeof dto.currency !== 'string' || !Number.isFinite(Date.parse(dto.issuedAt))) throw new Error('Invalid payment resource.');
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
        if (!Array.isArray(dtos)) throw new Error('Invalid payment history.');
        return dtos.map((dto) => this.toDomain(dto));
    }
}
