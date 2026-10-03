// Hides the "Ad Blocked" placeholder that adblock.js leaves in place of sponsored reels.
// The emptied container itself stays, so scroll-snap and auto-scroll keep working.
(function() {
    if (window._nbHideAdBlockedToast) return;
    window._nbHideAdBlockedToast = true;

    const STYLE_ID = 'nb-hide-adblocked-toast';
    const ensureStyle = () => {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = '[data-ad-hidden="true"] > * { display: none !important; }';
        (document.head || document.documentElement).appendChild(style);
    };

    ensureStyle();
    setInterval(ensureStyle, 1000);
})();
