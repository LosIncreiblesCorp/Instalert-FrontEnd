import { Subscription } from "../domain/model/subscription.entity.js";

/** Maps subscription API resources to and from domain entities. @class SubscriptionAssembler */
export class SubscriptionAssembler {
    /** Converts a subscription DTO to domain. @param {Object} dto - Subscription resource. @returns {import('../domain/model/subscription.entity.js').Subscription} Domain subscription. */
    static toDomain(dto) {
        return new Subscription({
            id: dto.id,
            businessId: dto.businessId,
            planId: dto.planId,
            status: dto.status,
            currentPeriodEnd: dto.currentPeriodEnd,
            cancelAtPeriodEnd: dto.cancelAtPeriodEnd ?? false,
            maxEmployees: dto.maxEmployees
        });
    }

    /** Converts a subscription entity to API resource. @param {import('../domain/model/subscription.entity.js').Subscription} subscription - Domain subscription. @returns {Object} Subscription resource. */
    static toResource(subscription) {
        return {
            id: subscription.id,
            businessId: subscription.businessId,
            planId: subscription.planId,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            maxEmployees: subscription.maxEmployees
        };
    }
}
