<template>
  <section class="monthly-page" aria-labelledby="monthly-title">
    <header class="page-header"><div><RouterLink :to="{ name: reportId ? 'admin-monthly-reports' : 'admin-dashboard' }" class="back-link"><i class="pi pi-arrow-left" aria-hidden="true"></i>{{ t(reportId ? 'dashboard.monthly.backToHistory' : 'dashboard.monthly.backToDashboard') }}</RouterLink>
      <h1 ref="heading" id="monthly-title" tabindex="-1">{{ report ? t('dashboard.monthly.reportFor', { month: monthLabel(report.month) }) : t(reportId ? 'dashboard.monthly.detailTitle' : 'dashboard.monthly.title') }}</h1><p class="page-description">{{ t(reportId ? 'dashboard.monthly.detailHelp' : 'dashboard.monthly.historyHelp') }}</p></div>
      <pv-button type="button" icon="pi pi-refresh" :label="t('dashboard.refresh')" :loading="loading" :disabled="loading" @click="reload" />
    </header>
    <p v-if="loading" role="status" class="loading-note"><i class="pi pi-spin pi-spinner" aria-hidden="true"></i>{{ t('dashboard.monthly.loading') }}</p>
    <pv-message v-if="error" severity="error" :closable="false" role="alert">{{ t(error) }} <button type="button" class="text-link" :disabled="loading" @click="reload">{{ t('dashboard.retry') }}</button></pv-message>
    <template v-if="!reportId">
      <div class="history-filter"><label for="report-month">{{ t('dashboard.monthly.filter') }}<input id="report-month" v-model="selectedMonth" type="month" min="2000-01" /></label><pv-button v-if="selectedMonth" type="button" text :label="t('dashboard.monthly.clearFilter')" @click="selectedMonth = ''" /></div>
      <div v-if="store.historyLoaded && !filteredReports.length" class="empty-card"><i class="pi pi-file" aria-hidden="true"></i><h2>{{ t(selectedMonth ? 'dashboard.monthly.noMatch' : 'dashboard.monthly.emptyTitle') }}</h2><p>{{ t('dashboard.monthly.emptyHelp') }}</p></div>
      <div v-else-if="filteredReports.length" class="report-list">
        <article v-for="item in filteredReports" :key="item.id" class="report-card"><div class="report-icon" aria-hidden="true"><i class="pi pi-file"></i></div><div class="report-copy"><h2>{{ monthLabel(item.month) }}</h2><p>{{ t('dashboard.monthly.generatedAt', { date: formatDate(item.generatedAt) }) }}</p><span class="source-label">{{ t('dashboard.monthly.source.' + item.generationSource) }}</span></div><RouterLink :to="{ name: 'admin-monthly-report', params: { reportId: item.id } }" class="open-report">{{ t('dashboard.monthly.open') }}<span class="sr-only">: {{ monthLabel(item.month) }}</span><i class="pi pi-arrow-right" aria-hidden="true"></i></RouterLink></article>
      </div>
    </template>
    <template v-else-if="report">
      <pv-message v-if="report.summary.warnings.length" severity="warn" :closable="false">{{ t('dashboard.monthly.partial') }}<ul><li v-for="warning in report.summary.warnings" :key="warning">{{ t('dashboard.warnings.' + warning) }}</li></ul></pv-message>
      <div class="report-metrics"><article><span>{{ t('dashboard.metrics.reports') }}</span><strong>{{ number(report.summary.metrics.reports) }}</strong><small>{{ t('dashboard.monthly.duringPeriod') }}</small></article><article><span>{{ t('dashboard.metrics.nearby') }}</span><strong>{{ number(report.summary.metrics.nearbyIncidents) }}</strong><small>{{ t('dashboard.filters.meters', { count: report.summary.radiusMeters }) }}</small></article><article><span>{{ t('dashboard.metrics.active') }}</span><strong>{{ number(report.summary.metrics.activeAlerts) }}</strong><small>{{ t('dashboard.monthly.atClosing') }}</small></article><article><span>{{ t('dashboard.metrics.pending') }}</span><strong>{{ number(report.summary.metrics.pendingReports) }}</strong><small>{{ t('dashboard.monthly.atClosing') }}</small></article></div>
      <section class="closing-summary" aria-labelledby="monthly-comparison-title"><h2 id="monthly-comparison-title">{{ t('dashboard.monthly.comparison') }}</h2>
        <dl class="comparison-counts"><div><dt>{{ monthLabel(report.month) }}</dt><dd>{{ number(report.summary.metrics.reports) }}</dd></div><div><dt>{{ previousMonth }}</dt><dd>{{ number(report.summary.metrics.previousReports) }}</dd></div></dl>
        <p class="comparison-value">{{ comparison }}</p><p>{{ t('dashboard.monthly.comparisonHelp') }}</p>
      </section>
      <div class="report-charts"><DashboardChart id="monthly-daily" type="line" :title="t('dashboard.charts.dailyTitle')" :description="t('dashboard.charts.dailyHelp')" :series="dailySeries" /><DashboardChart id="monthly-categories" horizontal :title="t('dashboard.charts.categoriesTitle')" :description="t('dashboard.charts.categoriesHelp')" :series="categorySeries" /><DashboardChart id="monthly-statuses" :title="t('dashboard.charts.statusTitle')" :description="t('dashboard.monthly.statusHelp')" :series="statusSeries" /><DashboardChart id="monthly-risk" :title="t('dashboard.charts.riskTitle')" :description="t('dashboard.charts.riskHelp')" :series="riskSeries" /></div>
      <p class="quality-note">{{ t('dashboard.quality', { location: number(report.summary.metrics.invalidLocationReports), date: number(report.summary.metrics.undatedReports) }) }}</p>
    </template>
  </section>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useDashboardStore } from '../../application/dashboard.store.js';
