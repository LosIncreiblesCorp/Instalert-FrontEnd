<script setup>
/** Subscription management page with plans and billing. */
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useConfirm } from "primevue/useconfirm";
import Dialog from "primevue/dialog";
import { usePaymentsStore } from "../../application/payments.store.js";
import { planPrice, formatMoney } from "../payments-format.js";
import PlanCard from "../components/plan-card.vue";
import SubscriptionSummary from "../components/subscription-summary.vue";
import BillingHistory from "../components/billing-history.vue";
import PayPalSubscriptionButton from "../components/paypal-subscription-button.vue";

const paymentsStore = usePaymentsStore();
const { locale, t } = useI18n();
const confirm = useConfirm();

const selectingPlanId = ref(null);
const openingCheckout = ref(false);
const cancelling = ref(false);
const notice = ref("");
const currency = "USD";
let checkoutTrigger = null;

function restoreCheckoutFocus() {
  if (checkoutTrigger instanceof HTMLElement && checkoutTrigger.isConnected) {
    checkoutTrigger.focus({ preventScroll: true });
  }
  checkoutTrigger = null;
}

const currentPlan = computed(() => paymentsStore.currentPlan ?? null);
const assignedOperators = computed(() => paymentsStore.assignedOperators);
const checkoutPlan = computed(() => paymentsStore.plans.find(plan => plan.id === selectingPlanId.value));
const checkoutVisible = computed({
  get: () => Boolean(selectingPlanId.value),
  set: visible => { if (!visible && !paymentsStore.checkoutBusy) selectingPlanId.value = null; }
});

const topPlanId = computed(() => {
  if (paymentsStore.plans.length === 0) return null;
  return [...paymentsStore.plans].sort((a, b) => (b.price ?? 0) - (a.price ?? 0))[0].id;
});

/** Checks whether a plan is blocked by seat usage. @param {Object} plan - Plan entity. @returns {boolean} True when blocked. */
function isBlocked(plan) {
  return !paymentsStore.seatUsageAvailable || plan.maxEmployees < assignedOperators.value;
}

/** Formats a monthly plan price. @param {Object} plan - Plan entity. @returns {string} Formatted price. */
function formatPlanPrice(plan) {
  return formatMoney(planPrice(plan, currency), currency, locale.value);
}

onMounted(() => {
  paymentsStore.resetPayPalCheckout();
  paymentsStore.fetchPaymentsData();
});

/** Opens checkout after checking plan availability. @param {string} planId - Plan identifier. */
async function handleSelectRequest(planId) {
  const next = paymentsStore.plans.find((p) => p.id === planId);
  if (!next || isBlocked(next) || paymentsStore.checkoutBusy || openingCheckout.value) return;
  checkoutTrigger = document.activeElement;
  openingCheckout.value = true;
  notice.value = "";
  try {
    if (await paymentsStore.preparePayPalCheckout(planId)) selectingPlanId.value = planId;
  } finally {
    openingCheckout.value = false;
  }
}

/** Asks for confirmation and cancels the subscription. @returns {void} */
function handleCancelClick() {
  confirm.require({
    message: t("payments.confirmCancelMessage"),
    header: t("payments.confirmCancelTitle"),
    icon: "pi pi-exclamation-triangle",
    acceptLabel: t("payments.confirmAccept"),
    rejectLabel: t("payments.confirmReject"),
    accept: async () => {
      cancelling.value = true;
      const applied = await paymentsStore.cancelSubscription();
      notice.value = applied ? t("payments.cancelScheduled") : "";
      cancelling.value = false;
    }
  });
}
</script>

