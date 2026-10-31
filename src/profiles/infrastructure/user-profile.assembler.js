import { UserProfile } from '../domain/model/user-profile.entity.js';

export class UserProfileAssembler {
    static toDomain(resource) {
        if (!resource || typeof resource.userId !== 'string') throw new Error('Invalid profile resource.');
        return new UserProfile(resource);
    }

    static toChanges(profile) {
        return { firstName: profile.firstName, lastName: profile.lastName, dni: profile.dni,
            phone: profile.phone, updatedAt: new Date().toISOString() };
    }
}
