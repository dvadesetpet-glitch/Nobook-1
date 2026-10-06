// Hides the blue "Open app" button Facebook shows in the header (e.g. on Reels).
(function() {
    if (window._nbHideOpenApp) return;
    window._nbHideOpenApp = true;

    const labels = [
        'Open app', 'Open App', 'Open in app', 'Open in App', 'Get app', 'Get the app', 'Install app', 'Use the app',
        'Otvori aplikaciju', 'Otvori app', 'Otvori u aplikaciji', 'Preuzmi aplikaciju', 'Instaliraj aplikaciju', 'Koristi aplikaciju',
        'App öffnen', 'Abrir app', 'Ouvrir l\u2019application'
    ];
    const xpath = '//*[' + labels.map((l) => "normalize-space(text())=\"" + l + "\"").join(' or ') + ']';

    const hideEl = (el) => el.style.setProperty('display', 'none', 'important');

    // A full-width "Open app" button (e.g. pinned to the bottom of an opened post) is wider than the
    // climb limit below, so hide the button itself and the bar that holds only it.
    const hideButton = (leaf) => {
        const button = leaf.closest('[role="button"]');
        if (!button || button.getBoundingClientRect().height > 80) return false;
        const bar = button.closest('.fixed-container');
        const barOnlyHoldsIt = bar && bar.getBoundingClientRect().height <= 120 &&
            bar.textContent.trim() === button.textContent.trim();
        hideEl(barOnlyHoldsIt ? bar : button);
        return true;
    };

    const hide = (leaf) => {
        // Climb while the parent is still button-sized. A text match alone is not enough: the
        // logo is an icon glyph, so the parent's text differs and the blue box would stay.
        let target = leaf;
        for (let i = 0; i < 6 && target.parentElement && target.parentElement !== document.body; i++) {
            const r = target.parentElement.getBoundingClientRect();
            if (r.width > 180 || r.height > 60) break;
            target = target.parentElement;
        }
        hideEl(target);
    };

    const scan = () => {
        const result = document.evaluate(xpath, document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for (let i = 0; i < result.snapshotLength; i++) {
            const el = result.snapshotItem(i);
            // The label can already be hidden (by an earlier pass or an ancestor), but its button may
            // not be: look for the button first. The climb needs a visible label, or it would run away.
            if (hideButton(el)) continue;
            if (el.getClientRects().length > 0) hide(el);
        }
    };

    let timer = null;
    const schedule = () => {
        if (timer) return;
        timer = setTimeout(() => {
            timer = null;
            scan();
        }, 400);
    };

    scan();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
})();
