<script>
    import { onMount } from 'svelte';
    import { supabase } from './lib/supabase';
    import { session, loading, error, notification } from './lib/stores';
    import Auth from './components/Auth.svelte';
    import Pomodoro from './components/Pomodoro.svelte';
    import Todos from './components/Todos.svelte';
    import Worklogs from './components/Worklogs.svelte';
    import Radio from './components/Radio.svelte';

    let activeTab = 'pomodoro';
    let currentSession = null;
    let isLoading = true;
    let errorMessage = '';
    let notificationMessage = '';
    let sidebarOpen = false;

    // Subscribe to stores
    session.subscribe(value => currentSession = value);
    loading.subscribe(value => isLoading = value);
    error.subscribe(value => errorMessage = value);
    notification.subscribe(value => notificationMessage = value);

    const tabs = [
        { id: 'pomodoro', label: 'Pomodoro', icon: '🍅', component: Pomodoro },
        { id: 'todos', label: 'Tasks', icon: '✅', component: Todos },
        { id: 'worklogs', label: 'Logs', icon: '📊', component: Worklogs },
        { id: 'radio', label: 'Radio', icon: '🎵', component: Radio }
    ];

    async function handleSignOut() {
        if (confirm('Ready to close your productive session?')) {
            loading.set(true);
            await supabase.auth.signOut();
        }
    }

    function clearError() {
        error.set('');
    }

    function clearNotification() {
        notification.set('');
    }

    function toggleSidebar() {
        sidebarOpen = !sidebarOpen;
    }

    function selectTab(tabId) {
        activeTab = tabId;
        sidebarOpen = false;
    }

    onMount(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session: sess } }) => {
            session.set(sess);
            loading.set(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, sess) => {
                session.set(sess);
                loading.set(false);

                if (event === 'SIGNED_OUT') {
                    activeTab = 'pomodoro';
                }
            }
        );

        return () => {
            subscription?.unsubscribe();
        };
    });
</script>

<svelte:head>
    <title>Pomoson</title>
    <meta name="description" content="Stay focused and productive">
</svelte:head>

