// Turns the square unseen-count badges (e.g. on story cards) into circles.
(function() {
    if (window._nbRoundBadges) return;
    window._nbRoundBadges = true;

    const COUNT = /^\d+\+?$/;

    const scan = () => {
        document.querySelectorAll('.nb').forEach((el) => {
            if (el.dataset.nbRound) return;
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.width > 40 || r.height > 40) return;
            if (!COUNT.test(el.textContent.trim())) return;
            el.dataset.nbRound = '1';
            el.style.clipPath = 'inset(0 round 999px)';
            const inner = el.firstElementChild;
            if (inner) inner.style.borderRadius = '999px';
        });
    };

    let timer = null;
    const schedule = () => {
        if (timer) return;
        timer = setTimeout(() => { timer = null; scan(); }, 300);
    };

    scan();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
})();
