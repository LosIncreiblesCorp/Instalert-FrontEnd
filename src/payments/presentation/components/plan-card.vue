<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { planPrice, formatMoney } from "../payments-format.js";

const props = defineProps({
  plan: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  selecting: { type: Boolean, default: false },
  billingCycle: { type: String, default: "monthly" },
  currency: { type: String, default: "PEN" },
  accent: { type: Boolean, default: false },
  // UI-level guard only: the quota counts active employees.
  // The definitive validation belongs to the backend.
  blocked: { type: Boolean, default: false },
  assignedOperators: { type: Number, default: 0 }
});

defineEmits(["select"]);

const { locale, te, t } = useI18n();

const tierIcons = {
  basic: "pi pi-store",
  professional: "pi pi-briefcase",
  enterprise: "pi pi-building"
};

const detailsOpen = ref(false);
const detailsId = computed(() => `plan-details-${props.plan.id}`);
const blockedHintId = computed(() => `plan-blocked-${props.plan.id}`);

const tierKey = computed(() => `payments.tiers.${props.plan.id}`);
const eyebrow = computed(() => (te(`${tierKey.value}.eyebrow`) ? t(`${tierKey.value}.eyebrow`) : ""));
const description = computed(() => (te(`${tierKey.value}.description`) ? t(`${tierKey.value}.description`) : ""));
const tierIcon = computed(() => tierIcons[props.plan.id] ?? "pi pi-shield");

const rawPrice = computed(() => planPrice(props.plan, props.currency, props.billingCycle));

const displayPrice = computed(() =>
    formatMoney(rawPrice.value, props.currency, locale.value)
);

const suffix = computed(() =>
    props.billingCycle === "annual" ? t("payments.perYear") : t("payments.perMonth")
);

const legend = computed(() =>
    props.billingCycle === "annual"
        ? t("payments.netBillingAnnual")
        : t("payments.netBillingMonthly")
);

const isDisabled = computed(() => props.selected || props.selecting || props.blocked);

const ctaLabel = computed(() => {
  if (props.selected) return t("payments.inUse");
  if (props.blocked) return t("payments.planBlocked");
  if (props.accent) return t("payments.upgradePlan", { name: props.plan.name });
  return t("payments.changePlan");
});
</script>

<template>
  <pv-card class="plan-card" :class="{ 'plan-card--selected': selected }" :aria-label="plan.name">
    <template #content>
      <p v-if="selected" class="plan-card__band">{{ $t("payments.recommendedBand") }}</p>
      <div class="plan-card__eyebrow-row">
        <p class="plan-card__eyebrow">{{ eyebrow }}</p>
        <i :class="tierIcon" aria-hidden="true"></i>
      </div>
      <h3 class="plan-card__name">{{ plan.name }}</h3>
      <p class="plan-card__description">{{ description }}</p>
      <p class="plan-card__price">
                <span class="plan-card__amount" :class="{ 'plan-card__amount--selected': selected }">
                    {{ displayPrice }}
                </span>
        <span class="plan-card__suffix">{{ suffix }}</span>
      </p>
      <p class="plan-card__legend">{{ legend }}</p>
      <pv-button
          class="plan-card__details-toggle"
          text
          :label="detailsOpen ? $t('payments.hideDetails') : $t('payments.showDetails')"
          :aria-expanded="detailsOpen"
          :aria-controls="detailsId"
          @click="detailsOpen = !detailsOpen"
      />
      <ul v-if="detailsOpen" :id="detailsId" class="plan-card__details" :aria-label="$t('payments.planDetailsLabel')">
        <li>
          <i class="pi pi-users" aria-hidden="true"></i>
          {{ $t("payments.upToEmployees", { count: plan.maxEmployees }) }}
        </li>
        <li v-for="feature in (plan.features ?? [])" :key="feature">
          <i class="pi pi-check" aria-hidden="true"></i>
          {{ $t(`payments.features.${feature}`) }}
        </li>
      </ul>
      <pv-message
          v-if="blocked && !selected"
          :id="blockedHintId"
          class="plan-card__blocked-hint"
          severity="info"
          :closable="false"
      >
        {{ $t("payments.blockedHint", { assigned: assignedOperators, limit: plan.maxEmployees }) }}
      </pv-message>
      <pv-button
          class="plan-card__action"
          :class="selected ? 'plan-card__action--inuse' : blocked ? 'plan-card__action--blocked' : accent ? 'plan-card__action--dark' : 'plan-card__action--light'"
          type="button"
          :icon="selected ? 'pi pi-check' : ''"
          :disabled="isDisabled"
          :aria-describedby="blocked && !selected ? blockedHintId : undefined"
          :label="ctaLabel"
          @click="$emit('select', plan.id)"
      />
    </template>
  </pv-card>
</template>

<style scoped>
.plan-card {
  position: relative;
  border: 1px solid #e6ebf2;
  border-radius: 16px;
  background: #fff;
  min-width: 0;
  box-shadow: 0 4px 12px rgb(17 28 50 / 4%);
}

.plan-card :deep(.p-card-body) {
  padding: 0;
}

.plan-card :deep(.p-card-content) {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  padding: 22px 20px 20px;
}

.plan-card--selected {
  border: 2px solid #2563eb;
  box-shadow: 0 12px 32px rgb(37 99 235 / 14%);
}

.plan-card__band {
  margin: -22px -20px 0;
  padding: 5px 12px;
  border-radius: 13px 13px 0 0;
  background: #2563eb;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-align: center;
}

.plan-card__eyebrow-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.plan-card__eyebrow-row i {
  color: #2563eb;
  font-size: 18px;
}

.plan-card__eyebrow {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #68758a;
}

.plan-card__name {
  margin: 10px 0 0;
  font-size: 20px;
  font-weight: 800;
  color: #111c32;
}

.plan-card__description {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: #68758a;
}

.plan-card__price {
  margin: 14px 0 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.plan-card__amount {
  font-size: 30px;
  font-weight: 800;
  color: #111c32;
}

.plan-card__amount--selected {
  color: #2563eb;
}

.plan-card__suffix {
  font-size: 12px;
  font-weight: 600;
  color: #68758a;
}

.plan-card__legend {
  margin: 10px 0 0;
  font-size: 11px;
  color: #68758a;
}

.plan-card__details-toggle {
  align-self: flex-start;
  margin-top: 4px;
  padding-left: 0;
  font-size: 12px;
  font-weight: 700;
  color: #2563eb;
  text-decoration: underline;
}

.plan-card__details {
  margin: 4px 0 0;
  padding: 10px 12px;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-radius: 8px;
  background: #f4f7fb;
  font-size: 12px;
  color: #465267;
}

.plan-card__details li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.plan-card__details i {
  color: #2563eb;
  font-size: 11px;
}

.plan-card__blocked-hint {
  margin-top: 4px;
  background: #eaf1ff;
  border: 1px solid #c9d8ff;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #1d4ed8;
}

.plan-card__action {
  margin-top: auto;
  width: 100%;
}

.plan-card__action--light {
  background: #eaf1ff;
  border-color: #eaf1ff;
  color: #1d4ed8;
}

.plan-card__action--dark {
  background: #111c32;
  border-color: #111c32;
  color: #fff;
}

.plan-card__action--inuse {
  background: #f0f4ff;
  border-color: #c9d8ff;
  color: #2563eb;
}

.plan-card__action--blocked {
  background: #f1f4f9;
  border-color: #e6ebf2;
  color: #68758a;
}

@media (max-width: 430px) {
  .plan-card__amount {
    font-size: 25px;
  }

  .plan-card__name {
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
