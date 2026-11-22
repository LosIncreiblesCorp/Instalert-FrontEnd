import { BaseApi } from '../../shared/infrastructure/base-api.js';
export class InvitationsApi extends BaseApi {
    own() { return this.http.get('staff-invitations/me'); }
    accept(id) { return this.http.post(`staff-invitations/${encodeURIComponent(id)}/acceptance`); }
}
