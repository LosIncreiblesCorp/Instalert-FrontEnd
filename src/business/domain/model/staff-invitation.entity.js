export const StaffInvitationStatus = Object.freeze({ PENDING: 'pending', CANCELLED: 'cancelled', ACCEPTED: 'accepted' });

/** Pending demo invitations reserve a seat; no account or password is created here. */
export class StaffInvitation {
    constructor({ id = null, businessId, displayName = '', email = '', status = StaffInvitationStatus.PENDING,
        createdAt = null, updatedAt = null, lastResentAt = null } = {}) {
        Object.assign(this, { id, businessId, status, createdAt, updatedAt, lastResentAt });
        this.displayName = displayName.trim();
        this.email = email.trim().toLowerCase();
    }

    get reservesSeat() { return this.status === StaffInvitationStatus.PENDING; }

    validate() {
        if (!this.businessId) throw new Error('business.errors.businessRequired');
        if (!this.displayName || this.displayName.length > 100) throw new Error('business.errors.nameInvalid');
        if (this.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
            throw new Error('business.errors.emailInvalid');
        }
        if (!Object.values(StaffInvitationStatus).includes(this.status)) throw new Error('business.errors.invalidState');
        return this;
    }
}
