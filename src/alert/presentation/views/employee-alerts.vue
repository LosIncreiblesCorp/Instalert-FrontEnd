<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import useAlertStore from '../../application/alert.store.js';
import { useI18n } from 'vue-i18n';
import logo from '../../../assets/instalert-logo.svg';

const { t, locale } = useI18n();
const store = useAlertStore();
const { panicStage, remainingSeconds, countdownProgress, incidentType, incidentDescription, reportFeedback } = storeToRefs(store);
const descriptionFocused = ref(false);
const historySearch = ref('');
const historyPeriod = ref('week');
const historyStatus = ref('all');
const historyType = ref('all');
const historyHeading = ref(null);
const openHistory = async () => {
  store.openHistoryPreview();
  await nextTick();
  historyHeading.value?.focus();
};
const { preventiveActivity, preventiveLocation, preventiveMoment, preventiveDescription, preventiveFeedback } = storeToRefs(store);
const preventiveHeading = ref(null);
const preventiveDescriptionFocused = ref(false);
const preventiveActivityOptions = [
  { key: 'person', icon: 'pi-users' }, { key: 'vehicle', icon: 'pi-car' },
  { key: 'behavior', icon: 'pi-asterisk' }, { key: 'surveillance', icon: 'pi-eye' }, { key: 'other', icon: 'pi-ellipsis-h' },
];
const communityActivityOptions = [
  { key: 'attempt', icon: 'pi-shield' }, { key: 'extortion', icon: 'pi-file' },
  { key: 'vandalism', icon: 'pi-hammer' }, { key: 'disturbance', icon: 'pi-users' },
  { key: 'vehicle', icon: 'pi-car' }, { key: 'suspicious', icon: 'pi-eye' },
  { key: 'intrusion', icon: 'pi-building' }, { key: 'other', icon: 'pi-ellipsis-h' },
];
const reportNamespace = computed(() => panicStage.value === 'community' ? 'alerts.communityReport' : 'alerts.preventive');
const preventiveActivities = computed(() => panicStage.value === 'community' ? communityActivityOptions : preventiveActivityOptions);
const openPreventive = async (kind = 'preventive') => {
  if (kind === 'community') store.openCommunityPreview();
  else store.openPreventivePreview();
  await nextTick();
  preventiveHeading.value?.focus();
};
const incidentTypes = [
  { value: 'Robbery', key: 'robbery', icon: 'pi-shopping-bag' },
  { value: 'AttemptedRobbery', key: 'attemptedRobbery', icon: 'pi-shield' },
  { value: 'Assault', key: 'assault', icon: 'pi-exclamation-triangle' },
  { value: 'Other', key: 'other', icon: 'pi-ellipsis-h' },
];
const reportHeading = ref(null);
const finishPanic = async () => {
  store.finishPanicPreview();
  await nextTick();
  reportHeading.value?.focus();
};
const countdownHeading = ref(null);
const panicButton = ref(null);

const startCountdown = async () => {
  store.startPanicCountdown();
  await nextTick();
  countdownHeading.value?.focus();
};
const returnToAlerts = async () => {
  store.cancelPanicCountdown();
  await nextTick();
  panicButton.value?.$el?.focus();
};
onUnmounted(() => store.cancelPanicCountdown());
const languages = [{ label: 'EN', value: 'en' }, { label: 'ES', value: 'es' }];
const indicators = [
  { key: 'community', icon: 'pi-circle-fill', tone: 'green' },
  { key: 'location', icon: 'pi-map-marker', tone: 'blue' },
  { key: 'police', icon: 'pi-wifi', tone: 'muted' },
  { key: 'latency', icon: 'pi-bolt', tone: 'green' },
];
const reports = [
  { key: 'preventive', icon: 'pi-eye', tone: 'amber' },
  { key: 'community', icon: 'pi-megaphone', tone: 'blue' },
  { key: 'historical', icon: 'pi-book', tone: 'navy' },
];

watch(locale, (value) => {
  document.documentElement.lang = value === 'es' ? 'es-419' : 'en-US';
  document.title = `InstAlert - ${t('alerts.title')}`;
}, { immediate: true });
</script>

