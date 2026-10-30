<script setup>
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
defineProps({ notification: { type: Object, required: true }, routeName: { type: String, required: true } });
defineEmits(['dismiss']);
const { t } = useI18n();
</script>

<template>
  <aside class="notification-notice" :aria-label="t('notifications.newNotification')">
    <div class="notice-copy" role="status" aria-live="polite" aria-atomic="true">
      <i class="pi pi-bell" aria-hidden="true" />
      <div>
        <strong>{{ notification.type === 'NEARBY_ALERT' ? t('notifications.nearbyTitle') : notification.title || t('notifications.generalTitle') }}</strong>
        <p>{{ notification.type === 'NEARBY_ALERT' ? t('notifications.nearbyMessage') : notification.message }}</p>
      </div>
    </div>
    <button class="notice-close" type="button" :aria-label="t('notifications.dismiss')" @click="$emit('dismiss')"><i class="pi pi-times" aria-hidden="true" /></button>
    <RouterLink :to="{ name: routeName }" @click="$emit('dismiss')">{{ t('notifications.viewNotifications') }}</RouterLink>
  </aside>
</template>

<style scoped>
.notification-notice { position: fixed; z-index: 30; right: 24px; bottom: 24px; width: min(420px, calc(100vw - 32px)); padding: 22px 54px 22px 22px; border: 1px solid #cbd5e1; border-left: 4px solid #2563eb; border-radius: 14px; background: #fff; color: #172033; box-shadow: 0 8px 32px #17203326; }
.notice-copy { display: flex; align-items: flex-start; gap: 12px; }
.notice-copy > i { color: #2563eb; font-size: 22px; }
strong { line-height: 1.5; } p { margin: 6px 0 14px; line-height: 1.5; color: #475569; }
a { display: inline-block; min-height: 32px; color: #1d4ed8; font-weight: 600; }
.notice-close { position: absolute; top: 6px; right: 6px; width: 44px; height: 44px; border: 0; background: transparent; border-radius: 50%; color: #475569; cursor: pointer; }
a:focus-visible, button:focus-visible { outline: 3px solid #2563eb; outline-offset: 3px; }
@media (max-width: 640px) { .notification-notice { right: 16px; bottom: 16px; } }
</style>
