import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { AlertPreferences, DEFAULT_PANIC_GRACE_PERIOD_SECONDS } from '../domain/model/alert-preferences.entity.js';
import { AlertRecord, AlertRecordKind, AlertRecordStatus } from '../domain/model/alert-record.entity.js';
import { AlertApi } from '../infrastructure/alert-api.js';
import { AlertPreferencesAssembler } from '../infrastructure/alert-preferences.assembler.js';
import { AlertRecordAssembler } from '../infrastructure/alert-record.assembler.js';

const alertApi = new AlertApi();
const demoEmployeeId = 'demo-employee';
const countdownStorageKey = `instalert:${demoEmployeeId}:panic-countdown`;

const useAlertStore = defineStore('alert', () => {
    const preferences = ref(new AlertPreferences({
        employeeId: demoEmployeeId,
        panicGracePeriodSeconds: DEFAULT_PANIC_GRACE_PERIOD_SECONDS,
    }));
    const alertRecords = ref([]);
    const currentView = ref('home');
    const countdownDeadline = ref(null);
    const countdownDurationSeconds = ref(DEFAULT_PANIC_GRACE_PERIOD_SECONDS);
    const remainingSeconds = ref(DEFAULT_PANIC_GRACE_PERIOD_SECONDS);
    const countdownLocation = ref({ location: '', latitude: null, longitude: null });
    const reportDraft = ref(createEmptyReportDraft());
    const reportKind = ref(null);
    const selectedRecordId = ref(null);
    const lastSubmittedRecordId = ref(null);
    const isLoading = ref(false);
    const isSaving = ref(false);
    const isInitialized = ref(false);
    const isActivatingPanic = ref(false);
    const errorMessage = ref(null);

    const countdownProgress = computed(() => countdownDurationSeconds.value > 0
        ? remainingSeconds.value / countdownDurationSeconds.value
        : 0);
    const activePanicRecord = computed(() => alertRecords.value.find((record) =>
        record.employeeId === demoEmployeeId
        && record.kind === AlertRecordKind.PANIC
        && record.status === AlertRecordStatus.ACTIVE));
    const selectedRecord = computed(() => alertRecords.value.find((record) =>
        String(record.id) === String(selectedRecordId.value)) ?? null);
    const pendingPanicRecord = computed(() => alertRecords.value.find((record) =>
        record.employeeId === demoEmployeeId
        && record.kind === AlertRecordKind.PANIC
        && record.status === AlertRecordStatus.PENDING_REPORT));
    const hasUnsavedReportDraft = computed(() => currentView.value === 'report-form');

    let initializationPromise = null;
    let countdownTimer = null;
    let draftSaveTimer = null;
    let pendingDraftSave = Promise.resolve(true);

    function createEmptyReportDraft() {
        return {
            category: '',
            location: '',
            latitude: null,
            longitude: null,
            moment: '',
            description: '',
        };
    }

    function getErrorMessage(error) {
        return error?.response?.data?.message || error?.message || 'The alert service could not complete the request.';
    }

    function replaceRecord(updatedRecord) {
        const index = alertRecords.value.findIndex((record) => String(record.id) === String(updatedRecord.id));
        if (index === -1) alertRecords.value.unshift(updatedRecord);
        else alertRecords.value[index] = updatedRecord;
    }

    function clearCountdownSnapshot() {
        try {
            window.sessionStorage.removeItem(countdownStorageKey);
        } catch {
            // The in-memory countdown continues if session storage is unavailable.
        }
    }

    function saveCountdownSnapshot() {
        try {
            window.sessionStorage.setItem(countdownStorageKey, JSON.stringify({
                deadline: countdownDeadline.value,
                durationSeconds: countdownDurationSeconds.value,
                location: countdownLocation.value,
            }));
        } catch {
            // Route changes still preserve the countdown in the Pinia store.
        }
    }

    function stopCountdownTimer() {
        if (countdownTimer) window.clearInterval(countdownTimer);
        countdownTimer = null;
    }

    function updateCountdown() {
        if (!countdownDeadline.value) return;
        remainingSeconds.value = Math.max(0, Math.ceil((countdownDeadline.value - Date.now()) / 1000));
        if (remainingSeconds.value === 0) {
            stopCountdownTimer();
            void activatePanic();
        }
    }

    function runCountdownTimer() {
        stopCountdownTimer();
        updateCountdown();
        if (countdownDeadline.value && remainingSeconds.value > 0) {
            countdownTimer = window.setInterval(updateCountdown, 200);
        }
    }

    async function activatePanic() {
        if (isActivatingPanic.value || !countdownDeadline.value) return false;
        isActivatingPanic.value = true;
        errorMessage.value = null;

        const activatedAt = new Date().toISOString();
        const record = new AlertRecord({
            employeeId: demoEmployeeId,
            kind: AlertRecordKind.PANIC,
            status: AlertRecordStatus.ACTIVE,
            location: countdownLocation.value.location,
            latitude: countdownLocation.value.latitude,
            longitude: countdownLocation.value.longitude,
            createdAt: activatedAt,
            activatedAt,
            updatedAt: activatedAt,
        });

        try {
            const response = await alertApi.createAlert(AlertRecordAssembler.toResourceFromEntity(record));
            const activeRecord = AlertRecordAssembler.toEntityFromResponse(response);
            alertRecords.value.unshift(activeRecord);
            currentView.value = 'active';
            countdownDeadline.value = null;
            remainingSeconds.value = 0;
            clearCountdownSnapshot();
            const latestLocation = countdownLocation.value;
            if (latestLocation.latitude !== activeRecord.latitude || latestLocation.longitude !== activeRecord.longitude) {
                setCountdownLocation(latestLocation);
            }
            return true;
        } catch (error) {
            errorMessage.value = getErrorMessage(error);
            currentView.value = 'activation-error';
            countdownDeadline.value = null;
            remainingSeconds.value = 0;
            clearCountdownSnapshot();
            return false;
        } finally {
            isActivatingPanic.value = false;
        }
    }

    async function loadAlertRecords() {
        const response = await alertApi.getAlerts();
        alertRecords.value = AlertRecordAssembler.toEntitiesFromResponse(response)
            .sort((first, second) => Date.parse(second.createdAt ?? '') - Date.parse(first.createdAt ?? ''));
    }

    async function restoreCountdown() {
        let snapshot;
        try {
            snapshot = JSON.parse(window.sessionStorage.getItem(countdownStorageKey) ?? 'null');
        } catch {
            snapshot = null;
        }

        if (!snapshot || !Number.isFinite(snapshot.deadline) || !Number.isInteger(snapshot.durationSeconds)) return false;

        countdownDeadline.value = snapshot.deadline;
        countdownDurationSeconds.value = snapshot.durationSeconds;
        countdownLocation.value = snapshot.location ?? { location: '', latitude: null, longitude: null };
        currentView.value = 'countdown';
        runCountdownTimer();
        return true;
    }

    async function initialize() {
        if (isInitialized.value) return true;
        if (initializationPromise) return initializationPromise;

        isLoading.value = true;
        errorMessage.value = null;
        initializationPromise = (async () => {
            try {
                const [alertsResponse, preferencesResponse] = await Promise.all([
                    alertApi.getAlerts(),
                    alertApi.getAlertPreferences(),
                ]);

                alertRecords.value = AlertRecordAssembler.toEntitiesFromResponse(alertsResponse)
                    .sort((first, second) => Date.parse(second.createdAt ?? '') - Date.parse(first.createdAt ?? ''));

                const allPreferences = AlertPreferencesAssembler.toEntitiesFromResponse(preferencesResponse);
                const employeePreferences = allPreferences.find((item) => item.employeeId === demoEmployeeId);
                if (employeePreferences) {
                    preferences.value = employeePreferences;
                } else {
                    const defaults = new AlertPreferences({
                        employeeId: demoEmployeeId,
                        panicGracePeriodSeconds: DEFAULT_PANIC_GRACE_PERIOD_SECONDS,
                    });
                    const createdPreferences = await alertApi.createAlertPreferences(
                        AlertPreferencesAssembler.toResourceFromEntity(defaults),
                    );
                    preferences.value = AlertPreferencesAssembler.toEntityFromResponse(createdPreferences);
                }

                isInitialized.value = true;
                const restoredCountdown = await restoreCountdown();
                if (!restoredCountdown && activePanicRecord.value) currentView.value = 'active';
                return true;
            } catch (error) {
                errorMessage.value = getErrorMessage(error);
                return false;
            } finally {
                isLoading.value = false;
                initializationPromise = null;
            }
        })();

        return initializationPromise;
    }

    async function retryInitialization() {
        isInitialized.value = false;
        return initialize();
    }

    async function loadHistory() {
        isLoading.value = true;
        errorMessage.value = null;
        try {
            await loadAlertRecords();
            return true;
        } catch (error) {
            errorMessage.value = getErrorMessage(error);
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    async function refreshHistory() {
        if (!await loadHistory()) return false;
        currentView.value = 'history';
        return true;
    }

    async function saveGracePeriod(seconds) {
        errorMessage.value = null;
        isSaving.value = true;
        try {
            const updatedPreferences = new AlertPreferences({
                ...preferences.value,
                panicGracePeriodSeconds: seconds,
            });
            const response = await alertApi.updateAlertPreferences(
                AlertPreferencesAssembler.toResourceFromEntity(updatedPreferences),
            );
            preferences.value = AlertPreferencesAssembler.toEntityFromResponse(response);
            return true;
        } catch (error) {
            errorMessage.value = getErrorMessage(error);
            return false;
        } finally {
            isSaving.value = false;
        }
    }

    function setCountdownLocation(location = {}) {
        countdownLocation.value = {
            location: location.location ?? '',
            latitude: location.latitude ?? null,
            longitude: location.longitude ?? null,
        };
        if (countdownDeadline.value) saveCountdownSnapshot();

        const activeRecord = activePanicRecord.value;
        if (activeRecord && (activeRecord.latitude !== countdownLocation.value.latitude
            || activeRecord.longitude !== countdownLocation.value.longitude
            || activeRecord.location !== countdownLocation.value.location)) {
            const updatedRecord = AlertRecordAssembler.toEntityFromResource(
                AlertRecordAssembler.toResourceFromEntity(activeRecord),
            );
            updatedRecord.location = countdownLocation.value.location;
            updatedRecord.latitude = countdownLocation.value.latitude;
            updatedRecord.longitude = countdownLocation.value.longitude;
            updatedRecord.updatedAt = new Date().toISOString();
            replaceRecord(updatedRecord);
            void alertApi.updateAlert(AlertRecordAssembler.toResourceFromEntity(updatedRecord))
                .catch((error) => { errorMessage.value = getErrorMessage(error); });
        }
    }

    function startPanicCountdown(location = {}) {
        if (!isInitialized.value || activePanicRecord.value || countdownDeadline.value) return false;

        countdownDurationSeconds.value = preferences.value.panicGracePeriodSeconds;
        remainingSeconds.value = countdownDurationSeconds.value;
        countdownDeadline.value = Date.now() + countdownDurationSeconds.value * 1000;
        countdownLocation.value = {
            location: location.location ?? '',
            latitude: location.latitude ?? null,
            longitude: location.longitude ?? null,
        };
        currentView.value = 'countdown';
        errorMessage.value = null;
        saveCountdownSnapshot();
        runCountdownTimer();
        return true;
    }

    function cancelPanicCountdown() {
        if (!countdownDeadline.value || currentView.value !== 'countdown') return false;
        stopCountdownTimer();
        countdownDeadline.value = null;
        remainingSeconds.value = countdownDurationSeconds.value;
        countdownLocation.value = { location: '', latitude: null, longitude: null };
        currentView.value = 'home';
        clearCountdownSnapshot();
        return true;
    }

    async function retryPanicActivation() {
        errorMessage.value = null;
        countdownDeadline.value = Date.now();
        return activatePanic();
    }

    async function finishActivePanic() {
        const activeRecord = activePanicRecord.value;
        if (!activeRecord) return false;

        const updatedRecord = AlertRecordAssembler.toEntityFromResource(
            AlertRecordAssembler.toResourceFromEntity(activeRecord),
        );
        if (!updatedRecord.finishPanic()) return false;

        isSaving.value = true;
        errorMessage.value = null;
        try {
            const response = await alertApi.updateAlert(AlertRecordAssembler.toResourceFromEntity(updatedRecord));
            const savedRecord = AlertRecordAssembler.toEntityFromResponse(response);
            replaceRecord(savedRecord);
            selectedRecordId.value = savedRecord.id;
            currentView.value = 'panic-report';
            return true;
        } catch (error) {
            errorMessage.value = getErrorMessage(error);
            return false;
        } finally {
            isSaving.value = false;
        }
    }

    function updatePanicReportDraft(fields = {}) {
        const record = alertRecords.value.find((item) =>
            String(item.id) === String(selectedRecordId.value)
            && item.kind === AlertRecordKind.PANIC
            && item.status === AlertRecordStatus.PENDING_REPORT);
        if (!record) return false;

        const updatedRecord = AlertRecordAssembler.toEntityFromResource(
            AlertRecordAssembler.toResourceFromEntity(record),
        );
        if (!updatedRecord.updatePanicReportDraft(fields)) return false;
        replaceRecord(updatedRecord);
        errorMessage.value = null;

        if (draftSaveTimer) window.clearTimeout(draftSaveTimer);
        draftSaveTimer = window.setTimeout(() => {
            pendingDraftSave = persistPanicReportDraft(updatedRecord.id);
        }, 350);
        return true;
    }

    async function persistPanicReportDraft(recordId) {
        const record = alertRecords.value.find((item) => String(item.id) === String(recordId));
        if (!record || record.status !== AlertRecordStatus.PENDING_REPORT) return true;

        isSaving.value = true;
        try {
            const response = await alertApi.updateAlert(AlertRecordAssembler.toResourceFromEntity(record));
            replaceRecord(AlertRecordAssembler.toEntityFromResponse(response));
            errorMessage.value = null;
            return true;
        } catch (error) {
            errorMessage.value = getErrorMessage(error);
            return false;
        } finally {
            isSaving.value = false;
        }
    }

    async function flushPanicReportDraft() {
        if (draftSaveTimer) {
            window.clearTimeout(draftSaveTimer);
            draftSaveTimer = null;
            const id = selectedRecordId.value;
            pendingDraftSave = persistPanicReportDraft(id);
        }
        return pendingDraftSave;
    }

    function resumePanicReport(recordId) {
        const record = alertRecords.value.find((item) =>
            String(item.id) === String(recordId)
            && item.kind === AlertRecordKind.PANIC
            && item.status === AlertRecordStatus.PENDING_REPORT);
        if (!record) return false;
        selectedRecordId.value = record.id;
        currentView.value = 'panic-report';
        return true;
    }

    async function deferPanicReport() {
        if (!await flushPanicReportDraft()) return false;
        currentView.value = 'home';
        selectedRecordId.value = null;
        return true;
    }

    async function completePanicReport() {
        if (!await flushPanicReportDraft()) return false;
        const record = alertRecords.value.find((item) => String(item.id) === String(selectedRecordId.value));
        if (!record) return false;

        const completedRecord = AlertRecordAssembler.toEntityFromResource(
            AlertRecordAssembler.toResourceFromEntity(record),
        );
        if (!completedRecord.completePanicReport()) return false;

        isSaving.value = true;
        errorMessage.value = null;
        try {
            const response = await alertApi.updateAlert(AlertRecordAssembler.toResourceFromEntity(completedRecord));
            const savedRecord = AlertRecordAssembler.toEntityFromResponse(response);
            replaceRecord(savedRecord);
            selectedRecordId.value = savedRecord.id;
            currentView.value = 'report-completed';
            return true;
        } catch (error) {
            errorMessage.value = getErrorMessage(error);
            return false;
        } finally {
            isSaving.value = false;
        }
    }

    function startReport(kind) {
        if (!Object.values(AlertRecordKind).includes(kind) || kind === AlertRecordKind.PANIC) return false;
        reportKind.value = kind;
        reportDraft.value = createEmptyReportDraft();
        errorMessage.value = null;
        currentView.value = 'report-form';
        return true;
    }

    function updateReportDraft(fields = {}) {
        if (currentView.value !== 'report-form') return false;
        reportDraft.value = { ...reportDraft.value, ...fields };
        return true;
    }

    async function submitReport() {
        if (currentView.value !== 'report-form' || !reportKind.value) return false;

        const report = new AlertRecord({
            ...reportDraft.value,
            employeeId: demoEmployeeId,
            kind: reportKind.value,
            status: AlertRecordStatus.DRAFT,
            createdAt: new Date().toISOString(),
        });
        if (!report.submitReport()) return false;

        isSaving.value = true;
        errorMessage.value = null;
        try {
            const response = await alertApi.createAlert(AlertRecordAssembler.toResourceFromEntity(report));
            const savedReport = AlertRecordAssembler.toEntityFromResponse(response);
            alertRecords.value.unshift(savedReport);
            lastSubmittedRecordId.value = savedReport.id;
            reportKind.value = null;
            currentView.value = 'report-sent';
            return true;
        } catch (error) {
            errorMessage.value = getErrorMessage(error);
            return false;
        } finally {
            isSaving.value = false;
        }
    }

    function discardReportDraft() {
        reportKind.value = null;
        reportDraft.value = createEmptyReportDraft();
        errorMessage.value = null;
        currentView.value = 'home';
    }

    async function showHistory() {
        if (currentView.value === 'panic-report' && !await flushPanicReportDraft()) return false;
        return refreshHistory();
    }

    function backFromHistory() {
        currentView.value = countdownDeadline.value
            ? 'countdown'
            : activePanicRecord.value ? 'active' : 'home';
    }

    function openRecord(recordId) {
        selectedRecordId.value = recordId;
        currentView.value = 'record-detail';
    }

    function closeRecordDetail() {
        currentView.value = 'history';
    }

    function openHome() {
        currentView.value = countdownDeadline.value
            ? 'countdown'
            : activePanicRecord.value ? 'active' : 'home';
    }

    return {
        preferences,
        alertRecords,
        currentView,
        countdownDurationSeconds,
        remainingSeconds,
        countdownProgress,
        countdownLocation,
        reportDraft,
        reportKind,
        selectedRecordId,
        selectedRecord,
        lastSubmittedRecordId,
        activePanicRecord,
        pendingPanicRecord,
        isLoading,
        isSaving,
        isInitialized,
        isActivatingPanic,
        errorMessage,
        hasUnsavedReportDraft,
        initialize,
        retryInitialization,
        saveGracePeriod,
        setCountdownLocation,
        startPanicCountdown,
        cancelPanicCountdown,
        retryPanicActivation,
        finishActivePanic,
        updatePanicReportDraft,
        flushPanicReportDraft,
        resumePanicReport,
        deferPanicReport,
        completePanicReport,
        startReport,
        updateReportDraft,
        submitReport,
        discardReportDraft,
        showHistory,
        loadHistory,
        backFromHistory,
        openRecord,
        closeRecordDetail,
        openHome,
    };
});

export default useAlertStore;
