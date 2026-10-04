import { defineStore } from "pinia";
import { PaymentsApi } from "../infrastructure/payments-api.js";
import { PlanAssembler } from "../infrastructure/plan.assembler.js";
import { SubscriptionAssembler } from "../infrastructure/subscription.assembler.js";
import { PaymentMethodAssembler } from "../infrastructure/payment-method.assembler.js";
import { InvoiceAssembler } from "../infrastructure/invoice.assembler.js";

const SIMULATED_BUSINESS_ID = "demo-business";

// Monthly catalog prices in PEN and USD; no real charge.
// The quota counts only active employees (admin and pending invites excluded).
const SIMULATED_PLANS = [
    {
        id: "basic",
        name: "Essential",
        price: 50,
        priceUsd: 15,
        currency: "PEN",
        billingCycle: "monthly",
        maxEmployees: 4,
        features: ["bracelets2", "incidentAlerts24h", "monthlyMaintenance"]
    },
    {
        id: "professional",
        name: "Professional",
        price: 100,
        priceUsd: 30,
        currency: "PEN",
        billingCycle: "monthly",
        maxEmployees: 8,
        features: ["bracelets5", "priorityAlerts24h", "monthlyMaintenance", "localRiskReports"]
    },
    {
        id: "enterprise",
        name: "Business",
        price: 150,
        priceUsd: 45,
        currency: "PEN",
        billingCycle: "monthly",
        maxEmployees: 15,
        features: ["bracelets8", "organizationPriority24h", "monthlyMaintenance", "advancedAlertsImplementation"]
    }
];

const SIMULATED_SUBSCRIPTION = {
    id: "sub-demo-01",
    businessId: SIMULATED_BUSINESS_ID,
    planId: "professional",
    status: "active",
    currentPeriodEnd: "2026-11-01",
    cancelAtPeriodEnd: false,
    maxEmployees: 8
};

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

// Simulated active-employee count. The real roster belongs to Business, not Payments.
// TODO: replace with the Business contract once it reports active employees
// (excluding the administrator and pending invites). No HTTP call here on purpose.
const SIMULATED_ACTIVE_EMPLOYEES = 8;

export const usePaymentsStore = defineStore("payments", {
    state: () => ({
        plans: [],
        currentSubscription: null,
        paymentMethod: null,
        invoices: [],
        activeEmployees: 0,
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
            return state.currentSubscription?.maxEmployees ?? 0;
        },
        assignedOperators(state) {
            return state.activeEmployees;
        },
        isSimulated(state) {
            return state.simulated.plans || state.simulated.subscription || state.simulated.billing;
        }
    },
    actions: {
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
        async fetchSubscription(businessId = SIMULATED_BUSINESS_ID) {
            this.isLoading = true;
            const api = new PaymentsApi();
            try {
                const response = await api.getSubscriptionById(`${businessId}-subscription`);
                this.currentSubscription = SubscriptionAssembler.toDomain(response.data);
                this.simulated.subscription = false;
            } catch (err) {
                this.currentSubscription = SubscriptionAssembler.toDomain({
                    ...SIMULATED_SUBSCRIPTION,
                    businessId
                });
                this.simulated.subscription = true;
                console.warn("Payments subscription fallback to simulated data.", err?.message ?? err);
            } finally {
                this.isLoading = false;
            }
        },
        async fetchPaymentsData(businessId = SIMULATED_BUSINESS_ID) {
            await this.fetchPlans();
            await this.fetchSubscription(businessId);
            await this.fetchBilling();
            await this.fetchActiveEmployeeCount();
        },
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
        async fetchActiveEmployeeCount() {
            // No HTTP call: the contract with Business does not exist yet.
            // Business must report the active-employee count (excluding the
            // administrator and pending invites); Payments only owns the limit.
            this.activeEmployees = SIMULATED_ACTIVE_EMPLOYEES;
        },
        async selectPlan(planId) {
            const plan = this.plans.find((p) => p.id === planId);
            if (!plan || !this.currentSubscription) return false;
            // UI-level guard only: the quota counts active employees and the
            // definitive validation belongs to the backend (Business enforces
            // the limit reported by Payments).
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
                this.currentSubscription = SubscriptionAssembler.toDomain(next);
                this.simulated.subscription = true;
            }
            return true;
        },
        async cancelSubscription() {
            if (!this.currentSubscription) return;
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
                this.currentSubscription = SubscriptionAssembler.toDomain(next);
                this.simulated.subscription = true;
            }
        }
    }
});
