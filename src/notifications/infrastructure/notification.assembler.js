import { Notification } from '../domain/model/notification.entity.js';

export class NotificationAssembler {
    static toDomain(resource) {
        if (!resource || !['id', 'recipientUserId', 'targetBusinessId', 'sourceAlertId'].every(key => typeof resource[key] === 'string' && resource[key])
            || resource.type !== 'nearby-panic' || typeof resource.title !== 'string' || typeof resource.message !== 'string'
            || typeof resource.createdAt !== 'string' || !Number.isFinite(Date.parse(resource.createdAt))
            || (resource.readAt != null && (typeof resource.readAt !== 'string' || !Number.isFinite(Date.parse(resource.readAt))))
            || !Number.isFinite(resource.distanceMeters) || resource.distanceMeters < 0) {
            throw new Error('notifications.errors.invalidResponse');
        }
        return new Notification(resource);
    }
}
