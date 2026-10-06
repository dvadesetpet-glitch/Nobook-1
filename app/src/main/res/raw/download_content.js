/*
 * Script to add download buttons for stories, stories highlights and reels on Facebook
 * Original Author: @YeiversonYurgaky
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
  let lastDownloadedUrl = null;
  const DOWNLOAD_BTN_ID = "nobook-global-downloader";

  // Selectors for finding media content
  const SELECTORS = {
    mediaElements: [
      'div[role="dialog"] video:not([hidden])',
      'div[role="dialog"] img[src*="fbcdn"]:not([width="16"]):not([hidden])',
      'div.x1ey2m1c.x9f619.xds687c.x17qophe.x10l6tqk.x13vifvy[role="presentation"] video',
      'div.x1ey2m1c.x9f619.xds687c.x17qophe.x10l6tqk.x13vifvy[role="presentation"] img[src*="fbcdn"]',
      'div[data-pagelet="Story"] video',
      'div[aria-label*="reel"] video',
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
    storyIndicators: [
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
  const debugLog = (...args) => CONFIG.debug && console.log("[ContentDownloader]", ...args);

  const isElementVisible = (element) => {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
    );
  };


  // Streaming (MSE) videos expose a blob: URL that cannot be fetched; only direct links work.
  const hasDirectSrc = (el) => !!el.src && !el.src.startsWith("blob:");

  const getVisibleBlobVideo = () =>
    Array.from(document.querySelectorAll("video")).find(v => {
      const r = v.getBoundingClientRect();
      const w = Math.min(r.right, window.innerWidth) - Math.max(r.left, 0);
      const h = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      return !hasDirectSrc(v) && v.src && r.width > 150 && r.height > 150 &&
        w > 0 && h > 0 && w * h > r.width * r.height * 0.6;
    });

  // Find the appropriate container for the content
  const findContentContainer = (element) => {
    if (!element) return null;

    for (const selector of SELECTORS.containers) {
      const container = element.closest(selector);
      if (container) return container;
    }

    return element.parentElement;
  };

  // Get the current visible media element
  const getCurrentMediaElement = () => {
    // Try each selector in order of priority
    for (const selector of SELECTORS.mediaElements) {
      const elements = document.querySelectorAll(selector);

      // Find the first visible element
      for (const element of elements) {
        if (isElementVisible(element) && hasDirectSrc(element)) {
          return element;
        }
      }
    }

    // Fallback: look for any large visible media
    return Array.from(
      document.querySelectorAll('video:not([hidden]), img[src*="fbcdn"]:not([width="16"]):not([hidden])')
    ).find(el => {
      const rect = el.getBoundingClientRect();
      return isElementVisible(el) && rect.width > 150 && rect.height > 150 && hasDirectSrc(el);
    });
  };

  // Check if we are in a story or reel view
  const isInStoryOrReelView = () => {
    // URL pattern checks
    const url = window.location.href;
    if (
      url.includes("/stories/") ||
      url.includes("/reel/") ||
      url.includes("/videos/") ||
      url.includes("/watch/?") ||
      url.includes("/photo") ||
      url.includes("/photos/") ||
      url.includes("/highlights/")
    ) {
      return true;
    }

    // Element selectors check
    for (const selector of SELECTORS.storyIndicators) {
      if (document.querySelector(selector)) {
        return true;
      }
    }

    return false;
  };

  // Download media from URL: the app saves the direct fbcdn link itself (no base64 round trip).
  const downloadMedia = (url) => {
    if (!window.DownloadBridge) return;
    if (url.startsWith("https://") && window.DownloadBridge.downloadUrl) {
      window.DownloadBridge.downloadUrl(url);
      return;
    }
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = function() {
          if (reader.result) {
            window.DownloadBridge.downloadBase64File(reader.result, blob.type || "image/jpeg");
          }
        };
        reader.readAsDataURL(blob);
      })
      .catch(err => console.error("Error downloading media:", err));
  };

  // Extract and download videos or images
  const extractAndDownloadMedia = () => {
    // Find current media element
    const mediaElement = getCurrentMediaElement();

    if (mediaElement && mediaElement.src && mediaElement.src !== lastDownloadedUrl) {
      downloadMedia(mediaElement.src);
      lastDownloadedUrl = mediaElement.src;
      return;
    }

    // Get container to search in
    const container = currentContentContainer || document.body;

    // Find videos first
    const videoElement = container.querySelector("video:not([hidden])");
    if (videoElement && hasDirectSrc(videoElement) && videoElement.src !== lastDownloadedUrl) {
      downloadMedia(videoElement.src);
      lastDownloadedUrl = videoElement.src;
      return;
    }

    // If no video, try with images
    const images = Array.from(container.querySelectorAll("img"))
      .filter(img =>
        img.src &&
        !img.src.includes("data:image") &&
        img.src !== lastDownloadedUrl
      )
      .filter(img => {
        const rect = img.getBoundingClientRect();
        return rect.width >= 100 && rect.height >= 100 && isElementVisible(img);
      })
      .sort((a, b) => {
        const areaA = a.getBoundingClientRect().width * a.getBoundingClientRect().height;
        const areaB = b.getBoundingClientRect().width * b.getBoundingClientRect().height;
        return areaB - areaA; // Largest first
      });

    if (images.length > 0) {
      downloadMedia(images[0].src);
      lastDownloadedUrl = images[0].src;
      return;
    }

    // Try background images as last resort
    const backgroundElements = Array.from(container.querySelectorAll("*"));

    for (const el of backgroundElements) {
      const style = window.getComputedStyle(el);
      const bgImage = style.backgroundImage;

      if (
        bgImage &&
        bgImage !== "none" &&
        (bgImage.includes("fbcdn.net") || bgImage.includes("fbsbx.com"))
      ) {
        const imageUrl = bgImage.replace(/^url\(['"](.+)['"]\)$/, "$1");

        if (imageUrl !== lastDownloadedUrl) {
          downloadMedia(imageUrl);
          lastDownloadedUrl = imageUrl;
          return;
        }
      }
    }

    // Nothing found
    debugLog("No media content found to download");
  };

  // ---- Feed posts ----------------------------------------------------------------------------
  // The feed has no per-post links in its DOM and plays videos from blob: URLs, so the button
  // follows the media that fills most of the screen. Pictures are saved from their own link;
  // videos are opened in the viewer (where the player gets a direct mp4), saved, then closed.
  let feedTarget = null;
  let busy = false;

  const isVideoThumb = (img) => /\/t15\.5256-/.test(img.src); // poster of a video post

  const findFeedMedia = () => {
    let best = null;
    let bestArea = 0;
    document.querySelectorAll("video, img[src*='fbcdn']").forEach(el => {
      if (el.closest("[data-is-h-scrollable]")) return; // stories tray, carousels of avatars
      const r = el.getBoundingClientRect();
      if (r.width < 200 || r.height < 150) return;
      const w = Math.min(r.right, window.innerWidth) - Math.max(r.left, 0);
      const h = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      if (w <= 0 || h <= 0) return;
      const area = w * h;
      if (area > bestArea) { bestArea = area; best = el; }
    });
    // Needs at least a third of the screen so the button never points at a neighbouring post.
    return bestArea > window.innerWidth * window.innerHeight / 3 ? best : null;
  };

  const placeButton = (btn, el) => {
    const r = el.getBoundingClientRect();
    const top = Math.min(Math.max(r.top + 8, 120), window.innerHeight - 60);
    btn.style.top = top + "px";
  };

  // Streaming (blob:) videos are DASH: a video-only and an audio-only mp4 per clip. The player's
  // requests show up in the resource timing list; with the byte range removed each URL is the
  // whole track, and the app muxes the two into one mp4.
  let navSince = 0; // when the current viewer page was opened
  let lastPath = location.pathname + location.search;

  const stripRange = (url) => {
    const u = new URL(url);
    u.searchParams.delete("bytestart");
    u.searchParams.delete("byteend");
    return u.toString();
  };

  // The clip on screen is the one whose length (duration_s in the request's efg blob) matches the
  // player's; when several match (preloaded neighbours), the most recently requested wins.
  const playingDuration = () => {
    let best = null;
    let bestArea = 0;
    document.querySelectorAll("video").forEach(v => {
      const r = v.getBoundingClientRect();
      const w = Math.min(r.right, window.innerWidth) - Math.max(r.left, 0);
      const h = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      const area = w > 0 && h > 0 ? w * h : 0;
      if (area > bestArea && isFinite(v.duration)) { bestArea = area; best = v; }
    });
    return best ? best.duration : null;
  };

  const dashTracks = (since) => {
    const duration = playingDuration();
    const tracks = [];
    performance.getEntriesByType("resource").forEach(e => {
      if (e.startTime < since || !/\.mp4/.test(e.name) || !e.name.includes("fbcdn")) return;
      try {
        const u = new URL(e.name);
        const efg = JSON.parse(atob(decodeURIComponent(u.searchParams.get("efg"))));
        const tag = efg.vencode_tag || "";
        if (!tag.startsWith("dash")) return;
        tracks.push({
          asset: String(efg.xpv_asset_id),
          length: efg.duration_s,
          audio: /audio/.test(tag),
          height: parseInt((tag.match(/_(\d+)p$/) || [0, 0])[1], 10),
          url: stripRange(e.name)
        });
      } catch (err) { /* not one of the player's requests */ }
    });
    const videos = tracks.filter(t => !t.audio);
    const matching = duration === null ? videos
      : videos.filter(t => typeof t.length === "number" && Math.abs(t.length - duration) <= 1);
    const pick = matching.length ? matching[matching.length - 1] : videos[0];
    if (!pick) return null;
    const mine = tracks.filter(t => t.asset === pick.asset);
    const video = mine.filter(t => !t.audio).sort((x, y) => y.height - x.height)[0];
    const audio = mine.find(t => t.audio);
    return { video: video.url, audio: audio ? audio.url : "" };
  };

  const downloadDash = (since) => {
    const t = dashTracks(since);
    if (t && window.DownloadBridge && window.DownloadBridge.downloadDash) {
      window.DownloadBridge.downloadDash(t.video, t.audio);
      return true;
    }
    return false;
  };

  const openVideoAndDownload = (el) => {
    busy = true;
    const startPath = location.pathname + location.search;
    const since = performance.now();
    (el.closest('[role="button"]') || el).click();
    const started = Date.now();
    const timer = setInterval(() => {
      const opened = location.pathname + location.search !== startPath;
      const timedOut = Date.now() - started > 9000;
      if ((opened && Date.now() - started > 1500 && downloadDash(since)) || timedOut) {
        clearInterval(timer);
        setTimeout(() => {
          busy = false;
          if (opened) history.back();
        }, 800);
      }
    }, 400);
  };

  const downloadFeedMedia = (el) => {
    if (busy) return;
    if (el.tagName === "VIDEO") {
      if (hasDirectSrc(el)) downloadMedia(el.src);
      else openVideoAndDownload(el);
    } else if (isVideoThumb(el)) {
      openVideoAndDownload(el);
    } else {
      downloadMedia(el.src);
    }
  };

  // Create and manage download button
  const createDownloadButton = () => {
    // Add CSS for the button
    const css = `
      #${DOWNLOAD_BTN_ID} {
        position: fixed;
        top: 70px;
        right: 15px;
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
        background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 960 960" fill="white"><path d="M480,640L280,440L336,384L440,488L440,160L520,160L520,488L624,384L680,440L480,640ZM240,800Q207,800 183.5,776.5Q160,753 160,720L160,600L240,600L240,720Q240,720 240,720Q240,720 240,720L720,720Q720,720 720,720Q720,720 720,720L720,600L800,600L800,720Q800,753 776.5,776.5Q753,800 720,800L240,800Z"/></svg>');
        background-repeat: no-repeat;
        background-position: center;
        background-size: 24px;
      }
      #${DOWNLOAD_BTN_ID}.visible {
        display: flex !important;
      }
    `;

    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    // Create button element
    const btn = document.createElement("button");
    btn.id = DOWNLOAD_BTN_ID;
    btn.setAttribute("aria-label", "Download content");

    btn.addEventListener("click", () => {
      if (feedTarget) {
        downloadFeedMedia(feedTarget);
        return;
      }
      // Reset state
      currentContentContainer = null;
      lastDownloadedUrl = null;

      // Find current media and container
      // A streaming video on screen wins over the thumbnails and avatars around it.
      const mediaElement = getCurrentMediaElement();
      if ((!mediaElement || mediaElement.tagName !== "VIDEO") && getVisibleBlobVideo()) {
        downloadDash(navSince);
        return;
      }
      if (mediaElement) {
        currentContentContainer = findContentContainer(mediaElement);
      }

      extractAndDownloadMedia();
    });

    document.body.appendChild(btn);

    return btn;
  };

  // Show/hide download button based on context
  const updateButtonVisibility = () => {
    let btn = document.getElementById(DOWNLOAD_BTN_ID);
    if (!btn) btn = createDownloadButton();

    if (!(isInStoryOrReelView() && !isFeed())) {
      feedTarget = busy ? feedTarget : findFeedMedia();
      if (feedTarget) {
        placeButton(btn, feedTarget);
        btn.classList.add("visible");
      } else {
        btn.classList.remove("visible");
      }
      return;
    }
    feedTarget = null;
    btn.style.top = "";

    if (isInStoryOrReelView() && !isFeed()) {
      const mediaElement = getCurrentMediaElement() || getVisibleBlobVideo();

      // Always hide "Open in App" buttons
      hideOpenAppButtons();

      if (mediaElement) {
        currentContentContainer = findContentContainer(mediaElement);
        btn.classList.add("visible");
        return;
      }

      // Special case for highlighted stories
      const highlightedStoryContainer = document.querySelector(
        'div.x1ey2m1c.x9f619.xds687c.x17qophe.x10l6tqk.x13vifvy[role="presentation"]'
      );

      if (highlightedStoryContainer) {
        const mediaInHighlight = highlightedStoryContainer.querySelector(
          'video, img[src*="fbcdn"]'
        );

        if (mediaInHighlight && isElementVisible(mediaInHighlight)) {
          currentContentContainer = highlightedStoryContainer;
          btn.classList.add("visible");
          return;
        }
      }
    }

    // Hide button if not in relevant view
    btn.classList.remove("visible");
    currentContentContainer = null;
  };

  const hideOpenAppButtons = (root = document) => {
        // Find all div[role="button"] elements
        const buttons = root.querySelectorAll('div[role="button"]');

        buttons.forEach(button => {
          // Check if it contains div.fl.ac with a span containing the 󱥬 symbol
          const flAcDiv = button.querySelector('div.fl.ac');

          if (flAcDiv) {
            const span = flAcDiv.querySelector('span');
            if (span && span.textContent.includes('󱥬')) {
              button.style.display = 'none';
            }
          }
        });
  };

  // Main processing function
  const processPage = () => {
    const path = location.pathname + location.search;
    if (path !== lastPath) { lastPath = path; navSince = performance.now(); }
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
    lastDownloadedUrl = null;

    // Initial check
    processPage();

    // Set up DOM observer
    const observer = new MutationObserver(mutations => {
      const hasRelevantChanges = mutations.some(
        mutation =>
          (mutation.type === "childList" && mutation.addedNodes.length > 0) ||
          (mutation.type === "attributes" &&
            (mutation.target.tagName === "VIDEO" ||
             mutation.target.tagName === "IMG"))
      );
      if (hasRelevantChanges) processPage();
    });

    window.addEventListener("scroll", () => processPage(), { passive: true, capture: true });
    setInterval(processPage, 1000);

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