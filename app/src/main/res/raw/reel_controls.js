// Adds a seek bar + play/pause button on reels and watch pages.
(function() {
    if (window._nbReelControls) return;
    window._nbReelControls = true;

    const BAR_ID = 'nb-reel-controls';

    const onVideoPage = () => {
        const p = location.pathname;
        return p.startsWith('/reel/') || p.startsWith('/reels/') || p === '/watch' || p === '/watch/';
    };

    // The video that covers the most of the viewport is the one being watched.
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

    const fmt = (s) => {
        if (!isFinite(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return m + ':' + (sec < 10 ? '0' : '') + sec;
    };

    let dragging = false;

    const build = () => {
        const bar = document.createElement('div');
        bar.id = BAR_ID;
        bar.setAttribute('style', [
            'position:fixed', 'left:0', 'right:0', 'bottom:0',
            'z-index:2147483647', 'display:none', 'align-items:center', 'gap:8px',
            'padding:4px 10px', 'border-radius:0',
            'background:rgba(0,0,0,0.6)', 'color:#fff',
            'font:12px sans-serif', 'touch-action:none'
        ].join(';'));

        const btn = document.createElement('button');
        btn.setAttribute('style', 'background:none;border:none;color:#fff;font-size:18px;width:28px;padding:0');
        btn.textContent = '⏯';

        const time = document.createElement('span');
        time.setAttribute('style', 'min-width:68px;text-align:center');
        time.textContent = '0:00 / 0:00';

        const range = document.createElement('input');
        range.type = 'range';
        range.min = '0';
        range.max = '1000';
        range.value = '0';
        range.setAttribute('style', 'flex:1;min-width:0');

        // Keep Facebook from treating bar gestures as swipes / taps on the video.
        ['touchstart', 'touchmove', 'touchend', 'pointerdown', 'click'].forEach((ev) => {
            bar.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
        });

        btn.addEventListener('click', () => {
            const v = currentVideo();
            if (!v) return;
            if (v.paused) v.play(); else v.pause();
        });

        range.addEventListener('input', () => {
            dragging = true;
            const v = currentVideo();
            if (v && v.duration) v.currentTime = (range.value / 1000) * v.duration;
        });
        range.addEventListener('change', () => { dragging = false; });
        range.addEventListener('touchend', () => { dragging = false; });

        bar.append(btn, range, time);
        document.body.appendChild(bar);
        return { bar, range, time };
    };

    let ui = null;

    const tick = () => {
        if (!document.body) return;
        if (!ui || !document.getElementById(BAR_ID)) ui = build();

        const v = onVideoPage() ? currentVideo() : null;
        ui.bar.style.display = v ? 'flex' : 'none';
        if (!v || dragging) return;

        const d = v.duration || 0;
        ui.range.value = d ? String(Math.round((v.currentTime / d) * 1000)) : '0';
        ui.time.textContent = fmt(v.currentTime) + ' / ' + fmt(d);
    };

    setInterval(tick, 250);
})();
