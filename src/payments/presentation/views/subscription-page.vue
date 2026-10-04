<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useConfirm } from "primevue/useconfirm";
import { usePaymentsStore } from "../../application/payments.store.js";
import { planPrice, formatMoney } from "../payments-format.js";
import PlanCard from "../components/plan-card.vue";
import SubscriptionSummary from "../components/subscription-summary.vue";
import PaymentMethodCard from "../components/payment-method-card.vue";
import BillingHistory from "../components/billing-history.vue";

const paymentsStore = usePaymentsStore();
const { locale, t } = useI18n();
const confirm = useConfirm();

const selectingPlanId = ref(null);
const cancelling = ref(false);
const notice = ref("");
// Simulated billing-cycle toggle: visual only, it just re-renders plan prices.
const billingCycle = ref("monthly");
const currency = ref("PEN");
const currencyOptions = computed(() => [
  { label: t("payments.currencySoles"), value: "PEN" },
  { label: t("payments.currencyDollars"), value: "USD" }
]);

const currentPlan = computed(() => paymentsStore.currentPlan ?? null);
const assignedOperators = computed(() => paymentsStore.assignedOperators);

const billingOptions = computed(() => [
  { label: t("payments.billingMonthly"), value: "monthly" },
  { label: t("payments.billingAnnual"), value: "annual", hint: t("payments.billingAnnualDiscount") }
]);

const topPlanId = computed(() => {
  if (paymentsStore.plans.length === 0) return null;
  return [...paymentsStore.plans].sort((a, b) => (b.price ?? 0) - (a.price ?? 0))[0].id;
});

function isBlocked(plan) {
  return !paymentsStore.seatUsageAvailable || plan.maxEmployees < assignedOperators.value;
}

function formatPlanPrice(plan, cycle) {
  return formatMoney(planPrice(plan, currency.value, cycle), currency.value, locale.value);
}

onMounted(() => {
  paymentsStore.fetchPaymentsData();
});

function handleSelectRequest(planId) {
  const next = paymentsStore.plans.find((p) => p.id === planId);
  if (!next || isBlocked(next)) return;
  confirm.require({
    message: t("payments.confirmPlanMessage", {
      current: currentPlan.value?.name ?? "",
      next: next.name,
      price: formatPlanPrice(next, billingCycle.value)
    }),
    header: t("payments.confirmPlanTitle"),
    icon: "pi pi-exclamation-triangle",
    acceptLabel: t("payments.confirmAccept"),
    rejectLabel: t("payments.confirmReject"),
    accept: async () => {
      selectingPlanId.value = planId;
      notice.value = "";
      const applied = await paymentsStore.selectPlan(planId);
      if (applied) notice.value = t("payments.planUpdatedTo", { name: next.name });
      selectingPlanId.value = null;
    }
  });
}

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

    <template v-else>
      <SubscriptionSummary
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

          <div class="billing-toggle">
            <span id="plan-currency-label" class="sr-only">{{ $t("payments.currencyLabel") }}</span>
            <pv-select-button
                v-model="currency"
                :options="currencyOptions"
                option-label="label"
                option-value="value"
                :allow-empty="false"
                aria-labelledby="plan-currency-label"
            />
            <span id="billing-cycle-label" class="sr-only">
              {{ $t("payments.billingToggleLabel") }}
            </span>
            <pv-select-button
                v-model="billingCycle"
                :options="billingOptions"
                option-label="label"
                option-value="value"
                :allow-empty="false"
                aria-labelledby="billing-cycle-label"
            >
              <template #option="{ option }">
                <span>{{ option.label }}</span>
                <span v-if="option.hint" class="billing-toggle__discount">{{ option.hint }}</span>
              </template>
            </pv-select-button>
          </div>
        </div>

        <div class="plans-section__grid">
          <PlanCard
              v-for="plan in paymentsStore.plans"
              :key="plan.id"
              :plan="plan"
              :selected="plan.id === paymentsStore.currentSubscription.planId"
              :selecting="selectingPlanId === plan.id"
              :billing-cycle="billingCycle"
              :currency="currency"
              :accent="plan.id === topPlanId"
              :blocked="plan.id !== paymentsStore.currentSubscription.planId && isBlocked(plan)"
              :assigned-operators="assignedOperators"
              @select="handleSelectRequest"
          />
        </div>
      </section>

      <div class="billing-row">
        <PaymentMethodCard :payment-method="paymentsStore.paymentMethod" />
        <BillingHistory :invoices="paymentsStore.invoices" />
      </div>

      <section class="pause-banner" :aria-label="$t('payments.pauseTitle')">
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
            :disabled="paymentsStore.currentSubscription.cancelAtPeriodEnd || cancelling"
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
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}
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

.billing-toggle {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.billing-toggle :deep(.p-selectbutton) {
  display: inline-flex;
  padding: 4px;
  border: 1px solid #e6ebf2;
  border-radius: 999px;
  background: #fff;
  gap: 2px;
}

.billing-toggle :deep(.p-togglebutton) {
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #465267;
  font-size: 13px;
  font-weight: 700;
  padding: 8px 16px;
  box-shadow: none;
}

.billing-toggle :deep([data-p-checked="true"]) {
  background: #111c32;
  border-color: #111c32;
  color: #fff;
}

.billing-toggle :deep(.p-togglebutton:hover) {
  background: #eaf1ff;
  border-color: #eaf1ff;
  color: #1d4ed8;
}

.billing-toggle :deep([data-p-checked="true"]:hover) {
  background: #243357;
  border-color: #243357;
  color: #fff;
}

.billing-toggle :deep([data-p-checked="true"]) .billing-toggle__discount {
  background: #10b981;
  color: #fff;
}

.billing-toggle__discount {
  padding: 2px 8px;
  border-radius: 999px;
  background: #10b981;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
}

.plans-section__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  align-items: start;
  gap: 16px;
  margin-top: 16px;
}

.billing-row {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 16px;
  align-items: start;
}

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

  .billing-toggle {
    align-self: flex-start;
  }

  .billing-row {
    grid-template-columns: 1fr;
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
