<script>
    import { onMount, onDestroy } from 'svelte';
    import { supabase, getCurrentUser } from '../lib/supabase';
    import { timerState, showNotification, showError } from '../lib/stores';

    let timer;
    let state = {
        minutes: 25,
        seconds: 0,
        isActive: false,
        isWork: true,
        cycles: 0,
        workTime: 25,
        shortBreak: 5,
        longBreak: 15,
        autoStart: true
    };

    let currentWorkTitle = '';

    $: timerState.set(state);

    function startTimer() {
        if (state.isActive) return;

        if (state.isWork && !currentWorkTitle.trim()) {
            currentWorkTitle = 'Pomodoro Work Session';
        }

        state.isActive = true;
        state = { ...state };
        timer = setInterval(updateTimer, 1000);
    }

    function stopTimer() {
        state.isActive = false;
        state = { ...state };
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    }

    function resetTimer() {
        stopTimer();
        state.isWork = true;
        state.minutes = state.workTime;
        state.seconds = 0;
        state.cycles = 0;
        currentWorkTitle = '';
        state = { ...state };
    }

    function updateTimer() {
        if (state.seconds === 0) {
            if (state.minutes === 0) {
                // Timer completed
                handleTimerComplete();
                return;
            } else {
                state.minutes--;
                state.seconds = 59;
            }
        } else {
            state.seconds--;
        }
        state = { ...state };
    }

    async function handleTimerComplete() {
        stopTimer(); // Stop the timer first

        if (state.isWork) {
            // Work session completed
            try {
                await createWorklog();
            } catch (err) {
                console.error('Error creating worklog:', err);
                showError('Failed to save work session');
            }

            state.cycles++;
            state.isWork = false;

            // Determine break type
            const isLongBreak = state.cycles % 4 === 0;
            state.minutes = isLongBreak ? state.longBreak : state.shortBreak;
            state.seconds = 0;

            showNotification(`Work session complete! Time for a ${isLongBreak ? 'long' : 'short'} break.`);

            if (state.autoStart) {
                // Auto-start break
                startTimer();
            }
        } else {
            // Break completed
            state.isWork = true;
            state.minutes = state.workTime;
            state.seconds = 0;

            showNotification('☕ Break time over! Ready for another work session?');

            if (state.autoStart) {
                // Don't auto-start work session, let user set title
                currentWorkTitle = ''; // Reset title for new work session
            }
        }

        state = { ...state };
    }

    async function createWorklog() {
        const user = await getCurrentUser();
        if (!user) return;

        const now = new Date();
        const start = new Date(now);
        start.setMinutes(start.getMinutes() - state.workTime);

        const workTitle = currentWorkTitle.trim() || 'Pomodoro Work Session';

        const { error } = await supabase.from('worklogs').insert({
            user_id: user.id,
            title: workTitle,
            description: `Completed ${state.workTime} minute focused work session`,
            start_time: start.toISOString(),
            end_time: now.toISOString(),
            duration: state.workTime * 60,
            date: now.toISOString().split('T')[0]
        });

        if (error) throw error;
    }

    function updateSettings() {
        stopTimer(); // Always stop timer when changing settings

        // Update current timer values based on session type
        if (state.isWork) {
            state.minutes = state.workTime;
        } else {
            const isLongBreak = state.cycles % 4 === 0;
            state.minutes = isLongBreak ? state.longBreak : state.shortBreak;
        }

        state.seconds = 0;
        state = { ...state };
    }

    function formatTime(minutes, seconds) {
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    onMount(() => {
        // Load settings from localStorage if available
        const savedSettings = localStorage.getItem('pomoson-settings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                state.workTime = settings.workTime || 25;
                state.shortBreak = settings.shortBreak || 5;
                state.longBreak = settings.longBreak || 15;
                state.autoStart = settings.autoStart !== undefined ? settings.autoStart : true;
                state.minutes = state.workTime;
                state = { ...state };
            } catch (err) {
                console.error('Error loading settings:', err);
            }
        }
    });

    onDestroy(() => {
        stopTimer(); // Use stopTimer instead of direct clearInterval

        // Save settings
        try {
            localStorage.setItem('pomoson-settings', JSON.stringify({
                workTime: state.workTime,
                shortBreak: state.shortBreak,
                longBreak: state.longBreak,
                autoStart: state.autoStart
            }));
        } catch (err) {
            console.error('Error saving settings:', err);
        }
    });
