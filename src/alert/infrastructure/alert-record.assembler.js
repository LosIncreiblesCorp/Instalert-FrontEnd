import { AlertRecord } from '../domain/model/alert-record.entity.js';

/** Maps server facts and sends only editable report details. */
export class AlertRecordAssembler {
    static toEntityFromResource(resource) {
        if (!resource || typeof resource.id !== 'string' || typeof resource.businessId !== 'string'
            || typeof resource.employeeId !== 'string' || !['panic', 'past-incident', 'suspicious-activity', 'other-situation'].includes(resource.kind)
            || !['active', 'resolved', 'submitted'].includes(resource.status)) throw new Error('alerts.workflow.errors.invalidResponse');
        return new AlertRecord(resource);
    }
    static toEntitiesFromResponse(response) {
        if (!Array.isArray(response.data)) throw new Error('alerts.workflow.errors.invalidResponse');
        return response.data.map(resource => this.toEntityFromResource(resource));
    }
    static toEntityFromResponse(response) { return this.toEntityFromResource(response.data); }
    static toReportDetails(record) {
        const { category, description, location, latitude, longitude, moment } = record;
        return { category, description, location, latitude, longitude, moment: moment || null };
    }
}
