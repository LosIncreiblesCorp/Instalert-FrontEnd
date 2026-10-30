// Category codes in the geographical projection contract, aligned with Alert.
// These are incident categories, not the Alert record kinds (panic, past incident, etc.).
export const IncidentCategory = Object.freeze({
    ROBBERY: 'robbery',
    ATTEMPTED_ROBBERY: 'attemptedRobbery',
    ASSAULT: 'assault',
    EXTORTION: 'extortion',
    VANDALISM: 'vandalism',
    PERSON: 'person',
    VEHICLE: 'vehicle',
    UNUSUAL_BEHAVIOR: 'unusualBehavior',
    SURVEILLANCE: 'surveillance',
    LOW_LIGHTING: 'lowLighting',
    POLICE_PRESENCE: 'policePresence',
    ROAD_BLOCKAGE: 'roadBlockage',
    OTHER: 'other',
});

/** Reported incident marker plotted on the risk map.
* @class IncidentMarker */
export class IncidentMarker {
/** Creates an incident marker entity.
* @param {Object} params - Incident marker fields. */
    constructor({ id, title, description, type, status, latitude, longitude, reportedAt }) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.type = type;
        this.status = status;
        this.latitude = latitude;
        this.longitude = longitude;
        this.reportedAt = reportedAt == null ? null : new Date(reportedAt);
    }

    get hasLocation() {
        return Number.isFinite(this.latitude) && Math.abs(this.latitude) <= 90
            && Number.isFinite(this.longitude) && Math.abs(this.longitude) <= 180;
    }

    matchesFilters({ category = 'all', since = null, until = null } = {}) {
        if (category !== 'all' && this.type !== category) return false;
        const timestamp = this.reportedAt?.getTime();
        if (since !== null && (!Number.isFinite(timestamp) || timestamp < since)) return false;
        if (until !== null && (!Number.isFinite(timestamp) || timestamp > until)) return false;
        return true;
    }
}
