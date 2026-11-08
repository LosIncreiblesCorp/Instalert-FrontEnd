import { BaseApi } from '../../shared/infrastructure/base-api.js';

/** Business resources and commands exposed by the platform API. */
export class BusinessApi extends BaseApi {
    getBusinessById(id) { return this.http.get(`businesses/${encodeURIComponent(id)}`); }
    createBusiness(resource) { return this.http.post('businesses', resource); }
    updateBusiness(id, changes) { return this.http.put(`businesses/${encodeURIComponent(id)}`, changes); }
    getMembers(businessId) { return this.http.get(`businesses/${encodeURIComponent(businessId)}/members`); }
    getInvitations(businessId) { return this.http.get(`businesses/${encodeURIComponent(businessId)}/invitations`); }
    getSeats(businessId) { return this.http.get(`businesses/${encodeURIComponent(businessId)}/seats`); }
    createInvitation(businessId, resource) { return this.http.post(`businesses/${encodeURIComponent(businessId)}/invitations`, resource); }
    updateInvitation(id, resource) { return this.http.put(`staff-invitations/${encodeURIComponent(id)}`, resource); }
    cancelInvitation(id) { return this.http.post(`staff-invitations/${encodeURIComponent(id)}/cancellation`); }
    resendInvitation(id) { return this.http.post(`staff-invitations/${encodeURIComponent(id)}/resend`); }
    updateMember(id, resource) { return this.http.put(`business-members/${encodeURIComponent(id)}`, resource); }
    setMemberActive(id, active) { return this.http.post(`business-members/${encodeURIComponent(id)}/${active ? 'activation' : 'deactivation'}`); }
}
