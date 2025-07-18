<script>
    import { onMount } from 'svelte';
    import { supabase } from './lib/supabase';
    import { session, loading, error, notification } from './lib/stores';
    import Auth from './components/Auth.svelte';
    import Pomodoro from './components/Pomodoro.svelte';
    import Todos from './components/Todos.svelte';
    import Worklogs from './components/Worklogs.svelte';
    import Radio from './components/Radio.svelte';
    import { theme } from './lib/theme';

    let currentTheme;
    theme.subscribe(value => {
        currentTheme = value;
        document.documentElement.setAttribute('data-theme', value);
    });

    const themeBackgrounds = {
        Pomoson: `
        radial-gradient(at 20% 30%, rgba(93, 71, 139, 0.12), transparent 60%),
        radial-gradient(at 80% 70%, rgba(51, 102, 153, 0.10), transparent 60%),
        radial-gradient(at 60% 40%, rgba(242, 204, 143, 0.08), transparent 60%),
        radial-gradient(at 50% 50%, rgba(10, 10, 10, 0.03), transparent 70%)`,

        dracula: `
        radial-gradient(at 30% 30%, rgba(189, 147, 249, 0.15), transparent 60%),
        radial-gradient(at 70% 70%, rgba(255, 121, 198, 0.12), transparent 60%),
        radial-gradient(at 60% 40%, rgba(139, 233, 253, 0.08), transparent 60%)`,

        gruvbox: `
        radial-gradient(at 20% 30%, rgba(184, 129, 69, 0.15), transparent 60%),
        radial-gradient(at 80% 70%, rgba(168, 153, 132, 0.1), transparent 60%)`,

        jungle: `
        radial-gradient(at 25% 30%, rgba(106, 176, 76, 0.15), transparent 60%),
        radial-gradient(at 75% 70%, rgba(34, 166, 179, 0.1), transparent 60%)`,

        light: `
        radial-gradient(at 20% 30%, rgba(142, 36, 170, 0.12), transparent 60%),
        radial-gradient(at 80% 70%, rgba(30, 136, 229, 0.1), transparent 60%)`,

        mono: `
        radial-gradient(at 20% 30%, rgba(150, 150, 150, 0.12), transparent 60%),
        radial-gradient(at 80% 70%, rgba(100, 100, 100, 0.1), transparent 60%)`,

        "yellow-gruvbox": `
        radial-gradient(at 25% 25%, rgba(152, 151, 26, 0.12), transparent 60%),
        radial-gradient(at 80% 70%, rgba(184, 187, 38, 0.10), transparent 60%),
        radial-gradient(at 60% 40%, rgba(121, 116, 14, 0.08), transparent 60%),
        radial-gradient(at 50% 50%, rgba(40, 40, 40, 0.02), transparent 70%)`,

        "pink-acid": `
        radial-gradient(at 20% 20%, rgba(249, 38, 114, 0.10), transparent 60%),
        radial-gradient(at 80% 75%, rgba(166, 226, 46, 0.10), transparent 60%),
        radial-gradient(at 60% 40%, rgba(253, 151, 31, 0.08), transparent 60%),
        radial-gradient(at 50% 50%, rgba(39, 40, 34, 0.02), transparent 70%)`,

        "frosty-blue": `
        radial-gradient(at 20% 25%, rgba(136, 192, 208, 0.10), transparent 60%),
        radial-gradient(at 70% 70%, rgba(94, 129, 172, 0.10), transparent 60%),
        radial-gradient(at 60% 30%, rgba(59, 66, 82, 0.08), transparent 60%),
        radial-gradient(at 50% 50%, rgba(46, 52, 64, 0.02), transparent 70%)`,

        "warm-gruvbox": `
        radial-gradient(at 20% 20%, rgba(152, 151, 26, 0.14), transparent 60%),
        radial-gradient(at 80% 75%, rgba(184, 187, 38, 0.12), transparent 60%),
        radial-gradient(at 50% 60%, rgba(121, 116, 14, 0.10), transparent 60%),
        radial-gradient(at 40% 40%, rgba(60, 56, 54, 0.10), transparent 70%),
        radial-gradient(at 65% 30%, rgba(146, 131, 116, 0.06), transparent 65%),
        radial-gradient(at 50% 50%, rgba(40, 40, 40, 0.03), transparent 75%)`,

        "blue-purple-green": `
        radial-gradient(at 25% 30%, rgba(97, 175, 239, 0.10), transparent 60%),
        radial-gradient(at 80% 70%, rgba(198, 120, 221, 0.10), transparent 60%),
        radial-gradient(at 60% 40%, rgba(152, 195, 121, 0.08), transparent 60%),
        radial-gradient(at 50% 50%, rgba(40, 44, 52, 0.02), transparent 70%)`,

        "neon-night": `
        radial-gradient(at 10% 20%, rgba(255, 0, 153, 0.14), transparent 60%),
        radial-gradient(at 90% 60%, rgba(0, 255, 255, 0.12), transparent 60%),
        radial-gradient(at 50% 50%, rgba(255, 255, 0, 0.06), transparent 60%),
        radial-gradient(at 70% 30%, rgba(0, 0, 0, 0.06), transparent 70%)`,

        "solarized-teal": `
        radial-gradient(at 15% 15%, rgba(0, 150, 199, 0.10), transparent 60%),
        radial-gradient(at 70% 85%, rgba(0, 214, 170, 0.12), transparent 60%),
        radial-gradient(at 50% 50%, rgba(7, 54, 66, 0.08), transparent 70%),
        radial-gradient(at 30% 60%, rgba(38, 139, 210, 0.06), transparent 65%)`,

        "mystical-purple": `
        radial-gradient(at 20% 30%, rgba(93, 71, 139, 0.12), transparent 60%),
        radial-gradient(at 80% 70%, rgba(51, 102, 153, 0.10), transparent 60%),
        radial-gradient(at 60% 40%, rgba(242, 204, 143, 0.08), transparent 60%),
        radial-gradient(at 50% 50%, rgba(10, 10, 10, 0.03), transparent 70%)`,

        "sunset-sky": `
        radial-gradient(at 10% 20%, rgba(255, 94, 87, 0.12), transparent 60%),
        radial-gradient(at 80% 80%, rgba(255, 195, 113, 0.10), transparent 60%),
        radial-gradient(at 60% 40%, rgba(255, 247, 174, 0.08), transparent 60%),
        radial-gradient(at 50% 50%, rgba(50, 10, 30, 0.02), transparent 70%)`,

        matrix: `
        radial-gradient(at 20% 30%, rgba(0, 255, 0, 0.10), transparent 60%),
        radial-gradient(at 80% 70%, rgba(0, 128, 0, 0.08), transparent 60%),
        radial-gradient(at 50% 50%, rgba(0, 64, 0, 0.06), transparent 70%),
        radial-gradient(at 70% 20%, rgba(10, 10, 10, 0.04), transparent 65%)`
    };

    const themeBgColors = {
        Pomoson: '#1a1b26',
        dracula: '#282a36',
        gruvbox: '#282828',
        jungle: '#1e272e',
        light: '#f5f5f5',
        mono: '#111',

        "yellow-gruvbox": '#1d2021',
        "pink-acid": '#272822',
        "frosty-blue": '#2e3440',
        "warm-gruvbox": '#1d2021',
        "blue-purple-green": '#282c34',
        "neon-night": '#0f0c29',
        "solarized-teal": '#073642',
        "mystical-purple": '#1a1b26',
        "sunset-sky": '#2c001e',
        matrix: '#0c0c0c'
    };


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
        { id: 'pomodoro', label: 'Pomodoro', icon: '⧖', component: Pomodoro },
        { id: 'todos', label: 'Tasks', icon: '✓', component: Todos },
        { id: 'worklogs', label: 'WorkLogs', icon: '≣', component: Worklogs },
        { id: 'radio', label: 'Radio', icon: '♫', component: Radio }
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
                    <span class="nav-icon">✖</span>
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
    <div
            class="dynamic-background"
            style="
        background: {themeBackgrounds[currentTheme]};
        background-color: {themeBgColors[currentTheme]};
    "
    ></div>

