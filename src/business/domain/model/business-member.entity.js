export const BusinessMemberRole = Object.freeze({ ADMINISTRATOR: 'Administrator', OPERATIVE: 'Operative' });
export const BusinessMemberStatus = Object.freeze({ ACTIVE: 'active', INACTIVE: 'inactive' });

/** Business owns membership data, not credentials or personal IAM profiles. */
export class BusinessMember {
    constructor({ id = null, businessId, userId = null, displayName = '', email = '',
        role = BusinessMemberRole.OPERATIVE, status = BusinessMemberStatus.INACTIVE,
        createdAt = null, updatedAt = null } = {}) {
        Object.assign(this, { id, businessId, userId, role, status, createdAt, updatedAt });
        this.displayName = displayName.trim();
        this.email = email.trim().toLowerCase();
    }

    get isEmployee() { return this.role === BusinessMemberRole.OPERATIVE; }
    get occupiesSeat() { return this.isEmployee && this.status === BusinessMemberStatus.ACTIVE; }

    validate() {
        if (!this.businessId) throw new Error('business.errors.businessRequired');
        if (!this.displayName || this.displayName.length > 100) throw new Error('business.errors.nameInvalid');
        if (this.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
            throw new Error('business.errors.emailInvalid');
        }
        if (!Object.values(BusinessMemberRole).includes(this.role)
            || !Object.values(BusinessMemberStatus).includes(this.status)) {
            throw new Error('business.errors.invalidState');
        }
        return this;
    }
}
