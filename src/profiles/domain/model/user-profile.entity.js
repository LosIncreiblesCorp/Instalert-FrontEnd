/** Personal data owned by Profiles. Access credentials belong to IAM. */
export class UserProfile {
    constructor({ userId, firstName = '', lastName = '', dni = '', phone = null, updatedAt = null } = {}) {
        this.userId = userId;
        this.firstName = typeof firstName === 'string' ? firstName.trim() : '';
        this.lastName = typeof lastName === 'string' ? lastName.trim() : '';
        this.dni = typeof dni === 'string' ? dni.trim() : '';
        this.phone = typeof phone === 'string' ? phone.trim() || null : null;
        this.updatedAt = updatedAt;
    }

    get validationErrors() {
        const errors = {};
        if (!this.firstName || this.firstName.length > 100) errors.firstName = 'profiles.validation.firstName';
        if (!this.lastName || this.lastName.length > 100) errors.lastName = 'profiles.validation.lastName';
        if (!/^\d{8}$/.test(this.dni)) errors.dni = 'profiles.validation.dni';
        if (this.phone && (this.phone.length > 30 || !/^[+\d\s().-]+$/.test(this.phone) || !/\d/.test(this.phone))) {
            errors.phone = 'profiles.validation.phone';
        }
        return errors;
    }
}
