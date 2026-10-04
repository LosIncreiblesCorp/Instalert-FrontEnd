import { AlertRecord } from '../domain/model/alert-record.entity.js';

/** Maps Alert API resources to and from domain entities. */
export class AlertRecordAssembler {
    static toEntityFromResource(resource) {
        return new AlertRecord({ ...resource });
    }

    static toEntitiesFromResponse(response) {
        if (response.status < 200 || response.status >= 300) {
            throw new Error(`Alert API returned ${response.status} ${response.statusText}.`);
        }

        const resources = Array.isArray(response.data) ? response.data : response.data?.alerts ?? [];
        return resources.map((resource) => this.toEntityFromResource(resource));
    }

    static toEntityFromResponse(response) {
        if (response.status < 200 || response.status >= 300) {
            throw new Error(`Alert API returned ${response.status} ${response.statusText}.`);
        }
        return this.toEntityFromResource(response.data);
    }

    static toResourceFromEntity(entity) {
        const resource = {
            employeeId: entity.employeeId,
            kind: entity.kind,
            status: entity.status,
            category: entity.category,
            location: entity.location,
            latitude: entity.latitude,
            longitude: entity.longitude,
            moment: entity.moment,
            description: entity.description,
            createdAt: entity.createdAt,
            activatedAt: entity.activatedAt,
            endedAt: entity.endedAt,
            submittedAt: entity.submittedAt,
            completedAt: entity.completedAt,
            updatedAt: entity.updatedAt,
        };
        if (entity.id !== null && entity.id !== undefined) resource.id = entity.id;
        return resource;
    }
}
