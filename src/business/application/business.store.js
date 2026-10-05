import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { BusinessMember } from '../domain/model/business-member.entity.js';
import { StaffInvitation, StaffInvitationStatus } from '../domain/model/staff-invitation.entity.js';
import { BusinessApi } from '../infrastructure/business-api.js';
import { BusinessMemberAssembler } from '../infrastructure/business-member.assembler.js';
import { StaffInvitationAssembler } from '../infrastructure/staff-invitation.assembler.js';

const businessApi = new BusinessApi();
const demoBusinessId = 'bus-1'; // Existing fictitious business. Demo scope, not an authorization boundary.

/** Application service store for the business bounded context. @returns {Object} The business store. */
const useBusinessStore = defineStore('business', () => {
    /** @type {import('vue').Ref<import('../domain/model/business-member.entity.js').BusinessMember[]>} */
    const members = ref([]);
    /** @type {import('vue').Ref<import('../domain/model/staff-invitation.entity.js').StaffInvitation[]>} */
    const invitations = ref([]);
    /** @type {import('vue').Ref<Object|null>} */
    const planLimits = ref(null);
    /** @type {import('vue').Ref<boolean>} */
    const isLoading = ref(false);
    /** @type {import('vue').Ref<boolean>} */
    const isSaving = ref(false);
    /** @type {import('vue').Ref<string|null>} */
    const errorMessage = ref(null);
    /** @type {import('vue').Ref<string|null>} */
    const noticeMessage = ref(null);
    const employees = computed(() => members.value.filter(member => member.isEmployee));
    const occupiedSeats = computed(() => members.value.filter(member => member.occupiesSeat).length);
    const reservedSeats = computed(() => invitations.value.filter(invitation => invitation.reservesSeat).length);
    const availableSeats = computed(() => planLimits.value == null ? null
        : Math.max(0, planLimits.value.maxEmployees - occupiedSeats.value - reservedSeats.value));

    /** Clears store feedback messages. @returns {void} */
    function clearMessages() { errorMessage.value = null; noticeMessage.value = null; }

    /** Reloads members and invitations scoped to the demo business. @returns {Promise<void>} */
    async function refreshRecords() {
        const [memberResponse, invitationResponse] = await Promise.all([
            businessApi.getMembers(demoBusinessId), businessApi.getInvitations(demoBusinessId),
        ]);
        // Scope defensively even if a mock/server ignores the query parameter.
        members.value = BusinessMemberAssembler.toEntitiesFromResponse(memberResponse)
            .filter(member => member.businessId === demoBusinessId);
        invitations.value = StaffInvitationAssembler.toEntitiesFromResponse(invitationResponse)
            .filter(invitation => invitation.businessId === demoBusinessId);
    }

    /** Reloads the subscription plan limits. @returns {Promise<void>} */
    async function refreshLimits() {
        planLimits.value = null;
        planLimits.value = await businessApi.getPlanLimits(demoBusinessId);
    }

    /** Loads personnel records and plan limits into the store. @returns {Promise<void>} */
    async function loadPersonnel() {
        if (isLoading.value || isSaving.value) return;
        isLoading.value = true;
        errorMessage.value = null;
        try {
            await refreshRecords();
            await refreshLimits();
        } catch {
            errorMessage.value = 'business.errors.load';
        } finally { isLoading.value = false; }
    }

    /** Ensures a seat is available for a new employee or invitation. @returns {void} */
    function assertAvailableSeat() {
        if (availableSeats.value == null) throw new Error('business.errors.limitsUnavailable');
        if (!planLimits.value.subscriptionActive) throw new Error('business.errors.subscriptionInactive');
        if (availableSeats.value <= 0) throw new Error('business.errors.noSeats');
    }

    /** Ensures an email is not already used by a member or invitation. @param {string} email - Email to check. @param {string|null} [memberId] - Member id to exclude. @param {string|null} [invitationId] - Invitation id to exclude. @returns {void} */
    function assertUniqueEmail(email, memberId = null, invitationId = null) {
        const memberExists = members.value.some(member => member.email === email
            && String(member.id) !== String(memberId));
        const invitationExists = invitations.value.some(invitation => invitation.reservesSeat
            && invitation.email === email && String(invitation.id) !== String(invitationId));
        if (memberExists || invitationExists) throw new Error('business.errors.duplicateEmail');
    }

    /** Runs a mutating command with shared loading and feedback handling. @param {Function} command - Command to execute. @param {string} successKey - Success message key. @returns {Promise<boolean>} True when the command succeeds. */
    async function runCommand(command, successKey) {
        if (isSaving.value || isLoading.value) return false;
        clearMessages();
        isSaving.value = true;
        try {
            // Fresh state reduces stale quota decisions; JSON Server is not transactional.
            await refreshRecords();
            await command();
            noticeMessage.value = successKey;
            return true;
        } catch (error) {
            errorMessage.value = error.message?.startsWith('business.errors.') ? error.message : 'business.errors.save';
            return false;
        } finally { isSaving.value = false; }
    }

    /** Finds an editable employee member by id. @param {string} id - Member id. @returns {Object} The member entity. */
    function getMember(id) {
        const member = members.value.find(item => String(item.id) === String(id));
        if (!member) throw new Error('business.errors.notFound');
        if (!member.isEmployee) throw new Error('business.errors.administratorProtected');
        return member;
    }

    /** Finds a pending invitation that still reserves a seat. @param {string} id - Invitation id. @returns {Object} The invitation entity. */
    function getPendingInvitation(id) {
        const invitation = invitations.value.find(item => String(item.id) === String(id));
        if (!invitation) throw new Error('business.errors.notFound');
        if (!invitation.reservesSeat) throw new Error('business.errors.invitationNotPending');
        return invitation;
    }

    /** Replaces a member in the local collection. @param {Object} resource - Updated member resource. @returns {void} */
    function replaceMember(resource) {
        const member = BusinessMemberAssembler.toEntityFromResource(resource);
        members.value = members.value.map(item => String(item.id) === String(member.id) ? member : item);
    }

    /** Inserts or replaces an invitation in the local collection. @param {Object} resource - Updated invitation resource. @returns {void} */
    function replaceInvitation(resource) {
        const invitation = StaffInvitationAssembler.toEntityFromResource(resource);
        const index = invitations.value.findIndex(item => String(item.id) === String(invitation.id));
        if (index === -1) invitations.value.unshift(invitation);
        else invitations.value[index] = invitation;
    }

    /** Creates a staff invitation after quota and email checks. @param {Object} values - Invitation form values. @returns {Promise<boolean>} True when created. */
    function createInvitation(values) {
        return runCommand(async () => {
            const now = new Date().toISOString();
            const invitation = new StaffInvitation({ businessId: demoBusinessId,
                displayName: values.displayName, email: values.email, createdAt: now, updatedAt: now }).validate();
            assertUniqueEmail(invitation.email);
            await refreshLimits();
            assertAvailableSeat();
            const response = await businessApi.createInvitation(StaffInvitationAssembler.toResourceFromEntity(invitation));
            replaceInvitation(response.data);
        }, 'business.messages.invitationCreated');
    }

    /** Updates a pending invitation. @param {string} id - Invitation id. @param {Object} values - New values. @returns {Promise<boolean>} True when updated. */
    function updateInvitation(id, values) {
        return runCommand(async () => {
            const invitation = new StaffInvitation({ ...getPendingInvitation(id),
                displayName: values.displayName, email: values.email, updatedAt: new Date().toISOString() }).validate();
            assertUniqueEmail(invitation.email, null, id);
            const response = await businessApi.updateInvitation(StaffInvitationAssembler.toResourceFromEntity(invitation));
            replaceInvitation(response.data);
        }, 'business.messages.updated');
    }

    /** Cancels a pending invitation. @param {string} id - Invitation id. @returns {Promise<boolean>} True when cancelled. */
    function cancelInvitation(id) {
        return runCommand(async () => {
            const invitation = new StaffInvitation({ ...getPendingInvitation(id),
                status: StaffInvitationStatus.CANCELLED, updatedAt: new Date().toISOString() });
            const response = await businessApi.updateInvitation(StaffInvitationAssembler.toResourceFromEntity(invitation));
            replaceInvitation(response.data);
        }, 'business.messages.invitationCancelled');
    }

    /** Records an invitation resend with fresh timestamps. @param {string} id - Invitation id. @returns {Promise<boolean>} True when recorded. */
    function resendInvitation(id) {
        return runCommand(async () => {
            const now = new Date().toISOString();
            const invitation = new StaffInvitation({ ...getPendingInvitation(id), lastResentAt: now, updatedAt: now });
            const response = await businessApi.updateInvitation(StaffInvitationAssembler.toResourceFromEntity(invitation));
            replaceInvitation(response.data);
        }, 'business.messages.resendRecorded');
    }

    /** Updates an employee member. @param {string} id - Member id. @param {Object} values - New values. @returns {Promise<boolean>} True when updated. */
    function updateMember(id, values) {
        return runCommand(async () => {
            const member = new BusinessMember({ ...getMember(id), displayName: values.displayName,
                email: values.email, updatedAt: new Date().toISOString() }).validate();
            assertUniqueEmail(member.email, id);
            const response = await businessApi.updateMember(BusinessMemberAssembler.toResourceFromEntity(member));
            replaceMember(response.data);
        }, 'business.messages.updated');
    }

    /** Activates or deactivates an employee membership. @param {string} id - Member id. @returns {Promise<boolean>} True when updated. */
    function toggleMembership(id) {
        return runCommand(async () => {
            const current = getMember(id);
            if (!current.occupiesSeat) {
                await refreshLimits();
                assertAvailableSeat();
            }
            const member = new BusinessMember({ ...current, status: current.occupiesSeat ? 'inactive' : 'active',
                updatedAt: new Date().toISOString() }).validate();
            const response = await businessApi.updateMember(BusinessMemberAssembler.toResourceFromEntity(member));
            replaceMember(response.data);
        }, 'business.messages.membershipUpdated');
    }

    /** Deletes an employee member. @param {string} id - Member id. @returns {Promise<boolean>} True when deleted. */
    function deleteMember(id) {
        return runCommand(async () => {
            getMember(id);
            await businessApi.deleteMember(id);
            members.value = members.value.filter(member => String(member.id) !== String(id));
        }, 'business.messages.deleted');
    }

    /** Deletes a cancelled invitation. @param {string} id - Invitation id. @returns {Promise<boolean>} True when deleted. */
    function deleteInvitation(id) {
        return runCommand(async () => {
            const invitation = invitations.value.find(item => String(item.id) === String(id));
            if (!invitation) throw new Error('business.errors.notFound');
            if (invitation.status !== StaffInvitationStatus.CANCELLED) throw new Error('business.errors.cancelBeforeDelete');
            await businessApi.deleteInvitation(id);
            invitations.value = invitations.value.filter(item => String(item.id) !== String(id));
        }, 'business.messages.deleted');
    }

    return { members, employees, invitations, planLimits, occupiedSeats, reservedSeats, availableSeats,
        isLoading, isSaving, errorMessage, noticeMessage, clearMessages, loadPersonnel,
        createInvitation, updateInvitation, cancelInvitation, resendInvitation,
        updateMember, toggleMembership, deleteMember, deleteInvitation };
});

export default useBusinessStore;
