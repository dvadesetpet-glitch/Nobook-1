// Short vibration on taps of buttons/menu items, so actions like "Save" or "Report" give feedback.
(function() {
    if (window._nbHaptic) return;
    window._nbHaptic = true;
    if (!navigator.vibrate) return;

    document.addEventListener('click', (e) => {
        const el = e.target instanceof Element
            ? e.target.closest('[data-action-id], [role="button"], [role="menuitem"], button, a[href]')
            : null;
        if (el) navigator.vibrate(15);
    }, true);
})();
