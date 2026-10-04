import { Invoice } from "../domain/model/invoice.entity.js";

export class InvoiceAssembler {
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

    static toDomainList(dtos) {
        return (dtos ?? []).map((dto) => this.toDomain(dto));
    }
}
