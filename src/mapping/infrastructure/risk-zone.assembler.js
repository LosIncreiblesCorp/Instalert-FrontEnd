import { RiskZone } from "../domain/model/risk-zone.entity.js";

/** Maps risk zone resources to domain entities.
* @class RiskZoneAssembler */
export class RiskZoneAssembler {
/** Converts one resource into a domain entity.
* @param {Object} dto - Risk zone resource.
* @returns {import('../domain/model/risk-zone.entity.js').RiskZone} Mapped entity. */
    static toDomain(dto) {
        if (!dto || !['string', 'number'].includes(typeof dto.id) || String(dto.id).trim() === '' || (typeof dto.id === 'number' && !Number.isFinite(dto.id))) throw new Error('Invalid geographical resource.');
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
        if (!Array.isArray(dtos)) throw new Error('Invalid geographical collection.');
        return dtos.map(dto => this.toDomain(dto));
    }
}
