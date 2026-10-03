// Hides the blue "Open app" button Facebook shows in the header (e.g. on Reels).
(function() {
    if (window._nbHideOpenApp) return;
    window._nbHideOpenApp = true;

    const labels = ['Open app', 'Open App', 'Otvori aplikaciju', 'Otvori app', 'App öffnen', 'Abrir app', 'Ouvrir l\u2019application'];
    const xpath = '//*[' + labels.map((l) => "normalize-space(text())=\"" + l + "\"").join(' or ') + ']';

    const hide = (leaf) => {
        // Climb to the outermost ancestor that still contains only that label.
        let target = leaf;
        const text = leaf.textContent.trim();
        for (let i = 0; i < 4 && target.parentElement; i++) {
            if (target.parentElement.textContent.trim() !== text) break;
            target = target.parentElement;
        }
        target.style.setProperty('display', 'none', 'important');
    };

    const scan = () => {
        const result = document.evaluate(xpath, document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for (let i = 0; i < result.snapshotLength; i++) {
            const el = result.snapshotItem(i);
            if (el.style.display !== 'none') hide(el);
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
