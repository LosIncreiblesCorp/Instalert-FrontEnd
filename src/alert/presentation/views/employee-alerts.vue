<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useConfirm } from 'primevue';
import { useI18n } from 'vue-i18n';
import useAlertStore from '../../application/alert.store.js';
import { AlertRecordKind, AlertRecordStatus } from '../../domain/model/alert-record.entity.js';
import {
  MAX_PANIC_GRACE_PERIOD_SECONDS,
  MIN_PANIC_GRACE_PERIOD_SECONDS,
} from '../../domain/model/alert-preferences.entity.js';

const store = useAlertStore();
const route = useRoute();
const isHistoryOnly = computed(() => route.meta.historyOnly === true);
const historyRecordId = ref(null);
const confirm = useConfirm();
const { locale, t } = useI18n();
const {
  preferences,
  alertRecords,
  currentView: employeeCurrentView,
  countdownDurationSeconds,
  remainingSeconds,
  countdownProgress,
  reportDraft,
  reportKind,
  selectedRecord: employeeSelectedRecord,
  lastSubmittedRecordId,
  activePanicRecord,
  pendingPanicRecord,
  isLoading,
  isSaving,
  isInitialized,
  isActivatingPanic,
  errorMessage,
  hasUnsavedReportDraft,
} = storeToRefs(store);

const currentView = computed(() => isHistoryOnly.value
  ? historyRecordId.value === null ? 'history' : 'record-detail'
  : employeeCurrentView.value);
const selectedRecord = computed(() => isHistoryOnly.value
  ? alertRecords.value.find((record) => String(record.id) === String(historyRecordId.value)) ?? null
  : employeeSelectedRecord.value);
const isHistoryHeading = computed(() => isHistoryOnly.value || currentView.value === 'history');

const gracePeriodDraft = ref(5);
const preferenceFeedback = ref('');
let preferenceSavePromise = null;
const locationFeedback = ref('');
const reportValidationError = ref(false);
const panicValidationError = ref(false);
const historySearch = ref('');
const historyStatus = ref('all');
const historyKind = ref('all');
const latestReportDate = ref(new Date());
const currentTime = ref(Date.now());
let elapsedTimeInterval = null;

