import { Business } from '../domain/model/business.entity.js';

/** Maps the business resource without importing Mapping's internal models. */
export class BusinessAssembler {
  static toEntityFromResource(resource) {
    if (!resource || typeof resource !== 'object' || resource.id == null) {
      throw new Error('business.profile.loadError');
    }
    return new Business(resource);
  }

  static toResourceFromEntity(entity) {
    const { taxId, name, address, latitude, longitude } = entity;
    return { taxId, name, address, latitude, longitude };
  }

  static toProfileChanges(entity) {
    const { name, address, latitude, longitude } = entity;
    return { name, address, latitude, longitude };
  }
}
