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
        sidebarOpen = false; // Close sidebar on mobile after selection
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
    <title>☕ Pomoson - Your Productive Coffee Break</title>
    <meta name="description" content="Stay focused and productive with our cozy coffee-themed productivity app">
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
            <!-- Floating Coffee Bean Navigation -->
            <div class="coffee-bean-nav">
                {#each tabs as tab}
                    <button
                            on:click={() => selectTab(tab.id)}
                            class="bean-btn"
                            class:active={activeTab === tab.id}
                            title={tab.label}
                    >
                        <span class="bean-icon">{tab.icon}</span>
                        <span class="bean-label">{tab.label}</span>
                    </button>
                {/each}

                <button on:click={handleSignOut} class="bean-btn sign-out-btn" title="Sign Out">
                    <span class="bean-icon">👋</span>
                    <span class="bean-label">Sign Out</span>
                </button>
            </div>

            <!-- Main Content -->
            <div class="main-content">
                <!-- Coffee Mug Header -->
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
        --coffee-dark: #2C1810;
        --coffee-darker: #1A0F0A;
        --coffee-brown: #8B4513;
        --coffee-light: #A0522D;
        --coffee-cream: #D2B48C;
        --coffee-foam: #F5E6D3;
        --coffee-accent: #E6B325;
    }

    :global(*) {
        box-sizing: border-box;
    }

    :global(body) {
        margin: 0;
        font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        background: linear-gradient(135deg, var(--coffee-dark) 0%, var(--coffee-darker) 100%);
        color: var(--coffee-foam);
        line-height: 1.6;
    }

    :global(::-webkit-scrollbar) {
        width: 8px;
    }

    :global(::-webkit-scrollbar-track) {
        background: #1A0F0A;
    }

    :global(::-webkit-scrollbar-thumb) {
        background: #8B4513;
        border-radius: 4px;
    }

    :global(::-webkit-scrollbar-thumb:hover) {
        background: #A0522D;
    }

    .app {
        min-height: 100vh;
        position: relative;
    }

    .app-layout {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
    }

    /* Coffee Bean Navigation */
    .coffee-bean-nav {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 10px;
        background: rgba(26, 15, 10, 0.8);
        backdrop-filter: blur(10px);
        padding: 12px 20px;
        border-radius: 50px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 100;
        border: 1px solid rgba(139, 69, 19, 0.3);
    }

    .bean-btn {
        background: none;
        border: none;
        color: var(--coffee-cream);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 8px 12px;
        border-radius: 30px;
        transition: all 0.3s ease;
        cursor: pointer;
        position: relative;
    }

    .bean-btn:hover {
        background: rgba(160, 82, 45, 0.2);
        transform: translateY(-3px);
    }

    .bean-btn.active {
        background: rgba(160, 82, 45, 0.3);
        color: var(--coffee-foam);
        box-shadow: 0 4px 12px rgba(139, 69, 19, 0.3);
    }

    .bean-icon {
        font-size: 1.4rem;
    }

    .bean-label {
        font-size: 0.7rem;
        font-weight: 500;
    }

    .sign-out-btn {
        color: #FF6B6B;
    }



    @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
    }

    @keyframes steam {
        0%, 100% { opacity: 0.5; transform: translateY(0) scale(1); }
        50% { opacity: 0.8; transform: translateY(-8px) scale(1.1); }
    }

    /* Main Content */
    .main-content {
        flex: 1;
        padding-bottom: 100px; /* Space for navigation */
    }

    .content-wrapper {
        max-width: 900px;
        margin: 0 auto;
        padding: 0 20px;
    }

    .coffee-header {
        padding: 10px 10px 10px;
    }

    /* Responsive Adjustments */
    @media (max-width: 768px) {
        .coffee-bean-nav {
            bottom: 10px;
            padding: 8px 12px;
        }

        .bean-btn {
            padding: 6px 8px;
        }

        .bean-icon {
            font-size: 1.2rem;
        }

        .bean-label {
            font-size: 0.6rem;
        }

        .coffee-header {
            padding: 10px 10px 10px;
        }

    }

    @media (max-width: 480px) {
        .coffee-bean-nav {
            width: 95%;
            justify-content: space-around;
            gap: 5px;
        }

        .bean-label {
            display: none;
        }

        .bean-btn {
            padding: 10px;
        }

        .app-title {
            font-size: 1.5rem;
        }
    }
</style>