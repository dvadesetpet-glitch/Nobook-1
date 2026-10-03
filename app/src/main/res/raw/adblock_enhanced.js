(function() {
    if (window.__nbAdFilterEnhanced) return;
    window.__nbAdFilterEnhanced = true;

    // Category -> selectors matching ad containers by structure, not by text.
    const categories = {
        sponsored: [
            '[data-pagelet^="FeedUnit"]:has(a[href*="/ads/about"])',
            '[data-pagelet^="FeedUnit"]:has(a[aria-label="Sponsored"])',
            '[data-pagelet="RightRail"] [data-pagelet*="Ad"]',
            'div[data-ad-preview]',
            'div[data-ad-comet-preview]',
            'article:has(a[href*="/ads/about"])'
        ],
        marketplaceAds: [
            'a[href*="/ads/"][role="link"]',
            'div[data-pagelet*="MarketplaceAd"]'
        ]
    };

    let total = 0;

    function sweep() {
        let newly = 0;
        for (const category in categories) {
            let count = 0;
            for (const selector of categories[category]) {
                let nodes;
                try { nodes = document.querySelectorAll(selector); }
                catch (e) { continue; } // :has() unsupported on old WebView
                nodes.forEach(el => {
                    if (el.dataset.nbBlocked === '1') return;
                    el.dataset.nbBlocked = '1';
                    el.style.display = 'none';
                    count++;
                });
            }
            newly += count;
        }
        if (newly > 0) {
            total += newly;
            if (window.AdFilteringBridge) {
                window.AdFilteringBridge.reportBlocked(total);
            }
        }
    }

    // Debounce: one sweep per animation frame, however many mutations fire.
    let scheduled = false;
    function schedule() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            sweep();
        });
    }

    sweep();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
})();
