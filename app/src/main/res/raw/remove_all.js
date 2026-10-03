// "Remove all" button for the "People you may know" list on the Friends page.
// Clicks every visible "Remove" button one by one (with pauses), scrolling to load more.
(function() {
    if (window._nbRemoveAll) return;
    window._nbRemoveAll = true;

    const REMOVE = ['Remove', 'Ukloni', 'Entfernen', 'Eliminar', 'Supprimer'];
    const HEADINGS = ['People you may know', 'Osobe koje možda poznajete', 'Personen, die du kennen könntest'];
    const BTN_ID = 'nb-remove-all';
    const MAX_PER_RUN = 60;

    const xpath = (labels) =>
        '//*[' + labels.map((l) => 'normalize-space(text())="' + l + '"').join(' or ') + ']';

    const onFriendsPage = () => location.pathname.startsWith('/friends');

    const hasHeading = () =>
        document.evaluate(xpath(HEADINGS), document.body, null, XPathResult.BOOLEAN_TYPE, null).booleanValue;

    const removeButtons = () => {
        const snap = document.evaluate(xpath(REMOVE), document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        const out = [];
        for (let i = 0; i < snap.snapshotLength; i++) {
            const el = snap.snapshotItem(i);
            const btn = el.closest('[role="button"], [data-action-id]') || el;
            if (!out.includes(btn) && !btn.dataset.nbRemoved) out.push(btn);
        }
        return out;
    };

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    let running = false;
    let armedTimer = null;
    let btn = null;

    const label = (text) => { if (btn) btn.textContent = text; };

    const run = async () => {
        running = true;
        let done = 0;
        let idleRounds = 0;
        while (running && done < MAX_PER_RUN && idleRounds < 4) {
            const next = removeButtons()[0];
            if (!next) {
                idleRounds++;
                window.scrollBy(0, window.innerHeight);
                await sleep(1200);
                continue;
            }
            idleRounds = 0;
            next.dataset.nbRemoved = '1';
            next.scrollIntoView({ block: 'center' });
            await sleep(250);
            next.click();
            done++;
            label('Stop (' + done + ')');
            await sleep(700 + Math.random() * 600);
        }
        running = false;
        label('Removed ' + done);
        setTimeout(() => label('Remove all'), 3000);
    };

    const onTap = () => {
        if (running) {
            running = false;
            return;
        }
        if (armedTimer) {
            clearTimeout(armedTimer);
            armedTimer = null;
            run();
            return;
        }
        // First tap only arms the button; a second tap within 4 s starts removing.
        label('Tap again to remove all');
        armedTimer = setTimeout(() => {
            armedTimer = null;
            label('Remove all');
        }, 4000);
    };

    const build = () => {
        const b = document.createElement('button');
        b.id = BTN_ID;
        b.textContent = 'Remove all';
        b.setAttribute('style', [
            'position:fixed', 'right:12px', 'bottom:72px', 'z-index:2147483647',
            'padding:10px 16px', 'border:none', 'border-radius:22px',
            'background:#e41e3f', 'color:#fff', 'font:600 14px sans-serif',
            'box-shadow:0 2px 8px rgba(0,0,0,0.4)', 'display:none'
        ].join(';'));
        b.addEventListener('click', (e) => {
            e.stopPropagation();
            onTap();
        });
        document.body.appendChild(b);
        return b;
    };

    const tick = () => {
        if (!document.body) return;
        if (!btn || !document.getElementById(BTN_ID)) btn = build();
        const show = onFriendsPage() && hasHeading() && (running || removeButtons().length > 0);
        btn.style.display = show ? 'block' : 'none';
    };

    setInterval(tick, 1000);
})();
