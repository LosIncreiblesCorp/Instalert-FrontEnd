import { BaseApi } from '../../shared/infrastructure/base-api.js';
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js';
import { createDashboardPeriod, dashboardDateKey, dashboardTimeZone } from '../domain/model/dashboard-summary.entity.js';

const sameId = (left, right) => left != null && right != null && String(left) === String(right);
const coordinatesAvailable = value => Number.isFinite(value?.latitude) && Math.abs(value.latitude) <= 90 && Number.isFinite(value?.longitude) && Math.abs(value.longitude) <= 180;
const time = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
const riskOrder = { low: 0, medium: 1, high: 2 };
const categories = new Set(['robbery', 'attemptedRobbery', 'assault', 'extortion', 'vandalism', 'person', 'vehicle', 'unusualBehavior', 'surveillance', 'lowLighting', 'policePresence', 'roadBlockage', 'other']);
const knownStatuses = new Set(['active', 'pending-report', 'completed', 'submitted', 'resolved', 'false-alarm']);
const alertStatus = item => item.kind === 'panic' && ['pending-report', 'completed'].includes(item.status) ? 'resolved' : item.status;
const hasPendingReport = item => item.kind === 'panic' && (item.status === 'pending-report'
    || (item.status === 'resolved' && item.reportStatus === 'pending'));
const registrationTime = item => time(item.createdAt) ?? time(item.activatedAt) ?? time(item.submittedAt);
const inPeriod = (value, start, end) => value !== null && value >= Date.parse(start) && value < Date.parse(end);
const aggregate = (rows, key) => [...rows.reduce((counts, item) => {
    const group = key(item); counts.set(group, (counts.get(group) ?? 0) + 1); return counts;
}, new Map())].map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));

function distanceMeters(from, to) {
    const rad = value => value * Math.PI / 180;
    const a = Math.sin(rad(to.latitude - from.latitude) / 2) ** 2 + Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(rad(to.longitude - from.longitude) / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}
function validBounds(bounds) {
    if (!Array.isArray(bounds) || bounds.length < 3 || !bounds.every(point => Array.isArray(point) && coordinatesAvailable({ longitude: point[0], latitude: point[1] }))) return null;
    const ring = bounds.map(point => [point[0], point[1]]);
    if (ring[0].some((value, index) => value !== ring.at(-1)[index])) ring.push([...ring[0]]);
    const area = ring.slice(1).reduce((sum, point, index) => sum + ring[index][0] * point[1] - point[0] * ring[index][1], 0);
    return Math.abs(area) > 1e-12 ? ring : null;
}
function contains(bounds, point) {
    if (!bounds || !coordinatesAvailable(point)) return false;
    const x = point.longitude, y = point.latitude;
    let inside = false;
    for (let i = 0; i < bounds.length - 1; i++) {
        const [ax, ay] = bounds[i], [bx, by] = bounds[i + 1];
        const cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax);
        if (Math.abs(cross) < 1e-12 && x >= Math.min(ax, bx) && x <= Math.max(ax, bx) && y >= Math.min(ay, by) && y <= Math.max(ay, by)) return true;
        if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
    }
    return inside;
}
/** Circle/polygon intersection for the local mock query; production geospatial rules belong to Mapping. */
function zoneIsNearby(bounds, center, radius) {
    if (!bounds || !center) return false;
    if (contains(bounds, center)) return true;
    const latitudeScale = Math.PI / 180 * 6371000;
    const longitudeScale = latitudeScale * Math.cos(center.latitude * Math.PI / 180);
    for (let i = 0; i < bounds.length - 1; i++) {
        const [ax, ay] = [(bounds[i][0] - center.longitude) * longitudeScale, (bounds[i][1] - center.latitude) * latitudeScale];
        const [bx, by] = [(bounds[i + 1][0] - center.longitude) * longitudeScale, (bounds[i + 1][1] - center.latitude) * latitudeScale];
        const dx = bx - ax, dy = by - ay, square = dx * dx + dy * dy;
        const fraction = square ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / square)) : 0;
        if (Math.hypot(ax + fraction * dx, ay + fraction * dy) <= radius) return true;
    }
    return false;
}
function uniqueResources(rows) {
    const seen = new Set();
    return rows.filter(item => {
        if (!item || !['string', 'number'].includes(typeof item.id) || !String(item.id).trim()) throw new Error('Invalid source record.');
        const id = String(item.id);
        if (seen.has(id)) throw new Error('Duplicate source identifier.');
        seen.add(id); return true;
    });
}
function dailySeries(rows, period) {
    const counts = new Map();
    const first = dashboardDateKey(period.start), last = dashboardDateKey(Date.parse(period.end) - 1);
    for (let day = Date.parse(first + 'T12:00:00Z'); dashboardDateKey(day) <= last; day += 86400000) counts.set(dashboardDateKey(day), 0);
    for (const item of rows) {
        const key = dashboardDateKey(registrationTime(item));
        if (counts.has(key)) counts.set(key, counts.get(key) + 1);
    }
    return [...counts].map(([key, value]) => ({ key, value }));
}

