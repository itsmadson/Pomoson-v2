<script>
    import { onMount } from 'svelte';
    import { supabase, getCurrentUser } from '../lib/supabase';
    import { showError, showNotification } from '../lib/stores';

    let worklogs = [];
    let selectedDate = new Date().toISOString().split('T')[0];
    let isLoading = false;
    let totalDuration = 0;
    let newWorklog = { title: '', description: '', duration: 30 };
    let isAddingWorklog = false;

    async function fetchWorklogs() {
        try {
            isLoading = true;
            const user = await getCurrentUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('worklogs')
                .select('*')
                .eq('user_id', user.id)
                .eq('date', selectedDate)
                .order('start_time', { ascending: false });

            if (error) throw error;
            worklogs = data || [];

            // Calculate total duration
            totalDuration = worklogs.reduce((sum, log) => sum + log.duration, 0);
        } catch (err) {
            console.error('Error fetching worklogs:', err);
            showError('Failed to load worklogs');
        } finally {
            isLoading = false;
        }
    }

    async function addWorklog() {
        if (!newWorklog.title.trim()) {
            showError('Please enter a title');
            return;
        }

        if (newWorklog.duration < 1 || newWorklog.duration > 480) {
            showError('Duration must be between 1 and 480 minutes');
            return;
        }

        try {
            isAddingWorklog = true;
            const user = await getCurrentUser();
            if (!user) return;

            const now = new Date();
            const start = new Date(now);
            start.setMinutes(start.getMinutes() - newWorklog.duration);

            const { data, error } = await supabase.from('worklogs').insert({
                user_id: user.id,
                title: newWorklog.title.trim(),
                description: newWorklog.description.trim(),
                start_time: start.toISOString(),
                end_time: now.toISOString(),
                duration: newWorklog.duration * 60,
                date: selectedDate
            }).select();

            if (error) throw error;

            if (data && data[0]) {
                worklogs = [data[0], ...worklogs];
                totalDuration += data[0].duration;
            }

            newWorklog = { title: '', description: '', duration: 30 };
            showNotification('✅ Worklog added successfully!');
        } catch (err) {
            console.error('Error adding worklog:', err);
            showError('Failed to add worklog');
        } finally {
            isAddingWorklog = false;
        }
    }

    async function deleteWorklog(id) {
        if (!confirm('Are you sure you want to delete this worklog?')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('worklogs')
                .delete()
                .eq('id', id);

            if (error) throw error;

            const deletedLog = worklogs.find(w => w.id === id);
            if (deletedLog) {
                totalDuration -= deletedLog.duration;
            }

            worklogs = worklogs.filter(w => w.id !== id);
            showNotification('🗑️ Worklog deleted');
        } catch (err) {
            console.error('Error deleting worklog:', err);
            showError('Failed to delete worklog');
        }
    }

    function formatTime(dateString) {
        return new Date(dateString).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    function formatTotalDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    onMount(() => {
        fetchWorklogs();
    });

    $: if (selectedDate) {
        fetchWorklogs();
    }
</script>

<div class="worklogs-container">
    <div class="worklogs-header">
        <h2>📊 Coffee Logs</h2>
        <div class="date-selector">
            <input
                    type="date"
                    bind:value={selectedDate}
                    class="date-input"
                    max={new Date().toISOString().split('T')[0]}
            >
        </div>
    </div>

    <div class="stats-cards">
        <div class="stat-card">
            <div class="stat-icon">🍵</div>
            <div class="stat-value">{worklogs.length}</div>
            <div class="stat-label">Sessions</div>
        </div>
        <div class="stat-card accent">
            <div class="stat-icon">⏱️</div>
            <div class="stat-value">{formatTotalDuration(totalDuration)}</div>
            <div class="stat-label">Total Time</div>
        </div>
    </div>

    <div class="add-worklog">
        <h3>➕ Add Manual Entry</h3>
        <div class="add-form">
            <input
                    bind:value={newWorklog.title}
                    placeholder="What did you work on?"
                    class="worklog-input"
                    disabled={isAddingWorklog}
                    maxlength="200"
            >
            <textarea
                    bind:value={newWorklog.description}
                    placeholder="Details (optional)..."
                    class="worklog-textarea"
                    disabled={isAddingWorklog}
                    maxlength="500"
            ></textarea>
            <div class="duration-row">
                <div class="duration-input">
                    <label>Duration (minutes)</label>
                    <input
                            type="number"
                            bind:value={newWorklog.duration}
                            min="1"
                            max="480"
                            class="duration-field"
                            disabled={isAddingWorklog}
                    >
                </div>
                <button
                        on:click={addWorklog}
                        class="add-btn"
                        disabled={isAddingWorklog || !newWorklog.title.trim()}
                >
                    {isAddingWorklog ? 'Brewing...' : 'Add Log'}
                </button>
            </div>
        </div>
    </div>

    {#if isLoading}
        <div class="loading-state">
            <div class="coffee-cup">☕</div>
            <p>Brewing your logs...</p>
        </div>
    {:else if worklogs.length === 0}
        <div class="empty-state">
            <div class="coffee-icon">📭</div>
            <h3>No logs for this date</h3>
            <p>Start a Pomodoro session or add a manual entry above</p>
        </div>
    {:else}
        <div class="worklogs-list">
            {#each worklogs as log (log.id)}
                <div class="worklog-item">
                    <div class="worklog-main">
                        <div class="worklog-time">
                            {formatTime(log.start_time)} - {formatTime(log.end_time)}
                        </div>
                        <h4 class="worklog-title">{log.title}</h4>
                        {#if log.description}
                            <p class="worklog-desc">{log.description}</p>
                        {/if}
                    </div>
                    <div class="worklog-meta">
                        <div class="worklog-duration">
                            {formatDuration(log.duration)}
                        </div>
                        <button on:click={() => deleteWorklog(log.id)} class="delete-btn">
                            🗑️
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .worklogs-container {
        max-width: 900px;
        margin: 0 auto;
        padding: 20px;
    }

    .worklogs-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        flex-wrap: wrap;
        gap: 20px;
    }

    h2 {
        color: var(--coffee-cream);
        margin: 0;
        font-size: 1.8rem;
    }

    .date-input {
        padding: 10px 15px;
        background: rgba(44, 24, 16, 0.5);
        border: 1px solid var(--coffee-light);
        color: var(--coffee-foam);
        border-radius: 8px;
        font-size: 1rem;
    }

    .stats-cards {
        display: flex;
        gap: 20px;
        margin-bottom: 30px;
        flex-wrap: wrap;
    }

    .stat-card {
        flex: 1;
        min-width: 150px;
        background: rgba(44, 24, 16, 0.5);
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        border: 1px solid rgba(139, 69, 19, 0.3);
    }

    .stat-card.accent {
        background: rgba(139, 69, 19, 0.3);
        border-color: var(--coffee-accent);
    }

    .stat-icon {
        font-size: 2rem;
        margin-bottom: 10px;
    }

    .stat-value {
        font-size: 1.8rem;
        font-weight: bold;
        color: var(--coffee-cream);
        margin-bottom: 5px;
    }

    .stat-label {
        color: var(--coffee-light);
        font-size: 0.9rem;
    }

    .add-worklog {
        background: rgba(44, 24, 16, 0.5);
        border-radius: 12px;
        padding: 25px;
        margin-bottom: 30px;
        border: 1px solid rgba(139, 69, 19, 0.3);
    }

    h3 {
        color: var(--coffee-cream);
        margin-top: 0;
        margin-bottom: 20px;
        font-size: 1.3rem;
    }

    .add-form {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }

    .worklog-input, .worklog-textarea {
        width: 100%;
        padding: 12px 15px;
        background: rgba(26, 15, 10, 0.5);
        border: 1px solid rgba(139, 69, 19, 0.5);
        color: var(--coffee-foam);
        border-radius: 8px;
        font-size: 1rem;
    }

    .worklog-input::placeholder, .worklog-textarea::placeholder {
        color: var(--coffee-light);
        opacity: 0.7;
    }

    .worklog-textarea {
        min-height: 80px;
        resize: vertical;
    }

    .duration-row {
        display: flex;
        align-items: center;
        gap: 20px;
        flex-wrap: wrap;
    }

    .duration-input {
        flex: 1;
        min-width: 200px;
    }

    .duration-input label {
        display: block;
        color: var(--coffee-cream);
        margin-bottom: 8px;
        font-size: 0.9rem;
    }

    .duration-field {
        width: 100%;
        padding: 10px 15px;
        background: rgba(26, 15, 10, 0.5);
        border: 1px solid rgba(139, 69, 19, 0.5);
        color: var(--coffee-foam);
        border-radius: 8px;
    }

    .add-btn {
        padding: 12px 24px;
        background: var(--coffee-light);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        align-self: flex-end;
    }

    .add-btn:hover:not(:disabled) {
        background: var(--coffee-brown);
        transform: translateY(-2px);
    }

    .add-btn:disabled {
        background: var(--coffee-darker);
        color: var(--coffee-light);
        cursor: not-allowed;
    }

    .loading-state, .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: var(--coffee-light);
    }

    .coffee-cup, .coffee-icon {
        font-size: 3rem;
        margin-bottom: 15px;
        opacity: 0.7;
    }

    .empty-state h3 {
        color: var(--coffee-cream);
        margin: 0 0 10px 0;
    }

    .empty-state p {
        margin: 0;
    }

    .worklogs-list {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }

    .worklog-item {
        display: flex;
        justify-content: space-between;
        gap: 20px;
        background: rgba(44, 24, 16, 0.5);
        border-radius: 12px;
        padding: 20px;
        border: 1px solid rgba(139, 69, 19, 0.3);
        transition: all 0.3s ease;
    }

    .worklog-item:hover {
        background: rgba(44, 24, 16, 0.7);
        transform: translateY(-2px);
    }

    .worklog-main {
        flex: 1;
    }

    .worklog-time {
        color: var(--coffee-light);
        font-size: 0.9rem;
        margin-bottom: 8px;
    }

    .worklog-title {
        color: var(--coffee-cream);
        margin: 0 0 10px 0;
        font-size: 1.1rem;
    }


    .worklog-desc {
        color: var(--coffee-light);
        margin: 0;
        font-size: 0.95rem;
        line-height: 1.5;
    }

    .worklog-meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 15px;
    }

    .worklog-duration {
        background: rgba(210, 180, 140, 0.2);
        color: var(--coffee-cream);
        padding: 6px 12px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 0.9rem;
    }

    .delete-btn {
        background: none;
        border: none;
        color: #FF6B6B;
        cursor: pointer;
        font-size: 1.2rem;
        opacity: 0.7;
        transition: all 0.3s ease;
    }

    .delete-btn:hover {
        opacity: 1;
        transform: scale(1.1);
    }

    @media (max-width: 768px) {
        .worklog-item {
            flex-direction: column;
            gap: 15px;
        }

        .worklog-meta {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            width: 100%;
        }

        .duration-row {
            flex-direction: column;
            gap: 15px;
        }

        .add-btn {
            width: 100%;
        }
    }
</style>