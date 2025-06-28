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
        autoStart: false
    };

    $: timerState.set(state);

    function startTimer() {
        if (state.isActive) return;
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
        state = { ...state };
    }

    function updateTimer() {
        if (state.seconds === 0) {
            if (state.minutes === 0) {
                // Timer completed
                handleTimerComplete();
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
        if (state.isWork) {
            // Work session completed
            await createWorklog();
            state.isWork = false;
            state.cycles++;

            // Determine break type
            const isLongBreak = state.cycles % 4 === 0;
            state.minutes = isLongBreak ? state.longBreak : state.shortBreak;
            state.seconds = 0;

            showNotification(`🎉 Work session complete! Time for a ${isLongBreak ? 'long' : 'short'} break.`);

            if (state.autoStart) {
                // Continue with break
                state = { ...state };
            } else {
                stopTimer();
            }
        } else {
            // Break completed
            state.isWork = true;
            state.minutes = state.workTime;
            state.seconds = 0;

            showNotification('☕ Break time over! Ready for another work session?');

            if (state.autoStart) {
                // Continue with work
                state = { ...state };
            } else {
                stopTimer();
            }
        }
    }

    async function createWorklog() {
        try {
            const user = await getCurrentUser();
            if (!user) return;

            const now = new Date();
            const start = new Date(now);
            start.setMinutes(start.getMinutes() - state.workTime);

            const { error } = await supabase.from('worklogs').insert({
                user_id: user.id,
                title: 'Pomodoro Work Session',
                description: `Completed ${state.workTime} minute focused work session`,
                start_time: start.toISOString(),
                end_time: now.toISOString(),
                duration: state.workTime * 60,
                date: now.toISOString().split('T')[0]
            });

            if (error) throw error;
        } catch (err) {
            console.error('Error creating worklog:', err);
            showError('Failed to save work session');
        }
    }

    function updateSettings() {
        if (!state.isActive) {
            resetTimer();
        }
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
                state.autoStart = settings.autoStart || false;
                state.minutes = state.workTime;
                state = { ...state };
            } catch (err) {
                console.error('Error loading settings:', err);
            }
        }
    });

    onDestroy(() => {
        if (timer) {
            clearInterval(timer);
        }

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

        <div class="timer-controls">
            <button on:click={startTimer} disabled={state.isActive} class="control-btn">
                ▶️ Start Brewing
            </button>
            <button on:click={stopTimer} disabled={!state.isActive} class="control-btn">
                ⏸️ Pause
            </button>
            <button on:click={resetTimer} class="control-btn">
                🔄 Fresh Cup
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
        <h3>⚙️ Brew Settings</h3>

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
                        disabled={state.isActive}
                >
            </label>
        </div>

        <label class="setting-switch">
            <input
                    type="checkbox"
                    bind:checked={state.autoStart}
                    class="switch-input"
                    disabled={state.isActive}
            >
            <span class="slider"></span>
            <span class="switch-label">Auto-brew next session</span>
        </label>
    </div>
</div>

<style>
    .pomodoro-container {
        display: grid;
        grid-template-columns: 1fr;
        gap: 30px;
        max-width: 900px;
        margin: 0 auto;
    }

    .timer-section {
        background: rgba(26, 15, 10, 0.6);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        padding: 30px;
        text-align: center;
        border: 1px solid rgba(139, 69, 19, 0.3);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    .timer-display {
        font-size: 5rem;
        font-weight: bold;
        font-family: 'Courier New', monospace;
        color: var(--coffee-cream);
        margin: 20px 0;
        position: relative;
    }

    .timer-status {
        margin: 20px 0;
    }

    .status-badge {
        padding: 8px 16px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 1.1rem;
    }

    .status-badge.work {
        background: rgba(210, 180, 140, 0.2);
        color: var(--coffee-cream);
        border: 1px solid var(--coffee-cream);
    }

    .status-badge.break {
        background: rgba(139, 69, 19, 0.3);
        color: var(--coffee-accent);
        border: 1px solid var(--coffee-accent);
    }

    .timer-controls {
        display: flex;
        gap: 15px;
        justify-content: center;
        margin: 30px 0;
        flex-wrap: wrap;
    }

    .control-btn {
        padding: 12px 24px;
        border: none;
        border-radius: 10px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        background: linear-gradient(135deg, rgba(139, 69, 19, 0.8) 0%, rgba(160, 82, 45, 0.8) 100%);
        color: white;
    }

    .control-btn:hover:not(:disabled) {
        transform: translateY(-3px);
        box-shadow: 0 4px 12px rgba(139, 69, 19, 0.4);
    }

    .control-btn:disabled {
        background: var(--coffee-darker);
        color: var(--coffee-light);
        cursor: not-allowed;
        opacity: 0.7;
    }

    .cycles-counter {
        color: var(--coffee-light);
        font-size: 1rem;
    }

    .coffee-beans {
        display: flex;
        justify-content: center;
        gap: 5px;
        margin-bottom: 10px;
        flex-wrap: wrap;
    }

    .bean {
        font-size: 1.2rem;
        animation: float 2s ease-in-out infinite;
    }

    .bean-count {
        color: var(--coffee-cream);
    }

    .settings-section {
        background: rgba(26, 15, 10, 0.6);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        padding: 25px;
        border: 1px solid rgba(139, 69, 19, 0.3);
    }

    h3 {
        color: var(--coffee-cream);
        margin-top: 0;
        margin-bottom: 25px;
        font-size: 1.5rem;
        text-align: center;
    }

    .setting-group {
        margin-bottom: 20px;
    }

    .setting-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: var(--coffee-cream);
        margin-bottom: 8px;
    }

    .setting-input {
        width: 80px;
        padding: 8px 12px;
        background: rgba(44, 24, 16, 0.5);
        border: 1px solid rgba(139, 69, 19, 0.5);
        color: var(--coffee-foam);
        border-radius: 8px;
        text-align: center;
    }

    .setting-input:disabled {
        opacity: 0.5;
    }

    .setting-switch {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 30px;
        cursor: pointer;
    }

    .switch-input {
        display: none;
    }

    .slider {
        width: 50px;
        height: 24px;
        background: rgba(44, 24, 16, 0.8);
        border: 1px solid var(--coffee-light);
        border-radius: 24px;
        position: relative;
        transition: 0.3s;
    }

    .slider:before {
        content: "";
        position: absolute;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        left: 2px;
        top: 2px;
        background: var(--coffee-light);
        transition: 0.3s;
    }

    .switch-input:checked + .slider:before {
        transform: translateX(26px);
        background: var(--coffee-accent);
    }

    .switch-label {
        color: var(--coffee-cream);
    }

    @media (max-width: 768px) {
        .timer-display {
            font-size: 3.5rem;
        }

        .timer-controls {
            flex-direction: column;
            align-items: center;
        }

        .control-btn {
            width: 100%;
            max-width: 250px;
        }

        .setting-label {
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
        }

        .setting-input {
            width: 100%;
        }
    }
</style>