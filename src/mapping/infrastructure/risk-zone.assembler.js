import { RiskZone } from "../domain/model/risk-zone.entity.js";

export class RiskZoneAssembler {
    static toDomain(dto) {
        return new RiskZone({
            id: dto.id,
            name: dto.name,
            riskLevel: dto.riskLevel,
            bounds: dto.bounds
        });
    }

    static toDomainList(dtos) {
        return dtos.map(dto => this.toDomain(dto));
    }
}
