import { BusinessLocation } from "../domain/model/business-location.entity.js";

export class BusinessLocationAssembler {
    static toDomain(dto) {
        return new BusinessLocation({
            id: dto.id,
            name: dto.name,
            address: dto.address,
            isVerified: dto.isVerified,
            latitude: dto.latitude,
            longitude: dto.longitude
        });
    }

    static toDomainList(dtos) {
        return dtos.map(dto => this.toDomain(dto));
    }
}
