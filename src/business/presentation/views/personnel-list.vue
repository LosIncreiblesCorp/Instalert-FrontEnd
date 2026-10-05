<script setup>
/** Personnel list view with employees and invitations management. */
import { computed, nextTick, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useConfirm } from 'primevue/useconfirm';
import useBusinessStore from '../../application/business.store.js';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const confirm = useConfirm();
const store = useBusinessStore();
const activeTab = ref(route.query.tab === 'invitations' ? 'invitations' : 'employees');
const search = ref('');
const editor = ref(null);
const editorName = ref(null);
const tabs = computed(() => [
    { label: t('business.personnel.employees'), value: 'employees' },
    { label: t('business.personnel.invitations'), value: 'invitations' },
]);
/** Checks whether a record matches the current search text. @param {Object} record - Member or invitation record. @returns {boolean} True when the record matches. */
const matching = record => (record.displayName + ' ' + record.email).toLowerCase().includes(search.value.trim().toLowerCase());
const visibleEmployees = computed(() => store.employees.filter(matching));
const visibleInvitations = computed(() => store.invitations.filter(matching));
const busy = computed(() => store.isLoading || store.isSaving);
const overCapacity = computed(() => store.planLimits
    && store.occupiedSeats + store.reservedSeats > store.planLimits.maxEmployees);

onMounted(() => store.loadPersonnel());

/** Opens the inline editor for a member or invitation record. @param {Object} record - Record to edit. @param {string} kind - Record kind. @returns {Promise<void>} */
async function editRecord(record, kind) {
    store.clearMessages();
    editor.value = { id: record.id, kind, displayName: record.displayName, email: record.email };
    await nextTick();
    editorName.value?.$el?.focus();
}

/** Persists the current inline edition through the store. @returns {Promise<void>} */
async function saveEdition() {
    const draft = editor.value;
    if (!draft) return;
    const success = draft.kind === 'member'
        ? await store.updateMember(draft.id, draft)
        : await store.updateInvitation(draft.id, draft);
    if (success) editor.value = null;
}

/** Asks for confirmation before running a personnel command. @param {Object} record - Target record. @param {string} action - Confirmation message key. @param {Function} command - Store command to run. @param {string} kind - Record kind. @returns {void} */
function requestConfirmation(record, action, command, kind) {
    confirm.require({
        header: t('business.actions.confirmTitle'),
        message: t('business.confirmations.' + action, { name: record.displayName }),
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: t('business.actions.confirm'),
        rejectLabel: t('business.actions.cancel'),
        accept: async () => {
            const success = await command(record.id);
            if (success && editor.value?.kind === kind && String(editor.value?.id) === String(record.id)) editor.value = null;
        },
    });
}
</script>

