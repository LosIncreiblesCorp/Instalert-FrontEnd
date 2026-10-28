<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { createPayPalButtons, isPayPalConfigured } from '../../infrastructure/paypal-subscriptions.js';
import { usePaymentsStore } from '../../application/payments.store.js';

const props = defineProps({ planId: { type: String, required: true } });
const emit = defineEmits(['busy', 'approved']);
const store = usePaymentsStore();
const container = ref(null);
const loading = ref(false);
const failed = ref(false);
let buttons;
let disposed = false;

function setBusy(value) {
  store.checkoutBusy = value;
  emit('busy', value);
}

async function renderButtons() {
  loading.value = true;
  failed.value = false;
  try {
    buttons = await createPayPalButtons({
      planId: props.planId,
      beforeApprove: () => store.preparePayPalCheckout(props.planId),
      onApproved: approval => {
        store.recordPayPalApproval(approval);
        if (store.checkoutOutcome === 'approved') emit('approved');
      },
      onCancel: () => store.setCheckoutOutcome('canceled'),
      onError: () => store.setCheckoutOutcome('error'),
      onBusy: setBusy
    });
    if (disposed) { await buttons.close(); return; }
    if (!buttons.isEligible()) throw new Error('PayPal is unavailable.');
    await buttons.render(container.value);
  } catch {
    if (!disposed) failed.value = true;
    try { await buttons?.close(); } catch { /* SDK cleanup is best effort. */ }
  } finally {
    if (!disposed) loading.value = false;
  }
}

onMounted(renderButtons);
onBeforeUnmount(() => {
  disposed = true;
  Promise.resolve(buttons?.close()).catch(() => {});
  setBusy(false);
});
</script>

<template>
  <section :aria-label="$t('payments.paypal.checkoutTitle')" :aria-busy="loading || store.checkoutBusy">
    <p v-if="loading" role="status">{{ $t('payments.paypal.loading') }}</p>
    <pv-message v-if="failed" severity="error" :closable="false" role="alert">
      {{ $t(isPayPalConfigured(planId) ? 'payments.paypal.loadError' : 'payments.paypal.configurationError') }}
    </pv-message>
    <pv-button v-if="failed" :label="$t('payments.paypal.retry')" @click="renderButtons" />
    <div ref="container" class="paypal-button" />
  </section>
</template>

<style scoped>
.paypal-button { width: 100%; margin-top: 16px; }
</style>
