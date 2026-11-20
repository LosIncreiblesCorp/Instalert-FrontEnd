import { BaseApi } from '../../shared/infrastructure/base-api.js';
export class IamApi extends BaseApi {
  register(email, password) { return this.http.post('users', { email, password }, { credentialRequest: true }); }
  signIn(email, password) { return this.http.post('tokens', { email, password }, { credentialRequest: true }); }
  current() { return this.http.get('sessions/current'); }
  changePassword(currentPassword, newPassword) {
    return this.http.put('users/me/password', { currentPassword, newPassword }, { credentialRequest: true });
  }
  signOut() { return this.http.delete('tokens/current'); }
}
