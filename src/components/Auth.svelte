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
                radial-gradient(circle at 20% 30%, rgba(188, 19, 254, 0.15) 0%, transparent 30%),
                radial-gradient(circle at 80% 70%, rgba(0, 255, 252, 0.15) 0%, transparent 30%),
                var(--dark-bg);
        position: relative;
        overflow: hidden;
    }

    .auth-container::before {
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
        animation: scanline 6s linear infinite;
        opacity: 0.1;
    }

    .auth-card {
        background: var(--panel-bg);
        backdrop-filter: blur(10px);
        border-radius: 0;
        padding: 40px;
        max-width: 400px;
        width: 100%;
        text-align: center;
        box-shadow: 0 0 20px rgba(0, 255, 252, 0.2);
        border: 1px solid var(--neon-blue);
        position: relative;
        overflow: hidden;
    }

    .auth-card::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(
                to bottom right,
                transparent 45%,
                rgba(0, 255, 252, 0.1) 50%,
                transparent 55%
        );
        animation: shine 3s infinite;
    }

    .cyber-icon {
        font-size: 3rem;
        margin-bottom: 10px;
        color: var(--neon-blue);
        text-shadow: 0 0 10px var(--neon-blue);
    }

    h1 {
        font-size: 1.8rem;
        margin-bottom: 5px;
        color: var(--neon-pink);
        text-shadow: 0 0 8px rgba(255, 0, 255, 0.5);
        letter-spacing: 1px;
        text-transform: uppercase;
    }

    .subtitle {
        color: var(--text-secondary);
        margin-bottom: 30px;
        font-size: 0.9rem;
    }

    .form-group {
        margin-bottom: 20px;
        position: relative;
    }

    .input-label {
        display: flex;
        align-items: center;
        background: rgba(5, 5, 8, 0.7);
        border-radius: 0;
        padding: 5px 15px;
        border: 1px solid var(--neon-blue);
        position: relative;
    }

    .input-label::before {
        content: '>';
        position: absolute;
        left: 8px;
        color: var(--neon-blue);
    }

    .input-icon {
        margin-right: 10px;
        color: var(--neon-blue);
    }

    .input-field {
        flex: 1;
        padding: 12px 0 12px 20px;
        background: transparent;
        border: none;
        color: var(--text-primary);
        font-family: 'Courier New', monospace;
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
        padding: 14px;
        background: transparent;
        color: var(--neon-blue);
        border: 1px solid var(--neon-blue);
        font-family: 'Courier New', monospace;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        margin: 20px 0;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .auth-button:hover:not(:disabled) {
        background: rgba(0, 255, 252, 0.1);
        text-shadow: 0 0 5px var(--neon-blue);
        box-shadow: 0 0 10px var(--neon-blue);
    }

    .auth-button:disabled {
        border-color: var(--text-secondary);
        color: var(--text-secondary);
        cursor: not-allowed;
    }

    .loading-dots {
        display: inline-flex;
        gap: 6px;
    }

    .loading-dots span {
        width: 8px;
        height: 8px;
        background: var(--neon-blue);
        border-radius: 50%;
        animation: pulse 1.5s infinite;
        box-shadow: 0 0 5px var(--neon-blue);
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
        font-size: 0.8rem;
        text-decoration: none;
        font-family: 'Courier New', monospace;
        text-transform: uppercase;
    }

    .toggle-button:hover:not(:disabled) {
        color: var(--neon-pink);
        text-shadow: 0 0 5px var(--neon-pink);
    }

    @keyframes shine {
        0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
        100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
    }

    @media (max-width: 480px) {
        .auth-card {
            padding: 30px 20px;
        }

        h1 {
            font-size: 1.5rem;
        }
    }
</style>