<template>
  <div class="subscription-page">
    <header class="subscription-page__header">
      <div class="subscription-page__titles">
        <h1 class="subscription-page__title">{{ $t("payments.title") }}</h1>
        <p class="subscription-page__subtitle">{{ $t("payments.subtitle") }}</p>
      </div>
    </header>

    <pv-message v-if="paymentsStore.errorMessage" severity="error" :closable="false" role="alert">
      {{ $t(paymentsStore.errorMessage) }}
    </pv-message>

    <p v-if="paymentsStore.isLoading" class="subscription-page__state" role="status">
      {{ $t("payments.loading") }}
    </p>
    <p v-else-if="!paymentsStore.currentSubscription" class="subscription-page__state" role="alert">
      {{ $t("payments.empty") }}
    </p>

    <pv-message v-if="paymentsStore.checkoutOutcome" severity="info" :closable="true" role="status" @close="paymentsStore.checkoutOutcome = null">
      {{ $t(`payments.paypal.${paymentsStore.checkoutOutcome}`) }}
    </pv-message>

    <template v-if="!paymentsStore.isLoading">
      <SubscriptionSummary
          v-if="paymentsStore.currentSubscription"
          :subscription="paymentsStore.currentSubscription"
          :plan="currentPlan"
          :currency="currency"
          :assigned-operators="assignedOperators"
      />

      <section class="plans-section" :aria-label="$t('payments.availablePlans')">
        <div class="plans-section__head">
          <div class="plans-section__titles">
            <h3 class="plans-section__title">{{ $t("payments.matrixTitle") }}</h3>
            <p class="plans-section__subtitle">{{ $t("payments.matrixSubtitle") }}</p>
          </div>

        </div>

        <div class="plans-section__grid">
          <PlanCard
              v-for="plan in paymentsStore.plans"
              :key="plan.id"
              :plan="plan"
              :selected="plan.id === paymentsStore.currentSubscription?.planId"
              :selecting="paymentsStore.checkoutBusy || openingCheckout"
              :currency="currency"
              :accent="plan.id === topPlanId"
              :blocked="plan.id !== paymentsStore.currentSubscription?.planId && isBlocked(plan)"
              :assigned-operators="assignedOperators"
              @select="handleSelectRequest"
          />
        </div>
      </section>

      <Dialog
          v-model:visible="checkoutVisible"
          modal
          block-scroll
          :draggable="false"
          :closable="!paymentsStore.checkoutBusy"
          :close-on-escape="!paymentsStore.checkoutBusy"
          :dismissable-mask="false"
          :header="$t('payments.paypal.checkoutTitle')"
          :style="{ width: '30rem', maxWidth: 'calc(100vw - 2rem)', maxHeight: 'calc(100dvh - 2rem)' }"
          :pt="{ mask: { class: 'payments-checkout-mask', style: { backdropFilter: 'blur(3px)' } } }"
          @after-hide="restoreCheckoutFocus"
      >
        <div v-if="checkoutPlan" class="checkout-summary">
          <span class="checkout-summary__icon" aria-hidden="true"><i class="pi pi-wallet" /></span>
          <div>
            <p class="checkout-summary__label">{{ $t('payments.paypal.selectedPlan') }}</p>
            <h2 class="checkout-summary__name">{{ checkoutPlan.name }}</h2>
            <p class="checkout-summary__capacity">{{ $t('payments.upToEmployees', { count: checkoutPlan.maxEmployees }) }}</p>
          </div>
          <p class="checkout-summary__price">{{ formatPlanPrice(checkoutPlan) }}<span>{{ $t('payments.perMonth') }}</span></p>
        </div>
        <p class="checkout-help">{{ $t('payments.paypal.checkoutHelp') }}</p>
        <PayPalSubscriptionButton v-if="selectingPlanId" :key="selectingPlanId" :plan-id="selectingPlanId" @approved="selectingPlanId = null" />
        <template #footer>
          <pv-button severity="secondary" outlined :label="$t('payments.confirmReject')" :disabled="paymentsStore.checkoutBusy" @click="selectingPlanId = null" />
        </template>
      </Dialog>

      <BillingHistory :payments="paymentsStore.paymentHistory" />

      <section v-if="paymentsStore.currentSubscription" class="pause-banner" :aria-label="$t('payments.pauseTitle')">
                <span class="pause-banner__icon" aria-hidden="true">
                    <i class="pi pi-shield"></i>
                </span>
        <div class="pause-banner__copy">
          <h3 class="pause-banner__title">{{ $t("payments.pauseTitle") }}</h3>
          <p class="pause-banner__text">{{ $t("payments.pauseText") }}</p>
        </div>
        <pv-button
            class="pause-banner__action"
            type="button"
            :disabled="paymentsStore.currentSubscription.cancelAtPeriodEnd || cancelling || paymentsStore.checkoutBusy"
            :label="$t('payments.cancelSubscription')"
            @click="handleCancelClick"
        />
      </section>

      <pv-message
          v-if="notice"
          class="subscription-page__notice"
          severity="success"
          :closable="false"
      >
        {{ notice }}
      </pv-message>
    </template>
  </div>
