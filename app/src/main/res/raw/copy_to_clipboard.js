/*
 * Copy button on photo / video views: copies the Facebook link of what is on screen.
 * Based on download_content.js
 */

(function() {
  // Configuration
  const CONFIG = {
    buttonZIndex: 999999,
    debug: false
  };

  // Global state
  let isProcessing = false;
  let currentContentContainer = null;
  const COPY_BTN_ID = "nobook-clipboard-copier";

  // Selectors for finding media content
  const SELECTORS = {
    mediaElements: [
      'div[role="dialog"] img[src*="fbcdn"]:not([width="16"]):not([hidden])',
      'div.x1ey2m1c.x9f619.xds687c.x17qophe.x10l6tqk.x13vifvy[role="presentation"] img[src*="fbcdn"]',
      'div[data-pagelet="Story"] img[src*="fbcdn"]',
      'div[aria-label*="reel"] img[src*="fbcdn"]',
      'div[data-pagelet="ProfilePhoto"] img[src*="fbcdn"]'
    ],
    containers: [
      'div[role="dialog"]',
      'div[data-pagelet="Story"]',
      'div[aria-label*="story"]',
      '.story-viewer',
      '.story_viewer',
      'div.x1ey2m1c.x9f619.xds687c.x17qophe.x10l6tqk.x13vifvy[role="presentation"]',
      'div[data-pagelet="ProfilePhoto"]',
      'div[aria-label*="photo"]',
      'div[data-pagelet*="ProfileAppSection"]'
    ],
    contentIndicators: [
      'div[data-sigil="story-viewer"]',
      'div[data-sigil="story-popup-header"]',
      'div[data-sigil="story-tray-item"]',
      ".story_body_container",
      ".story_viewer",
      ".story-container",
      'div[aria-label*="highlight"]',
      'div[aria-label*="Highlight"]',
      'div.x1ey2m1c.x9f619.xds687c.x17qophe.x10l6tqk.x13vifvy[role="presentation"]',
      'div[data-pagelet="ProfilePhoto"]'
    ]
  };

  // Utility functions
  const debugLog = (...args) => CONFIG.debug && console.log("[ClipboardCopier]", ...args);

  const isElementVisible = (element) => {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
    );
  };


  // Find the appropriate container for the content
  const findContentContainer = (element) => {
    if (!element) return null;

    for (const selector of SELECTORS.containers) {
      const container = element.closest(selector);
      if (container) return container;
    }

    return element.parentElement;
  };

  // Get the current visible image element
  const getCurrentImageElement = () => {
    // Try each selector in order of priority
    for (const selector of SELECTORS.mediaElements) {
      const elements = document.querySelectorAll(selector);

      // Find the first visible element
      for (const element of elements) {
        if (isElementVisible(element) && element.src) {
          return element;
        }
      }
    }

    // Fallback: look for any large visible image
    return Array.from(
      document.querySelectorAll('img[src*="fbcdn"]:not([width="16"]):not([hidden])')
    ).find(el => {
      const rect = el.getBoundingClientRect();
      return isElementVisible(el) && rect.width > 150 && rect.height > 150 && el.src;
    });
  };

  // Video pages (reels, watch, videos): there is no <img> to copy, so the current frame is copied.
  const onVideoPage = () => /^\/(reel|reels|watch|videos)(\/|$)/.test(window.location.pathname);

  const getVisibleVideo = () => {
    let best = null;
    let bestArea = 0;
    document.querySelectorAll("video").forEach(v => {
      const r = v.getBoundingClientRect();
      const w = Math.min(r.right, window.innerWidth) - Math.max(r.left, 0);
      const h = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      const area = w > 0 && h > 0 ? w * h * (v.paused ? 1 : 1000) : 0;
      if (area > bestArea && v.videoWidth > 0) {
        bestArea = area;
        best = v;
      }
    });
    return best;
  };

  // Check if we are in a story or reel view
  const isInContentView = () => {
    // URL pattern checks
    const url = window.location.href;
    if (
      url.includes("/stories/") ||
      url.includes("/videos/") ||
      url.includes("/watch/?") ||
      url.includes("/photo") ||
      url.includes("/photos/") ||
      url.includes("/highlights/")
    ) {
      return true;
    }

    // Element selectors check
    for (const selector of SELECTORS.contentIndicators) {
      if (document.querySelector(selector)) {
        return true;
      }
    }

    return false;
  };

  // Facebook link of the photo / video on screen. Videos and reels share /watch/?v=ID, which
  // also opens reels (a bare /reel/ID link lands on the feed).
  const currentLink = () => {
    const u = new URL(window.location.href);
    const path = u.pathname;
    const v = u.searchParams.get("v");
    if (path.startsWith("/watch") && v) return "https://www.facebook.com/watch/?v=" + v;
    const video = path.match(/^\/reels?\/(\d+)/) || path.match(/\/videos\/(?:[^/]+\/)?(\d+)/);
    if (video) return "https://www.facebook.com/watch/?v=" + video[1];

    if (/^\/photo(\.php)?\/?$/.test(path) || path.includes("/photos/") || path.includes("/stories/")) {
      const link = new URL("https://www.facebook.com" + path);
      ["fbid", "set", "id", "story_fbid"].forEach(k => {
        const value = u.searchParams.get(k);
        if (value) link.searchParams.set(k, value);
      });
      return link.toString();
    }

    // Viewers that open over the page without changing the URL: link the picture itself.
    const imageElement = getCurrentImageElement();
    if (imageElement && imageElement.src) return imageElement.src;
    return "https://www.facebook.com" + path + u.search;
  };

  // Create and manage copy button
  const createCopyButton = () => {
    // Add CSS for the button
    const css = `
      #${COPY_BTN_ID} {
        position: fixed;
        top: 70px;
        right: 65px;
        width: 40px;
        height: 40px;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        border-radius: 50%;
        z-index: ${CONFIG.buttonZIndex};
        border: none;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        cursor: pointer;
        background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 960 960" fill="white"><path d="M360,720Q327,720 303.5,696.5Q280,673 280,640L280,160Q280,127 303.5,103.5Q327,80 360,80L720,80Q753,80 776.5,103.5Q800,127 800,160L800,640Q800,673 776.5,696.5Q753,720 720,720L360,720ZM360,640L720,640Q720,640 720,640Q720,640 720,640L720,160Q720,160 720,160Q720,160 720,160L360,160Q360,160 360,160Q360,160 360,160L360,640Q360,640 360,640Q360,640 360,640ZM240,840Q207,840 183.5,816.5Q160,793 160,760L160,240L240,240L240,760Q240,760 240,760Q240,760 240,760L600,760L600,840L240,840ZM360,640Q360,640 360,640Q360,640 360,640L360,160Q360,160 360,160Q360,160 360,160L360,160L360,640L360,640Q360,640 360,640Q360,640 360,640Z"/></svg>');
        background-repeat: no-repeat;
        background-position: center;
        background-size: 24px;
      }
      #${COPY_BTN_ID}.visible {
        display: flex !important;
      }
    `;

    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    // Create button element
    const btn = document.createElement("button");
    btn.id = COPY_BTN_ID;
    btn.setAttribute("aria-label", "Copy link to clipboard");

    btn.addEventListener("click", () => {
      if (window.ClipboardBridge && window.ClipboardBridge.copyLink) {
        window.ClipboardBridge.copyLink(currentLink());
      }
    });

    document.body.appendChild(btn);

    return btn;
  };

  // Show/hide copy button based on context
  const updateButtonVisibility = () => {
    let btn = document.getElementById(COPY_BTN_ID);
    if (!btn) btn = createCopyButton();

    if (onVideoPage() && getVisibleVideo()) {
      btn.classList.add("visible");
      return;
    }

    if (isInContentView()) {
      const imageElement = getCurrentImageElement();

      if (imageElement) {
        currentContentContainer = findContentContainer(imageElement);
        btn.classList.add("visible");
        return;
      }

      // Special case for highlighted stories
      const highlightedContentContainer = document.querySelector(
        'div.x1ey2m1c.x9f619.xds687c.x17qophe.x10l6tqk.x13vifvy[role="presentation"]'
      );

      if (highlightedContentContainer) {
        const imageInHighlight = highlightedContentContainer.querySelector(
          'img[src*="fbcdn"]'
        );

        if (imageInHighlight && isElementVisible(imageInHighlight)) {
          currentContentContainer = highlightedContentContainer;
          btn.classList.add("visible");
          return;
        }
      }
    }

    // Hide button if not in relevant view
    btn.classList.remove("visible");
    currentContentContainer = null;
  };

  // Main processing function
  const processPage = () => {
    if (isProcessing) return;
    isProcessing = true;

    try {
      updateButtonVisibility();
    } finally {
      isProcessing = false;
    }
  };

  // Initialize
  const init = () => {
    // Reset state
    currentContentContainer = null;

    // Initial check
    processPage();

    // Reels change without a reliable DOM signal the observer filters on.
    setInterval(processPage, 1500);

    // Set up DOM observer
    const observer = new MutationObserver(mutations => {
      const hasRelevantChanges = mutations.some(
        mutation =>
          (mutation.type === "childList" && mutation.addedNodes.length > 0) ||
          (mutation.type === "attributes" &&
            mutation.target.tagName === "IMG")
      );
      if (hasRelevantChanges) processPage();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "style", "class"]
    });
  };

  // Start when document is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
