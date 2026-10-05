// Keeps the screen awake while a video is actually playing (not paused, not scrolled away).
(function() {
    if (window._nbKeepOn) return;
    window._nbKeepOn = true;
    if (!window.ScreenBridge) return;

    const onVideoPage = () => /^\/(reel|reels|watch|videos)(\/|$)/.test(location.pathname);

    const visibleEnough = (v) => {
        const r = v.getBoundingClientRect();
        const w = Math.min(r.right, window.innerWidth) - Math.max(r.left, 0);
        const h = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
        return w > 0 && h > 0 && w * h > window.innerWidth * window.innerHeight * 0.2;
    };

    let on = false;
    let poll = null;

    const evaluate = () => {
        let playing = false;
        const videos = document.getElementsByTagName('video');
        for (let i = 0; i < videos.length; i++) {
            const v = videos[i];
            // Muted autoplay in the feed must not hold the screen; reels/watch pages always do.
            if (!v.paused && !v.ended && v.readyState > 2 && visibleEnough(v) && (!v.muted || onVideoPage())) {
                playing = true;
                break;
            }
        }
        if (playing !== on) {
            on = playing;
            try { window.ScreenBridge.setKeepScreenOn(on); } catch (e) {}
        }
        // While on, re-check periodically: the video may scroll away without any media event.
        if (on && !poll) poll = setInterval(evaluate, 3000);
        else if (!on && poll) { clearInterval(poll); poll = null; }
    };

    ['play', 'playing', 'pause', 'ended', 'emptied', 'volumechange'].forEach((t) =>
        document.addEventListener(t, evaluate, { capture: true, passive: true }));
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && on) {
            on = false;
            try { window.ScreenBridge.setKeepScreenOn(false); } catch (e) {}
        } else evaluate();
    });
    window.addEventListener('pagehide', () => {
        if (on) { on = false; try { window.ScreenBridge.setKeepScreenOn(false); } catch (e) {} }
    });
})();
