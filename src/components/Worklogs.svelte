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

    // Jira integration state
    let showJiraConfig = false;
    let jiraConfig = { baseUrl: '', token: '' };
    let isSearching = false;
    let searchSuggestions = [];
    let showSuggestions = false;
    let searchTimeout;
    let pushingToJira = {};

    $: if (jiraConfig?.baseUrl && window.electron?.sendOrigin) {
        try {
            const url = new URL(jiraConfig.baseUrl)
            const cleanOrigin = `${url.protocol}//${url.hostname}`
            window.electron.sendOrigin(cleanOrigin)
        } catch (e) {
            console.error('Invalid Jira URL:', jiraConfig.baseUrl)
        }
    }



    // Load Jira config from localStorage
    function loadJiraConfig() {
        const stored = localStorage.getItem('jiraConfig');
        if (stored) {
            try {
                jiraConfig = JSON.parse(stored);
            } catch (e) {
                console.error('Error loading Jira config:', e);
            }
        }
    }

    // Save Jira config to localStorage
    function saveJiraConfig() {
        if (!jiraConfig.baseUrl.trim() || !jiraConfig.token.trim()) {
            showError('Please enter both Jira URL and token');
            return;
        }

        // Clean up URL (remove trailing slash)
        jiraConfig.baseUrl = jiraConfig.baseUrl.trim().replace(/\/$/, '');

        localStorage.setItem('jiraConfig', JSON.stringify(jiraConfig));
        showJiraConfig = false;
        showNotification('🔧 Jira configuration saved!');
    }

    // Check if Jira is configured
    function isJiraConfigured() {
        return jiraConfig.baseUrl && jiraConfig.token;
    }

    // Encode Persian/Unicode text for URL
    function encodeSearchTerm(term) {
        return encodeURIComponent(term);
    }

    // Check if input looks like a Jira issue key (e.g., SUP-165, GT3-1610)
    function looksLikeIssueKey(input) {
        return /^[A-Z][A-Z0-9]*-\d+$/i.test(input.trim());
    }

    // Search Jira issues
    async function searchJiraIssues(query) {
        if (!isJiraConfigured() || !query.trim()) {
            searchSuggestions = [];
            return;
        }

        try {
            isSearching = true;
            const trimmedQuery = query.trim();
            let url;

            if (looksLikeIssueKey(trimmedQuery)) {
                // Search by issue key
                url = `${jiraConfig.baseUrl}/rest/api/1.0/issues/picker?query=${encodeSearchTerm(trimmedQuery)}&showSubTasks=true`;
            } else {
                // Search by summary
                const encodedQuery = encodeSearchTerm(trimmedQuery);
                url = `${jiraConfig.baseUrl}/rest/api/2/search?jql=summary~"${encodedQuery}"&fields=key,summary&maxResults=10`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${jiraConfig.token}`,
                    'Accept': 'application/json',
                    'X-Atlassian-Token': 'nocheck'
                }
            });

            if (!response.ok) {
                throw new Error(`Jira API error: ${response.status}`);
            }

            const data = await response.json();

            if (looksLikeIssueKey(trimmedQuery)) {
                // Handle issue picker response
                searchSuggestions = [];
                if (data.sections) {
                    data.sections.forEach(section => {
                        if (section.issues) {
                            searchSuggestions.push(...section.issues.map(issue => ({
                                key: issue.key,
                                summary: issue.summaryText || issue.summary
                            })));
                        }
                    });
                }
            } else {
                // Handle search response
                searchSuggestions = data.issues ? data.issues.map(issue => ({
                    key: issue.key,
                    summary: issue.fields.summary
                })) : [];
            }

            showSuggestions = searchSuggestions.length > 0;
        } catch (err) {
            console.error('Jira search error:', err);
            searchSuggestions = [];
            showSuggestions = false;
        } finally {
            isSearching = false;
        }
    }

    // Handle title input with debounced search
    function handleTitleInput(event) {
        const value = event.target.value;
        newWorklog.title = value;

        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        // Don't search for very short inputs
        if (value.length < 2) {
            searchSuggestions = [];
            showSuggestions = false;
            return;
        }

        // Debounce search
        searchTimeout = setTimeout(() => {
            searchJiraIssues(value);
        }, 300);
    }

    // Select suggestion
    function selectSuggestion(suggestion) {
        newWorklog.title = suggestion.key;
        searchSuggestions = [];
        showSuggestions = false;
    }

    // Hide suggestions when clicking outside
    function hideSuggestions() {
        setTimeout(() => {
            showSuggestions = false;
        }, 200);
    }

    // Push worklog to Jira
    async function pushToJira(worklog) {
        if (!isJiraConfigured()) {
            showError('Please configure Jira first');
            return;
        }

        if (!looksLikeIssueKey(worklog.title)) {
            showError('Cannot push to Jira: Invalid issue key format');
            return;
        }

        try {
            pushingToJira[worklog.id] = true;

            // Convert duration from seconds to seconds (it's already in seconds in DB)
            // Convert start_time to Jira format
            const startTime = new Date(worklog.start_time).toISOString().replace('Z', '+0000');

            const jiraWorklog = {
                comment: worklog.description || worklog.title,
                started: startTime,
                timeSpentSeconds: worklog.duration
            };

            const response = await fetch(
                `${jiraConfig.baseUrl}/rest/api/2/issue/${worklog.title}/worklog`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${jiraConfig.token}`,
                        'Content-Type': 'application/json',
                        'User-Agent': 'test-agent',
                        'X-Atlassian-Token': 'no-check',
                        'Origin':`${jiraConfig.baseUrl}`,
                        'Sec-Fetch-Site': 'same-origin',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(jiraWorklog)
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Jira API error: ${response.status} - ${errorText}`);
            }

            showNotification(`✅ Pushed to Jira: ${worklog.title}`);
        } catch (err) {
            console.error('Error pushing to Jira:', err);
            showError(`Failed to push to Jira: ${err.message}`);
        } finally {
            pushingToJira[worklog.id] = false;
        }
    }

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
                duration: newWorklog.duration * 60, // Convert to seconds
                date: selectedDate
            }).select();

            if (error) throw error;

            if (data && data[0]) {
                worklogs = [data[0], ...worklogs];
                totalDuration += data[0].duration;
            }

            newWorklog = { title: '', description: '', duration: 30 };
            searchSuggestions = [];
            showSuggestions = false;
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
        loadJiraConfig();
        fetchWorklogs();
    });

    $: if (selectedDate) {
        fetchWorklogs();
    }
</script>

<div class="worklogs-container">
    <div class="worklogs-header">
        <h2>📊 Coffee Logs</h2>
        <div class="header-actions">
            <div class="date-selector">
                <input
                        type="date"
                        bind:value={selectedDate}
                        class="date-input"
                        max={new Date().toISOString().split('T')[0]}
                >
            </div>
            <button
                    on:click={() => showJiraConfig = true}
                    class="config-btn"
                    class:configured={isJiraConfigured()}
            >
                {isJiraConfigured() ? '🔗 Jira Connected' : '⚙️ Configure Jira'}
            </button>
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
            <div class="title-input-container">
                <input
                        bind:value={newWorklog.title}
                        on:input={handleTitleInput}
                        on:blur={hideSuggestions}
                        placeholder="Issue key (SUP-165) or description..."
                        class="worklog-input"
                        disabled={isAddingWorklog}
                        maxlength="200"
                >
                {#if isSearching}
                    <div class="search-indicator">🔍</div>
                {/if}
                {#if showSuggestions && searchSuggestions.length > 0}
                    <div class="suggestions-dropdown">
                        {#each searchSuggestions as suggestion}
                            <div
                                    class="suggestion-item"
                                    on:mousedown={() => selectSuggestion(suggestion)}
                            >
                                <strong>{suggestion.key}</strong> — {suggestion.summary}
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
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
                        <h4 class="worklog-title">
                            {log.title}
                            {#if looksLikeIssueKey(log.title)}
                                <span class="jira-badge">JIRA</span>
                            {/if}
                        </h4>
                        {#if log.description}
                            <p class="worklog-desc">{log.description}</p>
                        {/if}
                    </div>
                    <div class="worklog-meta">
                        <div class="worklog-duration">
                            {formatDuration(log.duration)}
                        </div>
                        <div class="worklog-actions">
                            {#if looksLikeIssueKey(log.title) && isJiraConfigured()}
                                <button
                                        on:click={() => pushToJira(log)}
                                        class="jira-btn"
                                        disabled={pushingToJira[log.id]}
                                >
                                    {pushingToJira[log.id] ? '⏳' : '🚀'} Jira
                                </button>
                            {/if}
                            <button on:click={() => deleteWorklog(log.id)} class="delete-btn">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<!-- Jira Configuration Modal -->
{#if showJiraConfig}
    <div class="modal-overlay" on:click={() => showJiraConfig = false}>
        <div class="modal-content" on:click|stopPropagation>
            <h3>🔧 Configure Jira Integration</h3>
            <div class="config-form">
                <div class="form-group">
                    <label>Jira Base URL</label>
                    <input
                            bind:value={jiraConfig.baseUrl}
                            placeholder="https://jira.hq.saafaa.ir"
                            class="config-input"
                            type="url"
                    >
                </div>
                <div class="form-group">
                    <label>Personal Access Token</label>
                    <input
                            bind:value={jiraConfig.token}
                            placeholder="Your Jira API token"
                            class="config-input"
                            type="password"
                    >
                </div>
                <div class="config-actions">
                    <button on:click={() => showJiraConfig = false} class="cancel-btn">
                        Cancel
                    </button>
                    <button on:click={saveJiraConfig} class="save-btn">
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

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
        border-bottom: 1px solid var(--neon-blue);
        padding-bottom: 20px;
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: 15px;
        flex-wrap: wrap;
    }

    h2 {
        color: var(--neon-pink);
        margin: 0;
        font-size: 1.5rem;
        text-transform: uppercase;
        letter-spacing: 2px;
        text-shadow: 0 0 8px rgba(255, 0, 255, 0.3);
    }

    .date-input {
        padding: 10px 15px;
        background: rgba(5, 5, 8, 0.7);
        border: 1px solid var(--neon-blue);
        color: var(--text-primary);
        border-radius: 0;
        font-size: 0.9rem;
        font-family: 'Courier New', monospace;
        transition: all 0.3s ease;
    }

    .date-input:focus {
        outline: none;
        border-color: var(--neon-pink);
        box-shadow: 0 0 10px rgba(255, 0, 255, 0.3);
    }

    .config-btn {
        padding: 10px 15px;
        background: rgba(5, 5, 8, 0.7);
        border: 1px solid var(--neon-blue);
        color: var(--text-primary);
        border-radius: 0;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.8rem;
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: 'Courier New', monospace;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .config-btn.configured {
        border-color: var(--neon-pink);
        color: var(--neon-pink);
    }

    .config-btn:hover {
        background: rgba(0, 255, 252, 0.1);
        color: var(--neon-blue);
        border-color: var(--neon-blue);
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
        background: rgba(5, 5, 8, 0.7);
        border-radius: 0;
        padding: 20px;
        text-align: center;
        border: 1px solid var(--neon-blue);
        transition: transform 0.3s ease;
        position: relative;
        overflow: hidden;
    }

    .stat-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 0 15px rgba(0, 255, 252, 0.2);
    }

    .stat-card.accent {
        border-color: var(--neon-pink);
    }

    .stat-card.accent:hover {
        box-shadow: 0 0 15px rgba(255, 0, 255, 0.2);
    }

    .stat-icon {
        font-size: 2rem;
        margin-bottom: 10px;
        display: block;
        color: var(--neon-blue);
    }

    .stat-card.accent .stat-icon {
        color: var(--neon-pink);
    }

    .stat-value {
        font-size: 1.8rem;
        font-weight: bold;
        color: var(--text-primary);
        margin-bottom: 5px;
        font-family: 'Courier New', monospace;
    }

    .stat-label {
        color: var(--text-secondary);
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .add-worklog {
        background: rgba(5, 5, 8, 0.7);
        border-radius: 0;
        padding: 25px;
        margin-bottom: 30px;
        border: 1px solid var(--neon-purple);
        box-shadow: 0 0 15px rgba(188, 19, 254, 0.1);
    }

    h3 {
        color: var(--neon-pink);
        margin-top: 0;
        margin-bottom: 20px;
        font-size: 1.2rem;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .add-form {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }

    .title-input-container {
        position: relative;
    }

    .worklog-input, .worklog-textarea {
        width: 100%;
        padding: 12px 15px;
        background: rgba(5, 5, 8, 0.7);
        border: 1px solid var(--neon-blue);
        color: var(--text-primary);
        border-radius: 0;
        font-size: 0.9rem;
        transition: all 0.3s ease;
        box-sizing: border-box;
        font-family: 'Courier New', monospace;
    }

    .worklog-input:focus, .worklog-textarea:focus {
        outline: none;
        border-color: var(--neon-pink);
        box-shadow: 0 0 10px rgba(255, 0, 255, 0.3);
    }

    .worklog-input::placeholder, .worklog-textarea::placeholder {
        color: var(--text-secondary);
        opacity: 0.7;
    }

    .worklog-textarea {
        min-height: 80px;
        resize: vertical;
        font-family: inherit;
    }

    .search-indicator {
        position: absolute;
        right: 15px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1rem;
        color: var(--neon-blue);
        pointer-events: none;
        animation: pulse 2s infinite;
    }

    @keyframes pulse {
        0%, 100% { opacity: 0.7; }
        50% { opacity: 1; }
    }

    .suggestions-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: rgba(5, 5, 8, 0.95);
        border: 1px solid var(--neon-blue);
        border-top: none;
        border-radius: 0;
        max-height: 200px;
        overflow-y: auto;
        z-index: 1000;
        backdrop-filter: blur(10px);
    }

    .suggestion-item {
        padding: 12px 15px;
        cursor: pointer;
        color: var(--text-primary);
        border-bottom: 1px solid rgba(0, 255, 252, 0.1);
        transition: background-color 0.2s;
        font-size: 0.9rem;
    }

    .suggestion-item:hover {
        background: rgba(0, 255, 252, 0.1);
    }

    .suggestion-item:last-child {
        border-bottom: none;
    }

    .suggestion-item strong {
        color: var(--neon-pink);
        font-weight: bold;
    }

    .duration-row {
        display: flex;
        align-items: flex-end;
        gap: 20px;
        flex-wrap: wrap;
    }

    .duration-input {
        flex: 1;
        min-width: 200px;
    }

    .duration-input label {
        display: block;
        color: var(--text-primary);
        margin-bottom: 8px;
        font-size: 0.9rem;
    }

    .duration-field {
        width: 100%;
        padding: 10px 15px;
        background: rgba(5, 5, 8, 0.7);
        border: 1px solid var(--neon-blue);
        color: var(--text-primary);
        border-radius: 0;
        transition: all 0.3s ease;
        box-sizing: border-box;
        font-family: 'Courier New', monospace;
    }

    .duration-field:focus {
        outline: none;
        border-color: var(--neon-pink);
        box-shadow: 0 0 10px rgba(255, 0, 255, 0.3);
    }

    .add-btn {
        padding: 12px 24px;
        background: transparent;
        color: var(--neon-blue);
        border: 1px solid var(--neon-blue);
        border-radius: 0;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        align-self: flex-end;
        white-space: nowrap;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-family: 'Courier New', monospace;
    }

    .add-btn:hover:not(:disabled) {
        background: rgba(0, 255, 252, 0.1);
        text-shadow: 0 0 5px var(--neon-blue);
        box-shadow: 0 0 10px var(--neon-blue);
    }

    .add-btn:disabled {
        border-color: var(--text-secondary);
        color: var(--text-secondary);
        cursor: not-allowed;
    }

    .loading-state, .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: var(--text-secondary);
    }

    .terminal-icon {
        font-size: 3rem;
        margin-bottom: 15px;
        color: var(--neon-blue);
        text-shadow: 0 0 10px var(--neon-blue);
    }

    .empty-state h3 {
        color: var(--neon-pink);
        margin: 0 0 10px 0;
        text-transform: uppercase;
        letter-spacing: 2px;
    }

    .empty-state p {
        margin: 0;
        opacity: 0.8;
    }

    .worklogs-list {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }

    .worklog-item {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 20px;
        background: rgba(5, 5, 8, 0.7);
        border-radius: 0;
        padding: 20px;
        border: 1px solid var(--neon-blue);
        transition: all 0.3s ease;
        position: relative;
    }

    .worklog-item:hover {
        background: rgba(5, 5, 8, 0.9);
        transform: translateY(-2px);
        box-shadow: 0 0 15px rgba(0, 255, 252, 0.2);
    }

    .worklog-item::before {
        content: '>';
        position: absolute;
        left: 5px;
        top: 20px;
        color: var(--neon-blue);
        opacity: 0.5;
    }

    .worklog-main {
        flex: 1;
        min-width: 0;
        padding-left: 15px;
    }

    .worklog-time {
        color: var(--text-secondary);
        font-size: 0.8rem;
        margin-bottom: 8px;
        font-family: 'Courier New', monospace;
    }

    .worklog-title {
        color: var(--text-primary);
        margin: 0 0 10px 0;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
    }

    .jira-badge {
        background: rgba(0, 82, 204, 0.7);
        color: white;
        padding: 2px 6px;
        border-radius: 0;
        font-size: 0.7rem;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .worklog-desc {
        color: var(--text-secondary);
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.5;
    }

    .worklog-meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 15px;
        flex-shrink: 0;
    }

    .worklog-duration {
        background: rgba(0, 255, 252, 0.1);
        color: var(--neon-blue);
        padding: 6px 12px;
        border-radius: 0;
        font-weight: bold;
        font-size: 0.9rem;
        white-space: nowrap;
        border: 1px solid var(--neon-blue);
    }

    .worklog-actions {
        display: flex;
        gap: 8px;
        align-items: center;
    }

    .jira-btn {
        background: rgba(0, 82, 204, 0.7);
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 0;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .jira-btn:hover:not(:disabled) {
        background: rgba(0, 61, 153, 0.7);
        transform: scale(1.05);
    }

    .jira-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
        transform: none;
    }

    .delete-btn {
        background: none;
        border: none;
        color: var(--accent-error);
        cursor: pointer;
        font-size: 1.2rem;
        opacity: 0.7;
        transition: all 0.3s ease;
        padding: 4px;
    }

    .delete-btn:hover {
        opacity: 1;
        transform: scale(1.1);
    }

    /* Modal Styles */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        backdrop-filter: blur(5px);
    }

    .modal-content {
        background: rgba(5, 5, 8, 0.95);
        border-radius: 0;
        padding: 30px;
        max-width: 500px;
        width: 90%;
        border: 1px solid var(--neon-pink);
        backdrop-filter: blur(10px);
        box-shadow: 0 0 30px rgba(255, 0, 255, 0.3);
    }

    .config-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .form-group label {
        color: var(--text-primary);
        font-weight: bold;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .config-input {
        width: 100%;
        padding: 12px 15px;
        background: rgba(5, 5, 8, 0.7);
        border: 1px solid var(--neon-blue);
        color: var(--text-primary);
        border-radius: 0;
        font-size: 0.9rem;
        transition: all 0.3s ease;
        box-sizing: border-box;
        font-family: 'Courier New', monospace;
    }

    .config-input:focus {
        outline: none;
        border-color: var(--neon-pink);
        box-shadow: 0 0 10px rgba(255, 0, 255, 0.3);
    }

    .config-actions {
        display: flex;
        gap: 15px;
        justify-content: flex-end;
        margin-top: 10px;
    }

    .cancel-btn {
        padding: 10px 20px;
        background: transparent;
        border: 1px solid var(--neon-blue);
        color: var(--text-primary);
        border-radius: 0;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-family: 'Courier New', monospace;
    }

    .cancel-btn:hover {
        background: rgba(0, 255, 252, 0.1);
    }

    .save-btn {
        padding: 10px 20px;
        background: transparent;
        color: var(--neon-pink);
        border: 1px solid var(--neon-pink);
        border-radius: 0;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: bold;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-family: 'Courier New', monospace;
    }

    .save-btn:hover {
        background: rgba(255, 0, 255, 0.1);
        box-shadow: 0 0 10px rgba(255, 0, 255, 0.3);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .worklogs-container {
            padding: 15px;
        }

        .worklogs-header {
            flex-direction: column;
            align-items: stretch;
            gap: 15px;
        }

        .header-actions {
            justify-content: space-between;
        }

        .stats-cards {
            flex-direction: column;
        }

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
            align-self: stretch;
        }

        .modal-content {
            padding: 20px;
            margin: 20px;
        }

        .config-actions {
            flex-direction: column;
        }

        .cancel-btn, .save-btn {
            width: 100%;
        }
    }

    @media (max-width: 480px) {
        .worklog-title {
            font-size: 1rem;
        }

        .stat-card {
            min-width: unset;
        }

        .suggestions-dropdown {
            max-height: 150px;
        }
    }
</style>