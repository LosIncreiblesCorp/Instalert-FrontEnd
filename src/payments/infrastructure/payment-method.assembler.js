import { PaymentMethod } from "../domain/model/payment-method.entity.js";

export class PaymentMethodAssembler {
    static toDomain(dto) {
        return new PaymentMethod({
            brand: dto.brand,
            last4: dto.last4,
            holderName: dto.holderName,
            expiry: dto.expiry
        });
    }
}
