<script>
    import { supabase } from '../lib/supabase';
    import { showError, showNotification } from '../lib/stores';

    let email = '';
    let password = '';
    let isLogin = true;
    let isLoading = false;

    async function handleAuth() {
        if (!email || !password) {
            showError('Please fill in all fields');
            return;
        }

        if (!isValidEmail(email)) {
            showError('Please enter a valid email address');
            return;
        }

        if (password.length < 6) {
            showError('Password must be at least 6 characters');
            return;
        }

        isLoading = true;

        try {
            if (isLogin) {
                const {error} = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password
                });
                if (error) throw error;
                showNotification('✅ Logged in successfully!');
            } else {
                const {error} = await supabase.auth.signUp({
                    email: email.trim(),
                    password
                });
                if (error) throw error;
                showNotification('✅ Account created! Please check your email to verify.');
            }
        } catch (err) {
            showError(err.message);
        } finally {
            isLoading = false;
        }
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function handleKeyPress(event) {
        if (event.key === 'Enter') {
            handleAuth();
        }
    }
</script>

<div class="auth-container">
    <div class="auth-card">
        <div class="coffee-icon">☕</div>
        <h1>Pomoson</h1>
        <p class="subtitle">{isLogin ? 'Sign in to your coffee-powered productivity' : 'Brew a new account'}</p>

        <div class="form-group">
            <label class="input-label">
                <span class="input-icon">📧</span>
                <input
                        type="email"
                        bind:value={email}
                        placeholder="Email address"
                        class="input-field"
                        on:keypress={handleKeyPress}
                        disabled={isLoading}
                >
            </label>
        </div>

        <div class="form-group">
            <label class="input-label">
                <span class="input-icon">🔒</span>
                <input
                        type="password"
                        bind:value={password}
                        placeholder="Password"
                        class="input-field"
                        on:keypress={handleKeyPress}
                        disabled={isLoading}
                >
            </label>
        </div>

        <button
                on:click={handleAuth}
                class="auth-button"
                disabled={isLoading}
        >
            {#if isLoading}
                <span class="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </span>
            {:else}
                {isLogin ? 'Brew My Session' : 'Create Account'}
            {/if}
        </button>

        <button
                on:click={() => isLogin = !isLogin}
                class="toggle-button"
                disabled={isLoading}
        >
            {isLogin ? 'Need a fresh cup? Sign up' : 'Already have a brew? Sign in'}
        </button>
    </div>
</div>

<style>
    .auth-container {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 20px;
        background:
                radial-gradient(ellipse at top, rgba(139, 92, 246, 0.1) 0%, transparent 60%),
                radial-gradient(ellipse at bottom, rgba(0, 212, 255, 0.08) 0%, transparent 60%),
                linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
        position: relative;
        overflow: hidden;
    }

    .auth-card {
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(40px) saturate(1.8);
        -webkit-backdrop-filter: blur(40px) saturate(1.8);
        border-radius: 28px;
        padding: 48px;
        max-width: 420px;
        width: 100%;
        text-align: center;
        box-shadow: var(--glass-shadow);
        border: 1px solid var(--glass-border);
        position: relative;
        overflow: hidden;
    }

    .auth-card::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
                135deg,
                rgba(255, 255, 255, 0.05) 0%,
                rgba(255, 255, 255, 0) 60%
        );
        pointer-events: none;
    }

    .cyber-icon {
        font-size: 48px;
        margin-bottom: 16px;
        color: var(--neon-blue);
    }

    h1 {
        font-size: 28px;
        margin-bottom: 8px;
        color: var(--text-primary);
        font-weight: 600;
        letter-spacing: -0.02em;
    }

    .subtitle {
        color: var(--text-secondary);
        margin-bottom: 32px;
        font-size: 15px;
    }

    .form-group {
        margin-bottom: 24px;
        position: relative;
    }

    .input-label {
        display: flex;
        align-items: center;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 8px 16px;
        border: 1px solid var(--glass-border);
        position: relative;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .input-label:focus-within {
        border-color: var(--neon-blue);
        box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.2);
    }

    .input-icon {
        margin-right: 12px;
        color: var(--neon-blue);
        opacity: 0.8;
    }

    .input-field {
        flex: 1;
        padding: 12px 0 12px 8px;
        background: transparent;
        border: none;
        color: var(--text-primary);
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 16px;
    }

    .input-field::placeholder {
        color: var(--text-secondary);
        opacity: 0.7;
    }

    .input-field:focus {
        outline: none;
    }

    .auth-button {
        width: 100%;
        padding: 16px;
        background: rgba(0, 212, 255, 0.15);
        color: var(--neon-blue);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 16px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        margin: 24px 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .auth-button:hover:not(:disabled) {
        background: rgba(0, 212, 255, 0.2);
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    }

    .auth-button:disabled {
        border-color: rgba(255, 255, 255, 0.05);
        color: var(--text-secondary);
        cursor: not-allowed;
        opacity: 0.5;
    }

    .loading-dots {
        display: inline-flex;
        gap: 8px;
    }

    .loading-dots span {
        width: 8px;
        height: 8px;
        background: var(--neon-blue);
        border-radius: 50%;
        animation: pulse 1.5s infinite;
    }

    .loading-dots span:nth-child(2) {
        animation-delay: 0.3s;
    }

    .loading-dots span:nth-child(3) {
        animation-delay: 0.6s;
    }

    .toggle-button {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        font-size: 14px;
        text-decoration: none;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        transition: color 0.2s;
    }

    .toggle-button:hover:not(:disabled) {
        color: var(--neon-blue);
    }

    @keyframes pulse {
        0%, 100% { opacity: 0.5; transform: scale(0.9); }
        50% { opacity: 1; transform: scale(1.1); }
    }

    @media (max-width: 480px) {
        .auth-card {
            padding: 32px 24px;
            border-radius: 24px;
        }

        h1 {
            font-size: 24px;
        }

        .cyber-icon {
            font-size: 40px;
        }
    }
</style>
