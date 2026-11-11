import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { PaymentsApi } from '../infrastructure/payments-api.js';
import { PlanAssembler } from '../infrastructure/plan.assembler.js';
import { SubscriptionAssembler } from '../infrastructure/subscription.assembler.js';
import { InvoiceAssembler } from '../infrastructure/invoice.assembler.js';
import { apiContext, currentContextRevision, requireBusinessId } from '../../shared/infrastructure/api-context.js';

const api = new PaymentsApi();
/** Subscription changes are only committed to the UI after server verification. */
export const usePaymentsStore = defineStore('payments', () => {
    const plans = ref([]), currentSubscription = ref(null), invoices = ref([]);
    const activeEmployees = ref(0), reservedSeats = ref(0), seatUsageAvailable = ref(false);
    const isLoading = ref(false), hasLoaded = ref(false), errorMessage = ref(null);
    const checkoutBusy = ref(false), checkoutApproval = ref(null), checkoutOutcome = ref(null), checkout = ref(null);
    let generation = 0, request = 0;
    const capture = () => ({ generation, revision: currentContextRevision(), userId: apiContext.userId, businessId: apiContext.businessId });
    const current = scope => scope.generation === generation && scope.revision === currentContextRevision()
        && scope.userId === apiContext.userId && scope.businessId === apiContext.businessId;
    const storageKey = scope => `instalert.payments.approval:${scope.userId}:${scope.businessId}`;
    const currentPlan = computed(() => plans.value.find(item => item.id === currentSubscription.value?.planId) ?? null);
    const assignedOperators = computed(() => activeEmployees.value + reservedSeats.value);
    const memberLimit = computed(() => currentPlan.value?.maxEmployees ?? 0);
    const isSimulated = computed(() => currentSubscription.value?.isSimulated === true);
    const paymentHistory = computed(() => invoices.value.map(item => ({ reference: item.folio || item.id,
        occurredAt: item.issuedAt, amount: item.amount, currency: item.currency, status: item.status })));
    function savePending(scope, approval) {
        try {
            if (approval) sessionStorage.setItem(storageKey(scope), JSON.stringify(approval));
            else sessionStorage.removeItem(storageKey(scope));
        } catch { /* Server verification remains available without browser storage. */ }
    }
    function restorePending() {
        try {
            const value = JSON.parse(sessionStorage.getItem(storageKey(capture())) ?? 'null');
            if (value && value.businessId === apiContext.businessId && value.userId === apiContext.userId
                && typeof value.checkoutId === 'string' && typeof value.providerSubscriptionId === 'string'
                && typeof value.planId === 'string') checkoutApproval.value = value;
        } catch { /* Ignore unavailable or invalid storage. */ }
    }
    function resetContext() {
        generation++; request++;
        plans.value = []; currentSubscription.value = null; invoices.value = [];
        activeEmployees.value = 0; reservedSeats.value = 0; seatUsageAvailable.value = false;
        isLoading.value = false; hasLoaded.value = false; errorMessage.value = null;
        checkoutBusy.value = false; checkoutApproval.value = null; checkoutOutcome.value = null; checkout.value = null;
    }
    watch(() => [apiContext.userId, apiContext.businessId, apiContext.status], resetContext, { flush: 'sync' });
    function ownedSubscription(dto, scope) {
        if (!dto || dto.businessId !== scope.businessId) throw new Error('Invalid subscription scope.');
        return SubscriptionAssembler.toDomain(dto);
    }
    async function fetchPaymentsData() {
        if (checkoutBusy.value) return false;
        const scope = capture(), id = ++request;
        const valid = () => current(scope) && request === id;
        isLoading.value = true; errorMessage.value = null;
        try {
            const businessId = requireBusinessId();
            const [catalog, subscription, billing, seats] = await Promise.all([
                api.getPlans(), api.getSubscription(businessId), api.getBillingHistory(businessId), api.getSeatUsage(businessId),
            ]);
            const parsedPlans = PlanAssembler.toDomainList(catalog.data);
            const parsedSubscription = subscription.status === 204 ? null : ownedSubscription(subscription.data, scope);
            if (!Array.isArray(billing.data) || billing.data.some(item => item.businessId !== businessId)) throw new Error('Invalid billing history.');
            const parsedBilling = InvoiceAssembler.toDomainList(billing.data);
            if (![seats.data.activeEmployees, seats.data.reservedSeats].every(value => Number.isInteger(value) && value >= 0)) throw new Error('Invalid seat usage.');
            if (!valid()) return false;
            plans.value = parsedPlans; currentSubscription.value = parsedSubscription; invoices.value = parsedBilling;
            activeEmployees.value = seats.data.activeEmployees; reservedSeats.value = seats.data.reservedSeats; seatUsageAvailable.value = true;
            hasLoaded.value = true; restorePending(); return true;
        } catch (error) {
            if (valid()) errorMessage.value = error.apiError?.messageKey ?? 'payments.errors.subscriptionLoad';
            return false;
        } finally { if (valid()) isLoading.value = false; }
    }
    async function preparePayPalCheckout(planId) {
        if (checkoutBusy.value || checkoutApproval.value || isLoading.value) return false;
        const scope = capture(), plan = plans.value.find(item => item.id === planId);
        if (!plan) return false;
        errorMessage.value = null; checkoutOutcome.value = null; checkoutBusy.value = true;
        try {
            requireBusinessId();
            const { data } = await api.getSeatUsage(scope.businessId);
            if (!current(scope)) return false;
            if (![data.activeEmployees, data.reservedSeats].every(value => Number.isInteger(value) && value >= 0)) throw new Error('Invalid seats.');
            activeEmployees.value = data.activeEmployees; reservedSeats.value = data.reservedSeats; seatUsageAvailable.value = true;
            if (assignedOperators.value > plan.maxEmployees) { checkoutOutcome.value = 'blocked'; return false; }
            return true;
        } catch (error) {
            if (current(scope)) { seatUsageAvailable.value = false; errorMessage.value = error.apiError?.messageKey ?? 'payments.errors.seatUsageLoad'; }
            return false;
        } finally { if (current(scope)) checkoutBusy.value = false; }
    }
    async function beginCheckout(planId) {
        if (checkoutBusy.value || checkoutApproval.value) throw new Error('Checkout is unavailable.');
        const scope = capture(); requireBusinessId(); checkoutBusy.value = true;
        try {
            const change = currentSubscription.value?.status === 'active' && !isSimulated.value;
            const { data } = await api.beginCheckout(scope.businessId, planId, change);
            if (!current(scope)) throw new Error('The selected account changed.');
            if (data.planId !== planId || typeof data.checkoutId !== 'string' || !data.checkoutId
                || typeof data.paypalPlanId !== 'string' || !data.paypalPlanId || !Number.isFinite(Date.parse(data.expiresAt))
                || Date.parse(data.expiresAt) <= Date.now() || (!data.subscriptionId && data.customId !== data.checkoutId))
                throw new Error('Invalid checkout response.');
            checkout.value = { ...data, businessId: scope.businessId, userId: scope.userId }; return { ...data };
        } catch (error) {
            if (current(scope)) { checkoutBusy.value = false; errorMessage.value = error.apiError?.messageKey ?? 'payments.paypal.error'; }
            throw error;
        }
    }
    async function recordPayPalApproval({ providerSubscriptionId, checkoutId }) {
        const pending = checkout.value;
        if (!pending || pending.checkoutId !== checkoutId || !providerSubscriptionId
            || pending.userId !== apiContext.userId || pending.businessId !== apiContext.businessId
            || (pending.subscriptionId && pending.subscriptionId !== providerSubscriptionId)) return false;
        checkoutApproval.value = { ...pending, providerSubscriptionId };
        savePending(capture(), checkoutApproval.value);
        checkoutBusy.value = false;
        return verifyPending();
    }
    async function verifyPending() {
        if (!checkoutApproval.value || checkoutBusy.value) return false;
        const scope = capture(), approval = { ...checkoutApproval.value };
        checkoutBusy.value = true; checkoutOutcome.value = 'verifying'; errorMessage.value = null;
        let verified = false;
        try {
            requireBusinessId();
            const { data } = await api.verify(scope.businessId, approval);
            const subscription = ownedSubscription(data, scope);
            if (subscription.planId !== approval.planId || subscription.status !== 'active' || subscription.isSimulated)
                throw new Error('The subscription has not been verified.');
            if (!current(scope)) return false;
            currentSubscription.value = subscription; checkoutApproval.value = null; checkout.value = null;
            savePending(scope, null); checkoutOutcome.value = 'approved'; verified = true;
        } catch (error) {
            if (current(scope)) {
                checkoutOutcome.value = 'pending';
                errorMessage.value = error.apiError?.messageKey ?? 'payments.errors.verification';
            }
        } finally { if (current(scope)) checkoutBusy.value = false; }
        if (verified && current(scope)) await fetchPaymentsData();
        return verified && current(scope);
    }
    function setCheckoutOutcome(value) {
        checkoutBusy.value = false;
        checkoutOutcome.value = checkoutApproval.value ? 'pending' : value;
    }
    async function cancelSubscription() {
        if (!currentSubscription.value || checkoutBusy.value || isSimulated.value) return false;
        const scope = capture(); checkoutBusy.value = true; errorMessage.value = null;
        try {
            requireBusinessId();
            const { data } = await api.cancel(scope.businessId);
            const saved = ownedSubscription(data, scope);
            if (!current(scope)) return false;
            currentSubscription.value = saved; return true;
        } catch (error) {
            if (current(scope)) errorMessage.value = error.apiError?.messageKey ?? 'payments.errors.save';
            return false;
        } finally { if (current(scope)) checkoutBusy.value = false; }
    }
    return { plans, currentSubscription, invoices, activeEmployees, reservedSeats, seatUsageAvailable, hasLoaded, isLoading,
        errorMessage, checkoutBusy, checkoutApproval, checkoutOutcome, currentPlan, assignedOperators, memberLimit, isSimulated,
        paymentHistory, fetchPaymentsData, preparePayPalCheckout, beginCheckout, recordPayPalApproval, verifyPending,
        setCheckoutOutcome, cancelSubscription, resetContext };
});