<template>
    <section class="personnel-page" aria-labelledby="personnel-title" :aria-busy="busy">
        <header class="page-heading">
            <div>
                <p class="eyebrow">{{ t('business.personnel.eyebrow') }}</p>
                <h1 id="personnel-title">{{ t('business.personnel.title') }}</h1>
                <p class="subtitle">{{ t('business.personnel.description') }}</p>
            </div>
            <pv-button icon="pi pi-user-plus" :label="t('business.invitation.title')" :disabled="busy"
                @click="router.push({ name: 'business-invitation-new' })" />
        </header>

        <p v-if="store.errorMessage" class="feedback error" role="alert">{{ t(store.errorMessage) }}</p>
        <p v-if="store.noticeMessage" class="feedback success" role="status">{{ t(store.noticeMessage) }}</p>

        <div class="quota-grid" :aria-label="t('business.personnel.quota')">
            <div class="quota-card"><span>{{ t('business.personnel.planLimit') }}</span>
                <strong>{{ store.planLimits?.maxEmployees ?? '—' }}</strong>
                <small>{{ store.planLimits?.planName ?? t('business.personnel.limitsUnavailable') }}</small></div>
            <div class="quota-card"><span>{{ t('business.personnel.occupied') }}</span><strong>{{ store.occupiedSeats }}</strong>
                <small>{{ t('business.personnel.activeEmployees') }}</small></div>
            <div class="quota-card"><span>{{ t('business.personnel.reserved') }}</span><strong>{{ store.reservedSeats }}</strong>
                <small>{{ t('business.personnel.pendingInvitations') }}</small></div>
            <div class="quota-card quota-card--available"><span>{{ t('business.personnel.available') }}</span>
                <strong>{{ store.availableSeats ?? '—' }}</strong><small>{{ t('business.personnel.adminExcluded') }}</small></div>
        </div>
        <p v-if="overCapacity" class="feedback error" role="alert">{{ t('business.errors.overCapacity') }}</p>

        <form v-if="editor" class="editor surface" novalidate @submit.prevent="saveEdition">
            <h2>{{ t('business.actions.edit') }} — {{ editor.displayName }}</h2>
            <div class="editor-fields">
                <div><label for="edit-name">{{ t('business.personnel.name') }}</label>
                    <pv-input-text id="edit-name" ref="editorName" v-model="editor.displayName" maxlength="100" required :disabled="busy" /></div>
                <div><label for="edit-email">{{ t('business.invitation.email') }}</label>
                    <pv-input-text id="edit-email" v-model="editor.email" type="email" maxlength="254" required :disabled="busy" /></div>
            </div>
            <div class="editor-actions">
                <pv-button type="submit" :label="t('business.actions.save')" :loading="store.isSaving" :disabled="busy" />
                <pv-button type="button" outlined :label="t('business.actions.cancel')" :disabled="busy" @click="editor = null" />
            </div>
        </form>

        <div class="surface records-surface">
            <div class="table-toolbar">
                <pv-select-button v-model="activeTab" :options="tabs" option-label="label" option-value="value"
                    :allow-empty="false" :aria-label="t('business.personnel.recordType')" />
                <div class="table-tools">
                    <pv-input-text v-model="search" :placeholder="t('business.personnel.search')" :aria-label="t('business.personnel.search')" />
                    <pv-button icon="pi pi-refresh" outlined :aria-label="t('business.actions.refresh')" :disabled="busy"
                        @click="store.loadPersonnel()" />
                </div>
            </div>

            <pv-data-table v-if="activeTab === 'employees'" :value="visibleEmployees" :loading="store.isLoading"
                data-key="id" :aria-label="t('business.personnel.employees')">
                <pv-column field="displayName" :header="t('business.personnel.name')" />
                <pv-column field="email" :header="t('business.invitation.email')" />
                <pv-column :header="t('business.personnel.status')">
                    <template #body="{ data }"><span class="status-badge" :class="'status-badge--' + data.status">{{ t('business.statuses.' + data.status) }}</span></template>
                </pv-column>
                <pv-column :header="t('business.personnel.actions')">
                    <template #body="{ data }"><div class="row-actions">
                        <pv-button text size="small" :label="t('business.actions.edit')" :disabled="busy" @click="editRecord(data, 'member')" />
                        <pv-button text size="small" :label="t(data.occupiesSeat ? 'business.actions.deactivate' : 'business.actions.activate')" :disabled="busy"
                            @click="requestConfirmation(data, data.occupiesSeat ? 'deactivate' : 'activate', store.toggleMembership, 'member')" />
                        <pv-button text size="small" severity="danger" :label="t('business.actions.delete')" :disabled="busy"
                            @click="requestConfirmation(data, 'deleteMember', store.deleteMember, 'member')" />
                    </div></template>
                </pv-column>
                <template #empty><div class="empty-state"><i class="pi pi-users" aria-hidden="true" />
                    <h2>{{ t('business.personnel.emptyEmployees') }}</h2><p>{{ t('business.personnel.emptyHelp') }}</p></div></template>
            </pv-data-table>

            <pv-data-table v-else :value="visibleInvitations" :loading="store.isLoading" data-key="id"
                :aria-label="t('business.personnel.invitations')">
                <pv-column field="displayName" :header="t('business.personnel.name')" />
                <pv-column field="email" :header="t('business.invitation.email')" />
                <pv-column :header="t('business.personnel.status')">
                    <template #body="{ data }"><span class="status-badge" :class="'status-badge--' + data.status">{{ t('business.statuses.' + data.status) }}</span></template>
                </pv-column>
                <pv-column :header="t('business.personnel.actions')">
                    <template #body="{ data }"><div class="row-actions">
                        <template v-if="data.reservesSeat">
                            <pv-button text size="small" :label="t('business.actions.edit')" :disabled="busy" @click="editRecord(data, 'invitation')" />
                            <pv-button text size="small" :label="t('business.actions.resend')" :disabled="busy" @click="store.resendInvitation(data.id)" />
                            <pv-button text size="small" severity="danger" :label="t('business.actions.cancelInvitation')" :disabled="busy"
                                @click="requestConfirmation(data, 'cancelInvitation', store.cancelInvitation, 'invitation')" />
                        </template>
                        <pv-button v-else-if="data.status === 'cancelled'" text size="small" severity="danger" :label="t('business.actions.delete')"
                            :disabled="busy" @click="requestConfirmation(data, 'deleteInvitation', store.deleteInvitation, 'invitation')" />
                    </div></template>
                </pv-column>
                <template #empty><div class="empty-state"><i class="pi pi-envelope" aria-hidden="true" />
                    <h2>{{ t('business.personnel.emptyInvitations') }}</h2><p>{{ t('business.personnel.emptyHelp') }}</p></div></template>
            </pv-data-table>
        </div>
    </section>
