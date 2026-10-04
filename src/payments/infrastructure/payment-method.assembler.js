import { PaymentMethod } from "../domain/model/payment-method.entity.js";

/** Maps payment method API resources to domain entities. @class PaymentMethodAssembler */
export class PaymentMethodAssembler {
    /** Converts a payment method DTO to domain. @param {Object} dto - Payment method resource. @returns {import('../domain/model/payment-method.entity.js').PaymentMethod} Domain payment method. */
    static toDomain(dto) {
        return new PaymentMethod({
            brand: dto.brand,
            last4: dto.last4,
            holderName: dto.holderName,
            expiry: dto.expiry
        });
    }
}
