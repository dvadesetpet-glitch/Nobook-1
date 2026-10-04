// Photo viewer: Facebook centres the picture on the whole screen, then lays a caption block over
// the bottom of it, so the lower part of the picture is hidden and it looks pushed down.
// Move the picture up so it is centred in the space between the header and the caption block.
(function() {
    if (window._nbPhotoViewerFix) return;
    window._nbPhotoViewerFix = true;

    let applied = 0;
    let timer = null;

    const fix = () => {
        const overlay = document.querySelector('.fixed-container.above-bottom');
        const scroller = document.querySelector('.hscroller-snap[data-disable-scroll-on-zoom="true"]');
        if (!overlay || !scroller) {
            return;
        }
        // The transparent block at the top of the overlay ends where the caption text starts.
        const spacer = overlay.querySelector('[role="img"]');
        const header = document.querySelector('.fixed-container:not(.above-bottom)');
        if (!spacer) return;

        // Overlay hidden (or not laid out): nothing covers the picture, undo any shift.
        if (spacer.getBoundingClientRect().height === 0 || getComputedStyle(overlay).display === 'none') {
            if (applied !== 0) {
                applied = 0;
                scroller.style.transform = '';
            }
            return;
        }

        // In a multi-photo post use the picture that is on screen, not the first one.
        const centreX = window.innerWidth / 2;
        let img = null;
        scroller.querySelectorAll('img[data-type="image"]').forEach((candidate) => {
            const r = candidate.getBoundingClientRect();
            if (r.height > 0 && r.left <= centreX && r.right >= centreX) img = candidate;
        });
        if (!img) return;

        const imgRect = img.getBoundingClientRect();

        // Measured position without our own shift.
        const imgTopNatural = imgRect.top - applied;
        const freeTop = header ? header.getBoundingClientRect().bottom : 0;
        const freeBottom = spacer.getBoundingClientRect().bottom;
        const free = freeBottom - freeTop;
        if (free <= 0) return;

        // If the picture is taller than the free space, align its top to the free area instead.
        const desiredTop = freeTop + Math.max(0, (free - imgRect.height) / 2);
        const dy = Math.round(desiredTop - imgTopNatural);
        if (Math.abs(dy - applied) < 2) return;

        applied = dy;
        scroller.style.transform = dy === 0 ? '' : 'translateY(' + dy + 'px)';
    };

    const schedule = () => {
        if (timer) return;
        timer = setTimeout(() => {
            timer = null;
            fix();
        }, 150);
    };

    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    // Swiping to another photo changes no DOM node, so listen for the scroll/touch itself.
    document.addEventListener('scroll', schedule, true);
    document.addEventListener('touchend', schedule, { passive: true, capture: true });
    schedule();
})();
