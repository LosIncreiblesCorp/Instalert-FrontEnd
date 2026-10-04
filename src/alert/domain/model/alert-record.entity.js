export const AlertRecordKind = Object.freeze({
    PANIC: 'panic',
    PAST_INCIDENT: 'past-incident',
    SUSPICIOUS_ACTIVITY: 'suspicious-activity',
    OTHER_SITUATION: 'other-situation',
});

export const AlertRecordStatus = Object.freeze({
    DRAFT: 'draft',
    ACTIVE: 'active',
    PENDING_REPORT: 'pending-report',
    COMPLETED: 'completed',
    SUBMITTED: 'submitted',
    RESOLVED: 'resolved',
    FALSE_ALARM: 'false-alarm',
});

/**
 * Alert aggregate projection used by the Alert bounded context.
 * It contains no Vue, PrimeVue, or HTTP dependencies.
 */
export class AlertRecord {
    constructor({
        id = null,
        employeeId = '',
        kind = AlertRecordKind.PANIC,
        status = AlertRecordStatus.ACTIVE,
        category = '',
        location = '',
        latitude = null,
        longitude = null,
        // ISO 8601 occurrence timestamp for new reports; legacy relative values remain readable.
        moment = '',
        description = '',
        createdAt = null,
        activatedAt = null,
        endedAt = null,
        submittedAt = null,
        completedAt = null,
        updatedAt = null,
    } = {}) {
        this.id = id;
        this.employeeId = employeeId;
        this.kind = kind;
        this.status = status;
        this.category = category;
        this.location = location;
        this.latitude = latitude;
        this.longitude = longitude;
        this.moment = moment;
        this.description = description;
        this.createdAt = createdAt;
        this.activatedAt = activatedAt;
        this.endedAt = endedAt;
        this.submittedAt = submittedAt;
        this.completedAt = completedAt;
        this.updatedAt = updatedAt;
    }

    finishPanic(endedAt = new Date().toISOString()) {
        if (this.kind !== AlertRecordKind.PANIC || this.status !== AlertRecordStatus.ACTIVE) return false;
        this.status = AlertRecordStatus.PENDING_REPORT;
        this.endedAt = endedAt;
        this.updatedAt = endedAt;
        return true;
    }

    updatePanicReportDraft(fields = {}) {
        if (this.kind !== AlertRecordKind.PANIC || this.status !== AlertRecordStatus.PENDING_REPORT) return false;

        for (const field of ['category', 'location', 'latitude', 'longitude', 'moment', 'description']) {
            if (Object.hasOwn(fields, field)) this[field] = fields[field];
        }

        this.updatedAt = new Date().toISOString();
        return true;
    }

    completePanicReport(completedAt = new Date().toISOString()) {
        const hasRequiredInformation = Boolean(this.category?.trim() && this.description?.trim());
        if (this.kind !== AlertRecordKind.PANIC || this.status !== AlertRecordStatus.PENDING_REPORT || !hasRequiredInformation) {
            return false;
        }

        this.status = AlertRecordStatus.COMPLETED;
        this.completedAt = completedAt;
        this.updatedAt = completedAt;
        return true;
    }

    submitReport(submittedAt = new Date().toISOString()) {
        const occurredAt = Date.parse(this.moment);
        const hasRequiredInformation = Boolean(
            this.category?.trim() && this.location?.trim() && this.description?.trim()
            && Number.isFinite(occurredAt) && occurredAt <= Date.parse(submittedAt),
        );
        if (this.kind === AlertRecordKind.PANIC || this.status !== AlertRecordStatus.DRAFT || !hasRequiredInformation) {
            return false;
        }

        this.status = AlertRecordStatus.SUBMITTED;
        this.submittedAt = submittedAt;
        this.createdAt ??= submittedAt;
        this.updatedAt = submittedAt;
        return true;
    }
}
