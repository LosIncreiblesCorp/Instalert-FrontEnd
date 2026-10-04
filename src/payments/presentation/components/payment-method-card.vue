<script setup>
/** Saved payment method card showing only the last 4 digits. */
// Simulated saved payment method: only the last 4 digits are displayed.
// Card numbers are never requested, processed or stored.
defineProps({
  paymentMethod: { type: Object, default: null }
});
</script>

<template>
  <section class="method-card" :aria-label="$t('payments.methodTitle')">
    <pv-card class="method-card__card">
      <template #content>
        <div class="method-card__head">
          <h3 class="method-card__title">{{ $t("payments.methodTitle") }}</h3>
          <pv-tag
              class="method-card__primary"
              severity="info"
              :value="$t('payments.methodPrimary')"
          />
        </div>
        <div v-if="paymentMethod" class="method-card__visual" aria-hidden="true">
          <p class="method-card__brand">{{ paymentMethod.brand }}</p>
          <p class="method-card__number">•••• •••• •••• {{ paymentMethod.last4 }}</p>
          <div class="method-card__foot">
            <p class="method-card__holder">{{ paymentMethod.holderName }}</p>
            <p class="method-card__expiry">{{ paymentMethod.expiry }}</p>
          </div>
        </div>
        <p v-if="paymentMethod" class="sr-only">
          {{ paymentMethod.brand }} {{ $t("payments.methodPrimary") }},
          •••• {{ paymentMethod.last4 }}
        </p>
        <div class="method-card__actions">
          <pv-button
              type="button"
              severity="secondary"
              text
              :label="$t('payments.methodChangeCard')"
          />
        </div>
      </template>
    </pv-card>
  </section>
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

.method-card__card {
  border: 1px solid #e6ebf2;
  border-radius: 16px;
  background: #fff;
  min-width: 0;
  box-shadow: 0 4px 12px rgb(17 28 50 / 4%);
}

.method-card__card :deep(.p-card-body) {
  padding: 0;
}

.method-card__head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.method-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  color: #111c32;
}

.method-card__primary {
  background: #e7edff;
  border: 0;
  color: #2563eb;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.method-card__visual {
  margin-top: 14px;
  padding: 18px;
  border: 1px solid #c9d8ff;
  border-radius: 12px;
  background: #f0f4ff;
  color: #111c32;
  text-align: center;
}

.method-card__brand {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  font-style: italic;
  letter-spacing: 0.12em;
  color: #2563eb;
}

.method-card__number {
  margin: 14px 0 0;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #111c32;
}

.method-card__foot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-top: 14px;
}

.method-card__holder,
.method-card__expiry {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #465267;
}

.method-card__actions {
  display: flex;
  justify-content: center;
  margin-top: 6px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
  }
}
</style>
