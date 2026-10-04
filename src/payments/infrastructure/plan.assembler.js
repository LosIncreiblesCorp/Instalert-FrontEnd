import { Plan } from "../domain/model/plan.entity.js";

/** Maps plan API resources to domain entities. @class PlanAssembler */
export class PlanAssembler {
    /** Converts a plan DTO to domain. @param {Object} dto - Plan resource. @returns {import('../domain/model/plan.entity.js').Plan} Domain plan. */
    static toDomain(dto) {
        return new Plan({
            id: dto.id,
            name: dto.name,
            price: dto.price,
            priceUsd: dto.priceUsd,
            currency: dto.currency,
            billingCycle: dto.billingCycle,
            maxEmployees: dto.maxEmployees,
            features: dto.features ?? []
        });
    }

    /** Converts a plan DTO list to domain. @param {Array<Object>} dtos - Plan resources. @returns {Array<import('../domain/model/plan.entity.js').Plan>} Domain plans. */
    static toDomainList(dtos) {
        return (dtos ?? []).map((dto) => this.toDomain(dto));
    }
}
