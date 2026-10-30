import { Notification } from '../domain/model/notification.entity.js';

export class NotificationAssembler {
    static toDomain(resource) {
        if (!resource || !['string', 'number'].includes(typeof resource.id)
            || typeof resource.recipientUserId !== 'string' || !['GENERAL', 'NEARBY_ALERT'].includes(resource.type)
            || !Number.isFinite(Date.parse(resource.createdAt))
            || (resource.readAt != null && !Number.isFinite(Date.parse(resource.readAt)))
            || (resource.title != null && typeof resource.title !== 'string')
            || (resource.message != null && typeof resource.message !== 'string')) {
            throw new Error('Invalid notification resource.');
        }
        return new Notification(resource);
    }

    static nearbyResource(userId, businessId, candidate) {
        return {
            id: `nearby-${businessId}-${userId}-${candidate.id}`, recipientUserId: userId, targetBusinessId: businessId,
            type: 'NEARBY_ALERT', sourceAlertId: candidate.id, distanceMeters: Math.round(candidate.distanceMeters),
            createdAt: new Date().toISOString(), readAt: null,
        };
    }
}
