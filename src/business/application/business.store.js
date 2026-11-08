import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { Business } from '../domain/model/business.entity.js';
import { BusinessMember } from '../domain/model/business-member.entity.js';
import { StaffInvitation } from '../domain/model/staff-invitation.entity.js';
import { BusinessApi } from '../infrastructure/business-api.js';
import { BusinessAssembler } from '../infrastructure/business.assembler.js';
import { BusinessMemberAssembler } from '../infrastructure/business-member.assembler.js';
import { StaffInvitationAssembler } from '../infrastructure/staff-invitation.assembler.js';
import { apiContext, currentContextRevision, prepareBusinessContext, requireBusinessId } from '../../shared/infrastructure/api-context.js';

const api = new BusinessApi();

/** Commerce and personnel state scoped to the selected demonstration account. */
export default defineStore('business', () => {
    const profile = ref(null);
    const profileLoaded = ref(false);
    const isProfileLoading = ref(false);
    const isProfileSaving = ref(false);
    const profileError = ref(null);
    const profileNotice = ref(null);
    const members = ref([]);
    const invitations = ref([]);
    const planLimits = ref(null);
    const personnelLoaded = ref(false);
    const isLoading = ref(false);
    const isSaving = ref(false);
    const errorMessage = ref(null);
    const noticeMessage = ref(null);
    const seats = ref(null);
    const employees = computed(() => members.value.filter(member => member.isEmployee));
    const occupiedSeats = computed(() => seats.value?.activeEmployees ?? null);
    const reservedSeats = computed(() => seats.value?.reservedSeats ?? null);
    const availableSeats = computed(() => seats.value?.availableSeats ?? null);

    watch(() => apiContext.userId, () => {
        profile.value = null; profileLoaded.value = false;
        isProfileLoading.value = false; isProfileSaving.value = false;
        profileError.value = null; profileNotice.value = null;
        members.value = []; invitations.value = []; seats.value = null; planLimits.value = null;
        personnelLoaded.value = false; isLoading.value = false; isSaving.value = false;
        clearMessages();
    }, { flush: 'sync' });

    const current = revision => revision === currentContextRevision();
    function requireAdministrator() {
        if (apiContext.role !== 'administrator') throw new Error('api.errors.forbidden');
    }
    function feedback(error, fallback) {
        const problem = error.apiError;
        if (problem?.code === 'capacity') return 'business.errors.noSeats';
        if (problem?.code === 'transition') return 'business.errors.invitationNotPending';
        if (problem?.status === 404) return 'business.errors.notFound';
        if (problem?.status === 409 && problem.field === 'email') return 'business.errors.duplicateEmail';
        if (problem?.status === 409 && problem.field === 'ownerUserId') return 'business.profile.alreadyRegistered';
        if (problem?.status === 409 && problem.field === 'taxId') return 'business.profile.duplicateTaxId';
        return problem?.messageKey ?? (/^(business\.|api\.)/.test(error.message) ? error.message : fallback);
    }
    function clearMessages() { errorMessage.value = null; noticeMessage.value = null; }

    async function loadProfile() {
        if (isProfileLoading.value || isProfileSaving.value) return false;
        const revision = currentContextRevision();
        isProfileLoading.value = true; profileLoaded.value = false;
        profileError.value = null; profileNotice.value = null;
        try {
            requireAdministrator();
            await prepareBusinessContext(api.http);
            if (!current(revision)) return false;
            if (apiContext.status === 'missing') {
                profile.value = null; profileLoaded.value = true;
                return true;
            }
            const response = await api.getBusinessById(requireBusinessId());
            if (!current(revision)) return false;
            const business = BusinessAssembler.toEntityFromResource(response.data);
            if (business.id !== apiContext.businessId) throw new Error('business.profile.loadError');
            profile.value = business; profileLoaded.value = true;
            return true;
        } catch (error) {
            if (current(revision)) profileError.value = feedback(error, 'business.profile.loadError');
            return false;
        } finally { if (current(revision)) isProfileLoading.value = false; }
    }

    async function saveProfile(values) {
        if (!profileLoaded.value || isProfileLoading.value || isProfileSaving.value) return false;
        const revision = currentContextRevision();
        const registering = !profile.value;
        isProfileSaving.value = true; profileError.value = null; profileNotice.value = null;
        try {
            requireAdministrator();
            const business = new Business({ ...values, taxId: profile.value?.taxId ?? values.taxId }).validate();
            const response = registering
                ? await api.createBusiness(BusinessAssembler.toResourceFromEntity(business))
                : await api.updateBusiness(requireBusinessId(), BusinessAssembler.toProfileChanges(business));
            if (!current(revision)) return false;
            profile.value = BusinessAssembler.toEntityFromResource(response.data);
            profileNotice.value = registering ? 'business.profile.created' : 'business.profile.saved';
            await prepareBusinessContext(api.http, { refresh: true });
            return current(revision);
        } catch (error) {
            if (current(revision)) profileError.value = feedback(error, 'business.profile.saveError');
            return false;
        } finally { if (current(revision)) isProfileSaving.value = false; }
    }

    async function refreshPersonnel(revision) {
        requireAdministrator();
        const businessId = requireBusinessId();
        const [memberResponse, invitationResponse, seatResponse] = await Promise.all([
            api.getMembers(businessId), api.getInvitations(businessId), api.getSeats(businessId),
        ]);
        if (!current(revision)) return false;
        const loadedMembers = BusinessMemberAssembler.toEntitiesFromResponse(memberResponse);
        const loadedInvitations = StaffInvitationAssembler.toEntitiesFromResponse(invitationResponse);
        const limits = seatResponse.data;
        if ([...loadedMembers, ...loadedInvitations].some(record => record.businessId !== businessId)
            || !['limit', 'activeEmployees', 'reservedSeats', 'availableSeats'].every(key => Number.isInteger(limits?.[key]) && limits[key] >= 0)
            || typeof limits.subscriptionActive !== 'boolean') throw new Error('business.errors.load');
        members.value = loadedMembers; invitations.value = loadedInvitations; seats.value = limits;
        planLimits.value = { maxEmployees: limits.limit, subscriptionActive: limits.subscriptionActive };
        personnelLoaded.value = true;
        return true;
    }
    async function loadPersonnel() {
        if (isLoading.value || isSaving.value) return false;
        const revision = currentContextRevision();
        isLoading.value = true; personnelLoaded.value = false; errorMessage.value = null;
        try { return await refreshPersonnel(revision); }
        catch (error) {
            if (current(revision)) errorMessage.value = feedback(error, 'business.errors.load');
            return false;
        } finally { if (current(revision)) isLoading.value = false; }
    }
    function assertAvailableSeat() {
        if (!seats.value) throw new Error('business.errors.limitsUnavailable');
        if (!seats.value.subscriptionActive) throw new Error('business.errors.subscriptionInactive');
        if (seats.value.availableSeats <= 0) throw new Error('business.errors.noSeats');
    }
    function assertUniqueEmail(email, memberId = null, invitationId = null) {
        if (members.value.some(item => item.email === email && item.id !== memberId)
            || invitations.value.some(item => item.reservesSeat && item.email === email && item.id !== invitationId)) {
            throw new Error('business.errors.duplicateEmail');
        }
    }
    async function runCommand(command, successKey) {
        if (isSaving.value || isLoading.value || !personnelLoaded.value) return false;
        const revision = currentContextRevision();
        isSaving.value = true; clearMessages();
        let persisted = false;
        try {
            if (!await refreshPersonnel(revision)) return false;
            await command(requireBusinessId());
            persisted = true;
            if (!current(revision)) return false;
            noticeMessage.value = successKey;
            await refreshPersonnel(revision);
            return current(revision);
        } catch (error) {
            if (current(revision)) {
                errorMessage.value = persisted ? 'business.errors.refreshAfterSave' : feedback(error, 'business.errors.save');
                if (persisted) personnelLoaded.value = false;
            }
            return persisted && current(revision);
        } finally { if (current(revision)) isSaving.value = false; }
    }
    function getMember(id) {
        const member = members.value.find(item => item.id === id);
        if (!member) throw new Error('business.errors.notFound');
        if (!member.isEmployee) throw new Error('business.errors.administratorProtected');
        return member;
    }
    function getPendingInvitation(id) {
        const invitation = invitations.value.find(item => item.id === id);
        if (!invitation) throw new Error('business.errors.notFound');
        if (!invitation.reservesSeat) throw new Error('business.errors.invitationNotPending');
        return invitation;
    }
    function createInvitation(values) {
        return runCommand(async businessId => {
            const invitation = new StaffInvitation({ ...values, businessId }).validate();
            assertUniqueEmail(invitation.email); assertAvailableSeat();
            await api.createInvitation(businessId, StaffInvitationAssembler.toResourceFromEntity(invitation));
        }, 'business.messages.invitationCreated');
    }
    function updateInvitation(id, values) {
        return runCommand(async () => {
            const invitation = new StaffInvitation({ ...getPendingInvitation(id), ...values }).validate();
            assertUniqueEmail(invitation.email, null, id);
            await api.updateInvitation(id, StaffInvitationAssembler.toResourceFromEntity(invitation));
        }, 'business.messages.updated');
    }
    function cancelInvitation(id) {
        return runCommand(async () => { getPendingInvitation(id); await api.cancelInvitation(id); }, 'business.messages.invitationCancelled');
    }
    function resendInvitation(id) {
        return runCommand(async () => { getPendingInvitation(id); await api.resendInvitation(id); }, 'business.messages.resendRecorded');
    }
    function updateMember(id, values) {
        return runCommand(async () => {
            const member = new BusinessMember({ ...getMember(id), ...values }).validate();
            assertUniqueEmail(member.email, id);
            await api.updateMember(id, BusinessMemberAssembler.toResourceFromEntity(member));
        }, 'business.messages.updated');
    }
    function toggleMembership(id) {
        return runCommand(async () => {
            const member = getMember(id);
            if (!member.occupiesSeat) assertAvailableSeat();
            await api.setMemberActive(id, !member.occupiesSeat);
        }, 'business.messages.membershipUpdated');
    }
    return { profile, profileLoaded, isProfileLoading, isProfileSaving, profileError, profileNotice, loadProfile, saveProfile,
        members, employees, invitations, planLimits, personnelLoaded, occupiedSeats, reservedSeats, availableSeats,
        isLoading, isSaving, errorMessage, noticeMessage, clearMessages, loadPersonnel,
        createInvitation, updateInvitation, cancelInvitation, resendInvitation, updateMember, toggleMembership };
});
