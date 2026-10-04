import { RiskZone } from "../domain/model/risk-zone.entity.js";

/** Maps risk zone resources to domain entities.
* @class RiskZoneAssembler */
export class RiskZoneAssembler {
/** Converts one resource into a domain entity.
* @param {Object} dto - Risk zone resource.
* @returns {import('../domain/model/risk-zone.entity.js').RiskZone} Mapped entity. */
    static toDomain(dto) {
        return new RiskZone({
            id: dto.id,
            name: dto.name,
            riskLevel: dto.riskLevel,
            bounds: dto.bounds
        });
    }

/** Converts a resource list into domain entities.
* @param {Array<Object>} dtos - Risk zone resources.
* @returns {Array<import('../domain/model/risk-zone.entity.js').RiskZone>} Mapped entities. */
    static toDomainList(dtos) {
        return dtos.map(dto => this.toDomain(dto));
    }
}
