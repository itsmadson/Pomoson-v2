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
        background: linear-gradient(135deg, var(--coffee-dark) 0%, var(--coffee-darker) 100%);
    }

    .auth-card {
        background: rgba(26, 15, 10, 0.8);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        padding: 40px;
        max-width: 400px;
        width: 100%;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(139, 69, 19, 0.3);
    }

    .coffee-icon {
        font-size: 3rem;
        margin-bottom: 10px;
        color: var(--coffee-cream);
        animation: float 3s ease-in-out infinite;
    }

    h1 {
        font-size: 2rem;
        margin-bottom: 5px;
        color: var(--coffee-cream);
    }

    .subtitle {
        color: var(--coffee-light);
        margin-bottom: 30px;
        font-style: italic;
    }

    .form-group {
        margin-bottom: 20px;
    }

    .input-label {
        display: flex;
        align-items: center;
        background: rgba(44, 24, 16, 0.5);
        border-radius: 10px;
        padding: 5px 15px;
        border: 1px solid rgba(139, 69, 19, 0.3);
    }

    .input-icon {
        margin-right: 10px;
        color: var(--coffee-cream);
    }

    .input-field {
        flex: 1;
        padding: 12px 0;
        background: transparent;
        border: none;
        color: var(--coffee-foam);
        font-size: 16px;
    }

    .input-field::placeholder {
        color: var(--coffee-light);
        opacity: 0.7;
    }

    .input-field:focus {
        outline: none;
    }

    .auth-button {
        width: 100%;
        padding: 14px;
        background: linear-gradient(135deg, var(--coffee-brown) 0%, var(--coffee-light) 100%);
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        margin: 20px 0;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
    }

    .auth-button:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(139, 69, 19, 0.4);
    }

    .auth-button:disabled {
        background: var(--coffee-darker);
        color: var(--coffee-light);
        cursor: not-allowed;
    }

    .loading-dots {
        display: inline-flex;
        gap: 6px;
    }

    .loading-dots span {
        width: 8px;
        height: 8px;
        background: var(--coffee-cream);
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
        color: var(--coffee-cream);
        cursor: pointer;
        font-size: 14px;
        text-decoration: underline;
        opacity: 0.8;
    }

    .toggle-button:hover:not(:disabled) {
        opacity: 1;
        color: var(--coffee-accent);
    }

    @media (max-width: 480px) {
        .auth-card {
            padding: 30px 20px;
        }
    }
</style>