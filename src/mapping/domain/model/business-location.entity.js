/** Registered business shown on the risk map.
* @class BusinessLocation */
export class BusinessLocation {
/** Creates a business location marker.
* @param {Object} params - Business location fields. */
    constructor({ id, name, address, isVerified, latitude, longitude }) {
        this.id = id;
        this.name = name;
        this.address = address;
        this.isVerified = isVerified;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    get hasLocation() {
        return Number.isFinite(this.latitude) && Math.abs(this.latitude) <= 90
            && Number.isFinite(this.longitude) && Math.abs(this.longitude) <= 180;
    }
}
