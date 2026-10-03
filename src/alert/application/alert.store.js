import { defineStore } from 'pinia';
import { computed, onScopeDispose, ref } from 'vue';

const panicCountdownSeconds = 5;

export default defineStore('alert', () => {
    const panicStage = ref('idle');
    const remainingSeconds = ref(panicCountdownSeconds);
    const incidentType = ref(null);
    const incidentDescription = ref('');
    const reportFeedback = ref(null);
    const preventiveActivity = ref(null);
    const preventiveLocation = ref('');
    const preventiveMoment = ref(null);
    const preventiveDescription = ref('');
    const preventiveFeedback = ref(null);
    const countdownProgress = computed(() => remainingSeconds.value / panicCountdownSeconds);
    let countdownTimer;

    const stopTimer = () => {
        clearInterval(countdownTimer);
        countdownTimer = undefined;
    };

    const startPanicCountdown = () => {
        if (panicStage.value !== 'idle') return;
        remainingSeconds.value = panicCountdownSeconds;
        panicStage.value = 'counting';
        const deadline = Date.now() + panicCountdownSeconds * 1000;
        countdownTimer = setInterval(() => {
            remainingSeconds.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            if (remainingSeconds.value === 0) {
                stopTimer();
                // Countdown completion is not evidence of a persisted or delivered alert.
                panicStage.value = 'completed';
            }
        }, 100);
    };

    const cancelPanicCountdown = () => {
        stopTimer();
        panicStage.value = 'idle';
        remainingSeconds.value = panicCountdownSeconds;
        incidentType.value = null;
        incidentDescription.value = '';
        reportFeedback.value = null;
        preventiveActivity.value = null;
        preventiveLocation.value = '';
        preventiveMoment.value = null;
        preventiveDescription.value = '';
        preventiveFeedback.value = null;
    };

    const finishPanicPreview = () => {
        if (panicStage.value !== 'completed') return;
        panicStage.value = 'reporting';
    };

    const completeReportPreview = () => {
        if (panicStage.value !== 'reporting') return;
        reportFeedback.value = incidentType.value && incidentDescription.value.trim()
            ? 'ready'
            : 'required';
    };

    const deferReportPreview = () => {
        if (panicStage.value === 'reporting') reportFeedback.value = 'deferred';
    };
    const openPreventivePreview = () => {
        if (panicStage.value === 'idle') panicStage.value = 'preventive';
    };
    const openCommunityPreview = () => {
        if (panicStage.value === 'idle') panicStage.value = 'community';
    };
    const openHistoryPreview = () => {
        if (panicStage.value === 'idle') panicStage.value = 'history';
    };
    const completePreventivePreview = () => {
        if (!['preventive', 'community'].includes(panicStage.value)) return;
        preventiveFeedback.value = preventiveActivity.value && preventiveLocation.value.trim()
            && preventiveMoment.value && preventiveDescription.value.trim() ? 'ready' : 'required';
    };

    onScopeDispose(stopTimer);

    return {
        panicStage, remainingSeconds, countdownProgress, incidentType, incidentDescription, reportFeedback,
        startPanicCountdown, cancelPanicCountdown, finishPanicPreview, completeReportPreview, deferReportPreview,
        preventiveActivity, preventiveLocation, preventiveMoment, preventiveDescription, preventiveFeedback,
        openPreventivePreview, openCommunityPreview, openHistoryPreview, completePreventivePreview,
    };
});