/** Replaceable gateway. Mock composition is deliberately isolated from presentation and source stores. */
export class DashboardApi extends BaseApi {
    constructor() {
        super();
        this.source = import.meta.env.VITE_DASHBOARD_DATA_SOURCE ?? 'mock';
        if (!['mock', 'service'].includes(this.source)) throw new Error('Invalid dashboard data source.');
        this.dashboard = new BaseEndpoint(this, import.meta.env.VITE_DASHBOARD_ENDPOINT_PATH);
        this.monthlyReports = new BaseEndpoint(this, import.meta.env.VITE_MONTHLY_REPORTS_ENDPOINT_PATH);
        this.paths = {
            businesses: import.meta.env.VITE_BUSINESSES_ENDPOINT_PATH, alerts: import.meta.env.VITE_ALERTS_ENDPOINT_PATH,
            members: import.meta.env.VITE_BUSINESS_MEMBERS_ENDPOINT_PATH, invitations: import.meta.env.VITE_STAFF_INVITATIONS_ENDPOINT_PATH,
            zones: import.meta.env.VITE_RISK_ZONES_ENDPOINT_PATH, incidents: import.meta.env.VITE_INCIDENTS_ENDPOINT_PATH,
            notifications: import.meta.env.VITE_NOTIFICATIONS_ENDPOINT_PATH, subscriptions: import.meta.env.VITE_SUBSCRIPTIONS_ENDPOINT_PATH,
            plans: import.meta.env.VITE_PLANS_ENDPOINT_PATH,
        };
    }
    getMonthlyReports(businessId) { return this.http.get(this.monthlyReports.endpointPath, { params: { businessId } }); }
    getMonthlyReport(id) { return this.monthlyReports.getById(encodeURIComponent(id)); }

