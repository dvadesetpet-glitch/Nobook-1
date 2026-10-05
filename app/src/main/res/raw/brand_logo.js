// Replaces the Facebook wordmark in the header with the text "noBook".
// The original image keeps its space (hidden), so the header layout does not move.
(function() {
    if (window._nbBrandLogo) return;
    window._nbBrandLogo = true;

    const TEXT = 'noBook';
    const MARK = 'nb-brand-text';

    const isLightTheme = () =>
        (document.querySelector('meta[name="theme-color"]')?.content || '').toLowerCase() === '#ffffff';

    const isLogoButton = (el) => {
        const label = (el.getAttribute('aria-label') || '').toLowerCase();
        if (!label.includes('facebook') || !el.querySelector('img')) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.width <= 170 && r.height > 0 && r.height <= 40 && r.top < 90;
    };

    const apply = (container) => {
        const img = container.querySelector('img');
        if (img && img.style.visibility !== 'hidden') img.style.visibility = 'hidden';

        let text = container.querySelector('.' + MARK);
        if (!text) {
            if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
            text = document.createElement('span');
            text.className = MARK;
            text.textContent = TEXT;
            text.setAttribute('style', [
                'position:absolute', 'left:0', 'top:0', 'height:100%', 'display:flex', 'align-items:center',
                'font:800 28px/1 "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                'letter-spacing:-0.8px', 'white-space:nowrap', 'pointer-events:none'
            ].join(';'));
            container.appendChild(text);
        }
        text.style.color = isLightTheme() ? '#0866ff' : '#ffffff';
    };

    const scan = () => {
        document.querySelectorAll('[role="button"][aria-label]').forEach((el) => {
            if (el.querySelector('.' + MARK) || isLogoButton(el)) apply(el);
        });
    };

    let timer = null;
    const schedule = () => {
        if (timer) return;
        timer = setTimeout(() => {
            timer = null;
            scan();
        }, 300);
    };

    scan();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
})();