<main class="app">
    <!-- Global Notifications -->
    {#if errorMessage}
        <div class="notification error-notification">
            <span>❌ {errorMessage}</span>
            <button on:click={clearError} class="close-btn">✕</button>
        </div>
    {/if}

    {#if notificationMessage}
        <div class="notification success-notification">
            <span>{notificationMessage}</span>
            <button on:click={clearNotification} class="close-btn">✕</button>
        </div>
    {/if}

    <!-- Loading State -->
    {#if isLoading}
        <div class="loading-screen">
            <div class="loading-content">
                <h1>🍅 Pomoson</h1>
                <p>⏳ Loading...</p>
            </div>
        </div>
    {:else if !currentSession}
        <Auth/>
    {:else}
        <div class="app-layout">
            <!-- Floating Navigation -->
            <div class="cyber-nav">
                {#each tabs as tab}
                    <button
                            on:click={() => selectTab(tab.id)}
                            class="nav-btn"
                            class:active={activeTab === tab.id}
                            title={tab.label}
                    >
                        <span class="nav-icon">{tab.icon}</span>
                        <span>{tab.label}</span>
                    </button>
                {/each}

                <button on:click={handleSignOut} class="nav-btn sign-out-btn" title="Sign Out">
                    <span class="nav-icon">👋</span>
                    <span>Sign Out</span>
                </button>
            </div>


            <!-- Main Content -->
            <div class="main-content">
                <header class="coffee-header">
                    <div class="coffee-foam"></div>
                </header>

                <div class="content-wrapper">
                    {#if activeTab === 'pomodoro'}
                        <Pomodoro/>
                    {:else if activeTab === 'todos'}
                        <Todos/>
                    {:else if activeTab === 'worklogs'}
                        <Worklogs/>
                    {:else if activeTab === 'radio'}
                        <Radio/>
                    {/if}
                </div>
            </div>
        </div>
    {/if}
</main>

<style>
    :root {
        --neon-blue: #0ff0fc;
        --neon-pink: #ff00ff;
        --neon-purple: #bc13fe;
        --dark-bg: #0a0a12;
        --darker-bg: #050508;
        --panel-bg: rgba(10, 10, 18, 0.4);
        --text-primary: #e0e0ff;
        --text-secondary: #a0a0c0;
        --accent-error: #ff3860;
    }

    :global(*) {
        box-sizing: border-box;
        scrollbar-color: var(--neon-blue) var(--dark-bg);
    }

    :global(body) {
        margin: 0;
        font-family: 'Courier New', monospace, 'SF Mono', 'Roboto Mono', sans-serif;
        background: var(--dark-bg);
        color: var(--text-primary);
        line-height: 1.5;
        overflow-x: hidden;
    }

    :global(::-webkit-scrollbar) {
        width: 8px;
        height: 8px;
    }

    :global(::-webkit-scrollbar-track) {
        background: var(--dark-bg);
    }

    :global(::-webkit-scrollbar-thumb) {
        background: var(--neon-blue);
        border-radius: 4px;
    }

    :global(::-webkit-scrollbar-thumb:hover) {
        background: var(--neon-purple);
    }

    .app {
        min-height: 100vh;
        position: relative;
        background:
                radial-gradient(circle at 20% 30%, rgba(188, 19, 254, 0.15) 0%, transparent 30%),
                radial-gradient(circle at 80% 70%, rgba(0, 255, 252, 0.15) 0%, transparent 30%),
                var(--dark-bg);
    }

    .app-layout {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        position: relative;
    }

    /* Cyberpunk Navigation */
    .cyber-nav {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 8px;
        background: var(--panel-bg);
        backdrop-filter: blur(8px);
        padding: 10px 10px;
        border-radius: 4px;
        box-shadow: 0 0 15px rgba(0, 255, 252, 0.2);
        z-index: 100;
        border: 1px solid var(--neon-blue);
    }

    .nav-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 8px 8px;
        border-radius: 2px;
        transition: all 0.2s ease;
        cursor: pointer;
        position: relative;
        font-family: 'Courier New', monospace;
        text-transform: uppercase;
        font-size: 0.7rem;
        letter-spacing: 1px;
    }

    .nav-btn:hover {
        color: var(--neon-blue);
        text-shadow: 0 0 5px var(--neon-blue);
    }

    .nav-btn.active {
        color: var(--neon-pink);
        text-shadow: 0 0 8px var(--neon-pink);
        background: rgba(188, 19, 254, 0.1);
    }

    .nav-btn.active::after {
        content: '';
        position: absolute;
        bottom: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 60%;
        height: 2px;
        background: var(--neon-pink);
        box-shadow: 0 0 5px var(--neon-pink);
    }

    .nav-icon {
        font-size: 1.2rem;
    }

    .sign-out-btn {
        color: var(--accent-error);
    }

    @keyframes scanline {
        0% { background-position: 0 -100vh; }
        100% { background-position: 0 100vh; }
    }

    /* Main Content */
    .main-content {
        flex: 1;
        padding-bottom: 100px;
        position: relative;
    }

    .main-content::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
                rgba(10, 10, 18, 0.8) 50%,
                rgba(0, 255, 252, 0.1) 50%
        );
        background-size: 100% 4px;
        pointer-events: none;
        animation: scanline 8s linear infinite;
        opacity: 0.15;
        z-index: 0;
    }

    .content-wrapper {
        max-width: 900px;
        margin: 0 auto;
        padding: 0 20px;
        position: relative;
        z-index: 1;
    }

    /* Responsive Adjustments */
    @media (max-width: 768px) {
        .cyber-nav {
            bottom: 10px;
            padding: 8px 12px;
        }

        .nav-btn {
            padding: 6px 8px;
            font-size: 0.6rem;
        }

        .nav-icon {
            font-size: 1rem;
        }
    }

    @media (max-width: 480px) {
        .cyber-nav {
            width: 95%;
            justify-content: space-around;
            gap: 2px;
        }

        .nav-btn span:not(.nav-icon) {
            display: none;
        }

        .nav-btn {
            padding: 8px 10px;
        }
    }

    .notification {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 20px;
        border-radius: 6px;
        font-size: 0.9rem;
        font-weight: bold;
        box-shadow: 0 0 12px rgba(0, 255, 252, 0.4);
        backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 9999;
        border: 1px solid;
        max-width: 80%;
        text-align: center;
        animation: fadeInDown 0.4s ease-out;
    }

    .error-notification {
        background: rgba(255, 56, 96, 0.1);
        color: #ff3860;
        border-color: #ff3860;
    }

    .success-notification {
        background: rgba(0, 255, 252, 0.1);
        color: var(--neon-blue);
        border-color: var(--neon-blue);
    }

    .close-btn {
        background: none;
        border: none;
        color: inherit;
        font-size: 1rem;
        cursor: pointer;
        margin-left: auto;
        padding: 0;
        transition: color 0.2s;
    }

    .close-btn:hover {
        color: white;
    }

    /* Animation */
    @keyframes fadeInDown {
        from {
            opacity: 0;
            transform: translate(-50%, -20px);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }

</style>