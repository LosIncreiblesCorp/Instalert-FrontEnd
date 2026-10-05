/** Personal emergency-contact data. Notification delivery belongs to a separate flow. */
export class EmergencyContact {
    constructor({ id = null, employeeId = null, fullName = '', relationship = '', phone = '',
        email = '', notes = '', createdAt = null, updatedAt = null } = {}) {
        Object.assign(this, { id, employeeId, createdAt, updatedAt });
        this.fullName = String(fullName ?? '').trim();
        this.relationship = String(relationship ?? '').trim();
        this.phone = String(phone ?? '').trim().replace(/[\s()-]/g, '');
        this.email = String(email ?? '').trim().toLowerCase();
        this.notes = String(notes ?? '').trim();
    }

    get initials() {
        return this.fullName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
    }

    validationErrors() {
        const errors = {};
        if (!this.employeeId) errors.employeeId = 'contacts.errors.ownerRequired';
        if (!this.fullName || this.fullName.length > 100) errors.fullName = 'contacts.errors.nameInvalid';
        if (!this.relationship || this.relationship.length > 60) errors.relationship = 'contacts.errors.relationshipInvalid';
        if (!/^\+?[1-9]\d{6,14}$/.test(this.phone)) errors.phone = 'contacts.errors.phoneInvalid';
        if (this.email && (this.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email))) {
            errors.email = 'contacts.errors.emailInvalid';
        }
        if (this.notes.length > 140) errors.notes = 'contacts.errors.notesInvalid';
        return errors;
    }

    validate() {
        const error = Object.values(this.validationErrors())[0];
        if (error) throw new Error(error);
        return this;
    }
}
