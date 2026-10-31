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

export const PanicReportStatus = Object.freeze({
    PENDING: 'pending',
    COMPLETED: 'completed',
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
        reportStatus = null,
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
        resolvedAt = null,
        submittedAt = null,
        completedAt = null,
        updatedAt = null,
    } = {}) {
        this.id = id;
        this.employeeId = employeeId;
        this.kind = kind;
        const legacyPanicReport = kind === AlertRecordKind.PANIC
            && [AlertRecordStatus.PENDING_REPORT, AlertRecordStatus.COMPLETED].includes(status);
        this.status = legacyPanicReport ? AlertRecordStatus.RESOLVED : status;
        this.reportStatus = legacyPanicReport
            ? status === AlertRecordStatus.COMPLETED ? PanicReportStatus.COMPLETED : PanicReportStatus.PENDING
            : reportStatus;
        this.category = category;
        this.location = location;
        this.latitude = latitude;
        this.longitude = longitude;
        this.moment = moment;
        this.description = description;
        this.createdAt = createdAt;
        this.activatedAt = activatedAt;
        this.endedAt = endedAt;
        this.resolvedAt = resolvedAt ?? (legacyPanicReport ? endedAt : null);
        this.submittedAt = submittedAt;
        this.completedAt = completedAt;
        this.updatedAt = updatedAt;
    }

    get hasPendingPanicReport() {
        return this.kind === AlertRecordKind.PANIC && this.status === AlertRecordStatus.RESOLVED
            && this.reportStatus === PanicReportStatus.PENDING;
    }

    finishPanic(resolvedAt = new Date().toISOString()) {
        if (this.kind !== AlertRecordKind.PANIC || this.status !== AlertRecordStatus.ACTIVE) return false;
        this.status = AlertRecordStatus.RESOLVED;
        this.reportStatus = PanicReportStatus.PENDING;
        this.resolvedAt = resolvedAt;
        this.endedAt = resolvedAt;
        this.updatedAt = resolvedAt;
        return true;
    }

    updatePanicReportDraft(fields = {}) {
        if (!this.hasPendingPanicReport) return false;

        for (const field of ['category', 'location', 'latitude', 'longitude', 'moment', 'description']) {
            if (Object.hasOwn(fields, field)) this[field] = fields[field];
        }

        this.updatedAt = new Date().toISOString();
        return true;
    }

    completePanicReport(completedAt = new Date().toISOString()) {
        const hasRequiredInformation = Boolean(this.category?.trim() && this.description?.trim());
        if (!this.hasPendingPanicReport || !hasRequiredInformation) {
            return false;
        }

        this.reportStatus = PanicReportStatus.COMPLETED;
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
