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
        this.reportedAt = new Date(reportedAt);
    }
}
