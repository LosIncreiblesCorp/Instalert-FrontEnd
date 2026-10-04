<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { formatDate, formatMoney, planPrice } from "../payments-format.js";

const props = defineProps({
  subscription: { type: Object, required: true },
  plan: { type: Object, default: null },
  currency: { type: String, default: "PEN" },
  assignedOperators: { type: Number, default: 0 }
});

const { locale } = useI18n();

const limit = computed(() => props.subscription.maxEmployees ?? 0);
const percent = computed(() =>
    limit.value > 0 ? Math.min(100, Math.round((props.assignedOperators / limit.value) * 100)) : 0
);

const rateText = computed(() =>
    props.plan ? formatMoney(planPrice(props.plan, props.currency), props.currency, locale.value) : ""
);

const renewalDate = computed(() => formatDate(props.subscription.currentPeriodEnd, locale.value));

const daysLeft = computed(() => {
  if (!props.subscription.currentPeriodEnd) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(props.subscription.currentPeriodEnd);
  return Math.max(0, Math.ceil((end - today) / 86400000));
});
</script>

<template>
  <section class="current-sub" :aria-label="$t('payments.currentSubscription')">
    <pv-card class="current-sub__card">
      <template #content>
        <h3 class="visually-hidden">{{ $t("payments.currentSubscription") }}</h3>
        <div class="current-sub__top">
          <div class="current-sub__identity">
                        <span class="current-sub__shield" aria-hidden="true">
                            <i class="pi pi-shield"></i>
                        </span>
            <div class="current-sub__idblock">
              <div class="current-sub__namerow">
                <p class="current-sub__plan">{{ plan?.name ?? "" }}</p>
                <pv-tag
                    v-if="subscription.status === 'active'"
                    class="current-sub__badge"
                    severity="info"
                    :value="$t('payments.currentPlanBadge')"
                />
              </div>
              <p class="current-sub__license">
                {{ $t("payments.licenseLabel") }} {{ $t("payments.licenseIdValue") }}
              </p>
              <p class="current-sub__status">
                {{ $t(`payments.status.${subscription.status}`) }}
              </p>
            </div>
          </div>
          <div class="current-sub__rate">
            <p class="current-sub__rate-label">{{ $t("payments.currentRate") }}</p>
            <p class="current-sub__rate-price">
              {{ rateText }} <span>{{ $t("payments.perMonth") }}</span>
            </p>
            <p class="current-sub__rate-renew">
              {{ $t("payments.renewal", { date: renewalDate, count: daysLeft }) }}
            </p>
          </div>
        </div>

        <div class="current-sub__metrics">
          <div class="metric">
            <p class="metric__eyebrow">{{ $t("payments.operatorsTitle") }}</p>
            <p class="metric__value">{{ assignedOperators }} / {{ limit }}</p>
            <pv-progress-bar
                class="metric__bar"
                :value="percent"
                :show-value="false"
                :aria-label="$t('payments.operatorsTitle')"
            />
            <p class="metric__caption">{{ $t("payments.operatorsAssigned", { percent }) }}</p>
            <p class="metric__limit">{{ $t("payments.memberLimit", { count: limit }) }}</p>
          </div>
          <!-- Radio perimetral omitida: no existe ese campo en el modelo de Payments
               y no se inventa sin confirmación del equipo. -->
        </div>

        <pv-message
            v-if="subscription.cancelAtPeriodEnd"
            class="current-sub__cancel-notice"
            severity="warn"
            :closable="false"
        >
          <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>
          {{ $t("payments.cancelScheduled") }}
        </pv-message>
      </template>
    </pv-card>
  </section>
</template>

<style scoped>
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

.current-sub__card {
  position: relative;
  overflow: hidden;
  border: 1px solid #e6ebf2;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgb(17 28 50 / 6%);
}

.current-sub__card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 4px;
  background: linear-gradient(90deg, #2563eb, #60a5fa);
}

.current-sub__card :deep(.p-card-body) {
  padding: 0;
}

.current-sub__card :deep(.p-card-content) {
  padding: 24px;
}

.current-sub__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.current-sub__identity {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
}

.current-sub__shield {
  display: grid;
  width: 48px;
  height: 48px;
  flex: none;
  place-items: center;
  border-radius: 12px;
  color: #fff;
  background: #111c32;
}

.current-sub__shield i {
  font-size: 22px;
}

.current-sub__namerow {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.current-sub__plan {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: #111c32;
}

.current-sub__badge {
  background: #e7edff;
  border: 0;
  color: #2563eb;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.current-sub__license {
  margin: 6px 0 0;
  font-size: 12px;
  color: #68758a;
}

.current-sub__status {
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: #465267;
}

.current-sub__rate {
  min-width: 220px;
  padding: 16px 20px;
  border-radius: 12px;
  background: #f0f4ff;
}

.current-sub__rate-label {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #68758a;
}

.current-sub__rate-price {
  margin: 6px 0 0;
  font-size: 32px;
  font-weight: 800;
  color: #111c32;
}

.current-sub__rate-price span {
  font-size: 13px;
  font-weight: 600;
  color: #68758a;
}

.current-sub__rate-renew {
  margin: 6px 0 0;
  font-size: 12px;
  color: #465267;
}

.current-sub__metrics {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-top: 16px;
  padding: 16px;
  border-radius: 12px;
  background: #f4f7fb;
}

.metric {
  padding: 16px 18px;
  border: 1px solid #e6ebf2;
  border-radius: 12px;
  background: #fff;
}

.metric__eyebrow {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #68758a;
}

.metric__value {
  margin: 8px 0 0;
  font-size: 24px;
  font-weight: 800;
  color: #111c32;
}

.metric__bar {
  height: 8px;
  margin-top: 10px;
  border: 0;
  border-radius: 999px;
  background: #e6ebf2;
  overflow: hidden;
}

.metric__bar :deep(.p-progressbar-value) {
  background: #2563eb;
  border-radius: 999px;
}

.metric__caption {
  margin: 8px 0 0;
  font-size: 12px;
  font-weight: 700;
  color: #2563eb;
}

.metric__limit {
  margin: 6px 0 0;
  font-size: 12px;
  color: #68758a;
}

.current-sub__cancel-notice {
  margin-top: 16px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #9a3412;
}

@media (max-width: 760px) {
  .current-sub__top {
    flex-direction: column;
  }

  .current-sub__rate {
    width: 100%;
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
