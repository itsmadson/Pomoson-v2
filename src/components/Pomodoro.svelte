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
        gap: 20px;
        max-width: 900px;
        margin: 0 auto;
    }

    .timer-section {
        background: var(--panel-bg);
        backdrop-filter: blur(10px);
        border-radius: 0;
        padding: 30px;
        text-align: center;
        border: 1px solid var(--neon-blue);
        box-shadow: 0 0 15px rgba(0, 255, 252, 0.2);
        position: relative;
        overflow: hidden;
    }

    .timer-section::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, var(--neon-blue), var(--neon-pink), var(--neon-purple));
    }

    .timer-display {
        font-size: 4.5rem;
        font-weight: bold;
        font-family: 'Courier New', monospace;
        color: var(--neon-blue);
        margin: 20px 0;
        position: relative;
        text-shadow: 0 0 10px var(--neon-blue);
    }

    .timer-status {
        margin: 20px 0;
    }

    .status-badge {
        padding: 8px 16px;
        border-radius: 0;
        font-weight: bold;
        font-size: 1.1rem;
        text-transform: uppercase;
        letter-spacing: 2px;
        display: inline-block;
    }

    .status-badge.work {
        background: rgba(0, 255, 252, 0.1);
        color: var(--neon-blue);
        border: 1px solid var(--neon-blue);
        box-shadow: 0 0 10px rgba(0, 255, 252, 0.3);
    }

    .status-badge.break {
        background: rgba(188, 19, 254, 0.1);
        color: var(--neon-pink);
        border: 1px solid var(--neon-pink);
        box-shadow: 0 0 10px rgba(188, 19, 254, 0.3);
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
        border: 1px solid var(--neon-blue);
        border-radius: 0;
        font-size: 1rem;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        background: transparent;
        color: var(--neon-blue);
        text-transform: uppercase;
        letter-spacing: 1px;
        font-family: 'Courier New', monospace;
        position: relative;
        overflow: hidden;
    }

    .control-btn:hover:not(:disabled) {
        background: rgba(0, 255, 252, 0.1);
        text-shadow: 0 0 5px var(--neon-blue);
        box-shadow: 0 0 10px var(--neon-blue);
        transform: translateY(-2px);
    }

    .control-btn:disabled {
        border-color: var(--text-secondary);
        color: var(--text-secondary);
        cursor: not-allowed;
        opacity: 0.5;
    }

    .cycles-counter {
        color: var(--text-secondary);
        font-size: 0.9rem;
        letter-spacing: 1px;
    }

    .binary-grid {
        display: flex;
        justify-content: center;
        gap: 5px;
        margin-bottom: 10px;
        flex-wrap: wrap;
    }

    .binary-digit {
        font-size: 1rem;
        color: var(--neon-blue);
        text-shadow: 0 0 5px var(--neon-blue);
        animation: blink 2s infinite;
    }

    @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
    }

    .settings-section {
        background: var(--panel-bg);
        backdrop-filter: blur(10px);
        border-radius: 0;
        padding: 25px;
        border: 1px solid var(--neon-purple);
        box-shadow: 0 0 15px rgba(188, 19, 254, 0.2);
    }

    h3 {
        color: var(--neon-pink);
        margin-top: 0;
        margin-bottom: 25px;
        font-size: 1.3rem;
        text-align: center;
        text-transform: uppercase;
        letter-spacing: 2px;
        text-shadow: 0 0 8px rgba(255, 0, 255, 0.5);
    }

    .setting-group {
        margin-bottom: 20px;
    }

    .setting-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: var(--text-primary);
        margin-bottom: 8px;
        font-size: 0.9rem;
    }

    .setting-input {
        width: 80px;
        padding: 8px 12px;
        background: rgba(5, 5, 8, 0.7);
        border: 1px solid var(--neon-blue);
        color: var(--text-primary);
        border-radius: 0;
        text-align: center;
        font-family: 'Courier New', monospace;
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
        background: rgba(5, 5, 8, 0.8);
        border: 1px solid var(--neon-blue);
        border-radius: 0;
        position: relative;
        transition: 0.3s;
    }

    .slider:before {
        content: "";
        position: absolute;
        width: 20px;
        height: 20px;
        left: 2px;
        top: 2px;
        background: var(--neon-blue);
        transition: 0.3s;
    }

    .switch-input:checked + .slider:before {
        transform: translateX(26px);
        background: var(--neon-pink);
    }

    .switch-label {
        color: var(--text-primary);
        font-size: 0.9rem;
    }

    @media (max-width: 768px) {
        .timer-display {
            font-size: 3rem;
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