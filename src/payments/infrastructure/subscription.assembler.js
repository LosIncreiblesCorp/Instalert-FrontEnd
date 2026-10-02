import { Subscription } from "../domain/model/subscription.entity.js";

export class SubscriptionAssembler {
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
