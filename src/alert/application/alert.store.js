import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { AlertPreferences, DEFAULT_PANIC_GRACE_PERIOD_SECONDS } from '../domain/model/alert-preferences.entity.js';
import { AlertRecord, AlertRecordKind, AlertRecordStatus } from '../domain/model/alert-record.entity.js';
import { AlertApi } from '../infrastructure/alert-api.js';
import { AlertPreferencesAssembler } from '../infrastructure/alert-preferences.assembler.js';
import { AlertRecordAssembler } from '../infrastructure/alert-record.assembler.js';
import { apiContext, currentContextRevision, requireBusinessId } from '../../shared/infrastructure/api-context.js';

const api = new AlertApi();
const blankLocation = () => ({ location: '', latitude: null, longitude: null });
const blankDraft = () => ({ category: '', description: '', moment: '', ...blankLocation() });
const locationDetails = value => ({ location: value.location ?? '', latitude: value.latitude ?? null, longitude: value.longitude ?? null });

/** Alert workflows scoped to one account and commerce; the API owns all persisted transitions. */
export default defineStore('alert', () => {
    const preferences = ref(new AlertPreferences());
    const alertRecords = ref([]);
    const currentView = ref('home');
    const countdownDeadline = ref(null);
    const countdownDurationSeconds = ref(DEFAULT_PANIC_GRACE_PERIOD_SECONDS);
    const remainingSeconds = ref(DEFAULT_PANIC_GRACE_PERIOD_SECONDS);
    const countdownLocation = ref(blankLocation());
    const preparation = ref(null);
    const reportDraft = ref(blankDraft());
    const reportKind = ref(null);
    const selectedRecordId = ref(null);
    const lastSubmittedRecordId = ref(null);
    const isLoading = ref(false);
    const isInitialized = ref(false);
    const isPreparingPanic = ref(false);
    const isActivatingPanic = ref(false);
    const isCompletingReport = ref(false);
    const writes = ref(0);
    const errorMessage = ref(null);
    const noticeMessage = ref(null);
    const isSaving = computed(() => writes.value > 0 || isPreparingPanic.value || isCompletingReport.value);
    const countdownProgress = computed(() => remainingSeconds.value / countdownDurationSeconds.value);
    const activePanicRecord = computed(() => alertRecords.value.find(record => record.employeeId === apiContext.userId
        && record.kind === 'panic' && record.status === 'active'));
    const pendingPanicRecord = computed(() => alertRecords.value.find(record => record.employeeId === apiContext.userId && record.hasPendingPanicReport));
    const selectedRecord = computed(() => alertRecords.value.find(record => record.id === selectedRecordId.value) ?? null);
    const hasUnsavedReportDraft = computed(() => currentView.value === 'report-form');
    let generation = 0;
    let initializationPromise = null;
    let countdownTimer = null;
    let draftSaveTimer = null;
    let pendingDraftSave = Promise.resolve(true);
    let pendingLocationSave = Promise.resolve(true);
    const draftRevisions = new Map();
    const savedDraftRevisions = new Map();
    const keyForContext = () => apiContext.userId && apiContext.businessId
        ? `instalert:${apiContext.userId}:${apiContext.businessId}:panic-preparation` : null;
    let storageKey = keyForContext();
    const scope = () => ({ generation, revision: currentContextRevision(), businessId: apiContext.businessId });
    const current = value => value.generation === generation && value.revision === currentContextRevision() && value.businessId === apiContext.businessId;
    function message(error) {
        if (error.apiError?.code === 'already_completed') return 'alerts.workflow.results.alreadyCompleted';
        if (error.apiError?.code === 'transition') return 'alerts.workflow.errors.transition';
        return error.apiError?.messageKey ?? (error.message?.startsWith('alerts.') ? error.message : 'alerts.workflow.errors.requestFailed');
    }
    function replaceRecord(record) {
        const index = alertRecords.value.findIndex(item => item.id === record.id);
        if (index === -1) alertRecords.value.unshift(record);
        else if (record.revision >= alertRecords.value[index].revision) alertRecords.value[index] = record;
    }
    function readRecord(response, businessId) {
        const record = AlertRecordAssembler.toEntityFromResponse(response);
        if (record.businessId !== businessId) throw new Error('alerts.workflow.errors.invalidResponse');
        return record;
    }
    function clearSnapshot() {
        try { if (storageKey) window.sessionStorage.removeItem(storageKey); } catch { /* Storage is optional. */ }
    }
    function saveSnapshot() {
        try {
            if (storageKey && preparation.value) window.sessionStorage.setItem(storageKey, JSON.stringify({
                preparation: preparation.value, deadline: countdownDeadline.value ?? Date.now(),
                durationSeconds: countdownDurationSeconds.value, location: countdownLocation.value,
            }));
        } catch { /* The in-memory preparation still works without storage. */ }
    }
    function stopCountdownTimer() { if (countdownTimer) clearInterval(countdownTimer); countdownTimer = null; }
    function clearPreparation() { stopCountdownTimer(); clearSnapshot(); countdownDeadline.value = null; preparation.value = null; }
    function resetContext() {
        clearPreparation(); clearTimeout(draftSaveTimer); draftSaveTimer = null;
        generation++; initializationPromise = null; pendingDraftSave = Promise.resolve(true); pendingLocationSave = Promise.resolve(true);
        draftRevisions.clear(); savedDraftRevisions.clear(); storageKey = keyForContext();
        preferences.value = new AlertPreferences({ employeeId: apiContext.userId ?? '' });
        alertRecords.value = []; currentView.value = 'home'; countdownLocation.value = blankLocation();
        countdownDurationSeconds.value = DEFAULT_PANIC_GRACE_PERIOD_SECONDS; remainingSeconds.value = DEFAULT_PANIC_GRACE_PERIOD_SECONDS;
        reportDraft.value = blankDraft(); reportKind.value = null; selectedRecordId.value = null; lastSubmittedRecordId.value = null;
        isLoading.value = false; isInitialized.value = false; isPreparingPanic.value = false; isActivatingPanic.value = false;
        isCompletingReport.value = false; writes.value = 0; errorMessage.value = null; noticeMessage.value = null;
    }
    watch(() => [apiContext.userId, apiContext.businessId], resetContext, { flush: 'sync' });
    function updateCountdown() {
        if (countdownDeadline.value === null) return;
        remainingSeconds.value = Math.max(0, Math.ceil((countdownDeadline.value - Date.now()) / 1000));
        if (remainingSeconds.value === 0) { stopCountdownTimer(); void activatePanic(); }
    }
    function runCountdownTimer() {
        stopCountdownTimer(); updateCountdown();
        if (remainingSeconds.value > 0 && countdownDeadline.value) countdownTimer = setInterval(updateCountdown, 200);
    }
    async function loadAlertRecords(captured) {
        const response = await api.getAlerts();
        if (!current(captured)) return false;
        const records = AlertRecordAssembler.toEntitiesFromResponse(response);
        if (records.some(record => record.businessId !== captured.businessId)) throw new Error('alerts.workflow.errors.invalidResponse');
        alertRecords.value = records;
        return true;
    }
    function restoreCountdown() {
        let snapshot;
        try { snapshot = JSON.parse(window.sessionStorage.getItem(storageKey) ?? 'null'); } catch { return false; }
        const proof = snapshot?.preparation;
        if (!proof || typeof proof.preparationToken !== 'string' || !Number.isFinite(snapshot.deadline)
            || !Number.isInteger(snapshot.durationSeconds) || snapshot.durationSeconds < 1 || snapshot.durationSeconds > 60
            || !Number.isFinite(Date.parse(proof.expiresAt)) || Date.parse(proof.expiresAt) <= Date.now()) {
            clearSnapshot(); return false;
        }
        preparation.value = proof; countdownDeadline.value = snapshot.deadline;
        countdownDurationSeconds.value = snapshot.durationSeconds; countdownLocation.value = locationDetails(snapshot.location ?? {});
        currentView.value = 'countdown'; runCountdownTimer(); return true;
    }
    async function initialize() {
        if (isInitialized.value) return true;
        if (initializationPromise) return initializationPromise;
        const captured = scope(); isLoading.value = true; errorMessage.value = null;
        const request = (async () => {
            try {
                requireBusinessId();
                const [, response] = await Promise.all([loadAlertRecords(captured), api.getAlertPreferences()]);
                if (!current(captured)) return false;
                const saved = AlertPreferencesAssembler.toEntityFromResponse(response);
                if (saved.employeeId !== apiContext.userId) throw new Error('alerts.workflow.errors.invalidResponse');
                preferences.value = saved; isInitialized.value = true;
                if (activePanicRecord.value) { clearPreparation(); currentView.value = 'active'; }
                else if (!restoreCountdown()) currentView.value = 'home';
                return true;
            } catch (error) { if (current(captured)) errorMessage.value = message(error); return false; }
            finally { if (current(captured)) { isLoading.value = false; initializationPromise = null; } }
        })();
        initializationPromise = request; return request;
    }
    async function retryInitialization() { isInitialized.value = false; return initialize(); }
    async function loadHistory() {
        if (isLoading.value || isSaving.value) return false;
        const captured = scope(); isLoading.value = true; errorMessage.value = null;
        try { return await loadAlertRecords(captured); }
        catch (error) { if (current(captured)) errorMessage.value = message(error); return false; }
        finally { if (current(captured)) isLoading.value = false; }
    }
    async function saveGracePeriod(seconds) {
        if (isSaving.value || isActivatingPanic.value || countdownDeadline.value) return false;
        const captured = scope(); writes.value++; errorMessage.value = null;
        try {
            AlertPreferences.validateGracePeriod(seconds);
            const response = await api.saveGracePeriod(seconds);
            if (!current(captured)) return false;
            preferences.value = AlertPreferencesAssembler.toEntityFromResponse(response); return true;
        } catch (error) { if (current(captured)) errorMessage.value = message(error); return false; }
        finally { if (current(captured)) writes.value--; }
    }
    function setCountdownLocation(value = {}) {
        const location = locationDetails(value); countdownLocation.value = location;
        if (preparation.value) saveSnapshot();
        const record = activePanicRecord.value;
        if (!record) return Promise.resolve(true);
        const captured = scope();
        pendingLocationSave = pendingLocationSave.then(async () => {
            if (!current(captured) || !activePanicRecord.value || activePanicRecord.value.id !== record.id) return false;
            writes.value++;
            try {
                const response = await api.updateLocation(record.id, location);
                if (!current(captured)) return false;
                replaceRecord(readRecord(response, captured.businessId)); return true;
            } catch (error) { if (current(captured)) errorMessage.value = message(error); return false; }
            finally { if (current(captured)) writes.value--; }
        });
        return pendingLocationSave;
    }
    async function startPanicCountdown(location = apiContext.businessLocation ?? {}) {
        if (!isInitialized.value || isSaving.value || isActivatingPanic.value || activePanicRecord.value || countdownDeadline.value) return false;
        const captured = scope(); isPreparingPanic.value = true; errorMessage.value = null; noticeMessage.value = null;
        try {
            const selectedLocation = locationDetails(location);
            const response = await api.preparePanic(selectedLocation);
            if (!current(captured)) return false;
            const proof = response.data;
            if (!proof || typeof proof.preparationToken !== 'string' || !proof.preparationToken
                || !Number.isInteger(proof.gracePeriodSeconds) || proof.gracePeriodSeconds < 1 || proof.gracePeriodSeconds > 60
                || !Number.isFinite(Date.parse(proof.notBefore)) || !Number.isFinite(Date.parse(proof.expiresAt))) throw new Error('alerts.workflow.errors.invalidResponse');
            preparation.value = proof; countdownLocation.value = selectedLocation;
            countdownDurationSeconds.value = proof.gracePeriodSeconds; remainingSeconds.value = proof.gracePeriodSeconds;
            // Start the full server-issued duration after receiving the preparation.
            countdownDeadline.value = Date.now() + proof.gracePeriodSeconds * 1000;
            currentView.value = 'countdown'; saveSnapshot(); runCountdownTimer(); return true;
        } catch (error) { if (current(captured)) errorMessage.value = message(error); return false; }
        finally { if (current(captured)) isPreparingPanic.value = false; }
    }
    function cancelPanicCountdown() {
        if (!countdownDeadline.value || isActivatingPanic.value || Date.now() >= countdownDeadline.value) return false;
        clearPreparation(); countdownLocation.value = blankLocation(); remainingSeconds.value = countdownDurationSeconds.value;
        currentView.value = 'home'; noticeMessage.value = 'alerts.workflow.countdown.cancelled'; return true;
    }
    async function activatePanic() {
        if (isActivatingPanic.value || !preparation.value) return false;
        const captured = scope(); const proof = preparation.value;
        isActivatingPanic.value = true; errorMessage.value = null;
        try {
            const response = await api.confirmPanic(proof.preparationToken, locationDetails(countdownLocation.value));
            if (!current(captured)) return false;
            replaceRecord(readRecord(response, captured.businessId)); clearPreparation();
            currentView.value = activePanicRecord.value ? 'active' : 'home'; return true;
        } catch (error) {
            if (current(captured)) {
                errorMessage.value = message(error); currentView.value = 'activation-error';
                countdownDeadline.value = null; remainingSeconds.value = 0; saveSnapshot();
            }
            return false;
        } finally { if (current(captured)) isActivatingPanic.value = false; }
    }
    async function retryPanicActivation() {
        if (isActivatingPanic.value) return false;
        if (!preparation.value) return startPanicCountdown(countdownLocation.value);
        const captured = scope();
        const expired = Date.parse(preparation.value.expiresAt) <= Date.now();
        const recovered = await activatePanic();
        if (recovered || !current(captured)) return recovered;
        if (errorMessage.value === 'api.errors.conflict') {
            try {
                if (await loadAlertRecords(captured) && activePanicRecord.value) {
                    clearPreparation(); currentView.value = 'active'; errorMessage.value = null; return true;
                }
            } catch (error) { if (current(captured)) errorMessage.value = message(error); }
        }
        if (current(captured) && expired && errorMessage.value === 'alerts.workflow.errors.transition') {
            clearPreparation(); return startPanicCountdown(countdownLocation.value);
        }
        return false;
    }
    async function finishActivePanic() {
        if (isSaving.value || !activePanicRecord.value) return false;
        const captured = scope(); const id = activePanicRecord.value.id; writes.value++; errorMessage.value = null;
        try {
            await pendingLocationSave; if (!current(captured)) return false;
            const response = await api.resolvePanic(id);
            if (!current(captured)) return false;
            replaceRecord(readRecord(response, captured.businessId)); selectedRecordId.value = id;
            currentView.value = 'panic-report'; return true;
        } catch (error) { if (current(captured)) errorMessage.value = message(error); return false; }
        finally { if (current(captured)) writes.value--; }
    }
    function updatePanicReportDraft(fields = {}) {
        const record = selectedRecord.value;
        if (isCompletingReport.value || !record?.hasPendingPanicReport || record.employeeId !== apiContext.userId) return false;
        const draft = new AlertRecord({ ...record }); if (!draft.updatePanicReportDraft(fields)) return false;
        draftRevisions.set(record.id, (draftRevisions.get(record.id) ?? 0) + 1); replaceRecord(draft); errorMessage.value = null;
        clearTimeout(draftSaveTimer); const captured = scope();
        draftSaveTimer = setTimeout(() => { draftSaveTimer = null; if (current(captured)) void persistPanicReportDraft(record.id); }, 350);
        return true;
    }
    async function recoverCompletedReport(id, captured) {
        try {
            const response = await api.getAlert(id);
            if (!current(captured)) return false;
            const latest = readRecord(response, captured.businessId);
            if (latest.reportStatus !== 'completed') return false;
            replaceRecord(latest); draftRevisions.delete(id); savedDraftRevisions.delete(id);
            lastSubmittedRecordId.value = id; currentView.value = 'report-completed';
            errorMessage.value = null; noticeMessage.value = 'alerts.workflow.results.alreadyCompleted';
            return true;
        } catch { return false; }
    }
    function persistPanicReportDraft(id) {
        const captured = scope();
        pendingDraftSave = pendingDraftSave.then(async () => {
            if (!current(captured)) return false;
            const record = alertRecords.value.find(item => item.id === id);
            const revision = draftRevisions.get(id) ?? 0;
            if (!record?.hasPendingPanicReport || revision === (savedDraftRevisions.get(id) ?? 0)) return true;
            writes.value++;
            try {
                const response = await api.savePanicDraft(id, AlertRecordAssembler.toReportDetails(record));
                if (!current(captured)) return false;
                const saved = readRecord(response, captured.businessId); savedDraftRevisions.set(id, revision);
                if (revision === draftRevisions.get(id)) replaceRecord(saved);
                errorMessage.value = null; return true;
            } catch (error) {
                if (current(captured) && error.apiError?.status === 409 && await recoverCompletedReport(id, captured)) return true;
                if (current(captured)) errorMessage.value = message(error);
                return false;
            } finally { if (current(captured)) writes.value--; }
        });
        return pendingDraftSave;
    }
    async function flushPanicReportDraft() {
        clearTimeout(draftSaveTimer); draftSaveTimer = null;
        const id = selectedRecordId.value;
        if ((draftRevisions.get(id) ?? 0) !== (savedDraftRevisions.get(id) ?? 0)) return persistPanicReportDraft(id);
        return pendingDraftSave;
    }
    function resumePanicReport(id) {
        const record = alertRecords.value.find(item => item.id === id);
        if (!record?.hasPendingPanicReport || record.employeeId !== apiContext.userId) return false;
        selectedRecordId.value = id; currentView.value = 'panic-report'; noticeMessage.value = null; return true;
    }
    async function deferPanicReport() {
        const captured = scope();
        if (!await flushPanicReportDraft() || !current(captured)) return false;
        currentView.value = 'home'; selectedRecordId.value = null; return true;
    }
    async function completePanicReport() {
        if (isCompletingReport.value || !selectedRecord.value?.hasPendingPanicReport) return false;
        const captured = scope(); const id = selectedRecordId.value;
        isCompletingReport.value = true; errorMessage.value = null;
        try {
            if (!await flushPanicReportDraft() || !current(captured)) return false;
            if (selectedRecord.value?.reportStatus === 'completed') return true;
            const response = await api.completePanicReport(id);
            if (!current(captured)) return false;
            replaceRecord(readRecord(response, captured.businessId)); lastSubmittedRecordId.value = id;
            currentView.value = 'report-completed'; return true;
        } catch (error) {
            if (current(captured) && error.apiError?.status === 409 && await recoverCompletedReport(id, captured)) return true;
            if (current(captured)) errorMessage.value = message(error);
            return false;
        } finally { if (current(captured)) isCompletingReport.value = false; }
    }
    function startReport(kind) {
        if (isSaving.value || isActivatingPanic.value || !isInitialized.value || kind === 'panic' || !Object.values(AlertRecordKind).includes(kind)) return false;
        reportKind.value = kind; reportDraft.value = { ...blankDraft(), ...locationDetails(apiContext.businessLocation ?? {}) };
        currentView.value = 'report-form'; errorMessage.value = null; noticeMessage.value = null; return true;
    }
    function updateReportDraft(fields = {}) {
        if (currentView.value !== 'report-form' || isSaving.value) return false;
        reportDraft.value = { ...reportDraft.value, ...fields }; return true;
    }
    async function submitReport() {
        if (isSaving.value || currentView.value !== 'report-form' || !reportKind.value) return false;
        const draft = new AlertRecord({ ...reportDraft.value, kind: reportKind.value, status: AlertRecordStatus.DRAFT });
        if (!draft.submitReport()) { errorMessage.value = 'alerts.workflow.form.required'; return false; }
        const captured = scope(); writes.value++; errorMessage.value = null;
        try {
            const response = await api.createReport(draft.kind, AlertRecordAssembler.toReportDetails(draft));
            if (!current(captured)) return false;
            const record = readRecord(response, captured.businessId); replaceRecord(record);
            lastSubmittedRecordId.value = record.id; reportKind.value = null; currentView.value = 'report-sent'; return true;
        } catch (error) { if (current(captured)) errorMessage.value = message(error); return false; }
        finally { if (current(captured)) writes.value--; }
    }
    function discardReportDraft() { reportKind.value = null; reportDraft.value = blankDraft(); errorMessage.value = null; openHome(); }
    async function showHistory() {
        const captured = scope();
        if (currentView.value === 'panic-report' && !await flushPanicReportDraft()) return false;
        if (!current(captured) || !await loadHistory()) return false;
        currentView.value = 'history'; noticeMessage.value = null; return true;
    }
    function openHome() { currentView.value = countdownDeadline.value ? 'countdown' : activePanicRecord.value ? 'active' : 'home'; }
    function openRecord(id) { selectedRecordId.value = id; currentView.value = 'record-detail'; }
    function closeRecordDetail() { currentView.value = 'history'; }
    return { preferences, alertRecords, currentView, countdownDurationSeconds, remainingSeconds, countdownProgress, countdownLocation,
        reportDraft, reportKind, selectedRecordId, selectedRecord, lastSubmittedRecordId, activePanicRecord, pendingPanicRecord,
        isLoading, isSaving, isInitialized, isPreparingPanic, isActivatingPanic, errorMessage, noticeMessage, hasUnsavedReportDraft,
        initialize, retryInitialization, saveGracePeriod, setCountdownLocation, startPanicCountdown, cancelPanicCountdown,
        retryPanicActivation, finishActivePanic, updatePanicReportDraft, flushPanicReportDraft, resumePanicReport, deferPanicReport,
        completePanicReport, startReport, updateReportDraft, submitReport, discardReportDraft, showHistory, loadHistory,
        backFromHistory: openHome, openRecord, closeRecordDetail, openHome, resetContext };
});
