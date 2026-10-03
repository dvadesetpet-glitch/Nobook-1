(function() {
    if (window.__nbPerfShim) return;
    window.__nbPerfShim = true;

    // Fix 1.3: batch every MutationObserver callback to one run per animation frame.
    // All feature scripts get debouncing without per-script edits.
    const NativeMO = window.MutationObserver;
    class DebouncedMO extends NativeMO {
        constructor(callback) {
            let pending = [];
            let scheduled = false;
            let self = null;
            super((records, observer) => {
                pending.push(...records);
                if (scheduled) return;
                scheduled = true;
                requestAnimationFrame(() => {
                    scheduled = false;
                    const batch = pending;
                    pending = [];
                    if (batch.length) callback.call(self, batch, observer);
                });
            });
            self = this;
        }
    }
    window.MutationObserver = DebouncedMO;

    // Fix 1.4: skip layout and paint of off-screen feed posts. Keeps React's DOM intact.
    const style = document.createElement('style');
    style.textContent = 'div[role="article"] { content-visibility: auto; contain-intrinsic-size: auto 500px; }';
    (document.head || document.documentElement).appendChild(style);
})();
