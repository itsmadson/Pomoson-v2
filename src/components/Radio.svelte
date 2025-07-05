<div class="radio-container">
    <div class="radio-header">
        <h2>🎵 Coffee Radio</h2>
        <p class="subtitle">Stay focused with some relaxing tunes</p>
    </div>

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
        padding: 20px;
    }

    .radio-header {
        text-align: center;
        margin-bottom: 30px;
        border-bottom: 1px solid var(--neon-blue);
        padding-bottom: 20px;
    }

    h2 {
        color: var(--neon-pink);
        margin: 0 0 10px 0;
        font-size: 1.5rem;
        text-transform: uppercase;
        letter-spacing: 2px;
        text-shadow: 0 0 8px rgba(255, 0, 255, 0.3);
    }

    .subtitle {
        color: var(--text-secondary);
        margin: 0;
        font-style: italic;
    }

    .radio-player {
        width: 100%;
        height: 300px;
        background: rgba(5, 5, 8, 0.7);
        border-radius: 0;
        overflow: hidden;
        border: 1px solid var(--neon-blue);
        margin-bottom: 30px;
        box-shadow: 0 0 15px rgba(0, 255, 252, 0.2);
    }

    .radio-player iframe {
        width: 100%;
        height: 100%;
        border: none;
    }

    .radio-stations {
        background: rgba(5, 5, 8, 0.7);
        border-radius: 0;
        padding: 25px;
        border: 1px solid var(--neon-blue);
        box-shadow: 0 0 15px rgba(0, 255, 252, 0.1);
    }

    .radio-stations h3 {
        color: var(--neon-pink);
        margin-top: 0;
        margin-bottom: 20px;
        font-size: 1.2rem;
        text-transform: uppercase;
        letter-spacing: 2px;
    }

    .stations-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 15px;
    }

    .station-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 15px;
        background: rgba(5, 5, 8, 0.9);
        border: 1px solid var(--neon-blue);
        color: var(--text-primary);
        border-radius: 0;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
    }

    .station-btn:hover {
        background: rgba(0, 255, 252, 0.1);
        transform: translateY(-3px);
        box-shadow: 0 0 10px rgba(0, 255, 252, 0.2);
    }

    .station-btn.active {
        border-color: var(--neon-pink);
        color: var(--neon-pink);
        box-shadow: 0 0 10px rgba(255, 0, 255, 0.3);
    }

    .station-btn.active::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--neon-pink);
    }

    .station-icon {
        font-size: 1.5rem;
        color: var(--neon-blue);
    }

    .station-btn.active .station-icon {
        color: var(--neon-pink);
    }

    .station-name {
        font-weight: 500;
        font-family: 'Courier New', monospace;
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