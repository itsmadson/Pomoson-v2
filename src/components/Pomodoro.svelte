<script>
    import { onMount, onDestroy } from 'svelte';
    import { supabase, getCurrentUser } from '../lib/supabase';
    import { timerState, showNotification, showError } from '../lib/stores';
    import { theme } from '../lib/theme';

    const themeOptions = [
        { value: 'Pomoson', label: 'Pomoson' },
        { value: 'dracula', label: 'Dracula' },
        { value: 'gruvbox', label: 'Gruvbox' },
        { value: 'jungle', label: 'Jungle' },
        { value: 'light', label: 'Light' },
        { value: 'mono', label: 'Mono' },
        { value: 'yellow-gruvbox', label: 'Yellow Gruvbox' },
        { value: 'pink-acid', label: 'Pink Acid' },
        { value: 'frosty-blue', label: 'Frosty Blue' },
        { value: 'warm-gruvbox', label: 'Warm Gruvbox' },
        { value: 'blue-purple-green', label: 'Blue Purple Green' },
        { value: 'neon-night', label: 'Neon Night' },
        { value: 'solarized-teal', label: 'Solarized Teal' },
        { value: 'mystical-purple', label: 'Mystical Purple' },
        { value: 'sunset-sky', label: 'Sunset Sky' },
        { value: 'matrix', label: 'Matrix' }
    ];

    let selectedTheme = $theme;
    let isDropdownOpen = false;

    function handleThemeChange(newTheme) {
        selectedTheme = newTheme;
        theme.set(newTheme);
        isDropdownOpen = false;
    }

    function toggleDropdown() {
        isDropdownOpen = !isDropdownOpen;
    }

    // Close dropdown when clicking outside
    function handleClickOutside(event) {
        if (!event.target.closest('.custom-select')) {
            isDropdownOpen = false;
        }
    }

    // Function to convert non-English digits to English
    function convertToEnglishNumbers(str) {
        if (!str) return '';

        // Persian/Farsi digits
        const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        // Arabic digits
        const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        // Hindi/Devanagari digits (just in case)
        const hindiDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

        let result = str.toString();

        // Convert all non-English digits to English
        for (let i = 0; i < 10; i++) {
            const persianRegex = new RegExp(persianDigits[i], 'g');
            const arabicRegex = new RegExp(arabicDigits[i], 'g');
            const hindiRegex = new RegExp(hindiDigits[i], 'g');

            result = result.replace(persianRegex, i);
            result = result.replace(arabicRegex, i);
            result = result.replace(hindiRegex, i);
        }

        return result;
    }

    // Function to validate and convert input values
    function validateAndConvertNumber(value, min, max) {
        const converted = convertToEnglishNumbers(value);
        const num = parseInt(converted);
        if (isNaN(num) || num < min || num > max) {
            return null;
        }
        return num;
    }

    let timer;
    let visibilityTimer; // Additional timer for visibility check
    let state = {
        minutes: 25,
        seconds: 0,
        isActive: false,
        isWork: true,
        cycles: 0,
        workTime: 25,
        shortBreak: 5,
        longBreak: 15,
        autoStart: true,
        startTime: null, // Track when timer started
        totalDuration: 0, // Track total duration for background calculation
        endTime: null // Track when timer should end
    };

    let currentWorkTitle = '';

    $: timerState.set(state);

    // Key functions for persistence
    function saveTimerState() {
        const timerData = {
            ...state,
            currentWorkTitle,
            timestamp: Date.now()
        };
        localStorage.setItem('pomoson-timer-state', JSON.stringify(timerData));
    }

    function loadTimerState() {
        try {
            const savedData = localStorage.getItem('pomoson-timer-state');
            if (savedData) {
                const timerData = JSON.parse(savedData);
                const now = Date.now();
                const timeDiff = now - timerData.timestamp;

                // If timer was active, calculate elapsed time
                if (timerData.isActive && timeDiff < 24 * 60 * 60 * 1000) { // Only if less than 24 hours
                    const elapsedSeconds = Math.floor(timeDiff / 1000);
                    const totalSeconds = timerData.minutes * 60 + timerData.seconds;
                    const remainingSeconds = totalSeconds - elapsedSeconds;

                    if (remainingSeconds > 0) {
                        // Timer still running
                        state.minutes = Math.floor(remainingSeconds / 60);
                        state.seconds = remainingSeconds % 60;
                        state.isActive = true;
                        state.startTime = timerData.startTime;
                        state.endTime = timerData.endTime;
                        state.totalDuration = timerData.totalDuration;
                    } else {
                        // Timer should have completed
                        state.minutes = 0;
                        state.seconds = 0;
                        state.isActive = false;
                        // Don't auto-complete, just reset
                    }
                } else {
                    // Timer was not active, restore state as-is
                    state.minutes = timerData.minutes;
                    state.seconds = timerData.seconds;
                    state.isActive = false; // Don't auto-start
                }

                // Restore other state
                state.isWork = timerData.isWork;
                state.cycles = timerData.cycles;
                state.workTime = timerData.workTime;
                state.shortBreak = timerData.shortBreak;
                state.longBreak = timerData.longBreak;
                state.autoStart = timerData.autoStart;
                currentWorkTitle = timerData.currentWorkTitle || '';

                state = { ...state };
                return true;
            }
        } catch (err) {
            console.error('Error loading timer state:', err);
        }
        return false;
    }

    function clearTimerState() {
        localStorage.removeItem('pomoson-timer-state');
    }

    function startTimer() {
        if (state.isActive) return;

        if (state.isWork && !currentWorkTitle.trim()) {
            currentWorkTitle = 'Pomodoro Work Session';
        }

        const now = Date.now();
        const totalSeconds = state.minutes * 60 + state.seconds;

        state.isActive = true;
        state.startTime = now;
        state.endTime = now + (totalSeconds * 1000);
        state.totalDuration = totalSeconds;
        state = { ...state };
        saveTimerState();

        // Start both timers
        timer = setInterval(() => {
            updateTimerByInterval();
        }, 1000);

        // Backup timer that checks every 500ms and recalculates from start time
        visibilityTimer = setInterval(() => {
            updateTimerByTimestamp();
        }, 500);
    }

    function stopTimer() {
        state.isActive = false;
        state.startTime = null;
        state.endTime = null;
        state = { ...state };
        saveTimerState();

        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        if (visibilityTimer) {
            clearInterval(visibilityTimer);
            visibilityTimer = null;
        }
    }

    function resetTimer() {
        stopTimer();
        state.isWork = true;
        state.minutes = state.workTime;
        state.seconds = 0;
        state.cycles = 0;
        state.startTime = null;
        state.endTime = null;
        state.totalDuration = 0;
        currentWorkTitle = '';
        state = { ...state };
        clearTimerState();
    }

    // Original interval-based update (for when tab is active)
    function updateTimerByInterval() {
        if (!state.isActive) return;

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
        saveTimerState();
    }

    // Timestamp-based update (works regardless of tab visibility)
    function updateTimerByTimestamp() {
        if (!state.isActive || !state.endTime) return;

        const now = Date.now();
        const remainingMs = state.endTime - now;

        if (remainingMs <= 0) {
            // Timer completed
            handleTimerComplete();
            return;
        }

        const remainingSeconds = Math.ceil(remainingMs / 1000);
        const newMinutes = Math.floor(remainingSeconds / 60);
        const newSeconds = remainingSeconds % 60;

        // Only update if values have changed to avoid unnecessary re-renders
        if (newMinutes !== state.minutes || newSeconds !== state.seconds) {
            state.minutes = newMinutes;
            state.seconds = newSeconds;
            state = { ...state };
            saveTimerState();
        }
    }

    async function handleTimerComplete() {
        stopTimer(); // Stop the timer first
        clearTimerState(); // Clear saved state

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

            // Request notification permission if not already granted
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }

            // Show browser notification if permission is granted
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Pomoson Timer', {
                    body: `Work session complete! Time for a ${isLongBreak ? 'long' : 'short'} break.`,
                    icon: '/favicon.ico'
                });
            }

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

            // Show browser notification if permission is granted
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Pomoson Timer', {
                    body: 'Break time over! Ready for another work session?',
                    icon: '/favicon.ico'
                });
            }

            if (state.autoStart) {
                // Don't auto-start work session, let user set title
                currentWorkTitle = ''; // Reset title for new work session
            }
        }

        state = { ...state };
        saveTimerState();
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

    // FIXED: Better settings update that properly handles timer state
    function updateSettings() {
        // Only stop timer if it's currently active
        if (state.isActive) {
            stopTimer();
        }

        // Update current timer values based on session type
        if (state.isWork) {
            state.minutes = state.workTime;
        } else {
            const isLongBreak = state.cycles % 4 === 0;
            state.minutes = isLongBreak ? state.longBreak : state.shortBreak;
        }

        state.seconds = 0;
        state = { ...state };

        // Only save if we're not in the middle of a session
        if (!state.isActive) {
            saveTimerState();
        }
    }

    function handleWorkTimeChange(event) {
        const rawValue = event.target.value;
        const englishValue = convertToEnglishNumbers(rawValue);
        const converted = validateAndConvertNumber(englishValue, 1, 60);

        if (converted !== null) {
            state.workTime = converted;
            event.target.value = converted; // Set the English number back to the input
            updateSettings();
        } else {
            // Reset to previous valid value
            event.target.value = state.workTime;
        }
    }

    function handleShortBreakChange(event) {
        const rawValue = event.target.value;
        const englishValue = convertToEnglishNumbers(rawValue);
        const converted = validateAndConvertNumber(englishValue, 1, 30);

        if (converted !== null) {
            state.shortBreak = converted;
            event.target.value = converted; // Set the English number back to the input
            updateSettings();
        } else {
            // Reset to previous valid value
            event.target.value = state.shortBreak;
        }
    }

    function handleLongBreakChange(event) {
        const rawValue = event.target.value;
        const englishValue = convertToEnglishNumbers(rawValue);
        const converted = validateAndConvertNumber(englishValue, 1, 60);

        if (converted !== null) {
            state.longBreak = converted;
            event.target.value = converted; // Set the English number back to the input
            updateSettings();
        } else {
            // Reset to previous valid value
            event.target.value = state.longBreak;
        }
    }

    function formatTime(minutes, seconds) {
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Handle page visibility changes
    function handleVisibilityChange() {
        if (document.hidden) {
            // Page is hidden, rely more on timestamp-based updates
            console.log('Page hidden - relying on timestamp-based timer');
        } else {
            // Page is visible, both timers will work
            console.log('Page visible - both timers active');

            // Force an immediate timestamp-based update when page becomes visible
            if (state.isActive) {
                updateTimerByTimestamp();
            }
        }
    }

    onMount(() => {
        // First load settings from localStorage
        const savedSettings = localStorage.getItem('pomoson-settings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                state.workTime = settings.workTime || 25;
                state.shortBreak = settings.shortBreak || 5;
                state.longBreak = settings.longBreak || 15;
                state.autoStart = settings.autoStart !== undefined ? settings.autoStart : true;
            } catch (err) {
                console.error('Error loading settings:', err);
            }
        }

        // Then try to load timer state (this will override minutes if there's an active timer)
        const hasActiveTimer = loadTimerState();

        // If no active timer was loaded, set default minutes
        if (!hasActiveTimer) {
            state.minutes = state.workTime;
        }

        state = { ...state };

        // If timer was active, restart both intervals
        if (state.isActive) {
            timer = setInterval(() => {
                updateTimerByInterval();
            }, 1000);

            visibilityTimer = setInterval(() => {
                updateTimerByTimestamp();
            }, 500);
        }

        // Add event listeners
        document.addEventListener('click', handleClickOutside);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Request notification permission on mount
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    });

    onDestroy(() => {
        stopTimer(); // This will save the current state

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

        // Remove event listeners
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
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
        <h3>⚙ Settings</h3>

        <div class="setting-group">
            <label class="setting-label">
                <span>☕ Work Duration (min)</span>
                <input
                        type="text"
                        value={state.workTime}
                        min="1"
                        max="60"
                        class="setting-input"
                        on:change={handleWorkTimeChange}
                        disabled={state.isActive}
                >
            </label>
        </div>

        <div class="setting-group">
            <label class="setting-label">
                <span>🍃 Short Break (min)</span>
                <input
                        type="text"
                        value={state.shortBreak}
                        min="1"
                        max="30"
                        class="setting-input"
                        on:change={handleShortBreakChange}
                        disabled={state.isActive}
                >
            </label>
        </div>

        <div class="setting-group">
            <label class="setting-label">
                <span>🌿 Long Break (min)</span>
                <input
                        type="text"
                        value={state.longBreak}
                        min="1"
                        max="60"
                        class="setting-input"
                        on:change={handleLongBreakChange}
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

        <div class="setting-group">
            <label class="setting-label">
                <span>🎨 Theme</span>
                <div class="custom-select">
                    <button
                            class="select-button"
                            on:click={toggleDropdown}
                            type="button"
                    >
                        {themeOptions.find(opt => opt.value === selectedTheme)?.label || 'Select Theme'}
                        <span class="select-arrow" class:open={isDropdownOpen}>▼</span>
                    </button>
                    {#if isDropdownOpen}
                        <div class="select-dropdown">
                            {#each themeOptions as option}
                                <button
                                        class="select-option"
                                        class:selected={option.value === selectedTheme}
                                        on:click={() => handleThemeChange(option.value)}
                                        type="button"
                                >
                                    {option.label}
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>
            </label>
        </div>
    </div>
</div>

<style>
    .pomodoro-container {
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
        max-width: 800px;
        margin: 0 auto;
        padding: 0px 8px;
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
        direction:ltr;
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
        width: 52px;  /* Changed from 70px to 52px for better proportion */
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
        transform: translateX(26px);  /* Changed from 22px to 26px */
        background: var(--neon-blue);
    }

    /* Custom Select Styles */
    .custom-select {
        position: relative;
        width: 140px;
    }

    .select-button {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid var(--glass-border);
        color: var(--text-primary);
        border-radius: 10px;
        font-size: 13px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .select-button:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.25);
    }

    .select-button:focus {
        outline: none;
        border-color: var(--neon-blue);
        box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.2);
    }

    .select-arrow {
        font-size: 10px;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        color: var(--text-secondary);
    }

    .select-arrow.open {
        transform: rotate(180deg);
    }

    .select-dropdown {
        position: absolute;
        bottom: 100%;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.9);
        border: 1px solid var(--glass-border);
        border-radius: 10px;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        margin-bottom: 4px;
        overflow: hidden;
    }

    .select-option {
        display: block;
        width: 100%;
        padding: 10px 12px;
        background: transparent;
        border: none;
        color: var(--text-primary);
        font-size: 13px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        text-align: left;
    }

    .select-option:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--neon-blue);
    }

    .select-option.selected {
        background: rgba(0, 212, 255, 0.2);
        color: var(--neon-blue);
    }

    .select-option.selected:hover {
        background: rgba(0, 212, 255, 0.3);
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

        .custom-select {
            width: 100%;
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