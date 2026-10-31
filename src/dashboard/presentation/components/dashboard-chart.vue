<template>
  <section class="dashboard-chart" :aria-labelledby="id + '-title'">
    <header><h2 :id="id + '-title'">{{ title }}</h2><p :id="id + '-description'">{{ description }}</p></header>
    <div v-if="hasValues" class="chart-canvas">
      <Chart :type="type" :data="chartData" :options="chartOptions" :canvas-props="{ role: 'img', 'aria-label': title, 'aria-describedby': id + '-description' }">
        <p>{{ description }}</p>
      </Chart>
    </div>
    <p v-else class="chart-empty"><i :class="series === null ? 'pi pi-info-circle' : 'pi pi-chart-bar'" aria-hidden="true"></i>{{ t(series === null ? 'dashboard.unavailable' : 'dashboard.charts.empty') }}</p>
      <table v-if="series !== null" class="sr-only"><caption>{{ title }}</caption><thead><tr><th scope="col">{{ t('dashboard.charts.label') }}</th><th scope="col">{{ t('dashboard.charts.count') }}</th></tr></thead>
        <tbody><tr v-for="(row, index) in series" :key="index"><th scope="row">{{ row.label }}</th><td>{{ number(row.value) }}</td></tr><tr v-if="!series.length"><td colspan="2">{{ t('dashboard.charts.empty') }}</td></tr></tbody>
      </table>
  </section>
</template>

<script setup>
import { computed, defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import PrimeVueChart from 'primevue/chart';
// PrimeVue 5.0.2 initializes asynchronously; discard imports for replaced or unmounted canvases.
const Chart = defineComponent({
  name: 'DashboardCanvasChart', extends: PrimeVueChart,
  data: () => ({ canvasRevision: 0, canvasDisposed: false }),
  beforeUnmount() { this.canvasDisposed = true; this.canvasRevision++; },
  methods: {
    initChart() {
      const revision = ++this.canvasRevision;
      import('chart.js/auto').then(module => {
        if (this.canvasDisposed || revision !== this.canvasRevision || !this.$refs.canvas?.isConnected) return;
        if (this.chart) this.chart.destroy();
        this.chart = new module.default(this.$refs.canvas, { type: this.type, data: this.data, options: this.options, plugins: this.plugins });
        this.$emit('loaded', this.chart);
      });
    },
  },
});
const props = defineProps({ id: { type: String, required: true }, title: { type: String, required: true }, description: { type: String, default: '' },
  series: { type: Array, default: null }, type: { type: String, default: 'bar', validator: value => ['line', 'bar'].includes(value) }, horizontal: { type: Boolean, default: false } });
const { t, locale } = useI18n();
const number = value => new Intl.NumberFormat(locale.value === 'es' ? 'es-419' : 'en-US').format(value);
const hasValues = computed(() => props.series?.some(row => row.value > 0) ?? false);
const chartData = computed(() => ({ labels: props.series?.map(row => row.label) ?? [], datasets: [{ label: t('dashboard.charts.count'),
  data: props.series?.map(row => row.value) ?? [], backgroundColor: props.type === 'line' ? '#2563eb18' : props.series?.map(row => row.color ?? '#2563eb'),
  borderColor: '#2563eb', borderWidth: props.type === 'line' ? 2 : 0, borderRadius: props.type === 'bar' ? 5 : 0,
  pointRadius: 2, pointHoverRadius: 5, tension: 0.2, fill: props.type === 'line' }] }));
const chartOptions = computed(() => ({ responsive: true, maintainAspectRatio: false, animation: false,
  locale: locale.value === 'es' ? 'es-419' : 'en-US', indexAxis: props.horizontal ? 'y' : 'x',
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => t('dashboard.charts.count') + ': ' + number(context.raw) } } },
  scales: {
    [props.horizontal ? 'x' : 'y']: { beginAtZero: true, ticks: { precision: 0, color: '#64748b' }, grid: { color: '#eef2f7' }, border: { display: false } },
    [props.horizontal ? 'y' : 'x']: { grid: { display: false }, ticks: { color: '#475569', maxTicksLimit: props.horizontal ? 14 : 8, maxRotation: 0 }, border: { display: false } },
  },
}));
</script>

<style scoped>
.dashboard-chart { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 22px; min-width: 0; }
header h2 { margin: 0; color: #172033; font-size: 16px; line-height: 1.4; } header p { color: #64748b; font-size: 12px; line-height: 1.6; margin: 8px 0 20px; }
.chart-canvas { height: 250px; position: relative; } .chart-canvas :deep(.p-chart) { height: 100%; width: 100%; }
.chart-empty { min-height: 180px; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 14px; color: #64748b; text-align: center; font-size: 13px; line-height: 1.7; }
.chart-empty i { font-size: 25px; color: #94a3b8; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
@media (max-width: 600px) { .dashboard-chart { padding: 18px; } .chart-canvas { height: 220px; } }
</style>
