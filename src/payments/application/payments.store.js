import { defineStore } from "pinia";
import { PaymentsApi } from "../infrastructure/payments-api.js";
import { PlanAssembler } from "../infrastructure/plan.assembler.js";
import { SubscriptionAssembler } from "../infrastructure/subscription.assembler.js";
import { PaymentMethodAssembler } from "../infrastructure/payment-method.assembler.js";
import { InvoiceAssembler } from "../infrastructure/invoice.assembler.js";

const SIMULATED_BUSINESS_ID = "bus-1";

// Monthly catalog prices in PEN and USD; no real charge.
// Active employees and pending invitations occupy seats; administrators are excluded.
const SIMULATED_PLANS = [
    {
        id: "demo-basic",
        name: "Essential",
        price: 50,
        priceUsd: 15,
        currency: "PEN",
        billingCycle: "monthly",
        maxEmployees: 4,
        features: ["bracelets2", "incidentAlerts24h", "monthlyMaintenance"]
    },
    {
        id: "demo-standard",
        name: "Professional",
        price: 100,
        priceUsd: 30,
        currency: "PEN",
        billingCycle: "monthly",
        maxEmployees: 8,
        features: ["bracelets5", "priorityAlerts24h", "monthlyMaintenance", "localRiskReports"]
    },
    {
        id: "demo-extended",
        name: "Business",
        price: 150,
        priceUsd: 45,
        currency: "PEN",
        billingCycle: "monthly",
        maxEmployees: 15,
        features: ["bracelets8", "organizationPriority24h", "monthlyMaintenance", "advancedAlertsImplementation"]
    }
];

// Simulated payment method: only the last 4 digits are shown.
// Card numbers are never requested or stored.
const SIMULATED_PAYMENT_METHOD = {
    brand: "VISA",
    last4: "4128",
    holderName: "TITULAR DEMO",
    expiry: "08/28"
};

// Simulated invoices: fictitious folios with no tax validity, no real download.
// Amounts in PEN, no real charge.
const SIMULATED_INVOICES = [
    { id: "inv-2026-09", folio: "FAC-2026-0003", issuedAt: "2026-09-15", amount: 220, currency: "PEN", status: "paid" },
    { id: "inv-2026-08", folio: "FAC-2026-0002", issuedAt: "2026-08-15", amount: 220, currency: "PEN", status: "paid" },
    { id: "inv-2026-07", folio: "FAC-2026-0001", issuedAt: "2026-07-15", amount: 220, currency: "PEN", status: "paid" }
];

