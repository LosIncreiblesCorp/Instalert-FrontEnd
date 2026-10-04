/** Verified business shown on the risk map.
* @class BusinessLocation */
export class BusinessLocation {
/** Creates a verified business location marker.
* @param {Object} params - Business location fields. */
    constructor({ id, name, address, isVerified, latitude, longitude }) {
        this.id = id;
        this.name = name;
        this.address = address;
        this.isVerified = isVerified;
        this.latitude = latitude;
        this.longitude = longitude;
    }
}
