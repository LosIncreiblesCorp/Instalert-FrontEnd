import { defineStore } from 'pinia';
import { createDashboardPeriod, dashboardDateKey } from '../domain/model/dashboard-summary.entity.js';
import { DashboardApi } from '../infrastructure/dashboard-api.js';
import { DashboardAssembler } from '../infrastructure/dashboard.assembler.js';

const demoUsers = { administrator: 'demo-admin', employee: 'demo-employee' };
export const useDashboardStore = defineStore('dashboard', {
    state: () => ({ role: null, userId: null, businessId: null, revision: 0, summaryRequest: 0, historyRequest: 0, detailRequest: 0,
        summary: null, summaryQuery: null, monthlyReports: [], monthlyReport: null,
        isSummaryLoading: false, isHistoryLoading: false, isDetailLoading: false, historyLoaded: false,
        summaryError: null, historyError: null, detailError: null }),
    actions: {
        /** Selected demo roles provide presentation context until IAM supplies identity. */
        setContext(role) {
            const userId = demoUsers[role] ?? null;
            if (userId === this.userId) return;
            const revision = this.revision + 1;
            this.$reset();
            this.role = userId ? role : null;
            this.userId = userId;
            this.businessId = userId ? 'bus-1' : null;
            this.revision = revision;
        },
        async loadSummary({ now = Date.now() } = {}) {
            if (!this.userId) return false;
            const period = 'month', radiusMeters = 500;
            let month;
            try { month = dashboardDateKey(now)?.slice(0, 7); createDashboardPeriod(period, month, now); }
            catch { this.summaryRequest++; this.summary = null; this.summaryQuery = null; this.isSummaryLoading = false; this.summaryError = 'dashboard.errors.invalidQuery'; return false; }
            const { role, userId, businessId, revision } = this;
            const request = ++this.summaryRequest;
            const query = JSON.stringify({ period, month, radiusMeters });
            if (query !== this.summaryQuery) this.summary = null;
            Object.assign(this, { summaryQuery: query, isSummaryLoading: true, summaryError: null });
            const current = () => this.revision === revision && this.summaryRequest === request;
            try {
                const response = await new DashboardApi().getSummary({ role, userId, businessId, period, month, radiusMeters, now });
                const summary = DashboardAssembler.toSummary(response.data);
                if (!current()) return false;
                if (summary.role !== role || summary.userId !== userId || summary.businessId !== businessId
                    || summary.period.kind !== period || summary.period.month !== month || summary.radiusMeters !== radiusMeters) throw new Error('Dashboard scope mismatch.');
                this.summary = summary;
                return true;
            } catch {
                if (current()) this.summaryError = 'dashboard.errors.summary';
                return false;
            } finally { if (current()) this.isSummaryLoading = false; }
        },
        async loadMonthlyReports() {
            if (this.role !== 'administrator') return false;
            const { revision, businessId } = this;
            const request = ++this.historyRequest;
            const current = () => this.revision === revision && this.historyRequest === request;
            this.isHistoryLoading = true;
            this.historyError = null;
            try {
                const response = await new DashboardApi().getMonthlyReports(businessId);
                if (!Array.isArray(response.data)) throw new Error('Invalid report history.');
                const reports = DashboardAssembler.toMonthlyReportList(response.data.filter(item => item?.businessId === businessId));
                if (!current()) return false;
                this.monthlyReports = reports;
                this.historyLoaded = true;
                return true;
            } catch {
                if (current()) this.historyError = 'dashboard.errors.history';
                return false;
            } finally { if (current()) this.isHistoryLoading = false; }
        },
        async loadMonthlyReport(id) {
            if (this.role !== 'administrator') return false;
            if (id == null || !String(id).trim()) { this.detailRequest++; this.monthlyReport = null; this.isDetailLoading = false; this.detailError = 'dashboard.errors.reportMissing'; return false; }
            const { revision, businessId } = this;
            const request = ++this.detailRequest;
            const current = () => this.revision === revision && this.detailRequest === request;
            this.isDetailLoading = true;
            this.detailError = null;
            this.monthlyReport = null;
            try {
                const report = DashboardAssembler.toMonthlyReport((await new DashboardApi().getMonthlyReport(id)).data);
                if (!current()) return false;
                if (report.businessId !== businessId || String(report.id) !== String(id)) throw new Error('Report scope mismatch.');
                this.monthlyReport = report;
                return true;
            } catch (error) {
                if (current()) this.detailError = error.response?.status === 404 ? 'dashboard.errors.reportMissing' : 'dashboard.errors.detail';
                return false;
            } finally { if (current()) this.isDetailLoading = false; }
        },
    },
});
