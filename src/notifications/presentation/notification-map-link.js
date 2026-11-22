/** Notification links always use the authenticated role and server-provided alert identifier. */
export function notificationMapLink(notification, role) {
    const id = notification?.sourceAlertId;
    if (notification?.type !== 'nearby-panic' || !['administrator', 'employee'].includes(role)
        || typeof id !== 'string' || !id.trim() || id.length > 80) return null;
    return { name: role === 'administrator' ? 'admin-risk-map' : 'employee-risk-map', query: { alertId: id } };
}
