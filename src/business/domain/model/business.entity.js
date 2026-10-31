/** Business profile owned by Business; coordinates are consumed by map projections. */
export class Business {
  constructor({ id = null, taxId = '', name = '', address = '', latitude = null,
    longitude = null, isVerified = false, createdAt = null, updatedAt = null } = {}) {
    Object.assign(this, { id, latitude, longitude, isVerified, createdAt, updatedAt });
    this.taxId = typeof taxId === 'string' ? taxId.trim() : '';
    this.name = typeof name === 'string' ? name.trim() : '';
    this.address = typeof address === 'string' ? address.trim() : '';
  }

  get validationErrors() {
    const errors = {};
    if (!/^\d{11}$/.test(this.taxId)) errors.taxId = 'business.profile.taxIdInvalid';
    if (!this.name || this.name.length > 150) errors.name = 'business.profile.nameInvalid';
    if (!this.address || this.address.length > 250) errors.address = 'business.profile.addressInvalid';
    if (!Number.isFinite(this.latitude) || this.latitude < -90 || this.latitude > 90
      || !Number.isFinite(this.longitude) || this.longitude < -180 || this.longitude > 180) {
      errors.location = 'business.profile.locationRequired';
    }
    return errors;
  }

  validate() {
    const firstError = Object.values(this.validationErrors)[0];
    if (firstError) throw new Error(firstError);
    return this;
  }
}
