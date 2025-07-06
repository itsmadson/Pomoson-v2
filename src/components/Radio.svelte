<div class="radio-container">
    <div class="radio-player">
        <iframe
                title="Live radio"
                src="https://radio.9craft.ir"
                allow="autoplay"
        ></iframe>
    </div>

    <div class="radio-stations">
        <h3>☕ Recommended Stations</h3>
        <div class="stations-grid">
            <button class="station-btn">
                <span class="station-icon">🎻</span>
                <span class="station-name">Classical Coffee</span>
            </button>
            <button class="station-btn">
                <span class="station-icon">🎹</span>
                <span class="station-name">Jazz Brew</span>
            </button>
            <button class="station-btn">
                <span class="station-icon">🌿</span>
                <span class="station-name">Lofi Beans</span>
            </button>
            <button class="station-btn">
                <span class="station-icon">🎧</span>
                <span class="station-name">Focus Roast</span>
            </button>
        </div>
    </div>
</div>

<style>
    .radio-container {
        max-width: 900px;
        margin: 0 auto;
        padding: 24px 20px;
    }

    .radio-header {
        text-align: center;
        margin-bottom: 32px;
    }

    h2 {
        color: var(--text-primary);
        margin: 0 0 12px 0;
        font-size: 28px;
        font-weight: 600;
        letter-spacing: -0.02em;
    }

    .subtitle {
        color: var(--text-secondary);
        margin: 0;
        font-size: 15px;
    }

    .radio-player {
        width: 100%;
        height: 300px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        overflow: hidden;
        border: 1px solid var(--glass-border);
        margin-bottom: 32px;
        box-shadow: var(--glass-shadow);
        backdrop-filter: blur(20px) saturate(1.8);
        -webkit-backdrop-filter: blur(20px) saturate(1.8);
    }

    .radio-player iframe {
        width: 100%;
        height: 100%;
        border: none;
    }

    .radio-stations {
        background: rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        padding: 28px;
        border: 1px solid var(--glass-border);
        box-shadow: var(--glass-shadow);
        backdrop-filter: blur(20px) saturate(1.8);
        -webkit-backdrop-filter: blur(20px) saturate(1.8);
    }

    .radio-stations h3 {
        color: var(--text-primary);
        margin-top: 0;
        margin-bottom: 24px;
        font-size: 20px;
        font-weight: 600;
        letter-spacing: -0.01em;
    }

    .stations-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
    }

    .station-btn {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid var(--glass-border);
        color: var(--text-primary);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }

    .station-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        transform: translateY(-4px);
        box-shadow: var(--glass-shadow);
    }

    .station-btn.active {
        background: rgba(0, 212, 255, 0.15);
        border-color: rgba(0, 212, 255, 0.3);
        color: var(--neon-blue);
    }

    .station-btn.active::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--neon-blue);
    }

    .station-icon {
        font-size: 24px;
        color: var(--neon-blue);
        opacity: 0.8;
    }

    .station-btn.active .station-icon {
        color: var(--neon-blue);
        opacity: 1;
    }

    .station-name {
        font-weight: 500;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 15px;
    }

    @media (max-width: 768px) {
        .radio-player {
            height: 200px;
        }

        .stations-grid {
            grid-template-columns: 1fr 1fr;
        }
    }

    @media (max-width: 480px) {
        .stations-grid {
            grid-template-columns: 1fr;
        }
    }
</style>