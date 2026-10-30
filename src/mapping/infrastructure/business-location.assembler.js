import { BusinessLocation } from "../domain/model/business-location.entity.js";

/** Maps business location resources to domain entities.
* @class BusinessLocationAssembler */
export class BusinessLocationAssembler {
/** Converts one resource into a domain entity.
* @param {Object} dto - Business resource.
* @returns {BusinessLocation} Mapped entity. */
    static toDomain(dto) {
        if (!dto || !['string', 'number'].includes(typeof dto.id) || String(dto.id).trim() === '' || (typeof dto.id === 'number' && !Number.isFinite(dto.id))) throw new Error('Invalid geographical resource.');
        return new BusinessLocation({
            id: dto.id,
            name: dto.name,
            address: dto.address,
            isVerified: dto.isVerified,
            latitude: dto.latitude,
            longitude: dto.longitude
        });
    }

/** Converts a resource list into domain entities.
* @param {Array<Object>} dtos - Business resources.
* @returns {BusinessLocation[]} Mapped entities. */
    static toDomainList(dtos) {
        if (!Array.isArray(dtos)) throw new Error('Invalid geographical collection.');
        return dtos.map(dto => this.toDomain(dto));
    }
}
