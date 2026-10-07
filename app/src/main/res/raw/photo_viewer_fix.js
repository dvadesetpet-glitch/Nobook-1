// Photo viewer: Facebook centres the picture on the whole screen, then lays a caption block over
// the bottom of it, so the lower part of the picture is hidden and it looks pushed down. On top of
// that it sometimes leaves the <img> offset inside its own box (top: 65px; bottom: -65px), which
// pushes the picture further down and lets the scroller clip its lower part.
// Move each picture back into its box, then centre the one on screen in the space between the
// header and the caption block, shrinking it a little if it is taller than that space.
(function() {
    if (window._nbPhotoViewerFix) return;
    window._nbPhotoViewerFix = true;

    let observer = null;

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

        const images = Array.from(scroller.querySelectorAll('img[data-type="image"]'));

        // Overlay hidden (or not laid out): nothing covers the picture, undo everything.
        if (spacer.getBoundingClientRect().height === 0 || getComputedStyle(overlay).display === 'none') {
            scroller.style.transform = '';
            images.forEach((image) => { image.style.translate = ''; });
            return;
        }

        // Measure without our own changes so repeated runs never compound. Facebook's own inline
        // offsets (top/left/transform) are left alone.
        scroller.style.transform = '';
        images.forEach((image) => { image.style.translate = ''; });

        // Put every picture back in the middle of its box, vertically only: the horizontal offset
        // is how Facebook parks the neighbouring photos of a multi-photo post.
        let active = null;
        const centreX = window.innerWidth / 2;
        images.forEach((image) => {
            const box = image.parentElement.getBoundingClientRect();
            const rect = image.getBoundingClientRect();
            if (box.height <= 0 || rect.height <= 0) return;
            const dy = Math.round(box.top + box.height / 2 - (rect.top + rect.height / 2));
            if (dy !== 0) image.style.translate = '0px ' + dy + 'px';
            if (box.left <= centreX && box.right >= centreX) active = image;
        });

        // Centre the picture on screen in the free area.
        if (active) {
            const box = active.parentElement.getBoundingClientRect();
            const freeTop = header ? header.getBoundingClientRect().bottom : 0;
            const free = spacer.getBoundingClientRect().bottom - freeTop;
            if (free > 0) {
                const scale = Math.min(1, free / box.height);
                const boxCentre = box.top + box.height / 2;
                const dy = Math.round(freeTop + free / 2 - boxCentre);
                const scrollerTop = scroller.getBoundingClientRect().top;
                scroller.style.transformOrigin = '50% ' + (boxCentre - scrollerTop) + 'px';
                scroller.style.transform = dy === 0 && scale === 1
                    ? ''
                    : 'translateY(' + dy + 'px) scale(' + scale.toFixed(4) + ')';
            }
        }

        // Our own style writes are not a reason to run again.
        if (observer) observer.takeRecords();
    };

    // Facebook animates the picture into place with CSS transitions, which fire no mutation, so
    // measure again a little later too: the first run may have caught it half way.
    const DELAYS = [150, 500, 1200];
    let timers = [];

    const schedule = () => {
        if (timers.length) return;
        timers = DELAYS.map((delay, index) => setTimeout(() => {
            if (index === DELAYS.length - 1) timers = [];
            fix();
        }, delay));
    };

    observer = new MutationObserver(schedule);
    // Style changes too: Facebook moves the <img> by rewriting its inline style once it has laid
    // the photo out, with no DOM node added or removed.
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
    });
    window.addEventListener('resize', schedule);
    // Swiping to another photo changes no DOM node, so listen for the scroll/touch itself.
    document.addEventListener('scroll', schedule, true);
    document.addEventListener('touchend', schedule, { passive: true, capture: true });
    // A picture can finish loading (and change size) without touching the DOM tree.
    document.addEventListener('load', schedule, true);
    document.addEventListener('transitionend', schedule, true);
    document.addEventListener('animationend', schedule, true);
    schedule();
})();
