import { IncidentMarker } from "../domain/model/incident-marker.entity.js";

export class IncidentMarkerAssembler {
    static toDomain(dto) {
        return new IncidentMarker({
            id: dto.id,
            title: dto.title,
            description: dto.description,
            type: dto.type,
            status: dto.status,
            latitude: dto.latitude,
            longitude: dto.longitude,
            reportedAt: dto.reportedAt
        });
    }

    static toDomainList(dtos) {
        return dtos.map(dto => this.toDomain(dto));
    }
}