<template>
  <div class="employee-alerts">
    <a class="skip-link" href="#alerts-content">{{ t('alerts.skip') }}</a>
    <header class="app-header">
      <div class="brand">
        <img :src="logo" alt="" width="30" height="30" /><span>InstAlert</span>
        <span class="network-badge"><span class="status-dot" />{{ t('alerts.preview') }}</span>
      </div>
      <div class="header-tools">
        <pv-select-button v-model="locale" :options="languages" option-label="label" option-value="value"
                          :allow-empty="false" :aria-label="t('alerts.language')" />
        <div class="employee-label"><span class="employee-icon"><i class="pi pi-user" aria-hidden="true" /></span>{{ t('alerts.employee') }}</div>
      </div>
    </header>
    <div class="workspace">
      <aside class="sidebar" :aria-label="t('alerts.navigation')">
        <div class="sidebar-heading">{{ t('alerts.navigation') }}<i class="pi pi-shield" aria-hidden="true" /></div>
        <nav :aria-label="t('alerts.navigation')">
          <button class="nav-item" disabled><i class="pi pi-th-large" aria-hidden="true" />{{ t('alerts.home') }}</button>
          <button class="nav-item" disabled><i class="pi pi-map" aria-hidden="true" />{{ t('alerts.riskMap') }}</button>
          <router-link class="nav-item selected" :to="{ name: 'employee-alerts' }" aria-current="page"><i class="pi pi-bell" aria-hidden="true" />{{ t('alerts.title') }}</router-link>
        </nav>
        <div class="sidebar-footer"><i class="pi pi-shield" aria-hidden="true" />{{ t('alerts.employeeView') }}</div>
      </aside>
      <main id="alerts-content" class="alerts-content" tabindex="-1">
        <div v-if="panicStage === 'history'" class="history-view">
          <div class="history-heading-row"><div><span class="location-status">{{ t('alerts.historyView.badge') }}</span><h1 ref="historyHeading" tabindex="-1">{{ t('alerts.historyView.title') }}</h1><p class="subtitle">{{ t('alerts.historyView.subtitle') }}</p></div><pv-button icon="pi pi-download" :label="t('alerts.historyView.download')" disabled /></div>
          <div class="history-summary">
            <section class="active-card"><div class="active-card-heading"><h2>{{ t('alerts.historyView.total') }}</h2><span class="report-icon blue"><i class="pi pi-folder" aria-hidden="true" /></span></div><p class="metric-value">—</p><p class="active-muted">{{ t('alerts.historyView.unavailable') }}</p></section>
            <section class="active-card"><div class="active-card-heading"><h2>{{ t('alerts.historyView.panic') }}</h2><span class="report-icon amber"><i class="pi pi-bell" aria-hidden="true" /></span></div><p class="metric-value">—</p><p class="active-muted">{{ t('alerts.historyView.unavailable') }}</p></section>
          </div>
          <section class="history-filters" :aria-label="t('alerts.historyView.filters')">
            <div class="history-filter-top"><label class="history-search"><i class="pi pi-search" aria-hidden="true" /><span class="sr-only">{{ t('alerts.historyView.search') }}</span><input v-model="historySearch" type="search" :placeholder="t('alerts.historyView.search')" /></label>
              <div class="history-periods" :aria-label="t('alerts.historyView.period')"><button v-for="period in ['today', 'week', 'month']" :key="period" type="button" :class="{ selected: historyPeriod === period }" :aria-pressed="historyPeriod === period" @click="historyPeriod = period">{{ t(`alerts.historyView.periods.${period}`) }}</button></div>
              <label class="history-type"><span class="sr-only">{{ t('alerts.historyView.type') }}</span><select v-model="historyType"><option v-for="type in ['all', 'panic', 'preventive', 'community']" :key="type" :value="type">{{ t(`alerts.historyView.types.${type}`) }}</option></select></label>
            </div>
            <div class="history-statuses"><span>{{ t('alerts.historyView.statusLabel') }}</span><button v-for="status in ['all', 'active', 'pending', 'completed', 'resolved', 'cancelled']" :key="status" type="button" :class="['history-status', status, { selected: historyStatus === status }]" :aria-pressed="historyStatus === status" @click="historyStatus = status">{{ t(`alerts.historyView.statuses.${status}`) }}</button></div>
            <p class="active-muted">{{ t('alerts.historyView.filtersNote') }}</p>
          </section>
          <div class="history-results">
            <section class="history-empty" aria-labelledby="history-empty-title"><i class="pi pi-folder-open" aria-hidden="true" /><h2 id="history-empty-title">{{ t('alerts.historyView.emptyTitle') }}</h2><p>{{ t('alerts.historyView.emptyDescription') }}</p></section>
            <aside class="history-detail"><i class="pi pi-file" aria-hidden="true" /><h2>{{ t('alerts.historyView.detailTitle') }}</h2><p>{{ t('alerts.historyView.detailDescription') }}</p></aside>
          </div>
          <pv-button class="history-back" icon="pi pi-arrow-left" :label="t('alerts.countdown.back')" text @click="returnToAlerts" />
        </div>
        <div v-else-if="['preventive', 'community'].includes(panicStage)" :class="['preventive-grid', { 'community-form-view': panicStage === 'community' }]">
          <form class="preventive-form" @submit.prevent="store.completePreventivePreview">
            <section class="preventive-intro">
              <div class="preventive-intro-top"><span>{{ t(reportNamespace + '.badge') }}</span><pv-button type="button" icon="pi pi-times" :aria-label="t(reportNamespace + '.discard')" text severity="secondary" @click="returnToAlerts" /></div>
              <h1 ref="preventiveHeading" tabindex="-1">{{ t(reportNamespace + '.title') }}</h1><p>{{ t(reportNamespace + '.subtitle') }}</p>
            </section>
            <fieldset class="report-fieldset">
              <legend class="sr-only">{{ t(reportNamespace + '.activityTitle') }}</legend>
              <div class="form-section-heading"><h2>{{ t(reportNamespace + '.activityTitle') }}</h2><span class="required-tag">{{ t('alerts.reportForm.required') }}</span></div>
              <div class="preventive-options">
                <label v-for="activity in preventiveActivities" :key="activity.key" :class="['preventive-option', { selected: preventiveActivity === activity.key }]">
                  <input v-model="preventiveActivity" type="radio" name="preventive-activity" :value="activity.key" required />
                  <span class="incident-icon"><i :class="['pi', activity.icon]" aria-hidden="true" /></span><strong>{{ t(`${reportNamespace}.activities.${activity.key}.title`) }}</strong><span>{{ t(`${reportNamespace}.activities.${activity.key}.description`) }}</span>
                </label>
              </div>
            </fieldset>
            <section class="description-section preventive-location">
              <div class="form-section-heading"><h2><label for="preventive-location">{{ t(reportNamespace + '.locationTitle') }}</label></h2></div>
              <input id="preventive-location" v-model="preventiveLocation" type="text" required :placeholder="t(reportNamespace + '.locationPlaceholder')" />
              <p class="form-help">{{ t(reportNamespace + '.locationHelp') }}</p>
            </section>
            <div class="preventive-bottom">
              <fieldset class="report-fieldset"><legend class="sr-only">{{ t(reportNamespace + '.momentTitle') }}</legend><h2>{{ t(reportNamespace + '.momentTitle') }}</h2>
                <label v-for="moment in ['now', 'recent', 'earlier']" :key="moment" class="moment-option"><input v-model="preventiveMoment" type="radio" name="preventive-moment" :value="moment" required />{{ t(`${reportNamespace}.moments.${moment}`) }}</label>
              </fieldset>
              <section class="description-section"><h2><label for="preventive-description">{{ t(reportNamespace + '.descriptionTitle') }}</label></h2>
                <textarea id="preventive-description" v-model="preventiveDescription" rows="4" required :placeholder="preventiveDescriptionFocused ? '' : t('alerts.reportForm.placeholder')" @focus="preventiveDescriptionFocused = true" @blur="preventiveDescriptionFocused = false" />
                <p class="form-help">{{ t(reportNamespace + '.descriptionHelp') }}</p>
              </section>
            </div>
            <div class="report-buttons"><pv-button type="button" icon="pi pi-times" :label="t(reportNamespace + '.discard')" severity="secondary" @click="returnToAlerts" /><pv-button type="submit" icon="pi pi-bell" :label="t(reportNamespace + '.send')" severity="secondary" /></div>
            <p v-if="preventiveFeedback" role="status" class="report-preview-info">{{ t(`${reportNamespace}.feedback.${preventiveFeedback}`) }}</p>
          </form>
          <aside class="preventive-aside">
            <section class="detail-card"><h2><i class="pi pi-bullseye blue" aria-hidden="true" />{{ t(reportNamespace + '.reachTitle') }}</h2><div class="preventive-map-placeholder"><i class="pi pi-map" aria-hidden="true" /><p>{{ t(reportNamespace + '.mapUnavailable') }}</p></div><p class="form-help">{{ t(reportNamespace + '.reachUnavailable') }}</p></section>
            <section class="detail-card"><h2>{{ t(reportNamespace + '.guidanceTitle') }}</h2><p class="preventive-guidance"><i class="pi pi-check-circle green" aria-hidden="true" />{{ t(reportNamespace + '.recommended') }}</p><p class="preventive-guidance"><i class="pi pi-times-circle" aria-hidden="true" />{{ t(reportNamespace + '.emergency') }}</p></section>
          </aside>
        </div>
        <div v-else-if="panicStage === 'reporting'" class="report-form-view">
          <section class="report-intro">
            <span class="report-intro-icon"><i class="pi pi-verified" aria-hidden="true" /></span>
            <div><h1 ref="reportHeading" tabindex="-1">{{ t('alerts.reportForm.title') }}</h1><p>{{ t('alerts.reportForm.subtitle') }}</p></div>
            <span class="location-status">{{ t('alerts.preview') }}</span>
          </section>
          <form @submit.prevent="store.completeReportPreview">
            <fieldset class="report-fieldset">
              <legend class="sr-only">{{ t('alerts.reportForm.typeTitle') }}</legend>
              <div class="form-section-heading"><h2><i class="pi pi-th-large" aria-hidden="true" />{{ t('alerts.reportForm.typeTitle') }}</h2><span class="required-tag">{{ t('alerts.reportForm.required') }}</span></div>
              <p class="form-help">{{ t('alerts.reportForm.typeHelp') }}</p>
              <div class="incident-options">
                <label v-for="type in incidentTypes" :key="type.value" :class="['incident-option', { 'is-selected': incidentType === type.value }]">
                  <input v-model="incidentType" type="radio" name="incident-type" :value="type.value" required />
                  <span class="incident-option-content"><span class="incident-icon"><i :class="['pi', type.icon]" aria-hidden="true" /></span><strong>{{ t(`alerts.reportForm.types.${type.key}.title`) }}</strong><span>{{ t(`alerts.reportForm.types.${type.key}.description`) }}</span></span>
                </label>
              </div>
            </fieldset>
            <section class="description-section">
              <div class="form-section-heading"><h2><label for="incident-description"><i class="pi pi-align-left" aria-hidden="true" />{{ t('alerts.reportForm.descriptionTitle') }}</label></h2><span class="required-tag">{{ t('alerts.reportForm.required') }}</span></div>
              <textarea id="incident-description" v-model="incidentDescription" rows="5" required
                        :placeholder="descriptionFocused ? '' : t('alerts.reportForm.placeholder')"
                        @focus="descriptionFocused = true" @blur="descriptionFocused = false" aria-describedby="description-help" />
              <p id="description-help" class="form-help"><i class="pi pi-lightbulb" aria-hidden="true" />{{ t('alerts.reportForm.descriptionHelp') }}</p>
            </section>
            <section class="report-form-actions">
              <div class="report-buttons"><pv-button type="button" :label="t('alerts.reportForm.later')" icon="pi pi-clock" severity="secondary" @click="store.deferReportPreview" /><pv-button type="submit" :label="t('alerts.reportForm.complete')" icon="pi pi-check-circle" /></div>
              <p class="report-preview-info">{{ t('alerts.reportForm.previewInfo') }}</p>
              <p v-if="reportFeedback" class="report-feedback" role="status">{{ t(`alerts.reportForm.feedback.${reportFeedback}`) }}</p>
              <pv-button type="button" :label="t('alerts.countdown.back')" icon="pi pi-arrow-left" text @click="returnToAlerts" />
            </section>
          </form>
        </div>
        <div v-else-if="panicStage === 'completed'" class="active-preview">
          <section class="active-banner" aria-labelledby="active-title">
            <p class="active-eyebrow"><span class="status-dot" />{{ t('alerts.activePreview.status') }}</p>
            <h1 id="active-title">{{ t('alerts.activePreview.title') }}</h1>
            <p class="active-subtitle">{{ t('alerts.activePreview.description') }}</p>
            <div class="active-badges"><span><i class="pi pi-shop" aria-hidden="true" />{{ t('alerts.activePreview.notified') }}</span><span>{{ t('alerts.activePreview.transmission') }}</span></div>
          </section>
          <div class="active-metrics">
            <section class="active-card">
              <div class="active-card-heading"><h2>{{ t('alerts.activePreview.operationalStatus') }}</h2><span class="preview-status">{{ t('alerts.preview') }}</span></div>
              <p class="metric-caption">{{ t('alerts.activePreview.activeTime') }}</p>
              <p class="metric-value">—<span>{{ t('alerts.activePreview.minutes') }}</span></p>
            </section>
            <section class="active-card">
              <div class="active-card-heading"><h2>{{ t('alerts.activePreview.activationTime') }}</h2><i class="pi pi-clock blue" aria-hidden="true" /></div>
              <p class="metric-caption">{{ t('alerts.activePreview.record') }}</p>
              <p class="metric-value">—</p><p class="active-muted">{{ t('alerts.activePreview.noRecord') }}</p>
            </section>
          </div>
          <section class="active-card active-location">
            <div class="active-card-heading"><h2>{{ t('alerts.activePreview.location') }}</h2><span class="location-status">{{ t('alerts.activePreview.gps') }}</span></div>
            <div class="active-location-body"><div><h3>{{ t('alerts.countdown.business') }}</h3><p class="active-muted">{{ t('alerts.unavailable') }}</p></div><div class="coordinates"><span>{{ t('alerts.activePreview.coordinates') }}</span><strong>—</strong></div></div>
          </section>
          <section class="finish-panel">
            <pv-button class="finish-button" icon="pi pi-history" :label="t('alerts.activePreview.finish')" severity="secondary" @click="finishPanic" />
            <p class="finish-warning">{{ t('alerts.activePreview.warning') }}</p>
            <p class="active-muted">{{ t('alerts.activePreview.pending') }}</p>
            <pv-button class="return-preview-button" icon="pi pi-arrow-left" :label="t('alerts.countdown.back')" text @click="returnToAlerts" />
          </section>
        </div>
        <div v-else-if="panicStage === 'counting'" class="confirmation-grid">
          <section class="countdown-panel" aria-labelledby="countdown-title">
            <span class="protocol-badge"><i class="pi pi-stopwatch" aria-hidden="true" />{{ t('alerts.countdown.sequence') }}</span>
            <h1 id="countdown-title" ref="countdownHeading" tabindex="-1">
              {{ panicStage === 'counting' ? t('alerts.countdown.title') : t('alerts.countdown.completedTitle') }}
            </h1>
            <p class="subtitle">{{ t('alerts.countdown.description') }}</p>
            <div class="countdown-ring" :style="{ '--countdown-angle': `${countdownProgress * 360}deg` }">
              <div class="countdown-ring-inner" role="timer" :aria-label="t('alerts.countdown.remaining')">
                <span class="timer-caption">{{ t('alerts.countdown.remaining') }}</span>
                <div class="timer-value">{{ remainingSeconds }}<span>{{ t('alerts.countdown.seconds') }}</span></div>
                <span class="pending-badge"><span class="status-dot red" />{{ t('alerts.countdown.pending') }}</span>
              </div>
            </div>
            <div v-if="panicStage === 'counting'" class="cancellation-copy">
              <p><i class="pi pi-verified" aria-hidden="true" />{{ t('alerts.countdown.cancelTitle') }}</p>
              <p>{{ t('alerts.countdown.cancelDescription') }}</p>
            </div>
            <p v-else class="completion-message" role="status">{{ t('alerts.countdown.completedDescription') }}</p>
            <pv-button class="cancel-button" :label="panicStage === 'counting' ? t('alerts.countdown.cancel') : t('alerts.countdown.back')"
                       :icon="panicStage === 'counting' ? 'pi pi-times-circle' : 'pi pi-arrow-left'" severity="secondary" @click="returnToAlerts" />
            <p class="cancel-hint">{{ t('alerts.countdown.notSent') }}</p>
          </section>
          <aside class="confirmation-details" :aria-label="t('alerts.countdown.details')">
            <section class="detail-card">
              <p class="detail-eyebrow">{{ t('alerts.countdown.sender') }}</p>
              <div class="sender-row"><span class="report-icon blue"><i class="pi pi-building" aria-hidden="true" /></span><div><h2>{{ t('alerts.countdown.business') }}</h2><p>{{ t('alerts.unavailable') }}</p></div></div>
              <div class="location-placeholder"><span class="location-pin"><i class="pi pi-map-marker" aria-hidden="true" /></span><h3>{{ t('alerts.countdown.location') }}</h3><p>{{ t('alerts.countdown.locationUnavailable') }}</p></div>
            </section>
            <section class="detail-card">
              <h2 class="protocol-title"><i class="pi pi-bolt" aria-hidden="true" />{{ t('alerts.countdown.protocolTitle') }}</h2>
              <ol class="protocol-steps">
                <li><span class="step-number">1</span><div><h3>{{ t('alerts.countdown.stepOne') }}</h3><p>{{ t('alerts.countdown.stepOneDescription') }}</p></div></li>
                <li><span class="step-number">2</span><div><h3>{{ t('alerts.countdown.stepTwo') }}</h3><p>{{ t('alerts.countdown.stepTwoDescription') }}</p></div></li>
                <li><span class="step-number">3</span><div><h3>{{ t('alerts.countdown.stepThree') }}</h3><p>{{ t('alerts.countdown.stepThreeDescription') }}</p></div></li>
              </ol>
            </section>
          </aside>
        </div>
        <template v-else>
        <div class="page-heading">
          <div><p class="eyebrow"><span class="status-dot red" />{{ t('alerts.commandCenter') }}</p><h1>{{ t('alerts.title') }}</h1><p class="subtitle">{{ t('alerts.subtitle') }}</p></div>
          <pv-button class="history-button" icon="pi pi-history" :label="t('alerts.history')" severity="secondary" disabled />
        </div>
        <section class="indicators" :aria-label="t('alerts.networkStatus')">
          <div v-for="indicator in indicators" :key="indicator.key" class="indicator">
            <i :class="['pi', indicator.icon, indicator.tone]" aria-hidden="true" />
            <div><h2>{{ t(`alerts.indicators.${indicator.key}`) }}</h2><p>{{ t('alerts.unavailable') }}</p></div>
          </div>
        </section>
        <section class="panic-panel" aria-labelledby="panic-title">
          <span class="protocol-badge"><i class="pi pi-shield" aria-hidden="true" />{{ t('alerts.protocol') }}</span>
          <pv-button ref="panicButton" class="panic-button" :aria-label="t('alerts.panicTitle')" @click="startCountdown" />
          <h2 id="panic-title">{{ t('alerts.panicTitle') }}</h2>
          <p class="panic-description">{{ t('alerts.panicDescription') }}</p>
          <p class="preview-note">{{ t('alerts.previewNote') }}</p>
        </section>
        <section class="reports-section" aria-labelledby="reports-title">
          <h2 id="reports-title">{{ t('alerts.reportsTitle') }}</h2><p class="subtitle">{{ t('alerts.reportsSubtitle') }}</p>
          <div class="report-grid">
            <article v-for="report in reports" :key="report.key" class="report-card">
              <div class="report-card-top"><span :class="['report-icon', report.tone]"><i :class="['pi', report.icon]" aria-hidden="true" /></span><span :class="['report-badge', report.tone]">{{ t(`alerts.reports.${report.key}.badge`) }}</span></div>
              <h3>{{ t(`alerts.reports.${report.key}.title`) }}</h3><p>{{ t(`alerts.reports.${report.key}.description`) }}</p>
              <pv-button class="report-action" :label="t(`alerts.reports.${report.key}.action`)" icon="pi pi-arrow-right" icon-pos="right" text severity="secondary" @click="report.key === 'historical' ? openHistory() : openPreventive(report.key)" />
            </article>
          </div>
        </section>
        </template>
      </main>
    </div>
  </div>
