<template>
  <section class="dashboard-page" aria-labelledby="dashboard-title">
    <header class="page-header">
      <div><p class="eyebrow"><i class="pi pi-chart-line" aria-hidden="true"></i>{{ t(isAdministrator ? 'roles.administrator' : 'roles.employee') }}</p>
        <h1 id="dashboard-title">{{ t(isAdministrator ? 'dashboard.adminTitle' : 'dashboard.employeeTitle') }}</h1>
        <p class="page-description">{{ t(isAdministrator ? 'dashboard.adminDescription' : 'dashboard.employeeDescription') }}</p>
        <p v-if="summary" class="business-context"><i class="pi pi-building" aria-hidden="true"></i>{{ summary.businessName || t('dashboard.business') }}</p>
        <p class="month-context">{{ t('dashboard.thisMonth') }}<span v-if="summary"> · {{ formatMonth(summary.period.start) }}</span></p>
      </div>
      <div class="page-actions"><pv-button v-if="isAdministrator" type="button" outlined icon="pi pi-file" :label="t('dashboard.monthly.title')" @click="router.push({ name: 'admin-monthly-reports' })" />
        <pv-button type="button" icon="pi pi-refresh" :label="t('dashboard.refresh')" :loading="store.isSummaryLoading" :disabled="store.isSummaryLoading" @click="reload" />
      </div>
    </header>

    <p v-if="summary" class="snapshot-note">{{ t('dashboard.updatedAt', { date: formatDate(summary.refreshedAt) }) }} · {{ t('dashboard.periodRange', { start: formatDay(summary.period.start), end: formatDay(new Date(Date.parse(summary.period.end) - 1)) }) }}</p>
    <pv-message v-if="store.summaryError" severity="error" :closable="false" role="alert">{{ t(store.summaryError) }} <button type="button" class="text-link" :disabled="store.isSummaryLoading" @click="reload">{{ t('dashboard.retry') }}</button></pv-message>
    <p v-if="store.isSummaryLoading" class="loading-note" role="status"><i class="pi pi-spin pi-spinner" aria-hidden="true"></i>{{ t('dashboard.loading') }}</p>
    <template v-if="summary">
      <pv-message v-if="summary.warnings.length" severity="warn" :closable="false"><strong>{{ t('dashboard.partialData') }}</strong><ul class="warning-list"><li v-for="warning in summary.warnings" :key="warning">{{ t('dashboard.warnings.' + warning) }}</li></ul></pv-message>
      <div class="metric-grid">
        <article v-for="card in cards" :key="card.key" class="metric-card">
          <div class="metric-heading"><span>{{ card.label }}</span><i :class="card.icon" aria-hidden="true"></i></div>
          <p class="metric-value" :class="card.color">{{ card.value }}</p>
          <p class="metric-context">{{ card.hint }}</p>
          <RouterLink :to="{ name: card.routeName }" class="card-link">{{ card.action }}<i class="pi pi-arrow-right" aria-hidden="true"></i></RouterLink>
        </article>
      </div>
      <div v-if="isAdministrator" class="support-grid">
        <section class="support-card" aria-labelledby="capacity-title"><div class="section-heading"><h2 id="capacity-title">{{ t('dashboard.staff.title') }}</h2><i class="pi pi-users" aria-hidden="true"></i></div>
          <dl class="capacity-values"><div><dt>{{ t('dashboard.staff.active') }}</dt><dd>{{ number(summary.staff?.active) }}</dd></div><div><dt>{{ t('dashboard.staff.pending') }}</dt><dd>{{ number(summary.staff?.pending) }}</dd></div><div><dt>{{ t('dashboard.staff.limit') }}</dt><dd>{{ number(summary.staff?.limit) }}</dd></div></dl>
          <template v-if="summary.seatUsagePercent !== null"><pv-progress-bar :value="Math.min(100, summary.seatUsagePercent)" :show-value="false" :aria-label="t('dashboard.staff.usage', { percent: summary.seatUsagePercent })" /><p class="support-description">{{ t('dashboard.staff.usage', { percent: summary.seatUsagePercent }) }}</p></template>
          <p v-else class="support-description">{{ t(summary.staff?.limit === 0 ? 'dashboard.staff.noCapacity' : 'dashboard.unavailable') }}</p>
          <p class="support-description">{{ t('dashboard.staff.rule') }}</p><pv-message v-if="summary.staff?.overCapacity" severity="warn" :closable="false">{{ t('dashboard.staff.overCapacity') }}</pv-message>
        </section>
        <section class="support-card" aria-labelledby="subscription-title"><div class="section-heading"><h2 id="subscription-title">{{ t('dashboard.subscription.title') }}</h2><i class="pi pi-credit-card" aria-hidden="true"></i></div>
          <template v-if="summary.subscription"><p class="plan-name">{{ summary.subscription.name || t('dashboard.subscription.noPlan') }}</p><p class="support-description">{{ subscriptionStatus(summary.subscription.status) }}</p>
            <p v-if="summary.subscription.currentPeriodEnd" class="support-description">{{ t('dashboard.subscription.periodEnd', { date: formatDay(summary.subscription.currentPeriodEnd) }) }}</p>
            <p v-if="summary.subscription.cancelAtPeriodEnd" class="support-description">{{ t('dashboard.subscription.cancellation') }}</p>
          </template><p v-else class="support-description">{{ t('dashboard.unavailable') }}</p>
          <RouterLink :to="{ name: 'admin-subscription' }" class="card-link">{{ t('dashboard.subscription.open') }}<i class="pi pi-arrow-right" aria-hidden="true"></i></RouterLink>
        </section>
      </div>
      <div class="charts-grid">
        <DashboardChart v-for="item in chartItems" :key="item.key" :id="'dashboard-' + item.key" :type="item.key === 'daily' ? 'line' : 'bar'" :horizontal="item.key === 'categories'"
          :title="item.title" :description="item.description" :series="chartSeries(item.key)" />
        <section class="support-card" aria-labelledby="risk-zones-title"><div class="section-heading"><h2 id="risk-zones-title">{{ t('dashboard.zones.title') }}</h2><i class="pi pi-map" aria-hidden="true"></i></div><p class="support-description">{{ t('dashboard.zones.help') }}</p>
          <p v-if="summary.riskZones === null" class="empty-note">{{ t('dashboard.unavailable') }}</p><p v-else-if="!summary.riskZones.length" class="empty-note">{{ t('dashboard.zones.empty') }}</p>
          <ul v-else class="zone-list"><li v-for="zone in summary.riskZones" :key="zone.id"><div><strong>{{ zone.name || t('dashboard.zones.unnamed') }}</strong><span class="zone-risk" :class="'risk-' + (zone.riskLevel ?? 'unknown')">{{ riskLabel(zone.riskLevel) }}</span></div><span>{{ t('dashboard.zones.incidents', { count: number(zone.incidentCount) }) }}</span></li></ul>
          <RouterLink :to="{ name: isAdministrator ? 'admin-risk-map' : 'employee-risk-map' }" class="card-link">{{ t('dashboard.openMap') }}<i class="pi pi-arrow-right" aria-hidden="true"></i></RouterLink>
        </section>
      </div>
      <section class="support-card activity-card" aria-labelledby="activity-title"><div class="section-heading"><h2 id="activity-title">{{ t('dashboard.activity.title') }}</h2><span class="active-count">{{ t('dashboard.activity.active', { count: number(summary.metrics.activeAlerts) }) }}</span></div><p class="support-description">{{ t('dashboard.activity.help') }}</p>
        <p v-if="summary.activity === null" class="empty-note">{{ t('dashboard.unavailable') }}</p><p v-else-if="!summary.activity.length" class="empty-note">{{ t('dashboard.activity.empty') }}</p>
        <div v-else class="activity-table"><table><caption class="sr-only">{{ t('dashboard.activity.title') }}</caption><thead><tr><th scope="col">{{ t('dashboard.activity.kind') }}</th><th scope="col">{{ t('dashboard.activity.category') }}</th><th scope="col">{{ t('dashboard.activity.status') }}</th><th scope="col">{{ t('dashboard.activity.date') }}</th></tr></thead><tbody><tr v-for="item in summary.activity" :key="item.id"><td>{{ kindLabel(item.kind) }}</td><td>{{ categoryLabel(item.category) }}</td><td><span class="status-label" :class="item.status === 'active' ? 'status-active' : ''">{{ statusLabel(item.status) }}</span></td><td>{{ formatDate(item.registeredAt) }}</td></tr></tbody></table></div>
        <RouterLink :to="{ name: isAdministrator ? 'admin-alerts-history' : 'employee-alerts' }" class="card-link">{{ t('dashboard.activity.open') }}<i class="pi pi-arrow-right" aria-hidden="true"></i></RouterLink>
      </section>
      <p class="quality-note">{{ t('dashboard.quality', { location: number(summary.metrics.invalidLocationReports), date: number(summary.metrics.undatedReports) }) }}</p>
    </template>
  </section>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { useDashboardStore } from '../../application/dashboard.store.js';
