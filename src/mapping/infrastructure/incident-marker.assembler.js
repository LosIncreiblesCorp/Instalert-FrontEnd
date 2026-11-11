import { IncidentMarker } from '../domain/model/incident-marker.entity.js';

export class IncidentMarkerAssembler {
    static toDomain(dto) {
        if (!dto || typeof dto.id !== 'string' || !dto.id || typeof dto.type !== 'string'
            || typeof dto.category !== 'string' || typeof dto.businessId !== 'string') throw new Error('Invalid incident resource.');
        return new IncidentMarker({ id: dto.id, businessId: dto.businessId, title: dto.title, description: dto.description,
            type: dto.type, category: dto.category, status: dto.status, latitude: dto.latitude,
            longitude: dto.longitude, reportedAt: dto.reportedAt });
    }
    static toDomainList(dtos) {
        if (!Array.isArray(dtos)) throw new Error('Invalid incident collection.');
        return dtos.map(dto => this.toDomain(dto));
    }
}