</template>

<style scoped>
.history-view { display: grid; gap: 18px; padding-top: 10px; }.history-heading-row { display: flex; justify-content: space-between; align-items: center; gap: 20px; }.history-heading-row h1 { font-size: 27px; margin: 8px 0; outline: none; }.history-heading-row > :deep(.p-button) { flex-shrink: 0; font-size: 12px; }.history-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }.history-filters { padding: 16px; border-radius: 12px; background: white; border: 1px solid #f0f1f7; }.history-filter-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }.history-search { flex: 1; min-width: 160px; display: flex; align-items: center; gap: 8px; padding: 10px; background: #eef3ff; border-radius: 8px; }.history-search input { width: 100%; background: transparent; border: 0; color: #25374d; font: inherit; font-size: 12px; }.history-periods { display: flex; gap: 4px; padding: 4px; border-radius: 8px; background: #eef3ff; }.history-periods button, .history-status { border: 0; padding: 7px 10px; border-radius: 7px; background: transparent; color: #536179; font: inherit; font-size: 11px; cursor: pointer; }.history-periods button.selected { background: white; color: #1464ff; font-weight: 700; }.history-type select { max-width: 100%; padding: 10px; border: 0; border-radius: 7px; background: #eef3ff; color: #25374d; font: inherit; font-size: 12px; }.history-statuses { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 18px 0 12px; }.history-statuses > span { font-size: 10px; text-transform: uppercase; color: #717580; }.history-status { border-radius: 20px; background: #eef3ff; }.history-status.selected { background: #0056da; color: white; }.history-results { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 18px; }.history-empty, .history-detail { display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 260px; padding: 30px; background: white; border: 1px solid #f0f1f7; border-radius: 12px; text-align: center; }.history-empty > i, .history-detail > i { font-size: 32px; color: #6088cf; margin-bottom: 14px; }.history-empty h2, .history-detail h2 { font-size: 17px; font-weight: 700; }.history-empty p, .history-detail p { margin-top: 9px; font-size: 13px; color: #717580; }.history-back { justify-self: start; font-size: 12px; }.history-filters button:focus-visible, .history-filters input:focus-visible, .history-filters select:focus-visible { outline: 2px solid #246bfa; outline-offset: 2px; }
@media (max-width: 760px) { .history-heading-row { align-items: flex-start; flex-direction: column; }.history-summary, .history-results { grid-template-columns: 1fr; }.history-filter-top { align-items: stretch; flex-direction: column; }.history-periods { justify-content: space-between; }.history-type select { width: 100%; } }
.community-form-view .preventive-intro { background: transparent; border-top: 0; padding: 0 0 8px; }
.community-form-view .preventive-intro-top > span { background: #e1eaff; color: #1d4a92; }
.community-form-view .preventive-options { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 9px; }
.community-form-view .preventive-option { align-items: flex-start; text-align: left; padding: 12px 8px; min-height: 105px; }
.community-form-view .preventive-option .incident-icon { border-radius: 8px; width: 32px; height: 32px; }
.community-form-view .preventive-option.selected { background: #dce8ff; border-color: #246bfa; color: #174baf; }
.community-form-view .preventive-option.selected .incident-icon { background: #0056da; color: white; }
.community-form-view .preventive-option.selected > span:last-child { color: #657187; }
.community-form-view .preventive-bottom { grid-template-columns: 1fr; }
.community-form-view .preventive-aside .detail-card:last-child { background: #edf3ff; }
@media (max-width: 600px) { .community-form-view .preventive-options { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.preventive-grid { display: grid; grid-template-columns: minmax(0, 2.2fr) minmax(220px, 1fr); gap: 20px; padding-top: 26px; }.preventive-form { display: grid; gap: 14px; min-width: 0; }.preventive-intro { padding: 18px; background: white; border-radius: 12px; border-top: 4px solid #eca01c; }.preventive-intro-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.preventive-intro-top > span { font-size: 10px; font-weight: 750; text-transform: uppercase; color: #a45608; background: #fff5e5; padding: 3px 8px; border-radius: 12px; }.preventive-intro h1 { font-size: 25px; outline: none; }.preventive-intro p { font-size: 12px; color: #727580; margin-top: 6px; }
.preventive-options { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; margin-top: 16px; }.preventive-option { position: relative; display: flex; flex-direction: column; align-items: center; gap: 5px; border: 2px solid transparent; border-radius: 8px; background: #eef3ff; padding: 10px 5px; text-align: center; cursor: pointer; }.preventive-option input { position: absolute; opacity: 0; width: 1px; height: 1px; }.preventive-option strong { font-size: 11px; }.preventive-option > span:last-child { font-size: 10px; color: #747b89; }.preventive-option.selected { background: #172033; border-color: #172033; color: white; }.preventive-option.selected .incident-icon { background: #ffffff20; color: white; }.preventive-option.selected > span:last-child { color: #c2cad9; }.preventive-option:focus-within { outline: 3px solid #95baff; outline-offset: 2px; }
.preventive-location input { width: 100%; margin-top: 15px; border: 1px solid #dce5f5; background: #eef3ff; padding: 12px; border-radius: 7px; font: inherit; font-size: 12px; color: #25374d; }.preventive-location input:focus { outline: 2px solid #246bfa; }.preventive-bottom { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); gap: 12px; }.preventive-bottom h2 { font-size: 14px; font-weight: 700; }.moment-option { display: flex; align-items: center; gap: 7px; padding: 9px; background: #eef3ff; border-radius: 6px; margin-top: 9px; font-size: 11px; cursor: pointer; }.moment-option input { accent-color: #246bfa; }.preventive-bottom textarea { font-size: 12px; }.preventive-bottom .form-help { font-size: 11px; }
.preventive-aside { display: grid; align-content: start; gap: 14px; }.preventive-aside h2 { font-size: 13px; font-weight: 700; }.preventive-aside h2 i { margin-right: 7px; }.preventive-map-placeholder { display: grid; place-items: center; gap: 10px; min-height: 155px; background: #e7eef9; border-radius: 9px; margin-top: 14px; padding: 20px; color: #718098; text-align: center; font-size: 12px; }.preventive-map-placeholder i { font-size: 32px; }.preventive-guidance { display: flex; gap: 8px; margin-top: 15px !important; font-size: 12px; color: #657187 !important; }.preventive-guidance i { margin-top: 3px; }.preventive-guidance:last-child i { color: #c51920; }
@media (max-width: 1100px) { .preventive-grid { grid-template-columns: 1fr; }.preventive-aside { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { .preventive-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }.preventive-bottom, .preventive-aside { grid-template-columns: 1fr; } }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.report-form-view { display: grid; gap: 20px; }.report-intro { display: flex; align-items: center; gap: 15px; padding: 24px; border-radius: 13px; background: linear-gradient(110deg, #eef3ff, #e8edff); }.report-intro h1 { font-size: 21px; letter-spacing: -.5px; outline: none; }.report-intro p { font-size: 13px; color: #727580; margin-top: 6px; }.report-intro-icon { flex-shrink: 0; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; color: white; background: #0056da; font-size: 23px; }.report-intro .location-status { margin-left: auto; white-space: nowrap; }
.report-form-view form { display: grid; gap: 20px; }.report-fieldset, .description-section, .report-form-actions { min-width: 0; margin: 0; padding: 22px; border: 1px solid #f0f1f7; border-radius: 13px; background: white; }.form-section-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; }.form-section-heading h2 { font-size: 16px; font-weight: 700; }.form-section-heading i { color: #246bfa; margin-right: 8px; }.required-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #b91c24; background: #ffdede; border-radius: 4px; padding: 3px 8px; }.form-help { font-size: 13px; color: #767985 !important; margin: 15px 0 !important; max-width: 650px; }
.incident-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }.incident-option { position: relative; padding: 8px; border: 2px solid transparent; background: #eef3ff; border-radius: 13px; cursor: pointer; }.incident-option input { position: absolute; opacity: 0; width: 1px; height: 1px; }.incident-option-content { min-height: 104px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; padding: 10px; border-radius: 8px; text-align: center; }.incident-option-content > span:last-child { font-size: 12px; color: #727580; }.incident-option-content strong { font-size: 14px; }.incident-icon { display: grid; place-items: center; width: 38px; height: 38px; background: white; border-radius: 50%; color: #686e79; font-size: 18px; margin-bottom: 4px; }.incident-option.is-selected { border-color: #1464ff; }.incident-option.is-selected .incident-option-content { background: white; box-shadow: 0 3px 4px #15253b20; }.incident-option.is-selected .incident-icon { background: #0056da; color: white; }.incident-option:focus-within { outline: 3px solid #95baff; outline-offset: 3px; }
.description-section textarea { display: block; width: 100%; margin-top: 18px; padding: 16px; border: 1px solid transparent; border-radius: 12px; background: #eef3ff; resize: vertical; min-height: 130px; color: #25374d; font: inherit; font-size: 14px; line-height: 1.5; }.description-section textarea::placeholder { color: #8b93a4; }.description-section textarea:focus { outline: 2px solid #246bfa; outline-offset: 2px; }.description-section .form-help { font-size: 12px; margin-bottom: 0 !important; }
.report-buttons { display: flex; align-items: center; justify-content: space-between; gap: 15px; }.report-buttons :deep(.p-button) { font-size: 13px; border-radius: 8px; }.report-preview-info { margin-top: 15px !important; padding: 12px; background: #eef3ff; border-radius: 8px; font-size: 12px; color: #657187 !important; }.report-feedback { margin-top: 12px !important; font-size: 13px; color: #215db9 !important; }.report-form-actions > :deep(.p-button) { margin-top: 10px; font-size: 12px; }
@media (max-width: 600px) { .report-intro { flex-wrap: wrap; padding: 18px; }.report-intro .location-status { margin-left: 0; }.incident-options { grid-template-columns: 1fr; }.report-buttons { align-items: stretch; flex-direction: column; }.report-fieldset, .description-section, .report-form-actions { padding: 18px; }.form-section-heading { align-items: flex-start; } }
.active-preview { display: flex; flex-direction: column; gap: 16px; min-height: calc(100svh - 130px); }
.active-banner { position: relative; overflow: hidden; padding: 24px; background: #c51920; border-radius: 12px; color: #fff; box-shadow: 0 8px 15px #51101820; }
.active-banner::after { content: ''; position: absolute; right: -30px; top: -80px; width: 230px; height: 310px; border: 2px solid #ffffff15; border-radius: 50%; pointer-events: none; }
.active-eyebrow { display: flex; align-items: center; gap: 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; }.active-eyebrow .status-dot { background: #fff; width: 12px; height: 12px; }
.active-banner h1 { color: white; margin: 15px 0 5px; font-size: clamp(25px, 3vw, 38px); letter-spacing: -1px; }.active-subtitle { font-size: 18px; }
.active-badges { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 17px; font-size: 12px; font-weight: 650; }.active-badges span { display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 20px; background: #a51319; }.active-badges span:first-child { background: white; color: #b51920; }
.active-metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }.active-card { padding: 18px; background: white; border-radius: 12px; border: 1px solid #f0f1f7; }
.active-card-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; }.active-card-heading h2, .metric-caption { font-size: 11px; text-transform: uppercase; font-weight: 650; color: #666976; }.preview-status { padding: 3px 9px; border-radius: 20px; background: #ffdddd; color: #bd2027; font-size: 11px; font-weight: 700; text-transform: uppercase; }
.metric-caption { margin-top: 20px !important; }.metric-value { font-size: 38px; font-weight: 750; line-height: 1.2; }.metric-value span { margin-left: 8px; font-size: 12px; font-weight: 400; }.active-muted { font-size: 12px; color: #737580 !important; }
.location-status { font-size: 10px; padding: 3px 8px; border-radius: 5px; color: #246bfa; background: #e5eeff; font-weight: 700; }.active-location-body { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-top: 14px; }.active-location h3 { font-size: 18px; font-weight: 700; }
.coordinates { display: flex; flex-direction: column; padding: 10px 14px; background: #eef3ff; border-radius: 8px; text-align: center; }.coordinates span { font-size: 10px; text-transform: uppercase; color: #666976; }.coordinates strong { font-family: monospace; }
.finish-panel { margin-top: auto; padding: 30px 24px; background: #fff; border: 1px solid #f0f1f7; border-radius: 12px; text-align: center; }.finish-button { width: 100%; max-width: 540px; background: #223247; color: #fff; padding: 18px; font-size: 17px; font-weight: 700; border-radius: 10px; }.finish-button:disabled { opacity: .8; }.finish-warning { color: #c51920 !important; font-size: 15px; font-weight: 650; max-width: 560px; margin: 16px auto 8px !important; }.return-preview-button { margin-top: 15px; font-size: 12px; }
@media (max-width: 600px) { .active-metrics { grid-template-columns: 1fr; }.active-banner { padding: 20px; }.active-subtitle { font-size: 15px; }.active-location-body { align-items: flex-start; flex-direction: column; }.finish-panel { padding: 24px 16px; }.finish-button { font-size: 14px; } }
.confirmation-grid { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr); gap: 22px; padding-top: 60px; }
.countdown-panel { padding: 28px 32px; display: flex; flex-direction: column; align-items: center; text-align: center; border: 1px solid #f0f1f7; border-radius: 15px; background: radial-gradient(ellipse at 50% 0%, #fae4e5, #fff 48%); }
.countdown-panel h1 { max-width: 420px; margin: 12px 0 8px !important; font-size: 29px !important; outline: none; }
.countdown-panel .subtitle { max-width: 420px; }
.countdown-panel .protocol-badge { color: #246bfa; }
.countdown-panel .protocol-badge i { color: inherit; }
.countdown-ring { width: 244px; height: 244px; margin: 42px 0 32px; padding: 13px; border-radius: 50%; background: conic-gradient(#c51920 var(--countdown-angle), #f5dfe1 0); }
.countdown-ring-inner { width: 100%; height: 100%; border-radius: 50%; background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.timer-caption, .pending-badge, .detail-eyebrow { font-size: 10px; font-weight: 750; color: #686a75; text-transform: uppercase; }
.timer-value { color: #c51920; font-size: 72px; font-weight: 750; letter-spacing: -3px; line-height: 1.1; }
.timer-value > span { font-size: 13px; color: #565a65; letter-spacing: normal; margin-left: 8px; }
.pending-badge { display: flex; align-items: center; gap: 5px; background: #eef3ff; border-radius: 20px; padding: 2px 8px; margin-top: 5px; }
.cancellation-copy { color: #70717c; font-size: 12px; max-width: 400px; }.cancellation-copy p + p { margin-top: 4px; }.cancellation-copy i { margin-right: 5px; }
.cancel-button { width: 100%; max-width: 350px; margin-top: 25px; background: #fff; border: 0; border-left: 5px solid #c51920; border-radius: 8px; box-shadow: 0 3px 5px #15253b1a; color: #15253b; font-weight: 750; font-size: 13px; padding: 14px; }
.cancel-button :deep(.p-button-icon) { color: #c51920; }.cancel-hint { font-size: 11px; color: #71717e !important; margin-top: 8px !important; }
.completion-message { font-size: 13px; color: #9c2a30 !important; max-width: 400px; }
.confirmation-details { display: grid; align-content: start; gap: 14px; }.detail-card { background: #fff; border: 1px solid #f0f1f7; border-radius: 14px; padding: 16px; }
.sender-row { display: flex; gap: 12px; align-items: center; margin: 14px 0; }.sender-row h2 { font-size: 14px; font-weight: 700; }.sender-row p, .location-placeholder p { font-size: 11px; color: #71717e; }
.location-placeholder { padding: 30px 15px; border-radius: 8px; background: #e5eeff; text-align: center; }.location-placeholder h3 { font-size: 12px; margin-top: 6px; }.location-pin { display: inline-grid; place-items: center; background: #c51920; color: white; border-radius: 50%; width: 28px; height: 28px; }
.protocol-title { display: flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 700; }.protocol-title i { color: #c51920; }
.protocol-steps { list-style: none; padding: 0; margin: 15px 0 0; display: grid; gap: 10px; }.protocol-steps li { display: flex; gap: 10px; padding: 12px; border-radius: 8px; background: #eef3ff; }.step-number { width: 24px; height: 24px; flex-shrink: 0; display: grid; place-items: center; border-radius: 50%; color: #246bfa; background: #dce8ff; font-weight: 700; }.protocol-steps li:first-child .step-number { color: #c51920; background: #efdfe6; }.protocol-steps h3 { font-size: 12px; font-weight: 700; }.protocol-steps p { font-size: 11px; color: #71717e; margin-top: 3px; }
@media (max-width: 1000px) { .confirmation-grid { grid-template-columns: 1fr; padding-top: 16px; }.confirmation-details { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { .countdown-panel { padding: 24px 18px; }.countdown-panel h1 { font-size: 25px !important; }.confirmation-details { grid-template-columns: 1fr; }.countdown-ring { width: 220px; height: 220px; margin: 28px 0; } }
.employee-alerts { position: absolute; inset: 0; min-height: 100svh; overflow: auto; background: #f7f8fd; color: #15253b; font: 14px/1.45 'Segoe UI', Arial, sans-serif; letter-spacing: normal; text-align: left; color-scheme: light; }
.employee-alerts, .employee-alerts * { box-sizing: border-box; }
.employee-alerts h1, .employee-alerts h2, .employee-alerts h3, .employee-alerts p { margin: 0; color: inherit; font-family: inherit; }
.employee-alerts button, .employee-alerts a { font-family: inherit; }
.skip-link { position: absolute; top: -60px; left: 16px; z-index: 10; padding: 10px; background: white; color: #15253b; }.skip-link:focus { top: 10px; }
.app-header { min-height: 68px; padding: 12px 26px; background: #fff; border-bottom: 1px solid #edf0f8; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.brand, .header-tools, .employee-label { display: flex; align-items: center; gap: 10px; }.brand { font-weight: 750; }.brand img { border-radius: 7px; }
.network-badge { display: inline-flex; align-items: center; gap: 5px; margin-left: 5px; padding: 3px 8px; border-radius: 20px; background: #e8efff; font-size: 10px; font-weight: 700; text-transform: uppercase; }
.status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #11b889; flex-shrink: 0; }.status-dot.red { background: #db232a; }
.employee-label { font-size: 12px; font-weight: 600; }.employee-icon { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; background: #eef3ff; }
.header-tools :deep(.p-togglebutton) { padding: 5px 8px; font-size: 11px; }
.workspace { display: grid; grid-template-columns: 232px minmax(0, 1fr); min-height: calc(100svh - 68px); }
.sidebar { background: #fff; padding: 14px 14px 22px; display: flex; flex-direction: column; border-right: 1px solid #f0f2f8; }
.sidebar-heading { display: flex; justify-content: space-between; align-items: center; margin: 0 6px 23px; font-size: 10px; font-weight: 750; color: #666873; text-transform: uppercase; }.sidebar nav { display: grid; gap: 5px; }
.nav-item { width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 0; border-radius: 8px; background: transparent; color: #555862; text-decoration: none; font-size: 13px; text-align: left; }.nav-item:disabled { opacity: .7; }.nav-item.selected { background: #141c2e; color: #fff; }
.sidebar-footer { margin-top: auto; display: flex; gap: 10px; align-items: center; padding: 13px; border-radius: 8px; background: #eef3ff; font-size: 11px; color: #546279; }
.alerts-content { width: 100%; max-width: 1260px; padding: 14px 20px 64px; margin: 0 auto; outline: none; }
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 26px; }
.eyebrow { display: flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 750; text-transform: uppercase; color: #626574 !important; }
.employee-alerts h1 { font-size: 30px; line-height: 1.2; font-weight: 750; letter-spacing: -1.2px; margin: 4px 0; }.subtitle { font-size: 13px; color: #71717e !important; }
.history-button { flex-shrink: 0; background: #fff; border: 1px solid #edf0f6; border-radius: 11px; font-size: 12px; padding: 10px 14px; }.history-button:disabled, .report-action:disabled { opacity: .65; }
.indicators { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; padding: 10px; background: #eef3ff; border-radius: 13px; margin-bottom: 26px; }
.indicator { display: flex; align-items: center; gap: 10px; padding: 11px 13px; background: #fff; border-radius: 8px; min-width: 0; }.indicator i { font-size: 14px; }.indicator h2 { font-size: 10px; font-weight: 750; color: #71717a; line-height: 1.3; text-transform: uppercase; }.indicator p { font-size: 11px; font-weight: 600; color: #687183; }
.green { color: #11ad83; }.blue { color: #246bfa; }.muted { color: #86868d; }
.panic-panel { min-height: 430px; display: flex; flex-direction: column; align-items: center; text-align: center; padding: 28px 24px 26px; border-radius: 22px; border: 1px solid #f0f0f5; background: linear-gradient(180deg, #fcf5f5 0%, #fff 60%); }
.protocol-badge { display: flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; background: #dfeaff; font-size: 10px; font-weight: 750; text-transform: uppercase; }.protocol-badge i { color: #e83d3d; font-size: 12px; }
.panic-button { width: 208px; height: 208px; min-height: 208px; border-radius: 50%; margin: 22px 0 28px; background: #eb3434; border: 1px solid #ef4444; box-shadow: 0 12px 30px #ed3b3b4a; }.panic-button:disabled { opacity: 1; }
.panic-panel h2 { font-size: 16px; font-weight: 750; color: #111; }.panic-description { max-width: 235px; margin-top: 20px !important; font-size: 12px; line-height: 1.3; color: #444 !important; }.preview-note { margin-top: 15px !important; font-size: 11px; color: #777582 !important; }
.reports-section { margin-top: 26px; }.reports-section > h2 { font-size: 19px; font-weight: 650; letter-spacing: -.5px; }
.report-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-top: 13px; }.report-card { display: flex; flex-direction: column; padding: 20px; background: #fff; border-radius: 15px; border: 1px solid #f0f1f7; }
.report-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 16px; }.report-icon { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; font-size: 19px; }.report-badge { padding: 3px 7px; border-radius: 20px; font-size: 10px; font-weight: 750; text-transform: uppercase; }
.report-icon.amber, .report-badge.amber { color: #b45309; background: #fff5e7; }.report-icon.blue, .report-badge.blue { color: #246bfa; background: #e7efff; }.report-icon.navy, .report-badge.navy { color: #30465f; background: #dfeaff; }
.report-card h3 { font-size: 14px; font-weight: 700; letter-spacing: -.3px; margin-bottom: 5px; }.report-card > p { font-size: 12px; color: #777781; line-height: 1.45; margin-bottom: 12px; }
.report-action { margin-top: auto; width: 100%; padding: 0; font-size: 11px; justify-content: space-between; border-radius: 4px; color: #343844; }.report-action :deep(.p-button-label) { flex: unset; text-align: left; }.report-action :deep(.p-button-icon) { font-size: 12px; }
.employee-alerts a:focus-visible { outline: 3px solid #246bfa; outline-offset: 3px; }
@media (min-width: 1440px) { .alerts-content { padding-top: 26px; }.panic-panel { min-height: 460px; }.panic-button { width: 230px; height: 230px; } }
@media (max-width: 1100px) { .workspace { grid-template-columns: 210px minmax(0, 1fr); }.indicators { grid-template-columns: repeat(2, minmax(0, 1fr)); }.report-card { padding: 16px; }.report-card-top { align-items: flex-start; flex-wrap: wrap; } }
@media (max-width: 760px) { .app-header { padding: 12px 16px; }.workspace { grid-template-columns: 1fr; }.sidebar { padding: 10px 16px; border-bottom: 1px solid #edf0f8; }.sidebar nav { grid-template-columns: repeat(3, minmax(0, 1fr)); }.sidebar-heading, .sidebar-footer { display: none; }.nav-item { justify-content: center; padding: 10px 6px; font-size: 12px; }.alerts-content { padding: 22px 16px 40px; }.report-grid { grid-template-columns: 1fr; }.report-card-top { flex-wrap: nowrap; }.panic-panel { min-height: 420px; }.page-heading { align-items: flex-start; }.employee-label { display: none; }.history-button { padding: 9px; }.brand { gap: 6px; }.network-badge { font-size: 9px; } }
@media (max-width: 420px) { .network-badge { display: none; }.page-heading { flex-direction: column; gap: 12px; }.indicator { padding: 10px 8px; gap: 7px; }.indicator h2 { font-size: 9px; }.indicator p { font-size: 10px; }.nav-item { gap: 6px; }.panic-button { width: 190px; height: 190px; min-height: 190px; } }
</style>