</template>

<style scoped>
.personnel-page { padding: clamp(20px, 3vw, 40px); max-width: 1440px; margin: auto; }
.page-heading { display: flex; justify-content: space-between; align-items: center; gap: 24px; margin-bottom: 22px; }
.eyebrow { color: var(--blue); font-size: 11px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; margin: 0 0 8px; }
h1 { margin: 0; color: var(--ink); font-size: clamp(26px, 3vw, 32px); letter-spacing: -.035em; }
.subtitle { margin: 10px 0 0; color: var(--muted); line-height: 1.6; }
.feedback { padding: 14px 18px; border-radius: 10px; font-size: 14px; line-height: 1.5; }
.error { color: #991b1b; background: #fff1f2; border: 1px solid #fecdd3; }
.success { color: #166534; background: #f0fdf4; border: 1px solid #bbf7d0; }
.quota-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin: 24px 0; }
.quota-card { display: flex; flex-direction: column; gap: 8px; padding: 20px; border: 1px solid var(--line); border-radius: 12px; background: white; }
.quota-card > span { color: var(--muted); font-size: 13px; font-weight: 600; }
.quota-card strong { color: var(--ink); font-size: 30px; line-height: 1.2; }
.quota-card small { color: var(--muted); font-size: 12px; line-height: 1.4; }
.quota-card--available { background: #eff6ff; border-color: #bfdbfe; }
.quota-card--available strong { color: #1d4ed8; }
.surface { border: 1px solid var(--line); border-radius: 12px; background: white; }
.records-surface { overflow: hidden; }
.table-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 20px; flex-wrap: wrap; border-bottom: 1px solid var(--line); }
.table-tools, .row-actions, .editor-actions { display: flex; align-items: center; gap: 8px; }
.row-actions { flex-wrap: wrap; min-width: 220px; }
.records-surface :deep(.p-datatable-header-cell) { background: #f8fafc; color: var(--muted); font-size: 13px; }
.records-surface :deep(.p-datatable-table-container) { overflow-x: auto; }
.status-badge { display: inline-block; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; color: #475569; background: #f1f5f9; }
.status-badge--active, .status-badge--accepted { color: #166534; background: #dcfce7; }
.status-badge--pending { color: #92400e; background: #fef3c7; }
.empty-state { text-align: center; padding: 36px 16px; color: var(--muted); }
.empty-state > i { font-size: 26px; color: var(--blue); }
.empty-state h2 { font-size: 17px; color: var(--ink); }
.empty-state p { font-size: 14px; }
.editor { padding: 24px; margin-bottom: 24px; }
.editor h2 { margin: 0 0 20px; font-size: 18px; color: var(--ink); }
.editor-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 20px; }
.editor-fields > div { display: flex; flex-direction: column; gap: 8px; }
label { color: var(--ink); font-weight: 600; font-size: 14px; }
@media (max-width: 900px) { .quota-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) {
    .page-heading { align-items: flex-start; flex-direction: column; }
    .table-tools { width: 100%; }
    .table-tools > input { width: 100%; min-width: 0; }
    .editor-fields { grid-template-columns: 1fr; }
    .quota-card { padding: 16px; }
}
</style>
