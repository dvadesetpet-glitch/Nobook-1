// Pull down at the very top of a page to reload it, like the native app's pull-to-refresh.
(function() {
    if (window._nbPullToRefresh) return;
    window._nbPullToRefresh = true;

    const THRESHOLD = 120;   // finger travel in px needed to refresh
    const MAX_PULL = 160;
    const INDICATOR_ID = 'nb-ptr';

    const onVideoPage = () => {
        const p = location.pathname;
        return p.startsWith('/reel/') || p.startsWith('/reels/') || p === '/watch' || p === '/watch/';
    };

    const scrollTop = () => window.scrollY || (document.scrollingElement ? document.scrollingElement.scrollTop : 0);

    let indicator = null;
    const getIndicator = () => {
        if (indicator && document.getElementById(INDICATOR_ID)) return indicator;
        const el = document.createElement('div');
        el.id = INDICATOR_ID;
        el.setAttribute('style', [
            'position:fixed', 'top:0', 'left:50%', 'width:36px', 'height:36px', 'margin-left:-18px',
            'border-radius:50%', 'background:#3a3b3c', 'box-shadow:0 2px 8px rgba(0,0,0,0.5)',
            'z-index:2147483646', 'display:none', 'pointer-events:none',
            'border:3px solid rgba(255,255,255,0.25)', 'border-top-color:#2d88ff', 'box-sizing:border-box'
        ].join(';'));
        document.body.appendChild(el);
        indicator = el;
        return el;
    };

    let startX = 0;
    let startY = 0;
    let tracking = false;
    let armed = false;
    let refreshing = false;

    const hide = () => {
        if (indicator) indicator.style.display = 'none';
    };

    document.addEventListener('touchstart', (e) => {
        tracking = false;
        armed = false;
        if (refreshing || e.touches.length !== 1 || onVideoPage() || scrollTop() > 0) return;
        if (e.target instanceof Element && e.target.closest('[role="dialog"], [role="menu"], video')) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        tracking = true;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!tracking || refreshing) return;
        const dy = e.touches[0].clientY - startY;
        const dx = Math.abs(e.touches[0].clientX - startX);
        if (dy <= 0 || scrollTop() > 0 || dx > dy * 0.6) {
            tracking = false;
            hide();
            return;
        }
        const el = getIndicator();
        const pull = Math.min(dy, MAX_PULL);
        el.style.display = 'block';
        el.style.transform = 'translateY(' + (pull * 0.5 - 36) + 'px) rotate(' + (pull * 3) + 'deg)';
        const nowArmed = dy >= THRESHOLD;
        if (nowArmed && !armed && navigator.vibrate) navigator.vibrate(20);
        armed = nowArmed;
    }, { passive: true });

    const end = () => {
        if (!tracking) return;
        tracking = false;
        if (armed && !refreshing) {
            refreshing = true;
            const el = getIndicator();
            el.style.transform = 'translateY(24px)';
            el.animate([{ transform: 'translateY(24px) rotate(0deg)' }, { transform: 'translateY(24px) rotate(360deg)' }],
                { duration: 700, iterations: Infinity });
            location.reload();
            return;
        }
        hide();
    };
    document.addEventListener('touchend', end, { passive: true });
    document.addEventListener('touchcancel', end, { passive: true });
})();
