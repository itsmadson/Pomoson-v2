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
        padding: 24px 20px;
    }

    .worklogs-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 32px;
        flex-wrap: wrap;
        gap: 16px;
    }

    h2 {
        color: var(--text-primary);
        margin: 0;
        font-size: 28px;
        font-weight: 600;
        letter-spacing: -0.02em;
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
    }

    .date-input {
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid var(--glass-border);
        color: var(--text-primary);
        border-radius: 16px;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .date-input:focus {
        outline: none;
        border-color: var(--neon-blue);
        box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.2);
    }

    .config-btn {
        padding: 12px 16px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid var(--glass-border);
        color: var(--text-primary);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-weight: 500;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .config-btn.configured {
        border-color: var(--neon-purple);
        color: var(--neon-purple);
    }

    .config-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.25);
    }

    .stats-cards {
        display: flex;
        gap: 16px;
        margin-bottom: 32px;
        flex-wrap: wrap;
    }

    .stat-card {
        flex: 1;
        min-width: 160px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        padding: 20px;
        text-align: center;
        border: 1px solid var(--glass-border);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        backdrop-filter: blur(20px) saturate(1.8);
        -webkit-backdrop-filter: blur(20px) saturate(1.8);
    }

    .stat-card:hover {
        transform: translateY(-4px);
        box-shadow: var(--glass-shadow);
        border-color: rgba(255, 255, 255, 0.25);
    }

    .stat-card.accent {
        border-color: rgba(139, 92, 246, 0.3);
    }

    .stat-icon {
        font-size: 24px;
        margin-bottom: 12px;
        display: block;
        color: var(--neon-blue);
    }

    .stat-card.accent .stat-icon {
        color: var(--neon-purple);
    }

    .stat-value {
        font-size: 28px;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 4px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .stat-label {
        color: var(--text-secondary);
        font-size: 14px;
        font-weight: 500;
    }

    .add-worklog {
        background: rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        padding: 28px;
        margin-bottom: 32px;
        border: 1px solid var(--glass-border);
        box-shadow: var(--glass-shadow);
        backdrop-filter: blur(20px) saturate(1.8);
        -webkit-backdrop-filter: blur(20px) saturate(1.8);
    }

    h3 {
        color: var(--text-primary);
        margin-top: 0;
        margin-bottom: 20px;
        font-size: 20px;
        font-weight: 600;
        letter-spacing: -0.01em;
    }

    .add-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .worklog-input, .worklog-textarea {
        width: 100%;
        padding: 14px 16px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid var(--glass-border);
        color: var(--text-primary);
        border-radius: 16px;
        font-size: 15px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .worklog-input:focus, .worklog-textarea:focus {
        outline: none;
        border-color: var(--neon-blue);
        box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.2);
    }

    .worklog-input::placeholder, .worklog-textarea::placeholder {
        color: var(--text-secondary);
        opacity: 0.7;
    }

    .worklog-textarea {
        min-height: 100px;
        resize: vertical;
    }

    .duration-row {
        display: flex;
        align-items: flex-end;
        gap: 16px;
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
        font-size: 14px;
        font-weight: 500;
    }

    .duration-field {
        width: 100%;
        padding: 14px 16px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid var(--glass-border);
        color: var(--text-primary);
        border-radius: 16px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .duration-field:focus {
        outline: none;
        border-color: var(--neon-blue);
        box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.2);
    }

    .add-btn {
        padding: 14px 28px;
        background: rgba(0, 212, 255, 0.15);
        color: var(--neon-blue);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        align-self: flex-end;
        white-space: nowrap;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 15px;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .add-btn:hover:not(:disabled) {
        background: rgba(0, 212, 255, 0.2);
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    }

    .add-btn:disabled {
        border-color: rgba(255, 255, 255, 0.05);
        color: var(--text-secondary);
        cursor: not-allowed;
        opacity: 0.5;
    }

    .loading-state, .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: var(--text-secondary);
    }

    .terminal-icon {
        font-size: 48px;
        margin-bottom: 16px;
        color: var(--neon-blue);
    }

    .empty-state h3 {
        color: var(--text-primary);
        margin: 0 0 12px 0;
        font-weight: 600;
    }

    .empty-state p {
        margin: 0;
        opacity: 0.8;
        font-size: 15px;
    }

    .worklogs-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .worklog-item {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 20px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        padding: 20px;
        border: 1px solid var(--glass-border);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        backdrop-filter: blur(20px) saturate(1.8);
        -webkit-backdrop-filter: blur(20px) saturate(1.8);
    }

    .worklog-item:hover {
        background: rgba(255, 255, 255, 0.12);
        transform: translateY(-4px);
        box-shadow: var(--glass-shadow);
    }

    .worklog-main {
        flex: 1;
        min-width: 0;
    }

    .worklog-time {
        color: var(--text-secondary);
        font-size: 14px;
        margin-bottom: 8px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .worklog-title {
        color: var(--text-primary);
        margin: 0 0 12px 0;
        font-size: 18px;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        font-weight: 500;
    }

    .jira-badge {
        background: rgba(0, 82, 204, 0.7);
        color: white;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .worklog-desc {
        color: var(--text-secondary);
        margin: 0;
        font-size: 15px;
        line-height: 1.5;
    }

    .worklog-meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 16px;
        flex-shrink: 0;
    }

    .worklog-duration {
        background: rgba(0, 212, 255, 0.15);
        color: var(--neon-blue);
        padding: 8px 14px;
        border-radius: 16px;
        font-weight: 500;
        font-size: 14px;
        white-space: nowrap;
        border: 1px solid rgba(0, 212, 255, 0.3);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
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
        padding: 8px 14px;
        border-radius: 16px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-weight: 500;
    }

    .jira-btn:hover:not(:disabled) {
        background: rgba(0, 82, 204, 0.8);
        transform: translateY(-2px);
    }

    .jira-btn:disabled {
        background: rgba(255, 255, 255, 0.1);
        cursor: not-allowed;
        transform: none;
    }

    .delete-btn {
        background: none;
        border: none;
        color: var(--accent-error);
        cursor: pointer;
        font-size: 20px;
        opacity: 0.7;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        padding: 4px;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .delete-btn:hover {
        opacity: 1;
        background: rgba(255, 69, 58, 0.1);
    }

    /* Modal Styles */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .modal-content {
        background: rgba(30, 30, 30, 0.95);
        border-radius: 24px;
        padding: 32px;
        max-width: 500px;
        width: 90%;
        border: 1px solid var(--glass-border);
        box-shadow: var(--glass-shadow);
        backdrop-filter: blur(40px) saturate(1.8);
        -webkit-backdrop-filter: blur(40px) saturate(1.8);
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
        font-weight: 500;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .config-input {
        width: 100%;
        padding: 14px 16px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid var(--glass-border);
        color: var(--text-primary);
        border-radius: 16px;
        font-size: 15px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .config-input:focus {
        outline: none;
        border-color: var(--neon-blue);
        box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.2);
    }

    .config-actions {
        display: flex;
        gap: 16px;
        justify-content: flex-end;
        margin-top: 16px;
    }

    .cancel-btn {
        padding: 12px 20px;
        background: transparent;
        border: 1px solid var(--glass-border);
        color: var(--text-primary);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 15px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-weight: 500;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .cancel-btn:hover {
        background: rgba(255, 255, 255, 0.08);
    }

    .save-btn {
        padding: 12px 20px;
        background: rgba(139, 92, 246, 0.15);
        color: var(--neon-purple);
        border: 1px solid rgba(139, 92, 246, 0.3);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-weight: 500;
        font-size: 15px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .save-btn:hover {
        background: rgba(139, 92, 246, 0.2);
        transform: translateY(-2px);
    }

    @media (max-width: 768px) {
        .worklogs-container {
            padding: 20px 16px;
        }

        .worklogs-header {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
        }

        .header-actions {
            justify-content: space-between;
        }

        .stats-cards {
            flex-direction: column;
        }

        .worklog-item {
            flex-direction: column;
            gap: 16px;
        }

        .worklog-meta {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            width: 100%;
        }

        .duration-row {
            flex-direction: column;
            gap: 16px;
        }

        .add-btn {
            width: 100%;
            align-self: stretch;
        }

        .modal-content {
            padding: 24px;
            margin: 16px;
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
            font-size: 16px;
        }

        .stat-card {
            min-width: unset;
        }
    }
</style>