export class IncidentMarker {
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
