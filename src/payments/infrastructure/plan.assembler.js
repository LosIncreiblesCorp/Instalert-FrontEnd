import { Plan } from "../domain/model/plan.entity.js";

export class PlanAssembler {
    static toDomain(dto) {
        return new Plan({
            id: dto.id,
            name: dto.name,
            price: dto.price,
            currency: dto.currency,
            billingCycle: dto.billingCycle,
            maxEmployees: dto.maxEmployees,
            features: dto.features ?? []
        });
    }

    static toDomainList(dtos) {
        return (dtos ?? []).map((dto) => this.toDomain(dto));
    }
}
