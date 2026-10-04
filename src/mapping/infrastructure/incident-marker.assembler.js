import { IncidentCategory, IncidentMarker } from "../domain/model/incident-marker.entity.js";

const legacyIncidentTypes = Object.freeze({
    'Asalto a Mano Armada': IncidentCategory.ASSAULT,
    'Hurto Sistemico': IncidentCategory.ROBBERY,
    'Sospechoso Merodeando': IncidentCategory.PERSON,
    'Vandalismo': IncidentCategory.VANDALISM,
});

export class IncidentMarkerAssembler {
    static toDomain(dto) {
        const category = dto.category ?? dto.type;
        return new IncidentMarker({
            id: dto.id,
            title: dto.title,
            description: dto.description,
            type: Object.hasOwn(legacyIncidentTypes, category) ? legacyIncidentTypes[category] : category,
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
