<template>
  <section :aria-label="$t('payments.methodTitle')">
    <pv-card>
      <template #content>
        <h3>{{ $t('payments.methodTitle') }}</h3>
        <p><strong>PayPal Sandbox</strong></p>
        <p>{{ $t('payments.paypal.fundingHelp') }}</p>
        <a href="https://www.sandbox.paypal.com/myaccount/autopay/connect/" target="_blank" rel="noopener noreferrer">
          {{ $t('payments.paypal.manageFunding') }}
        </a>
      </template>
    </pv-card>
  </section>
</template>

<style scoped>
a { color: #1d4ed8; }
a:focus-visible { outline: 3px solid #2563eb; outline-offset: 3px; }
p { line-height: 1.6; }
</style>
