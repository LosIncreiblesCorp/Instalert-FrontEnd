import { IncidentCategory } from '../domain/model/incident-marker.entity.js';

const categories = new Set(Object.values(IncidentCategory));
const kinds = new Set(['panic', 'past-incident', 'suspicious-activity', 'other-situation']);

export function incidentTitle(incident, t) {
    if (incident.title === incident.category && categories.has(incident.category))
        return t('mapping.incidentCategories.' + incident.category);
    if (kinds.has(incident.title)) return t('mapping.kinds.' + incident.title);
    return incident.title || t('mapping.notRecorded');
}

export function zoneName(zone, t) {
    return zone.name === 'Incident concentration' ? t('mapping.zoneName') : zone.name || t('mapping.notRecorded');
}
