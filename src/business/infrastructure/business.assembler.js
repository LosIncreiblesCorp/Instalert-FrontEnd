import { Business } from '../domain/model/business.entity.js';

/** Maps the mock business resource without importing Mapping's internal models. */
export class BusinessAssembler {
  static toEntityFromResource(resource) {
    if (!resource || typeof resource !== 'object' || resource.id == null) {
      throw new Error('business.profile.loadError');
    }
    return new Business(resource);
  }

  static toResourceFromEntity(entity) {
    const { id, taxId, name, address, latitude, longitude, isVerified, createdAt, updatedAt } = entity;
    return { ...(id == null ? {} : { id }), taxId, name, address, latitude, longitude,
      isVerified, createdAt, updatedAt };
  }

  static toProfileChanges(entity) {
    const { name, address, latitude, longitude, updatedAt } = entity;
    return { name, address, latitude, longitude, updatedAt };
  }
}