</template>

<style scoped>
:global(.payments-checkout-mask) { background: rgba(15, 23, 42, 0.65) !important; }
.subscription-page :deep(.p-card) {
  --p-card-background: #fff;
  --p-card-color: #172033;
  --p-card-shadow: none;
}
.subscription-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  max-width: 1100px;
}

.subscription-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.subscription-page__title {
  margin: 0;
  font-size: 32px;
  font-weight: 800;
  color: #111c32;
  letter-spacing: -0.02em;
}

.subscription-page__subtitle {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.55;
  color: #68758a;
  max-width: 640px;
}

.plans-section__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.plans-section__titles {
  min-width: 0;
}

.plans-section__title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #111c32;
}

.plans-section__subtitle {
  margin: 8px 0 0;
  font-size: 13px;
  color: #68758a;
}

.plans-section__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  align-items: start;
  gap: 16px;
  margin-top: 16px;
}

.checkout-summary { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; padding: 20px; border-radius: 14px; background: #eff6ff; color: #172033; }
.checkout-summary__icon { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; background: #dbeafe; color: #1d4ed8; font-size: 22px; }
.checkout-summary__label { margin: 0 0 4px; font-size: 12px; color: #475569; }
.checkout-summary__name { margin: 0; font-size: 22px; }
.checkout-summary__capacity { margin: 6px 0 0; font-size: 13px; color: #475569; }
.checkout-summary__price { margin: 0 0 0 auto; font-size: 28px; font-weight: 700; }
.checkout-summary__price span { display: block; text-align: right; font-size: 13px; font-weight: 400; color: #475569; }
.checkout-help { margin: 20px 0 12px; line-height: 1.6; color: #475569; }

.pause-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 22px;
  border: 1px solid #c9d8ff;
  border-radius: 16px;
  background: #eaf1ff;
}

.pause-banner__icon {
  display: grid;
  width: 44px;
  height: 44px;
  flex: none;
  place-items: center;
  border-radius: 12px;
  color: #fff;
  background: #2563eb;
}

.pause-banner__icon i {
  font-size: 20px;
}

.pause-banner__copy {
  flex: 1;
  min-width: 0;
}

.pause-banner__title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #111c32;
}

.pause-banner__text {
  margin: 4px 0 0;
  font-size: 13px;
  color: #465267;
}

.pause-banner__action {
  flex: none;
  background: #fff;
  border-color: #fff;
  color: #dc2626;
  font-weight: 700;
}

.subscription-page__state {
  padding: 16px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e6ebf2;
  font-size: 13px;
  color: #465267;
}

.subscription-page__notice {
  background: #fff;
  border: 1px solid #2563eb;
  border-radius: 8px;
  font-size: 13px;
  color: #465267;
}

button:focus-visible,
a:focus-visible {
  outline: 3px solid #60a5fa;
  outline-offset: 2px;
}

@media (max-width: 760px) {
  .subscription-page__header,
  .pause-banner {
    flex-direction: column;
    align-items: stretch;
  }

  .plans-section__head {
    flex-direction: column;
    align-items: stretch;
  }

  .pause-banner__action {
    width: 100%;
  }
}

@media (max-width: 430px) {
  .subscription-page {
    padding: 16px;
  }

  .subscription-page__title {
    font-size: 24px;
  }

  .plans-section__title {
    font-size: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
  }
}
</style>
