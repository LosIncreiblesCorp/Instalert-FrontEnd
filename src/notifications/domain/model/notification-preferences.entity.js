export const receptionRadiiMeters = Object.freeze([100, 500, 1000]);

/** User delivery preferences. General language preferences belong to Profiles. */
export class NotificationPreferences {
    constructor({ userId, businessId, nearbyAlertsEnabled = true, nearbyRadiusMeters = 500, updatedAt = null } = {}) {
        this.userId = userId;
        this.businessId = businessId;
        this.nearbyAlertsEnabled = nearbyAlertsEnabled;
        this.nearbyRadiusMeters = nearbyRadiusMeters;
        this.updatedAt = updatedAt;
    }

    get isValid() {
        return typeof this.nearbyAlertsEnabled === 'boolean' && receptionRadiiMeters.includes(this.nearbyRadiusMeters);
    }

    allowsNearbyAlert(distanceMeters) {
        return this.isValid && this.nearbyAlertsEnabled && Number.isFinite(distanceMeters)
            && distanceMeters >= 0 && distanceMeters <= this.nearbyRadiusMeters;
    }
}
