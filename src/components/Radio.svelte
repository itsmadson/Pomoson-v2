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
    }

    h2 {
        color: var(--coffee-cream);
        margin: 0 0 10px 0;
        font-size: 1.8rem;
    }

    .subtitle {
        color: var(--coffee-light);
        margin: 0;
        font-style: italic;
    }

    .radio-player {
        width: 100%;
        height: 300px;
        background: rgba(44, 24, 16, 0.5);
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid rgba(139, 69, 19, 0.3);
        margin-bottom: 30px;
    }

    .radio-player iframe {
        width: 100%;
        height: 100%;
        border: none;
    }

    .radio-stations {
        background: rgba(44, 24, 16, 0.5);
        border-radius: 12px;
        padding: 25px;
        border: 1px solid rgba(139, 69, 19, 0.3);
    }

    .radio-stations h3 {
        color: var(--coffee-cream);
        margin-top: 0;
        margin-bottom: 20px;
        font-size: 1.3rem;
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
        background: rgba(26, 15, 10, 0.8);
        border: 1px solid rgba(139, 69, 19, 0.5);
        color: var(--coffee-cream);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .station-btn:hover {
        background: rgba(160, 82, 45, 0.3);
        transform: translateY(-3px);
    }

    .station-icon {
        font-size: 1.5rem;
    }

    .station-name {
        font-weight: 500;
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