<script setup>
/** Payment history table. Rows are supplied by the Payments application projection. */
import { useI18n } from "vue-i18n";
import { formatDate, formatMoney } from "../payments-format.js";

defineProps({
  payments: { type: Array, default: () => [] }
});

const { locale, t } = useI18n();

/** Formats the payment date. @param {string} iso - ISO date string. @returns {string} Formatted date. */
function formatPaymentDate(iso) {
  return formatDate(iso, locale.value);
}

/** Formats the payment amount. @param {Object} payment - Payment row. @returns {string} Formatted amount. */
function formatPaymentAmount(payment) {
  return formatMoney(payment.amount, payment.currency, locale.value);
}

/** Resolves the localized payment status label. @param {string} status - Payment status. @returns {string} Status label. */
function statusLabel(status) {
  return status === "paid" ? t("payments.statusPaid") : t(`payments.status.${status}`);
}
</script>

<template>
  <section class="billing-history" :aria-label="$t('payments.historyTitle')">
    <pv-card class="billing-history__card">
      <template #content>
        <h3 class="billing-history__title">{{ $t("payments.historyTitle") }}</h3>
        <p class="billing-history__subtitle">{{ $t("payments.historySubtitle") }}</p>
        <div class="billing-history__scroll">
          <pv-data-table
              class="billing-history__table"
              :value="payments"
              :aria-label="$t('payments.historyCaption')"
              table-style="min-width: 36rem"
          >
            <template #empty>{{ $t('payments.historyEmpty') }}</template>
            <pv-column field="reference" :header="$t('payments.colReference')" />
            <pv-column field="occurredAt" :header="$t('payments.colDate')">
              <template #body="slotProps">
                {{ formatPaymentDate(slotProps.data.occurredAt) }}
              </template>
            </pv-column>
            <pv-column field="amount" :header="$t('payments.colAmount')">
              <template #body="slotProps">
                {{ formatPaymentAmount(slotProps.data) }}
              </template>
            </pv-column>
            <pv-column field="status" :header="$t('payments.colStatus')">
              <template #body="slotProps">
                <pv-tag
                    severity="success"
                    :value="statusLabel(slotProps.data.status)"
                />
              </template>
            </pv-column>
          </pv-data-table>
        </div>
        <p class="billing-history__foot">{{ $t("payments.showingRecent", { count: payments.length }) }}</p>
      </template>
    </pv-card>
  </section>
</template>

<style scoped>
.billing-history__card {
  border: 1px solid #e6ebf2;
  border-radius: 16px;
  background: #fff;
  min-width: 0;
  box-shadow: 0 4px 12px rgb(17 28 50 / 4%);
}

.billing-history__card :deep(.p-card-body) {
  padding: 0;
}

.billing-history__title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #111c32;
  text-align: center;
}

.billing-history__subtitle {
  margin: 6px 0 0;
  font-size: 12px;
  color: #68758a;
  text-align: center;
}

.billing-history__scroll {
  overflow-x: auto;
  margin-top: 12px;
  background: #fff;
  border-radius: 8px;
}

.billing-history__table :deep(table) {
  width: 100%;
  border-collapse: collapse;
  background: #fff !important;
}

.billing-history__table :deep(thead),
.billing-history__table :deep(tbody),
.billing-history__table :deep(tfoot),
.billing-history__table :deep(tr) {
  background: #fff !important;
}

.billing-history__table :deep(th) {
  padding: 10px 12px !important;
  text-align: left !important;
  border-bottom: 1px solid #e6ebf2 !important;
  background: transparent !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
  color: #68758a !important;
  white-space: nowrap;
}

.billing-history__table :deep(td) {
  padding: 10px 12px !important;
  font-size: 13px !important;
  color: #172033 !important;
  border-bottom: 1px solid #e6ebf2 !important;
  background: transparent !important;
  white-space: nowrap;
}

.billing-history__table :deep(tr:last-child td) {
  border-bottom: 0 !important;
}

.billing-history__table :deep(.p-tag-success) {
  background: #dcfce7 !important;
  border: 0 !important;
  color: #15803d !important;
}

.billing-history__foot {
  margin: 8px 0 0;
  font-size: 11px;
  color: #68758a;
  text-align: center;
}

.billing-history__foot {
  font-weight: 700;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
  }
}
</style>