</main>

<style>
    :root {
        --neon-blue: #00d4ff;
        --neon-pink: #ff006e;
        --neon-purple: #8b5cf6;
        --dark-bg: rgba(0, 0, 0, 0.85);
        --darker-bg: rgba(0, 0, 0, 0.95);
        --panel-bg: rgba(255, 255, 255, 0.08);
        --text-primary: rgba(255, 255, 255, 0.95);
        --text-secondary: rgba(255, 255, 255, 0.7);
        --accent-error: #ff453a;
        --glass-border: rgba(255, 255, 255, 0.15);
        --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    :root[data-theme='Pomoson'] {
        --neon-blue: #00d4ff;
        --neon-pink: #ff006e;
        --neon-purple: #8b5cf6;
        --dark-bg: #0f0f0f;
        --panel-bg: rgba(255, 255, 255, 0.08);
        --text-primary: #fff;
        --text-secondary: #aaa;
        --accent-error: #ff453a;
    }

    :root[data-theme='dracula'] {
        --neon-blue: #8be9fd;
        --neon-pink: #ff79c6;
        --neon-purple: #bd93f9;
        --dark-bg: #282a36;
        --panel-bg: #44475a;
        --text-primary: #f8f8f2;
        --text-secondary: #6272a4;
        --accent-error: #ff5555;
    }

    :root[data-theme='gruvbox'] {
        --neon-blue: #83a598;
        --neon-pink: #d3869b;
        --neon-purple: #b16286;
        --dark-bg: #282828;
        --panel-bg: #3c3836;
        --text-primary: #ebdbb2;
        --text-secondary: #a89984;
        --accent-error: #cc241d;
    }

    :root[data-theme='jungle'] {
        --neon-blue: #6ab04c;
        --neon-pink: #f0932b;
        --neon-purple: #22a6b3;
        --dark-bg: #1e272e;
        --panel-bg: #2f3640;
        --text-primary: #dcdde1;
        --text-secondary: #7f8fa6;
        --accent-error: #ff4757;
    }

    :root[data-theme='light'] {
        --neon-blue: #1e88e5;
        --neon-pink: #d81b60;
        --neon-purple: #8e24aa;
        --dark-bg: #f5f5f5;
        --panel-bg: #ffffff;
        --text-primary: #111;
        --text-secondary: #444;
        --accent-error: #e53935;
    }

    :root[data-theme='mono'] {
        --neon-blue: #666;
        --neon-pink: #999;
        --neon-purple: #aaa;
        --dark-bg: #111;
        --panel-bg: #222;
        --text-primary: #eee;
        --text-secondary: #aaa;
        --accent-error: #c00;
    }


    :global(*) {
        box-sizing: border-box;
        scrollbar-color: var(--neon-blue) transparent;
    }

    :global(body) {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
        color: var(--text-primary);
        line-height: 1.6;
        overflow-x: hidden;
        -webkit-font-smoothing: antialiased;
    }

    :global(::-webkit-scrollbar) {
        width: 6px;
        height: 6px;
    }

    :global(::-webkit-scrollbar-track) {
        background: transparent;
    }

    :global(::-webkit-scrollbar-thumb) {
        background: var(--neon-blue);
        border-radius: 8px;
        border: 1px solid rgba(0, 0, 0, 0.3);
    }

    :global(::-webkit-scrollbar-thumb:hover) {
        background: var(--neon-purple);
    }

    .dynamic-background {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: -1;
        pointer-events: none;
        animation: moveBackground 12s ease-in-out infinite;
        opacity: 0.85;
        will-change: transform;
    }

    @keyframes moveBackground {
        0% {
            transform: scale(2.5) rotate(0deg);
        }
        50% {
            transform: scale(2.5) rotate(180deg);
        }
        100% {
            transform: scale(2.5) rotate(360deg);
        }
    }


    .app-layout {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        position: relative;
    }

    /* iOS-style Navigation */
    .cyber-nav {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 4px;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(20px) saturate(1.8);
        -webkit-backdrop-filter: blur(20px) saturate(1.8);
        padding: 8px;
        border-radius: 24px;
        box-shadow: var(--glass-shadow);
        z-index: 100;
        border: 1px solid var(--glass-border);
    }

    .nav-btn {
        background: none;
        border: none;
        color: var(--text-secondary);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 12px 16px;
        border-radius: 18px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        position: relative;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-weight: 500;
        font-size: 11px;
        min-width: 64px;
    }

    .nav-btn:hover {
        color: var(--text-primary);
        background: rgba(255, 255, 255, 0.1);
    }

    .nav-btn.active {
        color: var(--neon-blue);
        background: rgba(0, 212, 255, 0.15);
    }

    .nav-icon {
        font-size: 22px;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .nav-btn.active .nav-icon {
        transform: scale(1.1);
    }

    .sign-out-btn {
        color: var(--accent-error);
    }

    /* Main Content */
    .main-content {
        flex: 1;
        padding-bottom: 70px;
        position: relative;
    }

    .content-wrapper {
        max-width: 900px;
        margin: 0 auto;
        padding: 32px 20px;
        position: relative;
        z-index: 1;
    }

    /* Notification */
    .notification {
        position: fixed;
        top: 24px;
        left: 50%;
        transform: translateX(-50%);
        padding: 16px 24px;
        border-radius: 16px;
        font-size: 14px;
        font-weight: 500;
        backdrop-filter: blur(20px) saturate(1.8);
        -webkit-backdrop-filter: blur(20px) saturate(1.8);
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 9999;
        border: 1px solid var(--glass-border);
        max-width: 80%;
        text-align: center;
        animation: slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: var(--glass-shadow);
    }

    .error-notification {
        background: rgba(255, 69, 58, 0.15);
        color: var(--accent-error);
        border-color: rgba(255, 69, 58, 0.3);
    }

    .success-notification {
        background: rgba(0, 212, 255, 0.15);
        color: var(--neon-blue);
        border-color: rgba(0, 212, 255, 0.3);
    }

    .close-btn {
        background: none;
        border: none;
        color: inherit;
        font-size: 16px;
        cursor: pointer;
        margin-left: auto;
        padding: 0;
        opacity: 0.7;
        transition: opacity 0.2s;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .close-btn:hover {
        opacity: 1;
        background: rgba(255, 255, 255, 0.1);
    }

    /* Animation */
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translate(-50%, -20px);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }

    @media (max-width: 768px) {
        .cyber-nav {
            bottom: 16px;
            padding: 6px;
        }

        .nav-btn {
            padding: 10px 12px;
            font-size: 10px;
            min-width: 56px;
        }

        .nav-icon {
            font-size: 20px;
        }

        .content-wrapper {
            padding: 24px 16px;
        }
    }

    @media (max-width: 480px) {
        .cyber-nav {
            width: calc(100% - 32px);
            justify-content: space-around;
            gap: 2px;
        }

        .nav-btn span:not(.nav-icon) {
            display: none;
        }

        .nav-btn {
            padding: 10px 8px;
            min-width: 48px;
        }
    }
</style>