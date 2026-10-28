import { defineStore } from "pinia";
import { PaymentsApi } from "../infrastructure/payments-api.js";
import { PlanAssembler } from "../infrastructure/plan.assembler.js";
import { SubscriptionAssembler } from "../infrastructure/subscription.assembler.js";
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

// Synthetic payment history retained through the legacy invoice adapter until backend integration.
const SIMULATED_INVOICES = [
    { id: "txn-2026-09", issuedAt: "2026-09-15T12:00:00Z", amount: 30, currency: "USD", status: "paid" },
    { id: "txn-2026-08", issuedAt: "2026-08-15T12:00:00Z", amount: 30, currency: "USD", status: "paid" },
    { id: "txn-2026-07", issuedAt: "2026-07-15T12:00:00Z", amount: 30, currency: "USD", status: "paid" }
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
        checkoutBusy: false,
        checkoutApproval: null,
        checkoutOutcome: null,
        simulated: {
            plans: true,
            subscription: true,
            billing: true
        }
    }),
    getters: {
        /** Read model for the payment history UI; references are internal until provider reconciliation. */
        paymentHistory(state) {
            return state.invoices.map(record => ({
                reference: record.id,
                occurredAt: record.issuedAt,
                amount: record.amount,
                currency: record.currency,
                status: record.status
            }));
        },
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
        /** Clears transient approval state and the former demo checkout lock. */
        resetPayPalCheckout() {
            this.checkoutApproval = null;
            this.checkoutOutcome = null;
            this.checkoutBusy = false;
            try { sessionStorage.removeItem('instalert.payments.sandbox-approval'); } catch { /* Storage can be unavailable. */ }
        },
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
        /** Loads demo invoices. PayPal manages the funding source outside this application. */
        async fetchBilling() {
            this.isLoading = true;
            const api = new PaymentsApi();
            try {
                const invoicesResponse = await api.getInvoices();
                const invoiceDtos = Array.isArray(invoicesResponse.data)
                    ? invoicesResponse.data
                    : (invoicesResponse.data?.invoices ?? []);
                this.invoices = InvoiceAssembler.toDomainList(invoiceDtos);
                this.simulated.billing = false;
            } catch (err) {
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
        /** Rechecks the demo seat projection before opening the PayPal approval flow. */
        async preparePayPalCheckout(planId) {
            const plan = this.plans.find((p) => p.id === planId);
            if (!plan || this.checkoutBusy) return false;
            this.errorMessage = null;
            this.checkoutOutcome = null;
            this.checkoutBusy = true;
            try {
                await this.fetchActiveEmployeeCount(this.currentSubscription?.businessId ?? SIMULATED_BUSINESS_ID);
                if (!this.seatUsageAvailable) return false;
                if (plan.maxEmployees < this.assignedOperators) {
                    this.checkoutOutcome = 'blocked';
                    return false;
                }
                return true;
            } finally {
                this.checkoutBusy = false;
            }
        },
        /** Stores browser approval evidence only; it cannot activate plans or update seat limits. */
        recordPayPalApproval({ providerSubscriptionId, planId }) {
            if (!providerSubscriptionId || !this.plans.some(plan => plan.id === planId)) {
                this.setCheckoutOutcome('error');
                return;
            }
            this.checkoutApproval = {
                businessId: this.currentSubscription?.businessId ?? SIMULATED_BUSINESS_ID,
                providerSubscriptionId, planId
            };
            this.checkoutBusy = false;
            this.checkoutOutcome = 'approved';
        },
        setCheckoutOutcome(outcome) {
            this.checkoutBusy = false;
            this.checkoutOutcome = outcome;
        },
        /** Schedules the subscription cancellation at period end. @returns {Promise<boolean>} True when applied. */
        async cancelSubscription() {
            if (!this.currentSubscription || this.checkoutBusy) return false;
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
