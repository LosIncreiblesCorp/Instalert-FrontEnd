<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { createPayPalButtons, isPayPalConfigured } from '../../infrastructure/paypal-subscriptions.js';
import { currentContextRevision } from '../../../shared/infrastructure/api-context.js';
import { usePaymentsStore } from '../../application/payments.store.js';

const props = defineProps({ planId: { type: String, required: true } });
const emit = defineEmits(['approved']);
const contextRevision = currentContextRevision();
const store = usePaymentsStore();
const container = ref(null);
const loading = ref(false);
const failed = ref(false);
let buttons;
let disposed = false;

async function renderButtons() {
  loading.value = true;
  failed.value = false;
  try {
    buttons = await createPayPalButtons({
      getCheckout: () => store.beginCheckout(props.planId),
      isCurrent: () => !disposed && contextRevision === currentContextRevision(),
      beforeApprove: () => store.preparePayPalCheckout(props.planId),
      onApproved: async approval => {
        if (await store.recordPayPalApproval(approval)) emit('approved');
      },
      onCancel: () => store.setCheckoutOutcome('canceled'),
      onError: () => store.setCheckoutOutcome('error')
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
});
</script>

<template>
  <section :aria-label="$t('payments.paypal.checkoutTitle')" :aria-busy="loading || store.checkoutBusy">
    <p v-if="loading" role="status">{{ $t('payments.paypal.loading') }}</p>
    <pv-message v-if="failed" severity="error" :closable="false" role="alert">
      {{ $t(isPayPalConfigured() ? 'payments.paypal.loadError' : 'payments.paypal.configurationError') }}
    </pv-message>
    <pv-button v-if="failed" :label="$t('payments.paypal.retry')" @click="renderButtons" />
    <div ref="container" class="paypal-button" />
  </section>
</template>

<style scoped>
.paypal-button { width: 100%; margin-top: 16px; }
</style>
