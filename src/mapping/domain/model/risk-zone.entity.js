/** Geographical risk polygon rendered on the map.
* @class RiskZone */
export class RiskZone {
/** Creates a risk zone polygon entity.
* @param {Object} params - Risk zone fields. */
    constructor({ id, name, riskLevel, bounds } = {}) {
        this.id = id;
        this.name = name;
        this.riskLevel = ['low', 'medium', 'high'].includes(riskLevel) ? riskLevel : null;
        this.bounds = Array.isArray(bounds) && bounds.every(point => Array.isArray(point) && point.length >= 2
            && Number.isFinite(point[0]) && Math.abs(point[0]) <= 180
            && Number.isFinite(point[1]) && Math.abs(point[1]) <= 90)
            ? bounds.map(point => [point[0], point[1]]) : [];
        if (this.bounds.length >= 3 && this.bounds[0].some((value, index) => value !== this.bounds.at(-1)[index])) {
            this.bounds.push([...this.bounds[0]]);
        }
    }

    get hasGeometry() {
        if (this.bounds.length < 4) return false;
        const area = this.bounds.slice(1).reduce((sum, point, index) =>
            sum + this.bounds[index][0] * point[1] - point[0] * this.bounds[index][1], 0);
        return Math.abs(area) > 1e-12;
    }

    /** Inclusive point-in-polygon test; supports nonrectangular zone boundaries. */
    containsLocation(location) {
        if (!this.hasGeometry || !Number.isFinite(location?.latitude) || !Number.isFinite(location?.longitude)) return false;
        const x = location.longitude, y = location.latitude;
        let inside = false;
        for (let i = 0; i < this.bounds.length - 1; i++) {
            const [ax, ay] = this.bounds[i], [bx, by] = this.bounds[i + 1];
            const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax);
            if (Math.abs(cross) < 1e-12 && x >= Math.min(ax, bx) && x <= Math.max(ax, bx)
                && y >= Math.min(ay, by) && y <= Math.max(ay, by)) return true;
            if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
        }
        return inside;
    }
}
