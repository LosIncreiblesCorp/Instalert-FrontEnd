import { ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { DashboardApi } from '../infrastructure/dashboard-api.js';
import { DashboardAssembler } from '../infrastructure/dashboard.assembler.js';
import { dashboardDateKey } from '../domain/model/dashboard-summary.entity.js';
import { apiContext, currentContextRevision, requireBusinessId } from '../../shared/infrastructure/api-context.js';

const api = new DashboardApi();
export const useDashboardStore = defineStore('dashboard', () => {
    const summary = ref(null), monthlyReports = ref([]), monthlyReport = ref(null);
    const isSummaryLoading = ref(false), isHistoryLoading = ref(false), isDetailLoading = ref(false), isGenerating = ref(false);
    const historyLoaded = ref(false), summaryError = ref(null), historyError = ref(null), detailError = ref(null), generationError = ref(null);
    let generation = 0, summaryRequest = 0, historyRequest = 0, detailRequest = 0;
    const capture = () => ({ generation, revision: currentContextRevision(), role: apiContext.role, userId: apiContext.userId, businessId: apiContext.businessId });
    const current = scope => scope.generation === generation && scope.revision === currentContextRevision()
        && scope.businessId === apiContext.businessId && scope.userId === apiContext.userId;
    function resetContext() {
        generation++; summaryRequest++; historyRequest++; detailRequest++;
        summary.value = null; monthlyReports.value = []; monthlyReport.value = null;
        isSummaryLoading.value = false; isHistoryLoading.value = false; isDetailLoading.value = false; isGenerating.value = false;
        historyLoaded.value = false; summaryError.value = null; historyError.value = null; detailError.value = null; generationError.value = null;
    }
    watch(() => [apiContext.userId, apiContext.businessId, apiContext.status], resetContext, { flush: 'sync' });
    function ownedReport(dto, scope) {
        const report = DashboardAssembler.toMonthlyReport(dto);
        if (report.businessId !== scope.businessId) throw new Error('Invalid report scope.');
        return report;
    }
    async function loadSummary() {
        const scope = capture(), request = ++summaryRequest;
        const valid = () => current(scope) && request === summaryRequest;
        isSummaryLoading.value = true; summaryError.value = null;
        try {
            const businessId = requireBusinessId();
            const response = await api.getSummary(businessId);
            const result = DashboardAssembler.toSummary(response.data);
            if (result.role !== scope.role || result.businessId !== businessId || result.userId !== scope.userId
                || result.period.kind !== 'month') throw new Error('Invalid dashboard scope.');
            if (!valid()) return false;
            summary.value = result; return true;
        } catch (error) {
            if (valid()) summaryError.value = error.apiError?.messageKey ?? 'dashboard.errors.summary';
            return false;
        } finally { if (valid()) isSummaryLoading.value = false; }
    }
    async function loadMonthlyReports() {
        const scope = capture(), request = ++historyRequest;
        const valid = () => current(scope) && request === historyRequest;
        isHistoryLoading.value = true; historyError.value = null;
        try {
            requireBusinessId();
            if (scope.role !== 'administrator') throw new Error('Report access requires an administrator.');
            const result = DashboardAssembler.toMonthlyReportList((await api.getReports(scope.businessId)).data);
            if (result.some(item => item.businessId !== scope.businessId)) throw new Error('Invalid report scope.');
            if (!valid()) return false;
            monthlyReports.value = result; historyLoaded.value = true; return true;
        } catch (error) {
            if (valid()) historyError.value = error.apiError?.messageKey ?? 'dashboard.errors.history';
            return false;
        } finally { if (valid()) isHistoryLoading.value = false; }
    }
    async function loadMonthlyReport(id) {
        const scope = capture(), request = ++detailRequest;
        const valid = () => current(scope) && request === detailRequest;
        isDetailLoading.value = true; detailError.value = null; monthlyReport.value = null;
        try {
            requireBusinessId();
            if (scope.role !== 'administrator' || typeof id !== 'string' || !id) throw new Error('Invalid report query.');
            const result = ownedReport((await api.getReport(scope.businessId, id)).data, scope);
            if (result.id !== id) throw new Error('Invalid report identifier.');
            if (!valid()) return false;
            monthlyReport.value = result; return true;
        } catch (error) {
            if (valid()) detailError.value = error.response?.status === 404 ? 'dashboard.errors.reportMissing'
                : error.apiError?.messageKey ?? 'dashboard.errors.detail';
            return false;
        } finally { if (valid()) isDetailLoading.value = false; }
    }
    async function generateReport(startDate, endDate) {
        if (isGenerating.value) return null;
        const scope = capture(); isGenerating.value = true; generationError.value = null;
        try {
            requireBusinessId();
            const validDate = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
                && Number.isFinite(Date.parse(date + 'T12:00:00Z')) && new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) === date;
            if (scope.role !== 'administrator' || !validDate(startDate) || !validDate(endDate) || startDate < '2000-01-01'
                || endDate < startDate || endDate > dashboardDateKey(Date.now())) throw new Error('dashboard.errors.invalidRange');
            const result = ownedReport((await api.generateReport(scope.businessId, startDate, endDate)).data, scope);
            if (result.startDate !== startDate || result.endDate !== endDate) throw new Error('Invalid report range.');
            if (!current(scope)) return null;
            monthlyReport.value = result;
            monthlyReports.value = [result, ...monthlyReports.value.filter(item => item.id !== result.id)];
            return result.id;
        } catch (error) {
            if (current(scope)) generationError.value = error.apiError?.messageKey
                ?? (error.message === 'dashboard.errors.invalidRange' ? error.message : 'dashboard.errors.generate');
            return null;
        } finally { if (current(scope)) isGenerating.value = false; }
    }
    return { summary, monthlyReports, monthlyReport, isSummaryLoading, isHistoryLoading, isDetailLoading, isGenerating,
        historyLoaded, summaryError, historyError, detailError, generationError, resetContext, loadSummary,
        loadMonthlyReports, loadMonthlyReport, generateReport };
});
