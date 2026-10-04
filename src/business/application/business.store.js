import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { BusinessMember } from '../domain/model/business-member.entity.js';
import { StaffInvitation, StaffInvitationStatus } from '../domain/model/staff-invitation.entity.js';
import { BusinessApi } from '../infrastructure/business-api.js';
import { BusinessMemberAssembler } from '../infrastructure/business-member.assembler.js';
import { StaffInvitationAssembler } from '../infrastructure/staff-invitation.assembler.js';

const businessApi = new BusinessApi();
const demoBusinessId = 'bus-1'; // Existing fictitious business. Demo scope, not an authorization boundary.

const useBusinessStore = defineStore('business', () => {
    const members = ref([]);
    const invitations = ref([]);
    const planLimits = ref(null);
    const isLoading = ref(false);
    const isSaving = ref(false);
    const errorMessage = ref(null);
    const noticeMessage = ref(null);
    const employees = computed(() => members.value.filter(member => member.isEmployee));
    const occupiedSeats = computed(() => members.value.filter(member => member.occupiesSeat).length);
    const reservedSeats = computed(() => invitations.value.filter(invitation => invitation.reservesSeat).length);
    const availableSeats = computed(() => planLimits.value == null ? null
        : Math.max(0, planLimits.value.maxEmployees - occupiedSeats.value - reservedSeats.value));

    function clearMessages() { errorMessage.value = null; noticeMessage.value = null; }

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

    async function refreshLimits() {
        planLimits.value = null;
        planLimits.value = await businessApi.getPlanLimits(demoBusinessId);
    }

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

    function assertAvailableSeat() {
        if (availableSeats.value == null) throw new Error('business.errors.limitsUnavailable');
        if (!planLimits.value.subscriptionActive) throw new Error('business.errors.subscriptionInactive');
        if (availableSeats.value <= 0) throw new Error('business.errors.noSeats');
    }

    function assertUniqueEmail(email, memberId = null, invitationId = null) {
        const memberExists = members.value.some(member => member.email === email
            && String(member.id) !== String(memberId));
        const invitationExists = invitations.value.some(invitation => invitation.reservesSeat
            && invitation.email === email && String(invitation.id) !== String(invitationId));
        if (memberExists || invitationExists) throw new Error('business.errors.duplicateEmail');
    }

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

    function getMember(id) {
        const member = members.value.find(item => String(item.id) === String(id));
        if (!member) throw new Error('business.errors.notFound');
        if (!member.isEmployee) throw new Error('business.errors.administratorProtected');
        return member;
    }

    function getPendingInvitation(id) {
        const invitation = invitations.value.find(item => String(item.id) === String(id));
        if (!invitation) throw new Error('business.errors.notFound');
        if (!invitation.reservesSeat) throw new Error('business.errors.invitationNotPending');
        return invitation;
    }

    function replaceMember(resource) {
        const member = BusinessMemberAssembler.toEntityFromResource(resource);
        members.value = members.value.map(item => String(item.id) === String(member.id) ? member : item);
    }

    function replaceInvitation(resource) {
        const invitation = StaffInvitationAssembler.toEntityFromResource(resource);
        const index = invitations.value.findIndex(item => String(item.id) === String(invitation.id));
        if (index === -1) invitations.value.unshift(invitation);
        else invitations.value[index] = invitation;
    }

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

    function updateInvitation(id, values) {
        return runCommand(async () => {
            const invitation = new StaffInvitation({ ...getPendingInvitation(id),
                displayName: values.displayName, email: values.email, updatedAt: new Date().toISOString() }).validate();
            assertUniqueEmail(invitation.email, null, id);
            const response = await businessApi.updateInvitation(StaffInvitationAssembler.toResourceFromEntity(invitation));
            replaceInvitation(response.data);
        }, 'business.messages.updated');
    }

    function cancelInvitation(id) {
        return runCommand(async () => {
            const invitation = new StaffInvitation({ ...getPendingInvitation(id),
                status: StaffInvitationStatus.CANCELLED, updatedAt: new Date().toISOString() });
            const response = await businessApi.updateInvitation(StaffInvitationAssembler.toResourceFromEntity(invitation));
            replaceInvitation(response.data);
        }, 'business.messages.invitationCancelled');
    }

    function resendInvitation(id) {
        return runCommand(async () => {
            const now = new Date().toISOString();
            const invitation = new StaffInvitation({ ...getPendingInvitation(id), lastResentAt: now, updatedAt: now });
            const response = await businessApi.updateInvitation(StaffInvitationAssembler.toResourceFromEntity(invitation));
            replaceInvitation(response.data);
        }, 'business.messages.resendRecorded');
    }

    function updateMember(id, values) {
        return runCommand(async () => {
            const member = new BusinessMember({ ...getMember(id), displayName: values.displayName,
                email: values.email, updatedAt: new Date().toISOString() }).validate();
            assertUniqueEmail(member.email, id);
            const response = await businessApi.updateMember(BusinessMemberAssembler.toResourceFromEntity(member));
            replaceMember(response.data);
        }, 'business.messages.updated');
    }

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

    function deleteMember(id) {
        return runCommand(async () => {
            getMember(id);
            await businessApi.deleteMember(id);
            members.value = members.value.filter(member => String(member.id) !== String(id));
        }, 'business.messages.deleted');
    }

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
