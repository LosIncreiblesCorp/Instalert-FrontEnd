import { IncidentCategory, IncidentMarker } from "../domain/model/incident-marker.entity.js";

const legacyIncidentTypes = Object.freeze({
    'Asalto a Mano Armada': IncidentCategory.ASSAULT,
    'Hurto Sistemico': IncidentCategory.ROBBERY,
    'Sospechoso Merodeando': IncidentCategory.PERSON,
    'Vandalismo': IncidentCategory.VANDALISM,
});

/** Maps incident resources to domain entities, normalizing legacy categories.
* @class IncidentMarkerAssembler */
export class IncidentMarkerAssembler {
/** Converts one resource into a domain entity.
* @param {Object} dto - Incident resource.
* @returns {IncidentMarker} Mapped entity. */
    static toDomain(dto) {
        if (!dto || !['string', 'number'].includes(typeof dto.id) || String(dto.id).trim() === '' || (typeof dto.id === 'number' && !Number.isFinite(dto.id))) throw new Error('Invalid geographical resource.');
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

/** Converts a resource list into domain entities.
* @param {Array<Object>} dtos - Incident resources.
* @returns {IncidentMarker[]} Mapped entities. */
    static toDomainList(dtos) {
        if (!Array.isArray(dtos)) throw new Error('Invalid geographical collection.');
        return dtos.map(dto => this.toDomain(dto));
    }
}