import { dashboardTimeZone } from '../../domain/model/dashboard-summary.entity.js';
import DashboardChart from '../components/dashboard-chart.vue';
const route = useRoute(), store = useDashboardStore();
const { t, te, locale } = useI18n();
const selectedMonth = ref(''), heading = ref(null);
const reportId = computed(() => route.params.reportId ?? null);
const report = computed(() => store.monthlyReport);
const loading = computed(() => reportId.value ? store.isDetailLoading : store.isHistoryLoading);
const error = computed(() => reportId.value ? store.detailError : store.historyError);
const filteredReports = computed(() => store.monthlyReports.filter(item => !selectedMonth.value || item.month === selectedMonth.value));
const number = value => value === null || value === undefined ? '—' : new Intl.NumberFormat(locale.value === 'es' ? 'es-419' : 'en-US').format(value);
const formatDate = value => new Intl.DateTimeFormat(locale.value === 'es' ? 'es-419' : 'en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: dashboardTimeZone }).format(new Date(value));
const formatDay = value => new Intl.DateTimeFormat(locale.value === 'es' ? 'es-419' : 'en-US', { dateStyle: 'medium', timeZone: dashboardTimeZone }).format(new Date(value));
const monthLabel = month => new Intl.DateTimeFormat(locale.value === 'es' ? 'es-419' : 'en-US', { year: 'numeric', month: 'long', timeZone: dashboardTimeZone }).format(new Date(month + '-01T12:00:00Z'));
const translated = (prefix, key, fallback = 'unknown') => t(prefix + (te(prefix + key) ? key : fallback));
const dailySeries = computed(() => report.value?.summary.daily?.map(row => ({ label: formatDay(row.key + 'T12:00:00Z'), value: row.value })) ?? null);
const categorySeries = computed(() => report.value?.summary.categories?.map(row => ({ label: translated('mapping.incidentCategories.', row.key, 'other'), value: row.value })) ?? null);
const statusSeries = computed(() => report.value?.summary.statuses?.map(row => ({ label: translated('dashboard.status.', row.key), value: row.value })) ?? null);
const colors = { low: '#10b981', medium: '#d97706', high: '#dc2626', unknown: '#64748b' };
const riskSeries = computed(() => report.value?.summary.riskCounts?.map(row => ({ label: translated('dashboard.risk.', row.key), value: row.value, color: colors[row.key] })) ?? null);
const previousMonth = computed(() => report.value ? new Intl.DateTimeFormat(locale.value === 'es' ? 'es-419' : 'en-US', { year: 'numeric', month: 'long', timeZone: dashboardTimeZone }).format(new Date(report.value.summary.period.previousStart)) : '');
const comparison = computed(() => {
  if (!report.value || report.value.summary.metrics.previousReports === null || report.value.summary.metrics.reports === null) return t('dashboard.comparisonUnavailable');
  const current = report.value.summary.metrics.reports, previous = report.value.summary.metrics.previousReports;
  if (previous === 0) return t(current === 0 ? 'dashboard.monthly.bothZero' : 'dashboard.monthly.noBaseline', { month: previousMonth.value });
  if (current === previous) return t('dashboard.monthly.unchanged', { month: previousMonth.value });
  const percent = Math.abs(current - previous) / previous * 100;
  const value = percent < 0.1 ? t('dashboard.monthly.lessThanPointOne') : new Intl.NumberFormat(locale.value === 'es' ? 'es-419' : 'en-US', { maximumFractionDigits: 1 }).format(percent);
  return t(current > previous ? 'dashboard.monthly.increased' : 'dashboard.monthly.decreased', { value, month: previousMonth.value });
});
function reload() { return reportId.value ? store.loadMonthlyReport(reportId.value) : store.loadMonthlyReports(); }
watch([() => route.meta.role, reportId], async ([role], previous, onCleanup) => {
  let current = true;
  onCleanup(() => { current = false; });
  store.setContext(role);
  if (role !== 'administrator') return;
  await reload(); await nextTick(); if (current) heading.value?.focus();
}, { immediate: true });
</script>

<style scoped>
.monthly-page { max-width: 1500px; margin: auto; padding: clamp(20px, 3vw, 36px); color: #172033; }
.page-header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; margin-bottom: 26px; } .back-link { display: inline-flex; align-items: center; gap: 7px; color: #1d4ed8; font-size: 12px; text-decoration: none; margin-bottom: 16px; }
h1 { margin: 0; font-size: clamp(25px, 3vw, 32px); letter-spacing: -.035em; } h1:focus { outline: none; } .page-description { color: #64748b; font-size: 14px; line-height: 1.7; max-width: 650px; margin: 10px 0 0; }
.loading-note { color: #475569; font-size: 14px; display: flex; align-items: center; gap: 10px; padding: 12px 0; }
.history-filter { display: flex; gap: 14px; align-items: flex-end; margin: 22px 0; } .history-filter label { display: flex; gap: 8px; flex-direction: column; color: #475569; font-size: 12px; font-weight: 600; } .history-filter input { height: 42px; border: 1px solid #cbd5e1; border-radius: 5px; background: #fff; color: #172033; padding: 8px 10px; }
.empty-card { text-align: center; background: white; border: 1px solid #e2e8f0; border-radius: 14px; padding: 50px 24px; color: #64748b; } .empty-card > i { font-size: 32px; color: #94a3b8; } .empty-card h2 { font-size: 18px; color: #334155; margin: 20px 0 10px; } .empty-card p { font-size: 13px; line-height: 1.7; max-width: 500px; margin: auto; }
.report-list { display: grid; gap: 14px; } .report-card { display: flex; align-items: center; gap: 18px; background: white; border: 1px solid #e2e8f0; border-radius: 14px; padding: 22px; }
.report-icon { flex-shrink: 0; display: grid; place-items: center; width: 48px; height: 48px; color: #2563eb; background: #eff6ff; border-radius: 12px; font-size: 22px; } .report-copy { flex: 1; } .report-copy h2 { font-size: 17px; margin: 0 0 8px; text-transform: capitalize; } .report-copy p { margin: 0 0 8px; font-size: 12px; color: #64748b; line-height: 1.7; } .source-label { font-size: 11px; color: #475569; padding: 4px 7px; background: #f1f5f9; border-radius: 5px; }
.open-report, .text-link { display: inline-flex; gap: 8px; align-items: center; color: #1d4ed8; font-size: 12px; font-weight: 600; text-decoration: none; } .text-link { padding: 0; background: none; border: none; cursor: pointer; text-decoration: underline; }
.report-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 20px; } .report-metrics article { padding: 22px; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; } .report-metrics span { color: #475569; font-size: 12px; line-height: 1.5; } .report-metrics strong { display: block; font-size: 32px; margin: 14px 0 8px; } .report-metrics small { color: #64748b; font-size: 11px; }
.report-charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin-bottom: 20px; } .closing-summary { margin-bottom: 20px; min-width: 0; padding: 22px; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; } .closing-summary h2 { font-size: 16px; margin: 0 0 20px; } .closing-summary p { color: #64748b; font-size: 12px; line-height: 1.7; } .comparison-counts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin: 0 0 20px; } .comparison-counts dt { color: #475569; font-size: 12px; overflow-wrap: anywhere; } .comparison-counts dd { color: #172033; font-size: 28px; font-weight: 700; margin: 8px 0 0; } .comparison-value { color: #172033 !important; font-size: 20px !important; font-weight: 600; }
.quality-note { color: #64748b; font-size: 11px; line-height: 1.7; } .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
a:focus-visible, button:focus-visible, input:focus-visible { outline: 3px solid #60a5fa; outline-offset: 3px; }
@media (max-width: 1050px) { .report-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 760px) { .report-charts { grid-template-columns: 1fr; } .page-header { flex-direction: column; } }
@media (max-width: 430px) { .report-card { flex-wrap: wrap; padding: 18px; } .open-report { margin-left: 66px; } .report-metrics { grid-template-columns: 1fr; } .history-filter { flex-wrap: wrap; } }
</style>
