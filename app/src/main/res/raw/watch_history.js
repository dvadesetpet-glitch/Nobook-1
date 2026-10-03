// Records visited video pages (watch / reel / videos) into the app's Watch History.
(function() {
    if (window._nbWatchHistory) return;
    window._nbWatchHistory = true;

    const isVideoPath = (path) =>
        path === '/watch' || path === '/watch/' ||
        path.startsWith('/reel/') || path.startsWith('/reels/') ||
        path.includes('/videos/');

    const normalize = () => {
        const u = new URL(location.href);
        if (!isVideoPath(u.pathname)) return null;
        if (u.pathname.startsWith('/watch')) {
            const v = u.searchParams.get('v');
            return v ? u.origin + '/watch/?v=' + v : null;
        }
        return u.origin + u.pathname;
    };

    const readTitle = () => {
        const og = document.querySelector('meta[property="og:title"]')?.content;
        const raw = (og || document.title || '').replace(/^\(\d+\)\s*/, '').trim();
        return raw && raw !== 'Facebook' ? raw : null;
    };

    let lastRecorded = null;
    let pending = null;

    const check = () => {
        const url = normalize();
        if (!url || url === lastRecorded) return;
        clearTimeout(pending);
        // Give the SPA a moment to set the title before recording.
        pending = setTimeout(() => {
            if (normalize() !== url) return;
            lastRecorded = url;
            const thumb = document.querySelector('meta[property="og:image"]')?.content || null;
            try {
                WatchHistoryBridge.recordWatch(url, readTitle(), thumb);
            } catch (e) {}
        }, 1500);
    };

    ['pushState', 'replaceState'].forEach((fn) => {
        const orig = history[fn];
        history[fn] = function() {
            const r = orig.apply(this, arguments);
            check();
            return r;
        };
    });
    window.addEventListener('popstate', check);
    setInterval(check, 1000);
    check();
})();