import { dashboardTimeZone } from '../../domain/model/dashboard-summary.entity.js';
import DashboardChart from '../components/dashboard-chart.vue';
const route = useRoute(), router = useRouter(), store = useDashboardStore();
const { t, te, locale } = useI18n();
const summary = computed(() => store.summary);
const isAdministrator = computed(() => route.meta.role === 'administrator');
function number(value) { return value === null || value === undefined ? '—' : new Intl.NumberFormat(locale.value === 'es' ? 'es-419' : 'en-US').format(value); }
function formatDate(value) { return value == null ? t('dashboard.unavailable') : new Intl.DateTimeFormat(locale.value === 'es' ? 'es-419' : 'en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: dashboardTimeZone }).format(new Date(value)); }
function formatDay(value) { return new Intl.DateTimeFormat(locale.value === 'es' ? 'es-419' : 'en-US', { dateStyle: 'medium', timeZone: dashboardTimeZone }).format(new Date(value)); }
const formatMonth = value => new Intl.DateTimeFormat(locale.value === 'es' ? 'es-419' : 'en-US', { month: 'long', year: 'numeric', timeZone: dashboardTimeZone }).format(new Date(value));
function translated(prefix, value, fallback = 'unknown') { return t(prefix + (te(prefix + value) ? value : fallback)); }
const riskLabel = risk => translated('dashboard.risk.', risk);
const statusLabel = status => translated('dashboard.status.', status);
const categoryLabel = category => translated('mapping.incidentCategories.', category, 'other');
const kindLabel = kind => translated('dashboard.kind.', kind);
const subscriptionStatus = status => translated('dashboard.subscription.status.', status);
const colors = { low: '#10b981', medium: '#d97706', high: '#dc2626', unknown: '#64748b' };
const chartSources = { daily: 'daily', categories: 'categories', statuses: 'statuses', risk: 'riskCounts', hourly: 'hourly' };
const chartItems = computed(() => (isAdministrator.value ? ['daily', 'categories', 'statuses', 'risk', 'hourly'] : ['daily', 'statuses']).map(key => ({ key,
  title: t('dashboard.charts.' + ({ daily: 'dailyTitle', categories: 'categoriesTitle', statuses: 'statusTitle', risk: 'riskTitle', hourly: 'hourlyTitle' }[key])),
  description: t('dashboard.charts.' + ({ daily: 'dailyHelp', categories: 'categoriesHelp', statuses: 'statusHelp', risk: 'riskHelp', hourly: 'hourlyHelp' }[key])),
})));
function chartSeries(key) {
  const rows = summary.value?.[chartSources[key]];
  if (rows == null) return null;
  return rows.map(row => ({ label: key === 'daily' ? formatDay(row.key + 'T12:00:00Z') : key === 'categories' ? categoryLabel(row.key)
    : key === 'statuses' ? statusLabel(row.key) : key === 'risk' ? riskLabel(row.key) : row.key + ':00', value: row.value, ...(key === 'risk' ? { color: colors[row.key] } : {}) }));
}
const changeHint = computed(() => {
  const item = summary.value;
  if (!item || item.metrics.reports === null || item.metrics.previousReports === null) return t('dashboard.comparisonUnavailable');
  if (item.metrics.previousReports === 0) return t('dashboard.previousZero');
  return t('dashboard.change', { value: (item.reportChangePercent > 0 ? '+' : '') + number(item.reportChangePercent) });
});
const cards = computed(() => {
  if (!summary.value) return [];
  const item = summary.value, metrics = item.metrics;
  if (isAdministrator.value) return [
    { key: 'active', label: t('dashboard.metrics.active'), value: number(metrics.activeAlerts), icon: 'pi pi-bell', hint: t('dashboard.currentState'), routeName: 'admin-alerts-history', action: t('dashboard.viewAlerts'), color: 'value-red' },
    { key: 'pending', label: t('dashboard.metrics.pending'), value: number(metrics.pendingReports), icon: 'pi pi-file-edit', hint: t('dashboard.currentState'), routeName: 'admin-alerts-history', action: t('dashboard.viewReports') },
    { key: 'reports', label: t('dashboard.metrics.reports'), value: number(metrics.reports), icon: 'pi pi-chart-line', hint: changeHint.value, routeName: 'admin-alerts-history', action: t('dashboard.viewReports') },
    { key: 'seats', label: t('dashboard.metrics.seats'), value: number(item.staff?.available), icon: 'pi pi-users', hint: t('dashboard.currentState'), routeName: 'admin-personnel', action: t('dashboard.manageTeam') },
  ];
  return [
    { key: 'risk', label: t('dashboard.metrics.localRisk'), value: riskLabel(metrics.localRiskLevel), icon: 'pi pi-shield', hint: t('dashboard.currentState'), routeName: 'employee-risk-map', action: t('dashboard.openMap'), color: 'risk-' + (metrics.localRiskLevel ?? 'unknown') },
    { key: 'nearby', label: t('dashboard.metrics.nearby'), value: number(metrics.nearbyIncidents), icon: 'pi pi-map-marker', hint: t('dashboard.summaryNearby'), routeName: 'employee-risk-map', action: t('dashboard.openMap') },
    { key: 'pending', label: t('dashboard.metrics.myPending'), value: number(metrics.pendingReports), icon: 'pi pi-file-edit', hint: t('dashboard.currentState'), routeName: 'employee-alerts', action: t('dashboard.viewReports') },
    { key: 'unread', label: t('dashboard.metrics.unread'), value: number(metrics.unreadNotifications), icon: 'pi pi-inbox', hint: t('dashboard.currentState'), routeName: 'employee-notifications', action: t('dashboard.openInbox') },
  ];
});
function reload() { return store.loadSummary(); }
watch(() => route.meta.role, role => { store.setContext(role); void reload(); }, { immediate: true });
</script>

<style scoped>
.dashboard-page { max-width: 1500px; margin: auto; padding: clamp(20px, 3vw, 36px); color: #172033; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 26px; }
.eyebrow { display: flex; align-items: center; gap: 7px; margin: 0 0 10px; color: #2563eb; text-transform: uppercase; letter-spacing: .07em; font-weight: 700; font-size: 11px; }
h1 { margin: 0; font-size: clamp(25px, 3vw, 32px); letter-spacing: -.035em; } .page-description { color: #64748b; font-size: 14px; line-height: 1.7; max-width: 640px; margin: 10px 0 0; }
.business-context { display: flex; gap: 7px; align-items: center; font-size: 13px; color: #475569; margin: 12px 0 0; overflow-wrap: anywhere; }
.month-context { display: inline-block; margin: 16px 0 0; padding: 7px 11px; border-radius: 7px; background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 600; }
.page-actions { display: flex; flex-wrap: wrap; gap: 10px; flex-shrink: 0; } .page-actions :deep(button) { min-height: 42px; font-size: 13px; }
.snapshot-note { color: #64748b; font-size: 11px; line-height: 1.7; margin: 12px 0 20px; } .loading-note { display: flex; gap: 10px; color: #475569; align-items: center; padding: 16px 0; font-size: 14px; }
.warning-list { margin: 8px 0 0; padding-left: 18px; font-size: 12px; line-height: 1.7; } .metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin: 22px 0; }
.metric-card { min-width: 0; padding: 20px; border: 1px solid #e2e8f0; border-radius: 14px; background: white; }
.metric-heading { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; color: #475569; font-size: 12px; line-height: 1.5; } .metric-heading i { color: #64748b; background: #f1f5f9; padding: 9px; border-radius: 9px; }
.metric-value { font-size: clamp(23px, 2.6vw, 32px); font-weight: 750; letter-spacing: -.035em; line-height: 1.3; margin: 15px 0 6px; overflow-wrap: anywhere; }
.metric-context { font-size: 11px; color: #64748b; line-height: 1.5; margin: 0 0 18px; min-height: 30px; }
.card-link, .text-link { display: inline-flex; gap: 7px; align-items: center; color: #1d4ed8; font-size: 12px; font-weight: 600; text-decoration: none; line-height: 1.6; } .text-link { background: none; border: none; cursor: pointer; text-decoration: underline; padding: 0; }
.card-link:hover { text-decoration: underline; } .support-grid, .charts-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin-bottom: 20px; }
.support-card { border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; padding: 22px; min-width: 0; }
.section-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; } .section-heading h2 { margin: 0; font-size: 16px; } .section-heading > i { color: #64748b; }
.capacity-values { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 24px 0; } dt { color: #64748b; font-size: 11px; line-height: 1.5; } dd { margin: 8px 0 0; font-size: 25px; font-weight: 700; }
.support-description { color: #64748b; font-size: 12px; line-height: 1.7; } .plan-name { font-weight: 700; font-size: 24px; margin: 20px 0 6px; }
.zone-list { padding: 0; margin: 18px 0; list-style: none; } .zone-list li { border-bottom: 1px solid #eef2f7; padding: 12px 0; display: flex; justify-content: space-between; gap: 12px; font-size: 12px; line-height: 1.6; } .zone-list li strong { overflow-wrap: anywhere; } .zone-list li > span { flex-shrink: 0; color: #64748b; font-size: 11px; } .zone-risk { display: block; font-size: 11px; margin-top: 4px; }
.risk-high, .value-red { color: #b91c1c; } .risk-medium { color: #a16207; } .risk-low { color: #047857; } .risk-unknown { color: #64748b; }
.empty-note { padding: 24px 0; color: #64748b; font-size: 13px; line-height: 1.7; } .activity-card { margin-top: 20px; } .active-count { color: #64748b; font-size: 12px; }
.activity-table { width: 100%; overflow-x: auto; margin: 20px 0; } table { width: 100%; border-collapse: collapse; font-size: 12px; } th, td { padding: 14px 8px; text-align: left; border-bottom: 1px solid #eef2f7; vertical-align: top; line-height: 1.5; } th { color: #64748b; font-size: 11px; font-weight: 600; } .status-label { display: inline-block; padding: 3px 7px; border-radius: 5px; background: #f1f5f9; white-space: nowrap; } .status-active { background: #fef2f2; color: #b91c1c; }
.quality-note { color: #64748b; font-size: 11px; line-height: 1.7; margin-top: 18px; } .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
a:focus-visible, button:focus-visible, input:focus-visible { outline: 3px solid #60a5fa; outline-offset: 3px; }
@media (max-width: 1180px) { .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .page-header { flex-direction: column; } }
@media (max-width: 760px) { .charts-grid, .support-grid { grid-template-columns: 1fr; } }
@media (max-width: 430px) { .metric-grid { grid-template-columns: 1fr; } .page-actions { width: 100%; } .page-actions :deep(button) { flex: 1; } .metric-card, .support-card { padding: 18px; } .zone-list li { flex-direction: column; gap: 4px; } .activity-table th, .activity-table td { min-width: 110px; } }
</style>
