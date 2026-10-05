// Records watched videos into the app's Watch History:
// - video pages (watch / reel / videos), from the URL;
// - videos watched inline in the feed (no URL change on m.facebook.com), once one has played
//   for a few seconds with sound or in fullscreen, using the post's own video/permalink link.
(function() {
    if (window._nbWatchHistory) return;
    window._nbWatchHistory = true;

    const FEED_WATCH_MS = 5000;

    const record = (url, title, thumb) => {
        try {
            WatchHistoryBridge.recordWatch(url, title || null, thumb || null);
        } catch (e) {}
    };

    const isVideoPath = (path) =>
        path === '/watch' || path === '/watch/' ||
        path.startsWith('/reel/') || path.startsWith('/reels/') ||
        path.includes('/videos/');

    const normalizeUrl = (href) => {
        let u;
        try { u = new URL(href, location.href); } catch (e) { return null; }
        if (u.pathname.startsWith('/watch')) {
            const v = u.searchParams.get('v');
            return v ? u.origin + '/watch/?v=' + v : null;
        }
        if (u.pathname === '/story.php' || u.pathname === '/permalink.php') {
            const id = u.searchParams.get('story_fbid');
            const owner = u.searchParams.get('id');
            return id ? u.origin + u.pathname + '?story_fbid=' + id + (owner ? '&id=' + owner : '') : null;
        }
        // Opening /reel/ID directly lands on the feed; /watch/?v=ID opens reels and videos alike.
        const id = keyOf(u.origin + u.pathname);
        return /^\d+$/.test(id) ? u.origin + '/watch/?v=' + id : u.origin + u.pathname;
    };

    // Same video under different URLs (/watch/?v=ID, /reel/ID, /…/videos/…/ID/) shares one key.
    const keyOf = (url) => {
        const m = url.match(/[?&]v=(\d+)/) || url.match(/\/(?:reel|videos)\/(?:[^?]*\/)?(\d{6,})\/?(?:\?|$)/);
        return m ? m[1] : url;
    };
    const seen = new Set();

    const cleanTitle = (raw) => {
        const t = (raw || '').replace(/^\(\d+\)\s*/, '').replace(/\s+/g, ' ').trim();
        return t && t !== 'Facebook' ? t.slice(0, 120) : null;
    };

    // Facebook icon glyphs live in the private use areas; they show up in innerText.
    const ICONS = /[-‎‏]|[\uDB80-\uDBFF][\uDC00-\uDFFF]/g;
    const NOISE = /^(follow|following|sponsored|more|see translation|tap to unmute|tap to play|unmute|mute|reels|watch|just now|yesterday|\d[\d.,]*\s*(tis\.|k|m|mil\.)?|\d+\s*(s|m|h|d|w|y|min|mins|hr|hrs|g|tj|mj)( ago)?)$/i;

    // "Author · caption" from the post / reel around the video (meta tags are stale in the SPA).
    const titleFrom = (post) => {
        if (!post || !post.innerText) return null;
        const lines = post.innerText.split('\n')
            .map((l) => l.replace(ICONS, '').replace(/(\.\.\.|…)\s*see more$|(\.\.\.|…)\s*more$/i, '').trim())
            .filter((l) => l.length > 1 && !NOISE.test(l));
        if (!lines.length) return null;
        return cleanTitle(lines.length > 1 ? lines[0] + ' · ' + lines[1] : lines[0]);
    };

    // The video's own thumbnail: the post image with the highest resolution (avatars are small).
    const thumbFrom = (video, post) => {
        if (video.poster) return video.poster;
        if (!post) return null;
        let best = null;
        let bestArea = 0;
        post.querySelectorAll('img[src*="fbcdn"]').forEach((img) => {
            const area = img.naturalWidth * img.naturalHeight;
            if (area > bestArea) { bestArea = area; best = img.src; }
        });
        return best;
    };

    // Nearest ancestor of the video that carries text (author, caption), skipping player
    // overlays whose only text is noise such as "Tap to unmute".
    const containerOf = (video) => {
        let el = video.parentElement;
        for (let d = 0; el && el !== document.body && d < 12; d++, el = el.parentElement) {
            if (titleFrom(el)) return el;
        }
        return null;
    };

    // The video being watched: playing, and covering the most of the viewport.
    const mainVideo = () => {
        let best = null;
        let bestArea = 0;
        const videos = document.getElementsByTagName('video');
        for (let i = 0; i < videos.length; i++) {
            const v = videos[i];
            const r = v.getBoundingClientRect();
            const w = Math.min(r.right, innerWidth) - Math.max(r.left, 0);
            const h = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
            const area = w > 0 && h > 0 ? w * h * (v.paused ? 1 : 1000) : 0;
            if (area > bestArea) { bestArea = area; best = v; }
        }
        return best;
    };

    // ---- Video pages ----

    let lastRecorded = null;
    let pending = null;
    let pendingUrl = null;

    const checkPage = () => {
        if (!isVideoPath(location.pathname)) return;
        const url = normalizeUrl(location.href);
        // Called every second: re-arming the timer for the same URL would keep it from ever firing.
        if (!url || url === lastRecorded || url === pendingUrl) return;
        clearTimeout(pending);
        pendingUrl = url;
        // Give the SPA a moment to set the title before recording.
        pending = setTimeout(() => {
            pendingUrl = null;
            if (normalizeUrl(location.href) !== url) return;
            lastRecorded = url;
            seen.add(keyOf(url));
            const video = mainVideo();
            const post = video && containerOf(video);
            const og = document.querySelector('meta[property="og:title"]')?.content;
            const thumb = document.querySelector('meta[property="og:image"]')?.content;
            record(url, titleFrom(post) || cleanTitle(og || document.title), (video && thumbFrom(video, post)) || thumb);
        }, 1500);
    };

    ['pushState', 'replaceState'].forEach((fn) => {
        const orig = history[fn];
        history[fn] = function() {
            const r = orig.apply(this, arguments);
            checkPage();
            return r;
        };
    });
    window.addEventListener('popstate', checkPage);

    // ---- Inline (feed) videos ----

    const LINK_RE = /\/(watch\/?\?v=|reel\/|videos\/|story\.php|permalink\.php|posts\/)/;

    // Walks up from the video to the post and returns its best link to the video / post.
    const findPostLink = (video) => {
        let el = video;
        for (let depth = 0; el && el !== document.body && depth < 20; depth++, el = el.parentElement) {
            const store = el.getAttribute && el.getAttribute('data-store');
            if (store) {
                const m = store.match(/"videoID"\s*:\s*"?(\d+)/);
                if (m) return { url: location.origin + '/watch/?v=' + m[1], post: el };
            }
            const vid = el.getAttribute && el.getAttribute('data-video-id');
            if (vid) return { url: location.origin + '/watch/?v=' + vid, post: el };

            const links = el.querySelectorAll ? el.querySelectorAll('a[href]') : [];
            let best = null;
            for (const a of links) {
                const href = a.getAttribute('href');
                if (!href || !LINK_RE.test(href)) continue;
                // Prefer a direct video link over a post permalink.
                if (/\/(watch|reel|videos)\b/.test(href)) { best = href; break; }
                if (!best) best = href;
            }
            if (best) return { url: normalizeUrl(best), post: el };
        }
        return null;
    };

    const isWatched = (v) => !v.muted || (document.fullscreenElement && document.fullscreenElement.contains(v));

    // Accumulates real playback time per video; muted feed autoplay does not count.
    // Keyed by video id: Facebook reuses <video> elements between the feed and video pages.
    const played = new Map();
    let lastTick = Date.now();

    const tick = () => {
        const now = Date.now();
        const dt = Math.min(now - lastTick, 2000);
        lastTick = now;
        checkPage();
        // Video pages are recorded from the URL.
        if (isVideoPath(location.pathname)) return;
        const videos = document.getElementsByTagName('video');
        for (let i = 0; i < videos.length; i++) {
            const v = videos[i];
            if (v.paused || v.ended || !isWatched(v)) continue;
            const found = findPostLink(v);
            if (!found || !found.url) continue;
            const key = keyOf(found.url);
            if (seen.has(key)) continue;
            const total = (played.get(key) || 0) + dt;
            played.set(key, total);
            if (total < FEED_WATCH_MS) continue;
            seen.add(key);
            const post = containerOf(v) || found.post;
            record(found.url, titleFrom(post) || cleanTitle(v.getAttribute('aria-label')), thumbFrom(v, found.post));
        }
    };

    setInterval(tick, 1000);
    checkPage();
})();
