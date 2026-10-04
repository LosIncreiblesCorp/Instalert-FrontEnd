export class BusinessLocation {
    constructor({ id, name, address, isVerified, latitude, longitude }) {
        this.id = id;
        this.name = name;
        this.address = address;
        this.isVerified = isVerified;
        this.latitude = latitude;
        this.longitude = longitude;
    }
}
