// Autoplay for reels and stories, each with its own on/off switch (settings).
// MainViewModel puts the choice in front of the scripts as window.nbAutoplay = { reel, story }.
//   on : a clip that opens paused or muted is started right away; a pause made by the user stays.
//   off: a clip opens paused and a tap starts it.
(function() {
    if (window._nbAutoplay) return;
    window._nbAutoplay = true;

    const config = window.nbAutoplay || { reel: true, story: true };

    // Which switch applies to the page being shown (null: not a reel or story page).
    const kind = () => {
        const p = location.pathname;
        if (/^\/(reel|reels)(\/|$)/.test(p)) return 'reel';
        if (/^\/stories(\/|$)/.test(p)) return 'story';
        return null;
    };

    let lastTouch = 0;
    ['touchstart', 'touchend', 'pointerdown', 'click'].forEach((ev) => {
        document.addEventListener(ev, () => { lastTouch = Date.now(); }, { capture: true, passive: true });
    });
    const touchedRecently = (ms) => Date.now() - lastTouch < ms;

    const keyOf = (v) => v.currentSrc || v.src;

    // Per video element: what has been done for the clip it currently shows.
    const state = new WeakMap();
    const stateFor = (v) => {
        let s = state.get(v);
        if (!s || s.key !== keyOf(v)) {
            s = { key: keyOf(v), userPaused: false, unmuted: false, checked: false, stoppedByUs: false };
            state.set(v, s);
        }
        return s;
    };

    const currentVideo = () => {
        let best = null;
        let bestArea = 0;
        document.querySelectorAll('video').forEach((v) => {
            const r = v.getBoundingClientRect();
            const w = Math.min(r.right, window.innerWidth) - Math.max(r.left, 0);
            const h = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
            const area = w > 0 && h > 0 ? w * h : 0;
            if (area > bestArea) { bestArea = area; best = v; }
        });
        return best;
    };

    const stop = (v) => {
        stateFor(v).stoppedByUs = true;
        v.pause();
    };

    // The player facing a pause it did not make: a pause shortly after a tap is the user's.
    document.addEventListener('pause', (e) => {
        if (e.target.tagName !== 'VIDEO' || !kind() || !config[kind()]) return;
        if (touchedRecently(1500) && !stateFor(e.target).stoppedByUs) stateFor(e.target).userPaused = true;
    }, true);

    // Off: stop clips the player starts on its own, unless the user just tapped.
    document.addEventListener('play', (e) => {
        const k = kind();
        if (!k || config[k] || e.target.tagName !== 'VIDEO') return;
        if (!touchedRecently(600)) stop(e.target);
    }, true);

    // Off: the player still believes a stopped clip is playing, so its first tap would "pause"
    // it again. A tap on a clip stopped here therefore starts it.
    document.addEventListener('click', () => {
        const k = kind();
        if (!k || config[k]) return;
        setTimeout(() => {
            document.querySelectorAll('video').forEach((v) => {
                const s = state.get(v);
                if (s && s.stoppedByUs && v.paused) v.play().catch(() => {});
                if (s) s.stoppedByUs = false;
            });
        }, 200);
    }, true);

    // Video stories open as a poster with a play button (data-autoplay="false"); the official app
    // starts them at once. Pressing that button is what starts the player, once per story video.
    const startedStories = new Set();
    let storyPage = '';
    const startStoryVideo = () => {
        // A story opened again later has to start again.
        if (storyPage !== location.pathname) {
            storyPage = location.pathname;
            startedStories.clear();
        }
        document.querySelectorAll('[data-video-url]').forEach((box) => {
            const id = box.getAttribute('data-video-id') || box.getAttribute('data-video-url');
            const play = box.querySelector('.inline-video-icon.play');
            if (!play || startedStories.has(id) || play.getBoundingClientRect().width === 0) return;
            startedStories.add(id);
            play.click();
        });
    };

    const tick = () => {
        const k = kind();
        if (!k) return;
        if (k === 'story' && config.story) startStoryVideo();
        const v = currentVideo();
        if (!v || !keyOf(v) || v.readyState < 2) return;
        const s = stateFor(v);

        if (config[k]) {
            if (!s.unmuted && v.muted) {
                v.muted = false;
                s.unmuted = true;
            }
            if (v.paused && !v.ended && !s.userPaused) v.play().catch(() => {});
        } else if (!s.checked) {
            // This script can load after the clip already started, so each clip is checked once.
            s.checked = true;
            if (!v.paused && !touchedRecently(600)) stop(v);
        }
    };

    setInterval(tick, 400);
})();
