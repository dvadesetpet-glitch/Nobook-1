// Hold a finger in the top-right part of the screen on a reel/video page to play at 2x;
// release to go back to normal speed.
(function() {
    if (window._nbReelSpeed) return;
    window._nbReelSpeed = true;

    const SPEED = 2;
    const HOLD_MS = 450;
    const MOVE_TOLERANCE = 12;
    const BADGE_ID = 'nb-speed-badge';

    const onVideoPage = () => {
        const p = location.pathname;
        return p.startsWith('/reel/') || p.startsWith('/reels/') || p === '/watch' || p === '/watch/';
    };

    const currentVideo = () => {
        let best = null;
        let bestArea = 0;
        document.querySelectorAll('video').forEach((v) => {
            const r = v.getBoundingClientRect();
            const w = Math.min(r.right, window.innerWidth) - Math.max(r.left, 0);
            const h = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
            const area = w > 0 && h > 0 ? w * h : 0;
            if (area > bestArea) {
                bestArea = area;
                best = v;
            }
        });
        return best;
    };

    const inTopRight = (x, y) => x >= window.innerWidth * 0.55 && y <= window.innerHeight * 0.45;

    const showBadge = (on) => {
        let badge = document.getElementById(BADGE_ID);
        if (!badge) {
            badge = document.createElement('div');
            badge.id = BADGE_ID;
            badge.textContent = SPEED + '×';
            badge.setAttribute('style', [
                'position:fixed', 'top:72px', 'left:50%', 'transform:translateX(-50%)',
                'padding:4px 12px', 'border-radius:14px', 'background:rgba(0,0,0,0.65)', 'color:#fff',
                'font:600 14px sans-serif', 'z-index:2147483646', 'pointer-events:none', 'display:none'
            ].join(';'));
            document.body.appendChild(badge);
        }
        badge.style.display = on ? 'block' : 'none';
    };

    let timer = null;
    let startX = 0;
    let startY = 0;
    let boosted = null;
    let swallowClickUntil = 0;

    const stop = () => {
        clearTimeout(timer);
        timer = null;
        if (boosted) {
            boosted.playbackRate = 1;
            boosted = null;
            swallowClickUntil = Date.now() + 400;
            showBadge(false);
        }
    };

    document.addEventListener('touchstart', (e) => {
        stop();
        if (e.touches.length !== 1 || !onVideoPage()) return;
        const t = e.touches[0];
        if (!inTopRight(t.clientX, t.clientY)) return;
        startX = t.clientX;
        startY = t.clientY;
        timer = setTimeout(() => {
            timer = null;
            const v = currentVideo();
            if (!v) return;
            boosted = v;
            v.playbackRate = SPEED;
            showBadge(true);
            if (navigator.vibrate) navigator.vibrate(15);
        }, HOLD_MS);
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!timer || e.touches.length !== 1) return;
        const t = e.touches[0];
        if (Math.abs(t.clientX - startX) > MOVE_TOLERANCE || Math.abs(t.clientY - startY) > MOVE_TOLERANCE) stop();
    }, { passive: true });

    document.addEventListener('touchend', stop, { passive: true });
    document.addEventListener('touchcancel', stop, { passive: true });

    // The press is not a tap: swallow the click it would produce on release, and the long-press menu.
    document.addEventListener('click', (e) => {
        if (Date.now() < swallowClickUntil) {
            e.stopPropagation();
            e.preventDefault();
        }
    }, true);
    document.addEventListener('contextmenu', (e) => {
        if (boosted || timer) e.preventDefault();
    }, true);
})();
