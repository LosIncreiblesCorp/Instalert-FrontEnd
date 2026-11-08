<script setup>
import { useI18n } from 'vue-i18n';
import { apiContext, prepareBusinessContext } from '../../infrastructure/api-context.js';
import { BaseApi } from '../../infrastructure/base-api.js';

const { t } = useI18n();
const retry = () => prepareBusinessContext(new BaseApi().http, { refresh: true });
</script>

<template>
    <section v-if="apiContext.role && apiContext.status !== 'ready'" class="connection-state" :aria-busy="apiContext.status === 'loading'">
        <pv-message :severity="apiContext.status === 'loading' ? 'info' : 'error'" :closable="false" :role="apiContext.status === 'loading' ? 'status' : 'alert'">
            {{ t(apiContext.error ?? 'api.connection.loading') }}
        </pv-message>
        <pv-button v-if="apiContext.status !== 'loading'" :label="t('api.connection.retry')" icon="pi pi-refresh" @click="retry" />
    </section>
</template>

<style scoped>
.connection-state { display: grid; justify-items: start; gap: 1rem; margin-bottom: 1.5rem; }
</style>