const activeElapsedTime = computed(() => {
  const activatedAt = new Date(activePanicRecord.value?.activatedAt ?? '').getTime();
  if (!Number.isFinite(activatedAt)) return t('alerts.workflow.notRecorded');
  const elapsedSeconds = Math.max(0, Math.floor((currentTime.value - activatedAt) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  const parts = [minutes, seconds];
  if (hours > 0) parts.unshift(hours);
  return parts.map((part) => String(part).padStart(2, '0')).join(':');
});

const categoryIcons = {
  robbery: 'pi pi-shopping-bag',
  attemptedRobbery: 'pi pi-shield',
  assault: 'pi pi-exclamation-triangle',
  extortion: 'pi pi-lock',
  vandalism: 'pi pi-hammer',
  person: 'pi pi-user',
  vehicle: 'pi pi-car',
  unusualBehavior: 'pi pi-exclamation-circle',
  surveillance: 'pi pi-eye',
  lowLighting: 'pi pi-moon',
  policePresence: 'pi pi-shield',
  roadBlockage: 'pi pi-ban',
  other: 'pi pi-ellipsis-h',
};

const panicCategories = ['robbery', 'attemptedRobbery', 'assault', 'extortion', 'vandalism', 'other'];
const reportCategoryKeys = computed(() => {
  if (reportKind.value === AlertRecordKind.PAST_INCIDENT) {
    return ['robbery', 'attemptedRobbery', 'assault', 'extortion', 'vandalism', 'other'];
  }
  if (reportKind.value === AlertRecordKind.SUSPICIOUS_ACTIVITY) {
    return ['person', 'vehicle', 'unusualBehavior', 'surveillance', 'other'];
  }
  return ['lowLighting', 'policePresence', 'roadBlockage', 'other'];
});

const panicCategoryOptions = computed(() => panicCategories.map((value) => ({
  value,
  label: t(`alerts.workflow.categories.${value}`),
  icon: categoryIcons[value],
  description: t(`alerts.workflow.categoryDescriptions.${value}`),
})));
const reportCategoryOptions = computed(() => reportCategoryKeys.value.map((value) => ({
  value,
  label: t(`alerts.workflow.categories.${value}`),
  icon: categoryIcons[value],
  description: t(`alerts.workflow.categoryDescriptions.${value}`),
})));
const kindFilterOptions = computed(() => ['all', ...Object.values(AlertRecordKind)]
  .map((value) => ({ value, label: t(`alerts.workflow.kinds.${value}`) })));
const statusFilterOptions = computed(() => [
  AlertRecordStatus.ACTIVE,
  AlertRecordStatus.PENDING_REPORT,
  AlertRecordStatus.COMPLETED,
  AlertRecordStatus.SUBMITTED,
  AlertRecordStatus.RESOLVED,
  AlertRecordStatus.FALSE_ALARM,
].map((value) => ({ value, label: t(`alerts.workflow.statuses.${value}`) })));

const panicCategory = computed({
  get: () => selectedRecord.value?.category ?? '',
  set: (value) => {
    store.updatePanicReportDraft({ category: value });
    panicValidationError.value = false;
  },
});
const panicDescription = computed({
  get: () => selectedRecord.value?.description ?? '',
  set: (value) => {
    store.updatePanicReportDraft({ description: value });
    panicValidationError.value = false;
  },
});
const panicLocation = computed({
  get: () => selectedRecord.value?.location ?? '',
  set: (value) => store.updatePanicReportDraft({ location: value }),
});
const reportCategory = computed({
  get: () => reportDraft.value.category,
  set: (value) => {
    store.updateReportDraft({ category: value });
    reportValidationError.value = false;
  },
});
const reportLocation = computed({
  get: () => reportDraft.value.location,
  set: (value) => {
    store.updateReportDraft({ location: value });
    reportValidationError.value = false;
  },
});
const reportMoment = computed({
  get: () => {
    const date = new Date(reportDraft.value.moment);
    return Number.isFinite(date.getTime()) ? date : null;
  },
  set: (value) => {
    store.updateReportDraft({ moment: value instanceof Date && Number.isFinite(value.getTime()) ? value.toISOString() : '' });
    reportValidationError.value = false;
  },
});
const reportDescription = computed({
  get: () => reportDraft.value.description,
  set: (value) => {
    store.updateReportDraft({ description: value });
    reportValidationError.value = false;
  },
});

const filteredRecords = computed(() => {
  const query = historySearch.value.trim().toLocaleLowerCase();
  return alertRecords.value.filter((record) => {
    const matchesStatus = historyStatus.value === 'all' || record.status === historyStatus.value;
    const matchesKind = historyKind.value === 'all' || record.kind === historyKind.value;
    const searchableText = [record.id, record.category, record.description, record.location]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase();
    return matchesStatus && matchesKind && (!query || searchableText.includes(query));
  });
});
const submittedRecord = computed(() => alertRecords.value.find((record) =>
  String(record.id) === String(lastSubmittedRecordId.value)) ?? null);
const panicFormIsComplete = computed(() => Boolean(
  selectedRecord.value?.category?.trim() && selectedRecord.value?.description?.trim(),
));
const reportFormIsComplete = computed(() => Boolean(
  reportDraft.value.category?.trim()
  && reportDraft.value.location?.trim()
  && Number.isFinite(Date.parse(reportDraft.value.moment))
  && Date.parse(reportDraft.value.moment) <= currentTime.value
  && reportDraft.value.description?.trim(),
));

watch(() => preferences.value.panicGracePeriodSeconds, (seconds) => {
  gracePeriodDraft.value = seconds;
}, { immediate: true });

watch(isHistoryOnly, (historyOnly) => {
  historyRecordId.value = null;
  if (historyOnly) void store.loadHistory();
  else void store.initialize();
}, { immediate: true });

onMounted(() => {
  elapsedTimeInterval = window.setInterval(() => { currentTime.value = Date.now(); }, 1000);
});

onUnmounted(() => {
  window.clearInterval(elapsedTimeInterval);
});

function formatDate(value) {
  if (!value) return t('alerts.workflow.notRecorded');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t('alerts.workflow.notRecorded');
  const language = locale.value === 'es' ? 'es-419' : 'en-US';
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function titleForKind(kind) {
  return t(`alerts.workflow.kinds.${kind}`);
}

function formatReportMoment(value) {
  if (['now', '15-30-minutes', 'over-one-hour'].includes(value)) {
    return t(`alerts.workflow.moments.${value}`);
  }
  return formatDate(value);
}

function titleForCategory(category) {
  return category ? t(`alerts.workflow.categories.${category}`) : t('alerts.workflow.notRecorded');
}

function statusLabel(status) {
  return t(`alerts.workflow.statuses.${status}`);
}

function requestCurrentLocation(target) {
  locationFeedback.value = 'requesting';
  if (!navigator.geolocation) {
    locationFeedback.value = 'unavailable';
    return;
  }

  navigator.geolocation.getCurrentPosition((position) => {
    const { latitude, longitude } = position.coords;
    const location = {
      location: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      latitude,
      longitude,
    };

    if (target === 'panic') store.setCountdownLocation(location);
    else if (target === 'panic-report') store.updatePanicReportDraft(location);
    else if (!reportDraft.value.location) store.updateReportDraft(location);

    locationFeedback.value = 'ready';
  }, () => {
    locationFeedback.value = 'unavailable';
  }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 });
}

async function preloadLocationIfAlreadyAllowed(target) {
  try {
    const permission = await navigator.permissions?.query({ name: 'geolocation' });
    if (permission?.state === 'granted') requestCurrentLocation(target);
  } catch {
    // Request location only after an explicit user action if permission state is unavailable.
  }
}

async function startPanic() {
  if (preferenceSavePromise && !await preferenceSavePromise) return;
  if (Number(gracePeriodDraft.value) !== preferences.value.panicGracePeriodSeconds
    && !await saveGracePeriod()) return;
  if (store.startPanicCountdown()) void preloadLocationIfAlreadyAllowed('panic');
}

async function saveGracePeriod() {
  const seconds = Number(gracePeriodDraft.value);
  if (seconds === preferences.value.panicGracePeriodSeconds) return true;
  if (preferenceSavePromise) return preferenceSavePromise;
  if (!Number.isInteger(seconds)
    || seconds < MIN_PANIC_GRACE_PERIOD_SECONDS
    || seconds > MAX_PANIC_GRACE_PERIOD_SECONDS) {
    preferenceFeedback.value = 'invalid';
    return false;
  }
  const savePromise = (async () => {
    const saved = await store.saveGracePeriod(seconds);
    preferenceFeedback.value = saved ? 'saved' : 'failed';
    return saved;
  })();
  preferenceSavePromise = savePromise;
  try {
    return await savePromise;
  } finally {
    if (preferenceSavePromise === savePromise) preferenceSavePromise = null;
  }
}

function startReport(kind) {
  if (store.startReport(kind)) void preloadLocationIfAlreadyAllowed('report');
}

function confirmDiscardReport() {
  return new Promise((resolve) => {
    let completed = false;
    const finish = (shouldDiscard) => {
      if (completed) return;
      completed = true;
      resolve(shouldDiscard);
    };

    confirm.require({
      header: t('alerts.workflow.discard.header'),
      message: t('alerts.workflow.discard.message'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: t('alerts.workflow.discard.confirm'),
      rejectLabel: t('alerts.workflow.discard.keepEditing'),
      accept: () => finish(true),
      reject: () => finish(false),
      onHide: () => finish(false),
    });
  });
}

async function leaveCurrentView(destination) {
  if (hasUnsavedReportDraft.value) {
    if (!await confirmDiscardReport()) return;
    store.discardReportDraft();
  }

  if (currentView.value === 'panic-report' && !await store.flushPanicReportDraft()) return;
  if (destination === 'history') await store.showHistory();
  else store.openHome();
}

async function openHistory() {
  await leaveCurrentView('history');
}

function openHistoryRecord(recordId) {
  if (isHistoryOnly.value) historyRecordId.value = recordId;
  else store.openRecord(recordId);
}

function closeHistoryRecord() {
  if (isHistoryOnly.value) historyRecordId.value = null;
  else store.closeRecordDetail();
}

function retryLoading() {
  if (isHistoryOnly.value) return store.loadHistory();
  return store.retryInitialization();
}

async function submitOtherReport() {
  if (!reportFormIsComplete.value) {
    reportValidationError.value = true;
    return;
  }
  reportValidationError.value = false;
  await store.submitReport();
}

async function completePanicReport() {
  if (!panicFormIsComplete.value) {
    panicValidationError.value = true;
    return;
  }
  panicValidationError.value = false;
  await store.completePanicReport();
}

async function canLeaveCurrentView() {
  if (isHistoryOnly.value) return true;
  if (hasUnsavedReportDraft.value) {
    if (!await confirmDiscardReport()) return false;
    store.discardReportDraft();
  }
  if (currentView.value === 'panic-report') return store.flushPanicReportDraft();
  return true;
}

onBeforeRouteLeave(canLeaveCurrentView);
onBeforeRouteUpdate(canLeaveCurrentView);
</script>

<template>
  <div class="alerts-page">
    <header class="page-heading">
      <div>
        <p class="eyebrow">
          <i :class="isHistoryHeading ? 'pi pi-history' : 'pi pi-shield'" aria-hidden="true"></i>
          {{ isHistoryHeading ? t('alerts.workflow.history.label') : t('alerts.workflow.sectionLabel') }}
        </p>
        <h1 :id="isHistoryHeading ? 'history-title' : 'alerts-title'">
          {{ isHistoryHeading ? t('alerts.workflow.history.title') : t('alerts.title') }}
        </h1>
        <p class="page-subtitle">{{ isHistoryHeading ? t('alerts.workflow.history.subtitle') : t('alerts.workflow.subtitle') }}</p>
      </div>
      <pv-button
        v-if="currentView !== 'history' && currentView !== 'record-detail'"
        class="history-button"
        icon="pi pi-history"
        :label="t('alerts.workflow.history.open')"
        :disabled="isLoading || !isInitialized"
        @click="openHistory"
      />
      <pv-button
        v-else-if="currentView === 'record-detail'"
        icon="pi pi-arrow-left"
        :label="t('alerts.workflow.history.back')"
        text
        @click="closeHistoryRecord"
      />
      <pv-button
        v-else-if="!isHistoryOnly"
        icon="pi pi-arrow-left"
        :label="t('alerts.workflow.home.back')"
        text
        @click="store.backFromHistory"
      />
    </header>

    <div v-if="errorMessage" class="service-message" role="alert">
      <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
      <span>{{ t('alerts.workflow.errors.requestFailed') }}</span>
      <pv-button
        v-if="isHistoryOnly || !isInitialized"
        :label="t('alerts.workflow.actions.retry')"
        text
        @click="retryLoading"
      />
    </div>

    <section v-if="isLoading && (isHistoryOnly || !isInitialized)" class="loading-card" aria-live="polite">
      <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
      <p>{{ t('alerts.workflow.loading') }}</p>
    </section>

    <template v-else-if="isHistoryOnly || isInitialized">
      <section v-if="currentView === 'home'" class="home-view">
        <section v-if="activePanicRecord" class="active-reminder" aria-live="polite">
          <span class="active-status-dot"></span>
          <div>
            <strong>{{ t('alerts.workflow.active.title') }}</strong>
            <p>{{ t('alerts.workflow.active.subtitle') }}</p>
          </div>
          <pv-button :label="t('alerts.workflow.active.open')" icon="pi pi-arrow-right" @click="store.openHome" />
        </section>

        <section class="panic-card" aria-labelledby="panic-action-title">
          <pv-button
            class="panic-trigger"
            :aria-label="t('alerts.workflow.panic.activate')"
            aria-describedby="panic-help"
            :disabled="isLoading || isActivatingPanic || Boolean(activePanicRecord)"
            @click="startPanic"
          >
            <span class="panic-symbol"><i class="pi pi-bell" aria-hidden="true"></i></span>
            <span id="panic-action-title" class="panic-action-title">{{ t('alerts.workflow.panic.activate') }}</span>
            <span class="panic-description">{{ t('alerts.workflow.panic.description') }}</span>
            <span class="panic-start-hint"><i class="pi pi-clock" aria-hidden="true"></i>{{ t('alerts.workflow.panic.start', { seconds: gracePeriodDraft ?? preferences.panicGracePeriodSeconds }) }}</span>
          </pv-button>
          <div class="preference-control">
            <label for="panic-grace-period"><i class="pi pi-clock" aria-hidden="true"></i>{{ t('alerts.workflow.preference.seconds') }}</label>
            <pv-input-number
              v-model="gracePeriodDraft"
              input-id="panic-grace-period"
              :pt="{
                pcInputText: { 'aria-describedby': 'grace-period-range' },
                incrementButton: { 'aria-label': t('alerts.workflow.preference.increase'), 'aria-hidden': false, tabindex: 0 },
                decrementButton: { 'aria-label': t('alerts.workflow.preference.decrease'), 'aria-hidden': false, tabindex: 0 },
              }"
              :min="MIN_PANIC_GRACE_PERIOD_SECONDS"
              :max="MAX_PANIC_GRACE_PERIOD_SECONDS"
              :use-grouping="false"
              :disabled="isSaving || isLoading"
              show-buttons
              button-layout="horizontal"
              increment-icon="pi pi-plus"
              decrement-icon="pi pi-minus"
              @blur="saveGracePeriod"
              @keydown.enter="saveGracePeriod"
            />
            <small id="grace-period-range">{{ t('alerts.workflow.preference.compactRange') }}</small>
          </div>
        </section>
        <p v-if="preferenceFeedback" class="preference-feedback" :class="{ 'preference-feedback--error': preferenceFeedback !== 'saved' }" role="status">
          <template v-if="preferenceFeedback === 'saved'">{{ t('alerts.workflow.preference.saved') }}</template>
          <template v-else-if="preferenceFeedback === 'failed'">{{ t('alerts.workflow.preference.failed') }}</template>
          <template v-else>{{ t('alerts.workflow.preference.invalid') }}</template>
        </p>
        <p id="panic-help" class="panic-help"><i class="pi pi-info-circle" aria-hidden="true"></i>{{ t('alerts.workflow.panic.disclaimer') }}</p>

        <section class="reports-section" aria-labelledby="reports-title">
          <div class="section-heading">
            <div>
              <h2 id="reports-title">{{ t('alerts.workflow.reports.title') }}</h2>
              <p>{{ t('alerts.workflow.reports.subtitle') }}</p>
            </div>
          </div>
          <div class="report-grid">
            <article v-for="kind in [AlertRecordKind.PAST_INCIDENT, AlertRecordKind.SUSPICIOUS_ACTIVITY, AlertRecordKind.OTHER_SITUATION]" :key="kind" class="report-card">
              <span class="report-icon" :class="`report-icon--${kind}`">
                <i
                  :class="kind === AlertRecordKind.PAST_INCIDENT ? 'pi pi-book' : kind === AlertRecordKind.SUSPICIOUS_ACTIVITY ? 'pi pi-eye' : 'pi pi-megaphone'"
                  aria-hidden="true"
                ></i>
              </span>
              <h3>{{ titleForKind(kind) }}</h3>
              <p>{{ t(`alerts.workflow.reportKinds.${kind}.description`) }}</p>
              <pv-button
                class="report-action"
                :label="t(`alerts.workflow.reportKinds.${kind}.action`)"
                icon="pi pi-arrow-right"
                icon-pos="right"
                text
                @click="startReport(kind)"
              />
            </article>
          </div>
        </section>

        <section v-if="pendingPanicRecord" class="pending-reminder" aria-live="polite">
          <span class="pending-icon"><i class="pi pi-file-edit" aria-hidden="true"></i></span>
          <div>
            <strong>{{ t('alerts.workflow.pending.title') }}</strong>
            <p>{{ t('alerts.workflow.pending.subtitle') }}</p>
          </div>
          <pv-button :label="t('alerts.workflow.pending.action')" @click="store.resumePanicReport(pendingPanicRecord.id)" />
        </section>
      </section>

      <section v-else-if="currentView === 'countdown'" class="countdown-view" aria-labelledby="countdown-title">
        <span class="protocol-badge"><i class="pi pi-clock" aria-hidden="true"></i>{{ t('alerts.workflow.countdown.badge') }}</span>
        <h2 id="countdown-title">{{ t('alerts.workflow.countdown.title', { seconds: countdownDurationSeconds }) }}</h2>
        <p class="page-subtitle">{{ t('alerts.workflow.countdown.description') }}</p>
        <div
          class="countdown-ring"
          role="timer"
          aria-live="polite"
          :aria-label="t('alerts.workflow.countdown.remaining', { seconds: remainingSeconds })"
          :style="{ '--countdown-angle': `${Math.max(0, countdownProgress) * 360}deg` }"
        >
          <div class="countdown-ring-inner">
            <span>{{ t('alerts.workflow.countdown.remainingLabel') }}</span>
            <strong>{{ remainingSeconds }}</strong>
            <small>{{ t('alerts.workflow.countdown.seconds') }}</small>
          </div>
        </div>
        <p class="countdown-note"><i class="pi pi-info-circle" aria-hidden="true"></i>{{ t('alerts.workflow.countdown.continues') }}</p>
        <pv-button
          class="cancel-countdown"
          icon="pi pi-times-circle"
          :label="t('alerts.workflow.countdown.cancel')"
          :disabled="isActivatingPanic"
          @click="store.cancelPanicCountdown"
        />
      </section>

      <section v-else-if="currentView === 'activation-error'" class="result-card result-card--error" role="alert">
        <span class="result-icon"><i class="pi pi-exclamation-triangle" aria-hidden="true"></i></span>
        <h2>{{ t('alerts.workflow.errors.activationTitle') }}</h2>
        <p>{{ t('alerts.workflow.errors.requestFailed') }}</p>
        <pv-button :label="t('alerts.workflow.actions.retry')" icon="pi pi-refresh" @click="store.retryPanicActivation" />
      </section>

      <section v-else-if="currentView === 'active'" class="active-view" aria-labelledby="active-title">
        <div class="active-banner">
          <p><span class="active-status-dot"></span>{{ t('alerts.workflow.active.status') }}</p>
          <h2 id="active-title">{{ t('alerts.workflow.active.title') }}</h2>
          <p>{{ t('alerts.workflow.active.subtitle') }}</p>
        </div>
        <div class="active-detail-grid">
          <article class="detail-card elapsed-card">
            <span><i class="pi pi-clock" aria-hidden="true"></i>{{ t('alerts.workflow.active.elapsed') }}</span>
            <strong class="elapsed-time" role="timer" aria-live="off">{{ activeElapsedTime }}</strong>
            <small>{{ t('alerts.workflow.active.elapsedHelp') }}</small>
          </article>
          <article class="detail-card">
            <span>{{ t('alerts.workflow.active.startedAt') }}</span>
            <strong>{{ formatDate(activePanicRecord?.activatedAt) }}</strong>
          </article>
          <article class="detail-card location-card">
            <span>{{ t('alerts.workflow.active.location') }}</span>
            <strong>{{ activePanicRecord?.location || t('alerts.workflow.location.notAvailable') }}</strong>
            <small v-if="activePanicRecord?.latitude !== null && activePanicRecord?.latitude !== undefined">
              {{ activePanicRecord.latitude }}, {{ activePanicRecord.longitude }}
            </small>
          </article>
        </div>
        <section class="finish-panel">
          <p>{{ t('alerts.workflow.active.finishHelp') }}</p>
          <pv-button
            class="finish-button"
            icon="pi pi-check-circle"
            :label="t('alerts.workflow.active.finish')"
            :loading="isSaving"
            :disabled="isSaving"
            @click="store.finishActivePanic"
          />
        </section>
      </section>

      <section v-else-if="currentView === 'panic-report'" class="form-view" aria-labelledby="panic-report-title">
        <div class="form-intro form-intro--success">
          <span class="result-icon"><i class="pi pi-check" aria-hidden="true"></i></span>
          <div>
            <h2 id="panic-report-title">{{ t('alerts.workflow.panicReport.title') }}</h2>
            <p>{{ t('alerts.workflow.panicReport.subtitle') }}</p>
          </div>
          <span class="status-badge status-badge--pending-report">{{ statusLabel(AlertRecordStatus.PENDING_REPORT) }}</span>
        </div>

        <section class="form-card">
          <fieldset class="incident-field">
            <legend>{{ t('alerts.workflow.form.category') }} <span aria-hidden="true">*</span></legend>
            <div class="incident-grid">
              <label v-for="option in panicCategoryOptions" :key="option.value" class="incident-option" :class="{ 'incident-option--selected': panicCategory === option.value }">
                <input v-model="panicCategory" class="visually-hidden" type="radio" name="panic-category" :value="option.value" :aria-label="option.label" required />
                <span class="incident-icon"><i :class="option.icon" aria-hidden="true"></i></span>
                <span class="incident-label">{{ option.label }}</span>
                <span class="incident-description">{{ option.description }}</span>
                <i v-if="panicCategory === option.value" class="pi pi-check-circle incident-check" aria-hidden="true"></i>
              </label>
            </div>
          </fieldset>
          <div class="form-field">
            <div class="field-heading">
              <label for="panic-location">{{ t('alerts.workflow.form.location') }}</label>
              <pv-button icon="pi pi-map-marker" :label="t('alerts.workflow.location.useCurrent')" text @click="requestCurrentLocation('panic-report')" />
            </div>
            <pv-input-text id="panic-location" v-model="panicLocation" :placeholder="t('alerts.workflow.location.manualPlaceholder')" />
            <small v-if="locationFeedback === 'requesting'">{{ t('alerts.workflow.location.requesting') }}</small>
            <small v-else-if="locationFeedback === 'ready'">{{ t('alerts.workflow.location.ready') }}</small>
            <small v-if="locationFeedback === 'unavailable'">{{ t('alerts.workflow.location.manualHelp') }}</small>
          </div>
          <div class="form-field">
            <label for="panic-description">{{ t('alerts.workflow.form.description') }} <span aria-hidden="true">*</span></label>
            <pv-textarea
              id="panic-description"
              v-model="panicDescription"
              rows="5"
              auto-resize
              :maxlength="1000"
              :placeholder="t('alerts.workflow.form.descriptionPlaceholder')"
            />
            <small class="field-hint">{{ t('alerts.workflow.panicReport.autosave') }}</small>
          </div>
          <p v-if="panicValidationError" class="validation-message" role="alert">{{ t('alerts.workflow.form.required') }}</p>
          <p v-if="isSaving" class="inline-feedback" role="status">{{ t('alerts.workflow.saving') }}</p>
          <div class="form-actions">
            <pv-button :label="t('alerts.workflow.panicReport.later')" severity="secondary" text @click="leaveCurrentView('home')" />
            <pv-button
              :label="t('alerts.workflow.panicReport.complete')"
              icon="pi pi-check-circle"
              :disabled="!panicFormIsComplete || isSaving"
              :loading="isSaving"
              @click="completePanicReport"
            />
          </div>
        </section>
      </section>

      <section v-else-if="currentView === 'report-form'" class="form-view" aria-labelledby="report-title">
        <div class="form-intro">
          <span class="result-icon result-icon--blue"><i class="pi pi-file-edit" aria-hidden="true"></i></span>
          <div>
            <h2 id="report-title">{{ titleForKind(reportKind) }}</h2>
            <p>{{ t(`alerts.workflow.reportKinds.${reportKind}.description`) }}</p>
          </div>
        </div>

        <section class="form-card">
          <fieldset class="incident-field">
            <legend>{{ t('alerts.workflow.form.category') }} <span aria-hidden="true">*</span></legend>
            <div class="incident-grid">
              <label v-for="option in reportCategoryOptions" :key="option.value" class="incident-option" :class="{ 'incident-option--selected': reportCategory === option.value }">
                <input v-model="reportCategory" class="visually-hidden" type="radio" name="report-category" :value="option.value" :aria-label="option.label" required />
                <span class="incident-icon"><i :class="option.icon" aria-hidden="true"></i></span>
                <span class="incident-label">{{ option.label }}</span>
                <span class="incident-description">{{ option.description }}</span>
                <i v-if="reportCategory === option.value" class="pi pi-check-circle incident-check" aria-hidden="true"></i>
              </label>
            </div>
          </fieldset>
          <div class="form-field">
            <div class="field-heading">
              <label for="report-location">{{ t('alerts.workflow.form.location') }} <span aria-hidden="true">*</span></label>
              <pv-button icon="pi pi-map-marker" :label="t('alerts.workflow.location.useCurrent')" text @click="requestCurrentLocation('report')" />
            </div>
            <pv-input-text id="report-location" v-model="reportLocation" :placeholder="t('alerts.workflow.location.manualPlaceholder')" />
            <small v-if="locationFeedback === 'requesting'">{{ t('alerts.workflow.location.requesting') }}</small>
            <small v-else-if="locationFeedback === 'ready'">{{ t('alerts.workflow.location.ready') }}</small>
            <small v-if="locationFeedback === 'unavailable'">{{ t('alerts.workflow.location.manualHelp') }}</small>
          </div>
          <div class="form-field">
            <label for="report-moment">{{ t('alerts.workflow.form.moment') }} <span aria-hidden="true">*</span></label>
            <pv-date-picker
              v-model="reportMoment"
              input-id="report-moment"
              :date-format="locale === 'es' ? 'dd/mm/yy' : 'mm/dd/yy'"
              :max-date="latestReportDate"
              :manual-input="false"
              :placeholder="t('alerts.workflow.form.dateTimePlaceholder')"
              :pt="{
                pcInputText: { 'aria-describedby': 'report-moment-help' },
                panel: { class: 'alert-occurrence-calendar' },
              }"
              show-icon
              show-time
              hour-format="24"
              show-button-bar
              fluid
              @show="latestReportDate = new Date()"
            />
            <small id="report-moment-help" class="field-hint">{{ t('alerts.workflow.form.dateTimeHelp') }}</small>
          </div>
          <div class="form-field">
            <label for="report-description">{{ t('alerts.workflow.form.description') }} <span aria-hidden="true">*</span></label>
            <pv-textarea
              id="report-description"
              v-model="reportDescription"
              rows="5"
              auto-resize
              :maxlength="1000"
              :placeholder="t('alerts.workflow.form.descriptionPlaceholder')"
            />
            <small class="field-hint">{{ t('alerts.workflow.form.noAttachments') }}</small>
          </div>
          <p v-if="reportValidationError" class="validation-message" role="alert">{{ t('alerts.workflow.form.required') }}</p>
          <div class="form-actions">
            <pv-button :label="t('alerts.workflow.reportKinds.cancel')" severity="secondary" text @click="leaveCurrentView('home')" />
            <pv-button
              :label="t('alerts.workflow.reportKinds.submit')"
              icon="pi pi-send"
              :disabled="!reportFormIsComplete || isSaving"
              :loading="isSaving"
              @click="submitOtherReport"
            />
          </div>
        </section>
      </section>

      <section v-else-if="currentView === 'report-sent' || currentView === 'report-completed'" class="result-card" role="status">
        <span class="result-icon"><i class="pi pi-check-circle" aria-hidden="true"></i></span>
        <h2>{{ currentView === 'report-sent' ? t('alerts.workflow.results.sentTitle') : t('alerts.workflow.results.completedTitle') }}</h2>
        <p>{{ currentView === 'report-sent' ? t('alerts.workflow.results.sentDescription') : t('alerts.workflow.results.completedDescription') }}</p>
        <span v-if="submittedRecord" class="status-badge" :class="`status-badge--${submittedRecord.status}`">
          {{ statusLabel(submittedRecord.status) }}
        </span>
        <div class="form-actions form-actions--center">
          <pv-button :label="t('alerts.workflow.home.back')" severity="secondary" text @click="store.openHome" />
          <pv-button :label="t('alerts.workflow.history.open')" icon="pi pi-history" @click="store.showHistory" />
        </div>
      </section>

      <section v-else-if="currentView === 'history'" class="history-view" aria-labelledby="history-title">
        <div class="history-heading">
          <span class="history-count"><i class="pi pi-folder" aria-hidden="true"></i>{{ t('alerts.workflow.history.count', { count: filteredRecords.length }) }}</span>
        </div>
        <section class="history-filters" :aria-label="t('alerts.workflow.history.filters')">
          <label class="history-search">
            <i class="pi pi-search" aria-hidden="true"></i>
            <span class="visually-hidden">{{ t('alerts.workflow.history.search') }}</span>
            <input v-model="historySearch" type="search" :placeholder="t('alerts.workflow.history.search')" />
          </label>
          <label class="filter-field">
            <span>{{ t('alerts.workflow.history.kindFilter') }}</span>
            <pv-select v-model="historyKind" :options="kindFilterOptions" option-label="label" option-value="value" />
          </label>
          <label class="filter-field">
            <span>{{ t('alerts.workflow.history.statusFilter') }}</span>
            <pv-select v-model="historyStatus" :options="[{ value: 'all', label: t('alerts.workflow.statuses.all') }, ...statusFilterOptions]" option-label="label" option-value="value" />
          </label>
        </section>

        <div v-if="isLoading" class="loading-card loading-card--compact" aria-live="polite">
          <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>{{ t('alerts.workflow.loading') }}
        </div>
        <div v-else-if="filteredRecords.length" class="history-list">
          <article v-for="record in filteredRecords" :key="record.id" class="history-record">
            <span class="history-type-icon"><i :class="record.kind === AlertRecordKind.PANIC ? 'pi pi-bell' : 'pi pi-file'" aria-hidden="true"></i></span>
            <div class="history-record-copy">
              <div class="history-record-heading">
                <h3>{{ titleForKind(record.kind) }}</h3>
                <span class="status-badge" :class="`status-badge--${record.status}`">{{ statusLabel(record.status) }}</span>
              </div>
              <p>{{ titleForCategory(record.category) }}<span v-if="record.location"> · {{ record.location }}</span></p>
              <small>{{ formatDate(record.createdAt) }}<span v-if="record.id"> · #{{ record.id }}</span></small>
            </div>
            <pv-button icon="pi pi-chevron-right" text rounded :aria-label="t('alerts.workflow.history.openRecord')" @click="openHistoryRecord(record.id)" />
          </article>
        </div>
        <section v-else class="empty-state">
          <span class="empty-icon"><i class="pi pi-folder-open" aria-hidden="true"></i></span>
          <h3>{{ t('alerts.workflow.history.emptyTitle') }}</h3>
          <p>{{ t('alerts.workflow.history.emptyDescription') }}</p>
        </section>
      </section>

      <section v-else-if="currentView === 'record-detail' && selectedRecord" class="record-detail" aria-labelledby="record-detail-title">
        <div class="detail-heading">
          <div>
            <p class="eyebrow">{{ t('alerts.workflow.history.record') }} <span v-if="selectedRecord.id">#{{ selectedRecord.id }}</span></p>
            <h2 id="record-detail-title">{{ titleForKind(selectedRecord.kind) }}</h2>
          </div>
          <span class="status-badge" :class="`status-badge--${selectedRecord.status}`">{{ statusLabel(selectedRecord.status) }}</span>
        </div>
        <dl class="record-fields">
          <div><dt>{{ t('alerts.workflow.form.category') }}</dt><dd>{{ titleForCategory(selectedRecord.category) }}</dd></div>
          <div><dt>{{ t('alerts.workflow.form.location') }}</dt><dd>{{ selectedRecord.location || t('alerts.workflow.location.notAvailable') }}</dd></div>
          <div><dt>{{ t('alerts.workflow.form.moment') }}</dt><dd>{{ formatReportMoment(selectedRecord.moment) }}</dd></div>
          <div><dt>{{ t('alerts.workflow.history.createdAt') }}</dt><dd>{{ formatDate(selectedRecord.createdAt) }}</dd></div>
          <div class="record-description"><dt>{{ t('alerts.workflow.form.description') }}</dt><dd>{{ selectedRecord.description || t('alerts.workflow.notRecorded') }}</dd></div>
        </dl>
        <p class="read-only-note"><i class="pi pi-lock" aria-hidden="true"></i>{{ t('alerts.workflow.history.readOnly') }}</p>
        <div class="form-actions">
          <pv-button :label="t('alerts.workflow.history.back')" icon="pi pi-arrow-left" severity="secondary" text @click="closeHistoryRecord" />
          <pv-button
            v-if="!isHistoryOnly && selectedRecord.kind === AlertRecordKind.PANIC && selectedRecord.status === AlertRecordStatus.PENDING_REPORT"
            :label="t('alerts.workflow.pending.action')"
            icon="pi pi-file-edit"
            @click="store.resumePanicReport(selectedRecord.id)"
          />
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.alerts-page {
  --alert-ink: #172033;
  --alert-muted: #68758a;
  --alert-line: #e4eaf3;
  --alert-blue: #2563eb;
  --alert-navy: #111c32;
  --alert-red: #c51920;
  max-width: 1320px;
  min-height: calc(100svh - 64px);
  margin: 0 auto;
  padding: 26px clamp(16px, 3vw, 36px) 48px;
  color: var(--alert-ink);
  color-scheme: light;
}

.page-heading,
.history-heading,
.section-heading,
.field-heading,
.form-actions,
.history-record-heading,
.detail-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.page-heading { margin-bottom: 22px; }
.page-heading h1,
.history-heading h2,
.form-intro h2,
.detail-heading h2 { margin: 3px 0 5px; font-size: clamp(23px, 2.4vw, 30px); line-height: 1.2; letter-spacing: -0.04em; }
.page-subtitle,
.form-intro p,
.section-heading p { max-width: 680px; margin: 0; color: var(--alert-muted); font-size: 13px; line-height: 1.55; }
.eyebrow { display: flex; align-items: center; gap: 7px; margin: 0; color: #536179; font-size: 10px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
.history-button { flex-shrink: 0; }

.service-message {
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 0 0 18px;
  padding: 12px 15px;
  border: 1px solid #f3d8aa;
  border-radius: 10px;
  color: #74420d;
  background: #fff8e8;
  font-size: 13px;
}
.service-message > span { flex: 1; }
.loading-card,
.empty-state,
.result-card {
  display: flex;
  min-height: 220px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 28px;
  border: 1px solid var(--alert-line);
  border-radius: 15px;
  background: #fff;
  text-align: center;
}
.loading-card { color: var(--alert-muted); }
.loading-card > i { color: var(--alert-blue); font-size: 22px; }
.loading-card--compact { min-height: 90px; flex-direction: row; }
.loading-card p { margin: 0; }

.home-view { display: grid; gap: 16px; }
.report-icon,
.history-type-icon,
.pending-icon,
.empty-icon,
.result-icon,
.panic-symbol {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
}
.preference-control { position: absolute; top: 16px; right: 16px; display: grid; grid-template-columns: 1fr; gap: 5px; width: 156px; padding: 10px 12px; border: 1px solid #ffffff40; border-radius: 12px; background: #8e1018; }
.preference-control label { display: flex; align-items: center; gap: 5px; color: #fff; font-size: 10px; font-weight: 700; }
.preference-control :deep(.p-inputnumber) { width: 100%; height: 32px; }
.preference-control :deep(.p-inputnumber-input) { width: 100%; padding: 4px 8px; border-color: #fff; font-size: 14px; font-weight: 750; text-align: center; }
.preference-control :deep(.p-inputnumber-button) { width: 28px; color: #172033; background: #eef2fa; border-color: #fff; }
.preference-control :deep(.p-inputnumber-button:hover) { background: #dae5f5; }
.alerts-page :deep(.p-inputnumber-input),
.alerts-page :deep(.p-inputtext),
.alerts-page :deep(.p-textarea) { color: var(--alert-ink); background: #fff; }
.alerts-page :deep(.p-select) { color: var(--alert-ink); background: #fff; border-color: var(--alert-line); color-scheme: light; }
.alerts-page :deep(.p-select-label) { color: var(--alert-ink); background: transparent; }
:global(.alert-occurrence-calendar) { width: min(240px, calc(100vw - 24px)) !important; min-width: 0 !important; max-height: calc(100svh - 24px); overflow-y: auto; padding: 6px; font-size: 12px; color: #172033; background: #fff; color-scheme: light; }
:global(.alert-occurrence-calendar .p-datepicker-header) { padding-bottom: 2px; }
:global(.alert-occurrence-calendar .p-datepicker-title) { gap: 2px; }
:global(.alert-occurrence-calendar .p-datepicker-select-month),
:global(.alert-occurrence-calendar .p-datepicker-select-year) { padding: 2px 4px; font-size: 12px; }
:global(.alert-occurrence-calendar .p-datepicker-day-view) { margin: 4px 0; }
:global(.alert-occurrence-calendar .p-datepicker-weekday-cell) { padding: 2px; font-size: 11px; }
:global(.alert-occurrence-calendar .p-datepicker-day-cell) { padding: 1px; }
:global(.alert-occurrence-calendar .p-datepicker-day) { width: 26px; height: 26px; font-size: 12px; }
:global(.alert-occurrence-calendar .p-datepicker-time-picker) { padding-top: 4px; font-size: 13px; }
:global(.alert-occurrence-calendar .p-datepicker-hour-picker),
:global(.alert-occurrence-calendar .p-datepicker-minute-picker) { gap: 0; }
:global(.alert-occurrence-calendar .p-datepicker-increment-button),
:global(.alert-occurrence-calendar .p-datepicker-decrement-button),
:global(.alert-occurrence-calendar .p-datepicker-prev-button),
:global(.alert-occurrence-calendar .p-datepicker-next-button) { width: 26px; height: 26px; padding: 2px; }
:global(.alert-occurrence-calendar .p-datepicker-buttonbar) { padding-top: 2px; }
:global(.alert-occurrence-calendar .p-datepicker-today-button),
:global(.alert-occurrence-calendar .p-datepicker-clear-button) { min-height: 26px; padding: 2px 6px; font-size: 11px; }
:global(.alert-occurrence-calendar .p-datepicker-day:not(.p-datepicker-day-selected)) { color: #172033; }
:global(.alert-occurrence-calendar .p-datepicker-day:not(.p-datepicker-day-selected):not(.p-disabled):hover) { background: #edf3ff; }
:global(.alert-occurrence-calendar .p-datepicker-select-month),
:global(.alert-occurrence-calendar .p-datepicker-select-year),
:global(.alert-occurrence-calendar .p-datepicker-time-picker) { color: #172033; }
:global(.p-select-overlay) { color: #172033; background: #fff; color-scheme: light; }
:global(.p-select-option) { color: #172033; }
:global(.p-select-option:not(.p-select-option-selected):not(.p-disabled):hover) { color: #172033; background: #f1f5fc; }
.preference-control small { color: #ffe5e7; font-size: 10px; }
.preference-feedback { margin: 0; color: #216b51; font-size: 11px; text-align: center; }
.preference-feedback--error { color: #a8171e; }
.inline-feedback { grid-column: 1 / -1; margin: 0; color: #216b51; font-size: 11px; }

.active-reminder,
.pending-reminder {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 13px 16px;
  border: 1px solid #f1c9cb;
  border-radius: 12px;
  background: #fff;
}
.active-reminder > div,
.pending-reminder > div { flex: 1; }
.active-reminder strong,
.pending-reminder strong { font-size: 13px; }
.active-reminder p,
.pending-reminder p { margin: 3px 0 0; color: var(--alert-muted); font-size: 11px; }
.active-status-dot { width: 10px; height: 10px; border-radius: 50%; background: #d32027; box-shadow: 0 0 0 4px #fde8e9; }
.pending-reminder { border-color: #f0ddb7; background: #fffcf5; }
.pending-icon { width: 38px; height: 38px; border-radius: 10px; color: #94620a; background: #fff1ce; }

.panic-card {
  position: relative;
  width: min(100%, 760px);
  margin: 0 auto;
  border-radius: 18px;
  background: #bd171e;
  box-shadow: 0 12px 28px #a8171e26;
  text-align: center;
}
.protocol-badge { display: inline-flex; align-items: center; gap: 7px; padding: 5px 10px; border-radius: 999px; color: #264f9d; background: #e8efff; font-size: 10px; font-weight: 750; letter-spacing: .04em; text-transform: uppercase; }
.panic-symbol { width: 62px; height: 62px; border-radius: 50%; color: #fff; background: #ffffff1f; font-size: 27px; }
.panic-trigger { display: flex; width: 100%; min-height: 354px; flex-direction: column; gap: 13px; padding: 100px 30px 28px; border: 1px solid #bd171e; border-radius: 18px; color: #fff; background: #bd171e; }
.panic-trigger:not(:disabled):hover { border-color: #a91018; background: #a91018; }
.panic-trigger:focus-visible { outline: 3px solid #2563eb; outline-offset: 4px; }
.panic-action-title { max-width: 420px; font-size: clamp(26px, 3vw, 34px); font-weight: 800; line-height: 1.13; letter-spacing: -.025em; text-transform: uppercase; }
.panic-description { max-width: 480px; color: #fff; font-size: 13px; font-weight: 400; line-height: 1.5; }
.panic-start-hint { display: inline-flex; align-items: center; gap: 7px; margin-top: 2px; padding: 7px 13px; border-radius: 999px; color: #fff; background: #850f16; font-size: 11px; font-weight: 600; }
.panic-help { display: flex; max-width: 670px; align-items: flex-start; justify-content: center; gap: 7px; margin: 0 auto 6px; color: var(--alert-muted); font-size: 11px; line-height: 1.5; text-align: center; }
.panic-help i { margin-top: 2px; }

.reports-section { display: grid; gap: 12px; }
.section-heading h2 { margin: 0 0 4px; font-size: 18px; letter-spacing: -.02em; }
.report-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.report-card { display: flex; min-height: 180px; flex-direction: column; align-items: flex-start; padding: 16px; border: 1px solid var(--alert-line); border-radius: 14px; background: #fff; }
.report-card:focus-within { border-color: #b9ccec; box-shadow: 0 4px 14px #17203308; }
.report-icon { width: 36px; height: 36px; margin-bottom: 9px; border-radius: 11px; color: #a84d0a; background: #fff2df; font-size: 16px; }
.report-icon--suspicious-activity { color: #1e57c8; background: #e8efff; }
.report-icon--other-situation { color: #334b69; background: #e8eef7; }
.report-card h3 { margin: 0 0 6px; font-size: 14px; }
.report-card > p { margin: 0 0 10px; color: var(--alert-muted); font-size: 12px; line-height: 1.45; }
.report-action { width: 100%; justify-content: space-between; margin-top: auto; padding: 5px 0; font-size: 11px; }
.report-action :deep(.p-button-label),
.report-action :deep(.p-button-icon) { color: var(--alert-blue); }

.countdown-view {
  display: flex;
  min-height: min(680px, calc(100svh - 130px));
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  border: 1px solid var(--alert-line);
  border-radius: 16px;
  background: radial-gradient(ellipse at 50% 5%, #fff0f0 0, #fff 54%);
  text-align: center;
}
.countdown-view h2 { max-width: 600px; margin: 16px 0 6px; font-size: clamp(23px, 3vw, 32px); letter-spacing: -.04em; }
.countdown-ring { display: grid; width: min(248px, 58vw); aspect-ratio: 1; place-items: center; margin: 28px 0 18px; padding: 12px; border-radius: 50%; background: conic-gradient(#bd171e var(--countdown-angle), #f0dddd 0); }
.countdown-ring-inner { display: flex; width: 100%; height: 100%; flex-direction: column; align-items: center; justify-content: center; border-radius: 50%; background: #fff; box-shadow: inset 0 0 0 1px #f0e9e9; }
.countdown-ring-inner > span { color: var(--alert-muted); font-size: 10px; font-weight: 750; letter-spacing: .07em; text-transform: uppercase; }
.countdown-ring-inner strong { color: #b8171e; font-size: clamp(54px, 9vw, 74px); line-height: 1.08; }
.countdown-ring-inner small { color: var(--alert-muted); font-size: 12px; }
.countdown-note { display: flex; max-width: 520px; align-items: flex-start; gap: 8px; margin: 0; color: var(--alert-muted); font-size: 12px; line-height: 1.5; }
.countdown-note i { margin-top: 2px; color: var(--alert-blue); }
.cancel-countdown { min-height: 46px; margin-top: 22px; border-color: #edc9cb; color: #8d2026; background: #fff; }

.active-view { display: grid; gap: 16px; }
.active-banner { display: grid; gap: 8px; padding: clamp(20px, 4vw, 30px); border-radius: 14px; color: #fff; background: #b71920; }
.active-banner > p:first-child { display: flex; align-items: center; gap: 9px; margin: 0; font-size: 11px; font-weight: 750; letter-spacing: .05em; text-transform: uppercase; }
.active-banner .active-status-dot { background: #fff; box-shadow: none; }
.active-banner h2 { margin: 3px 0 0; font-size: clamp(24px, 3.5vw, 38px); letter-spacing: -.04em; }
.active-banner > p:last-child { margin: 0; font-size: 14px; }
.active-detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.detail-card { display: grid; gap: 6px; padding: 18px; border: 1px solid var(--alert-line); border-radius: 12px; background: #fff; }
.detail-card span { color: var(--alert-muted); font-size: 10px; font-weight: 750; letter-spacing: .06em; text-transform: uppercase; }
.detail-card strong { font-size: 16px; overflow-wrap: anywhere; }
.detail-card small { color: var(--alert-muted); font-size: 11px; }
.elapsed-card > span { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.elapsed-card > span i { order: 1; color: var(--alert-blue); font-size: 17px; }
.elapsed-card .elapsed-time { font-size: 38px; font-variant-numeric: tabular-nums; line-height: 1.15; letter-spacing: -.025em; }
.location-card { grid-column: 1 / -1; }
.finish-panel { display: grid; justify-items: center; gap: 15px; padding: clamp(22px, 4vw, 34px); border: 1px solid var(--alert-line); border-radius: 14px; background: #fff; text-align: center; }
.finish-panel p { margin: 0; color: var(--alert-muted); font-size: 13px; }
.finish-button { width: min(100%, 460px); min-height: 50px; border-color: #223247; background: #223247; font-weight: 750; }

.form-view { display: grid; max-width: 900px; gap: 15px; margin: 0 auto; }
.form-intro { display: flex; align-items: center; gap: 14px; padding: 18px; border: 1px solid var(--alert-line); border-radius: 13px; background: #fff; }
.form-intro > div { flex: 1; }
.form-intro h2 { font-size: 22px; }
.form-intro p { font-size: 12px; }
.form-intro--success { border-color: #d8e8df; background: #f7fcf8; }
.result-icon { width: 44px; height: 44px; border-radius: 12px; color: #16805e; background: #e4f5ed; font-size: 18px; }
.result-icon--blue { color: var(--alert-blue); background: #e8efff; }
.status-badge { display: inline-flex; align-items: center; flex-shrink: 0; padding: 4px 9px; border-radius: 999px; color: #4f5b70; background: #edf1f6; font-size: 10px; font-weight: 750; }
.status-badge--active { color: #a8171e; background: #ffe8e9; }
.status-badge--pending-report { color: #94620a; background: #fff1ce; }
.status-badge--completed,
.status-badge--submitted { color: #176d4e; background: #ddf5e9; }
.status-badge--resolved { color: #1d4f91; background: #e4efff; }
.status-badge--false-alarm { color: #525b68; background: #edf0f4; }
.form-card,
.record-detail { display: grid; gap: 18px; padding: clamp(18px, 3vw, 26px); border: 1px solid var(--alert-line); border-radius: 14px; background: #fff; }
.form-field { display: grid; gap: 8px; }
.incident-field { min-width: 0; margin: 0; padding: 0; border: 0; }
.incident-field legend { margin-bottom: 12px; padding: 0; color: #354258; font-size: 12px; font-weight: 750; }
.incident-field legend > span { color: #b71920; }
.incident-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.incident-option { position: relative; display: flex; min-width: 0; min-height: 130px; flex-direction: column; align-items: center; justify-content: center; gap: 7px; padding: 16px 12px; border: 1px solid #e5ebf7; border-radius: 12px; background: #f5f7fd; text-align: center; cursor: pointer; }
.incident-option:not(.incident-option--selected):hover { border-color: #bacbeb; background: #edf2fc; }
.incident-option:focus-within { outline: 3px solid #bfdbfe; outline-offset: 2px; }
.incident-option--selected { border-color: #2563eb; background: #edf3ff; box-shadow: inset 0 0 0 1px #2563eb; }
.incident-icon { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 50%; color: #526078; background: #fff; font-size: 17px; }
.incident-option--selected .incident-icon { color: #fff; background: var(--alert-blue); }
.incident-label { color: var(--alert-ink); font-size: 12px; font-weight: 750; line-height: 1.35; }
.incident-description { color: #59677e; font-size: 11px; line-height: 1.4; }
.incident-check { position: absolute; top: 10px; right: 10px; color: var(--alert-blue); font-size: 14px; }
.form-field label,
.filter-field > span { color: #354258; font-size: 12px; font-weight: 750; }
.form-field label span { color: #b71920; }
.form-field :deep(.p-inputtext),
.form-field :deep(.p-select),
.form-field :deep(.p-textarea) { width: 100%; }
.form-field :deep(.p-textarea) { resize: vertical; }
.field-heading { align-items: center; }
.field-heading > :deep(.p-button) { flex-shrink: 0; padding: 3px 6px; font-size: 11px; }
.field-hint { color: var(--alert-muted); font-size: 11px; }
.validation-message { margin: 0; color: #b71920; font-size: 12px; }
.form-actions { justify-content: flex-end; padding-top: 4px; }
.form-actions--center { justify-content: center; }

.result-card { min-height: 350px; }
.result-card h2 { margin: 0; font-size: 23px; }
.result-card > p { max-width: 560px; margin: 0; color: var(--alert-muted); font-size: 13px; line-height: 1.5; }
.result-card--error .result-icon { color: #a8171e; background: #ffe8e9; }

.history-view { display: grid; gap: 16px; }
.history-heading { align-items: flex-end; }
.history-count { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid var(--alert-line); border-radius: 9px; color: #41536e; background: #fff; font-size: 12px; }
.history-filters { display: grid; grid-template-columns: minmax(200px, 1fr) repeat(2, minmax(175px, 230px)); align-items: end; gap: 12px; padding: 14px; border: 1px solid var(--alert-line); border-radius: 12px; background: #fff; }
.history-search { display: flex; min-height: 42px; align-items: center; gap: 9px; padding: 0 11px; border: 1px solid #dfe5ef; border-radius: 8px; color: var(--alert-muted); }
.history-search:focus-within { outline: 3px solid #bfdbfe; outline-offset: 1px; }
.history-search input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--alert-ink); font: inherit; font-size: 12px; }
.filter-field { display: grid; gap: 5px; }
.filter-field :deep(.p-select) { width: 100%; min-height: 42px; }
.history-list { display: grid; gap: 9px; }
.history-record { display: flex; min-width: 0; align-items: center; gap: 13px; padding: 14px; border: 1px solid var(--alert-line); border-radius: 11px; background: #fff; }
.history-type-icon { width: 40px; height: 40px; border-radius: 11px; color: #b71920; background: #fff0f0; }
.history-record-copy { flex: 1; min-width: 0; }
.history-record-heading { justify-content: flex-start; flex-wrap: wrap; gap: 8px; }
.history-record-heading h3 { margin: 0; font-size: 13px; }
.history-record-copy > p { overflow: hidden; margin: 4px 0; color: #526078; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.history-record-copy > small { color: var(--alert-muted); font-size: 10px; }
.empty-icon { width: 48px; height: 48px; border-radius: 14px; color: var(--alert-blue); background: #eaf1ff; font-size: 20px; }
.empty-state { min-height: 240px; }
.empty-state h3 { margin: 0; font-size: 16px; }
.empty-state p { max-width: 520px; margin: 0; color: var(--alert-muted); font-size: 12px; line-height: 1.5; }

.record-detail { max-width: 860px; margin: 0 auto; }
.record-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 0; }
.record-fields > div { display: grid; gap: 5px; min-width: 0; }
.record-fields dt { color: var(--alert-muted); font-size: 10px; font-weight: 750; letter-spacing: .05em; text-transform: uppercase; }
.record-fields dd { margin: 0; overflow-wrap: anywhere; font-size: 13px; }
.record-description { grid-column: 1 / -1; padding-top: 15px; border-top: 1px solid var(--alert-line); }
.record-description dd { white-space: pre-wrap; line-height: 1.55; }
.read-only-note { display: flex; align-items: center; gap: 8px; margin: 0; color: var(--alert-muted); font-size: 11px; }

.alerts-page :deep(.p-button:not(.p-button-text):not(.panic-trigger):not(.finish-button):not(.cancel-countdown)) {
  border-color: var(--alert-blue);
  color: #fff;
  background: var(--alert-blue);
}
.alerts-page :deep(.p-button:not(:disabled):not(.p-button-text):not(.panic-trigger):not(.finish-button):not(.cancel-countdown):hover) {
  border-color: #1d4ed8;
  background: #1d4ed8;
}
.alerts-page :deep(.p-button-text) { color: #2563eb; }
.alerts-page :deep(.p-button-text:not(:disabled):hover) { background: #edf3ff; }

.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); clip-path: inset(50%); white-space: nowrap; }

@media (max-width: 820px) {
  .report-grid { grid-template-columns: 1fr; }
  .report-card { min-height: auto; }
  .history-filters { grid-template-columns: 1fr 1fr; }
  .history-search { grid-column: 1 / -1; }
}

@media (max-width: 560px) {
  :global(.alert-occurrence-calendar) { position: fixed !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important; }
  .alerts-page { padding: 19px 13px 30px; }
  .page-heading { align-items: flex-start; gap: 10px; }
  .page-heading .p-button { max-width: 145px; flex-shrink: 0; font-size: 11px; }
  .page-heading h1 { font-size: 24px; }
  .page-heading { flex-wrap: wrap; }
  .panic-trigger { min-height: 354px; padding: 110px 20px 25px; }
  .preference-control { top: 12px; right: 12px; width: 148px; padding: 8px 10px; }
  .panic-action-title { font-size: 27px; }
  .panic-description { font-size: 12px; }
  .incident-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .incident-option { min-height: 134px; padding: 15px 10px; }
  .active-reminder,
  .pending-reminder { align-items: flex-start; flex-wrap: wrap; }
  .active-reminder > div,
  .pending-reminder > div { min-width: calc(100% - 70px); }
  .active-reminder > .p-button,
  .pending-reminder > .p-button { margin-left: 50px; }
  .active-detail-grid { grid-template-columns: 1fr; }
  .form-intro { align-items: flex-start; flex-wrap: wrap; padding: 14px; }
  .form-intro > div { min-width: calc(100% - 60px); }
  .history-heading { align-items: flex-start; flex-direction: column; }
  .history-filters { grid-template-columns: 1fr; }
  .history-search { grid-column: auto; }
  .history-record { align-items: flex-start; gap: 9px; padding: 11px; }
  .history-type-icon { width: 34px; height: 34px; }
  .history-record-heading { align-items: flex-start; flex-direction: column; gap: 5px; }
  .record-fields { grid-template-columns: 1fr; }
  .record-description { grid-column: auto; }
  .form-actions { align-items: stretch; flex-direction: column-reverse; }
  .form-actions :deep(.p-button) { justify-content: center; }
  .form-actions--center { flex-direction: column; }
}

@media (prefers-reduced-motion: reduce) {
  .alerts-page *,
  .alerts-page *::before,
  .alerts-page *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; }
}
</style>