/** Application service store for plans, subscription and billing. @returns {Object} Payments store. */
export const usePaymentsStore = defineStore("payments", {
    state: () => ({
        plans: [],
        currentSubscription: null,
        paymentMethod: null,
        invoices: [],
        activeEmployees: 0,
        reservedSeats: 0,
        seatUsageAvailable: false,
        errorMessage: null,
        isLoading: false,
        simulated: {
            plans: true,
            subscription: true,
            billing: true
        }
    }),
    getters: {
        currentPlan(state) {
            return state.plans.find((plan) => plan.id === state.currentSubscription?.planId) ?? null;
        },
        memberLimit(state) {
            return this.currentPlan?.maxEmployees ?? 0;
        },
        assignedOperators(state) {
            return state.activeEmployees + state.reservedSeats;
        },
        isSimulated(state) {
            return state.simulated.plans || state.simulated.subscription || state.simulated.billing;
        }
    },
    actions: {
        /** Loads the plan catalog, falling back to simulated data. @returns {Promise<void>} */
        async fetchPlans() {
            this.isLoading = true;
            const api = new PaymentsApi();
            try {
                const response = await api.getPlans();
                const dtos = Array.isArray(response.data) ? response.data : response.data?.plans ?? [];
                if (dtos.length === 0) throw new Error("Empty plans collection");
                this.plans = PlanAssembler.toDomainList(dtos);
                this.simulated.plans = false;
            } catch (err) {
                this.plans = PlanAssembler.toDomainList(SIMULATED_PLANS);
                this.simulated.plans = true;
                console.warn("Payments plans fallback to simulated catalog.", err?.message ?? err);
            } finally {
                this.isLoading = false;
            }
        },
        /** Loads the active subscription for a business. @param {string} businessId - Business identifier. @returns {Promise<void>} */
        async fetchSubscription(businessId = SIMULATED_BUSINESS_ID) {
            this.isLoading = true;
            this.currentSubscription = null;
            const api = new PaymentsApi();
            try {
                const response = await api.getSubscriptions(businessId);
                const subscriptions = Array.isArray(response.data) ? response.data : response.data?.subscriptions;
                if (!Array.isArray(subscriptions)) throw new Error('Invalid subscription response');
                const active = subscriptions.filter(subscription => String(subscription.businessId) === String(businessId)
                    && subscription.status === 'active');
                if (active.length > 1) throw new Error('Multiple active subscriptions');
                this.currentSubscription = active.length ? SubscriptionAssembler.toDomain(active[0]) : null;
                this.simulated.subscription = false;
            } catch {
                this.errorMessage = 'payments.errors.subscriptionLoad';
            } finally {
                this.isLoading = false;
            }
        },
        /** Loads plans, subscription, billing and seat usage. @param {string} businessId - Business identifier. @returns {Promise<void>} */
        async fetchPaymentsData(businessId = SIMULATED_BUSINESS_ID) {
            this.errorMessage = null;
            await this.fetchPlans();
            await this.fetchSubscription(businessId);
            await this.fetchBilling();
            await this.fetchActiveEmployeeCount(businessId);
        },
        /** Loads the payment method and invoices. @returns {Promise<void>} */
        async fetchBilling() {
            this.isLoading = true;
            const api = new PaymentsApi();
            try {
                const [methodsResponse, invoicesResponse] = await Promise.all([
                    api.getPaymentMethods(),
                    api.getInvoices()
                ]);
                const methodDtos = Array.isArray(methodsResponse.data)
                    ? methodsResponse.data
                    : (methodsResponse.data?.paymentMethods ?? []);
                const invoiceDtos = Array.isArray(invoicesResponse.data)
                    ? invoicesResponse.data
                    : (invoicesResponse.data?.invoices ?? []);
                if (methodDtos.length === 0 || invoiceDtos.length === 0) throw new Error("Empty billing collections");
                this.paymentMethod = PaymentMethodAssembler.toDomain(methodDtos[0]);
                this.invoices = InvoiceAssembler.toDomainList(invoiceDtos);
                this.simulated.billing = false;
            } catch (err) {
                this.paymentMethod = PaymentMethodAssembler.toDomain(SIMULATED_PAYMENT_METHOD);
                this.invoices = InvoiceAssembler.toDomainList(SIMULATED_INVOICES);
                this.simulated.billing = true;
                console.warn("Payments billing fallback to simulated data.", err?.message ?? err);
            } finally {
                this.isLoading = false;
            }
        },
        /** Loads the seat usage for a business. @param {string} businessId - Business identifier. @returns {Promise<void>} */
        async fetchActiveEmployeeCount(businessId = SIMULATED_BUSINESS_ID) {
            this.seatUsageAvailable = false;
            try {
                const usage = await new PaymentsApi().getSeatUsage(businessId);
                this.activeEmployees = usage.activeEmployees;
                this.reservedSeats = usage.reservedSeats;
                this.seatUsageAvailable = true;
            } catch {
                this.errorMessage = 'payments.errors.seatUsageLoad';
            }
        },
        /** Changes the subscription to the given plan. @param {string} planId - Plan identifier. @returns {Promise<boolean>} True when applied. */
        async selectPlan(planId) {
            const plan = this.plans.find((p) => p.id === planId);
            if (!plan || !this.currentSubscription) return false;
            this.errorMessage = null;
            await this.fetchActiveEmployeeCount(this.currentSubscription.businessId);
            if (!this.seatUsageAvailable) return false;
            // Backend must enforce the limit against Business seat usage again.
            if (plan.maxEmployees < this.assignedOperators) return false;
            const next = {
                ...SubscriptionAssembler.toResource(this.currentSubscription),
                planId: plan.id,
                status: "active",
                cancelAtPeriodEnd: false,
                maxEmployees: plan.maxEmployees
            };
            try {
                const api = new PaymentsApi();
                const response = await api.updateSubscription(next.id, next);
                this.currentSubscription = SubscriptionAssembler.toDomain(response.data);
                this.simulated.subscription = false;
            } catch {
                this.errorMessage = 'payments.errors.save';
                return false;
            }
            return true;
        },
        /** Schedules the subscription cancellation at period end. @returns {Promise<boolean>} True when applied. */
        async cancelSubscription() {
            if (!this.currentSubscription) return false;
            this.errorMessage = null;
            const next = {
                ...SubscriptionAssembler.toResource(this.currentSubscription),
                cancelAtPeriodEnd: true
            };
            try {
                const api = new PaymentsApi();
                const response = await api.updateSubscription(next.id, next);
                this.currentSubscription = SubscriptionAssembler.toDomain(response.data);
                this.simulated.subscription = false;
            } catch {
                this.errorMessage = 'payments.errors.save';
                return false;
            }
            return true;
        }
    }
});
