/** Received notification. The original alert remains owned by Alert. */
export class Notification {
    constructor({ id, recipientUserId, targetBusinessId = null, type = 'GENERAL', title = '', message = '',
        sourceAlertId = null, distanceMeters = null, createdAt, readAt = null } = {}) {
        this.id = id;
        this.recipientUserId = recipientUserId;
        this.targetBusinessId = targetBusinessId;
        this.type = type;
        this.title = title;
        this.message = message;
        this.sourceAlertId = sourceAlertId;
        this.distanceMeters = distanceMeters;
        this.createdAt = createdAt;
        this.readAt = readAt;
    }

    get isUnread() { return this.readAt === null; }
}