</script>

<div class="pomodoro-container">
    <div class="timer-section">
        <div class="timer-display">
            {formatTime(state.minutes, state.seconds)}
            <div class="timer-status">
                {#if state.isWork}
                    <span class="status-badge work">Focus Time ☕</span>
                {:else}
                    <span class="status-badge break">
                        {state.cycles % 4 === 0 ? 'Long Break 🌿' : 'Short Break 🍃'}
                    </span>
                {/if}
            </div>
        </div>

        {#if state.isWork}
            <div class="work-title-section">
                <label class="title-label">What are you working on?</label>
                <input
                        type="text"
                        bind:value={currentWorkTitle}
                        placeholder="e.g., Writing,Coding,Studying..."
                        class="work-title-input"
                        maxlength="100"
                        disabled={state.isActive}
                />
            </div>
        {/if}

        <div class="timer-controls">
            <button on:click={startTimer} disabled={state.isActive} class="control-btn">
                ► Start
            </button>
            <button on:click={stopTimer} disabled={!state.isActive} class="control-btn">
                ◼ Pause
            </button>
            <button on:click={resetTimer} class="control-btn">
                ↻ Reset
            </button>
        </div>

        <div class="cycles-counter">
            <div class="coffee-beans">
                {#each { length: Math.min(state.cycles, 10) } as _, i}
                    <span class="bean">🍪</span>
                {/each}
                {#if state.cycles > 10}
                    <span class="bean-count">+{state.cycles - 10}</span>
                {/if}
            </div>
            <p>Completed cycles: {state.cycles}</p>
        </div>
    </div>

    <div class="settings-section">
        <h3>⚙ Timer Settings</h3>

        <div class="setting-group">
            <label class="setting-label">
                <span>☕ Work Duration (min)</span>
                <input
                        type="number"
                        bind:value={state.workTime}
                        min="1"
                        max="60"
                        class="setting-input"
                        on:input={updateSettings}
                        disabled={state.isActive}
                >
            </label>
        </div>

        <div class="setting-group">
            <label class="setting-label">
                <span>🍃 Short Break (min)</span>
                <input
                        type="number"
                        bind:value={state.shortBreak}
                        min="1"
                        max="30"
                        class="setting-input"
                        on:input={updateSettings}
                        disabled={state.isActive}
                >
            </label>
        </div>

        <div class="setting-group">
            <label class="setting-label">
                <span>🌿 Long Break (min)</span>
                <input
                        type="number"
                        bind:value={state.longBreak}
                        min="1"
                        max="60"
                        class="setting-input"
                        on:input={updateSettings}
                        disabled={state.isActive}
                >
            </label>
        </div>

        <div class="setting-group">
            <label class="setting-label">
                <span>Auto-start breaks</span>
                <label class="switch">
                    <input
                            type="checkbox"
                            bind:checked={state.autoStart}
                            class="switch-input"
                            disabled={state.isActive}
                    >
                    <span class="slider"></span>
                </label>
            </label>
        </div>

    </div>
</div>

<style>
    .pomodoro-container {
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
        max-width: 900px;
        margin: 0 auto;
        padding: 8px;
    }

    .timer-section {
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(20px) saturate(1.8);
        -webkit-backdrop-filter: blur(20px) saturate(1.8);
        border-radius: 16px;
        padding: 16px;
        text-align: center;
        border: 1px solid var(--glass-border);
        box-shadow: var(--glass-shadow);
        position: relative;
        overflow: hidden;
    }

    .timer-display {
        font-size: 3.5rem;
        font-weight: 300;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
        color: var(--text-primary);
        margin: 4px 0;
        position: relative;
        letter-spacing: -0.02em;
        line-height: 1;
    }

    .timer-status {
        margin: 6px 0;
    }

    .status-badge {
        padding: 8px 16px;
        border-radius: 16px;
        font-weight: 500;
        font-size: 13px;
        display: inline-block;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .status-badge.work {
        background: rgba(0, 212, 255, 0.15);
        color: var(--neon-blue);
        border: 1px solid rgba(0, 212, 255, 0.3);
    }

    .status-badge.break {
        background: rgba(139, 92, 246, 0.15);
        color: var(--neon-purple);
        border: 1px solid rgba(139, 92, 246, 0.3);
    }

    .work-title-section {
        margin: 8px 35px;
        text-align: left;
    }

    .title-label {
        display: block;
        color: var(--text-primary);
        font-size: 13px;
        font-weight: 500;
        margin-bottom: 6px;
    }

    .work-title-input {
        width: 100%;
        padding: 10px 14px;
        border: 1px solid var(--glass-border);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.08);
        color: var(--text-primary);
        font-size: 15px;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .work-title-input:focus {
        outline: none;
        border-color: var(--neon-blue);
        box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.2);
    }

    .work-title-input::placeholder {
        color: var(--text-secondary);
    }

    .work-title-input:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }

    .timer-controls {
        display: flex;
        gap: 12px;
        justify-content: center;
        margin: 12px 0;
        flex-wrap: wrap;
    }

    .control-btn {
        padding: 12px 20px;
        border: 1px solid var(--glass-border);
        border-radius: 14px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        background: rgba(255, 255, 255, 0.08);
        color: var(--text-primary);
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        position: relative;
        overflow: hidden;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .control-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.12);
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        border-color: rgba(255, 255, 255, 0.25);
    }

    .control-btn:disabled {
        border-color: rgba(255, 255, 255, 0.05);
        color: var(--text-secondary);
        cursor: not-allowed;
        opacity: 0.5;
    }

    .cycles-counter {
        color: var(--text-secondary);
        font-size: 13px;
        font-weight: 400;
        margin-top: 8px;
    }

    .coffee-beans {
        margin: 6px 0;
    }

    .bean {
        margin: 0 2px;
    }

    .bean-count {
        margin-left: 4px;
    }

    .settings-section {
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(20px) saturate(1.8);
        -webkit-backdrop-filter: blur(20px) saturate(1.8);
        border-radius: 16px;
        padding: 20px;
        border: 1px solid var(--glass-border);
        box-shadow: var(--glass-shadow);
    }

    h3 {
        color: var(--text-primary);
        margin-top: 0;
        margin-bottom: 12px;
        font-size: 18px;
        text-align: center;
        font-weight: 600;
        letter-spacing: -0.01em;
    }

    .setting-group {
        margin-bottom: 16px;
    }

    .setting-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: var(--text-primary);
        margin-bottom: 8px;
        font-size: 13px;
        font-weight: 500;
    }

    .setting-input {
        width: 70px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid var(--glass-border);
        color: var(--text-primary);
        border-radius: 10px;
        text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .setting-input:focus {
        outline: none;
        border-color: var(--neon-blue);
        box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.2);
    }

    .setting-input:disabled {
        opacity: 0.5;
    }

    .setting-group .switch {
        position: relative;
        display: inline-block;
        width: 70px;
        height: 26px;
    }

    .setting-group .switch-input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .setting-group .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid var(--glass-border);
        border-radius: 16px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .setting-group .slider:before {
        position: absolute;
        content: "";
        height: 22px;
        width: 22px;
        left: 2px;
        bottom: 2px;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 50%;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .setting-group .switch-input:checked + .slider {
        background: rgba(0, 212, 255, 0.3);
        border-color: var(--neon-blue);
    }

    .setting-group .switch-input:checked + .slider:before {
        transform: translateX(22px);
        background: var(--neon-blue);
    }

    .setting-group .switch-input:disabled + .slider {
        opacity: 0.5;
        cursor: not-allowed;
    }


    .setting-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: var(--text-primary);
        margin-bottom: 8px;
        font-size: 13px;
        font-weight: 500;
        width: 100%;
    }

    @media (max-width: 400px) {
        .pomodoro-container {
            gap: 12px;
            padding: 6px;
        }

        .timer-display {
            font-size: 2.5rem;
        }

        .timer-section, .settings-section {
            padding: 12px;
            border-radius: 12px;
        }

        .status-badge {
            padding: 6px 12px;
            font-size: 12px;
        }

        .timer-controls {
            gap: 8px;
            margin: 8px 0;
        }

        .control-btn {
            padding: 10px 16px;
            font-size: 13px;
            border-radius: 12px;
        }

        .setting-group {
            margin-bottom: 12px;
        }

        .setting-label {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
        }

        .setting-input {
            width: 100%;
            padding: 6px 10px;
        }

        .slider {
            width: 44px;
            height: 24px;
        }

        .slider:before {
            width: 20px;
            height: 20px;
        }

        .switch-input:checked + .slider:before {
            transform: translateX(20px);
        }
    }
</style>