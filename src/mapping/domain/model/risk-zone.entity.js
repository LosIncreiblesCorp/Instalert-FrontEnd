/** Geographical risk polygon rendered on the map.
* @class RiskZone */
export class RiskZone {
/** Creates a risk zone polygon entity.
* @param {Object} params - Risk zone fields. */
    constructor({ id, name, riskLevel, bounds }) {
        this.id = id;
        this.name = name;
        this.riskLevel = riskLevel;
        this.bounds = bounds;
    }
}