    async getSummary({ role, businessId, userId, period = '30d', month, radiusMeters = 500, now = Date.now() }) {
        if (!['administrator', 'employee'].includes(role) || !businessId || !userId || ![100, 500, 1000].includes(radiusMeters)) throw new Error('Invalid dashboard context.');
        const range = createDashboardPeriod(period, month, now);
        if (this.source === 'service') {
            return this.http.get(this.dashboard.endpointPath + '/' + (role === 'administrator' ? 'administrator' : 'operational'), {
                params: { businessId, period, month: range.month ?? undefined, year: range.year ?? undefined, radiusMeters },
            });
        }
        const warnings = new Set();
        const collection = async key => {
            const response = await new BaseEndpoint(this, this.paths[key]).getAll();
            if (!Array.isArray(response.data)) throw new Error('Invalid source collection.');
            return uniqueResources(response.data);
        };
        const keys = ['alerts', 'members', 'zones', 'incidents', 'notifications', ...(role === 'administrator' ? ['invitations', 'subscriptions'] : [])];
        const [businessResponse, results] = await Promise.all([
            new BaseEndpoint(this, this.paths.businesses).getById(encodeURIComponent(businessId)),
            Promise.allSettled(keys.map(collection)),
        ]);
        const business = businessResponse.data;
        if (!business || !sameId(business.id, businessId)) throw new Error('Business unavailable.');
        const sources = Object.fromEntries(keys.map((key, index) => [key, results[index].status === 'fulfilled' ? results[index].value : null]));
        for (const key of keys) if (sources[key] === null) warnings.add(['zones', 'incidents'].includes(key) ? 'geography' : key === 'subscriptions' ? 'subscription' : key);
        const center = coordinatesAvailable(business) ? { latitude: business.latitude, longitude: business.longitude } : null;
        if (!center) warnings.add('location');
        const members = sources.members?.filter(item => sameId(item.businessId, businessId));
        const invitations = sources.invitations?.filter(item => sameId(item.businessId, businessId));
        let unresolvedScope = false;
        const scopedAlerts = sources.alerts?.filter(item => {
            if (item.status === 'draft' || (role === 'employee' && !sameId(item.employeeId, userId))) return false;
            if (item.businessId != null) return sameId(item.businessId, businessId);
            const businesses = new Set(sources.members?.filter(member => sameId(member.userId, item.employeeId)).map(member => String(member.businessId)) ?? []);
            if (businesses.size !== 1) { unresolvedScope = true; return false; }
            return businesses.has(String(businessId));
        });
        if (unresolvedScope) warnings.add('scope');
        const alertsAvailable = sources.alerts !== null && !unresolvedScope;
        const current = alertsAvailable ? scopedAlerts.filter(item => inPeriod(registrationTime(item), range.start, range.end)) : null;
        const previous = alertsAvailable ? scopedAlerts.filter(item => inPeriod(registrationTime(item), range.previousStart, range.previousEnd)) : null;
        const allZones = sources.zones?.map(item => ({ id: item.id, name: typeof item.name === 'string' ? item.name : '', riskLevel: Object.hasOwn(riskOrder, item.riskLevel) ? item.riskLevel : null, bounds: validBounds(item.bounds) }));
        if (allZones?.some(zone => !zone.bounds)) warnings.add('geography');
        const nearbyZones = center && allZones ? allZones.filter(zone => zoneIsNearby(zone.bounds, center, radiusMeters)) : null;
        const nearby = center && sources.incidents ? sources.incidents.filter(item => coordinatesAvailable(item) && distanceMeters(center, item) <= radiusMeters
            && inPeriod(time(item.reportedAt), range.start, range.end)) : null;
        const riskAt = point => {
            const matching = allZones?.filter(zone => contains(zone.bounds, point)) ?? [];
            const levels = new Set(matching.map(zone => zone.riskLevel));
            if (levels.size > 1) warnings.add('classification');
            return levels.size === 1 ? [...levels][0] : null;
        };
        const riskCounts = nearby && allZones ? ['low', 'medium', 'high', 'unknown'].map(key => ({ key, value: nearby.filter(item => (riskAt(item) ?? 'unknown') === key).length })) : null;
        const localRiskLevel = center && allZones ? riskAt(center) : null;
        let subscription = null, limit = null;
        const subscriptions = sources.subscriptions?.filter(item => sameId(item.businessId, businessId));
        if (role === 'administrator' && subscriptions) {
            try {
                const active = subscriptions.filter(item => item.status === 'active');
                if (active.length > 1) throw new Error('Ambiguous subscription.');
                if (!active.length) {
                    subscription = { name: null, status: 'none', currentPeriodEnd: null, cancelAtPeriodEnd: false };
                    limit = 0;
                } else {
                    const plan = (await new BaseEndpoint(this, this.paths.plans).getById(encodeURIComponent(active[0].planId))).data;
                    if (!plan || !sameId(plan.id, active[0].planId) || !Number.isInteger(plan.maxEmployees) || plan.maxEmployees < 0) throw new Error('Invalid plan projection.');
                    limit = plan.maxEmployees;
                    subscription = { name: typeof plan.name === 'string' ? plan.name : '', status: active[0].status,
                        currentPeriodEnd: time(active[0].currentPeriodEnd) === null ? null : active[0].currentPeriodEnd, cancelAtPeriodEnd: active[0].cancelAtPeriodEnd === true };
                }
            } catch { warnings.add('subscription'); }
        }
        const activeStaff = members ? members.filter(item => item.role === 'Operative' && item.status === 'active').length : null;
        const pending = invitations ? invitations.filter(item => item.status === 'pending').length : null;
        const reserved = activeStaff !== null && pending !== null ? activeStaff + pending : null;
        const staff = role === 'administrator' ? { active: activeStaff, pending, limit,
            available: reserved !== null && limit !== null ? Math.max(0, limit - reserved) : null,
            overCapacity: reserved !== null && limit !== null ? reserved > limit : null } : null;
        const hourly = current ? Array.from({ length: 24 }, (_, hour) => ({ key: String(hour).padStart(2, '0'), value: current.filter(item =>
            Number(new Intl.DateTimeFormat('en-US', { timeZone: dashboardTimeZone, hour: '2-digit', hourCycle: 'h23' }).format(registrationTime(item))) === hour).length })) : null;
        const metrics = {
            activeAlerts: alertsAvailable ? scopedAlerts.filter(item => item.status === 'active').length : null,
            pendingReports: alertsAvailable ? scopedAlerts.filter(hasPendingReport).length : null,
            reports: current?.length ?? null, previousReports: previous?.length ?? null, nearbyIncidents: nearby?.length ?? null,
            unreadNotifications: sources.notifications ? sources.notifications.filter(item => sameId(item.recipientUserId, userId)
                && (item.targetBusinessId == null || sameId(item.targetBusinessId, businessId)) && item.readAt == null).length : null,
            invalidLocationReports: alertsAvailable ? scopedAlerts.filter(item => !coordinatesAvailable(item)).length : null,
            undatedReports: alertsAvailable ? scopedAlerts.filter(item => registrationTime(item) === null).length : null, localRiskLevel,
        };
        return { data: {
            role, businessId, userId, businessName: typeof business.name === 'string' ? business.name : '', period: range,
            radiusMeters, refreshedAt: new Date(now).toISOString(), metrics, staff, subscription,
            daily: current ? dailySeries(current, range) : null,
            categories: current ? aggregate(current, item => categories.has(item.category) ? item.category : 'other') : null,
            statuses: current ? aggregate(current, item => knownStatuses.has(alertStatus(item)) ? alertStatus(item) : 'unknown') : null,
            hourly, riskCounts,
            riskZones: nearbyZones ? nearbyZones.map(zone => ({ id: zone.id, name: zone.name, riskLevel: zone.riskLevel,
                incidentCount: nearby ? nearby.filter(item => contains(zone.bounds, item)).length : null }))
                .sort((a, b) => (riskOrder[b.riskLevel] ?? -1) - (riskOrder[a.riskLevel] ?? -1) || (b.incidentCount ?? 0) - (a.incidentCount ?? 0)).slice(0, 5) : null,
            activity: current ? [...current].sort((a, b) => registrationTime(b) - registrationTime(a)).slice(0, 8).map(item => ({ id: item.id,
                kind: typeof item.kind === 'string' ? item.kind : 'other', status: knownStatuses.has(alertStatus(item)) ? alertStatus(item) : 'unknown',
                category: categories.has(item.category) ? item.category : 'other', registeredAt: new Date(registrationTime(item)).toISOString() })) : null,
            warnings: [...warnings],
        } };
    }
}
