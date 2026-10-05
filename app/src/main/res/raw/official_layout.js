// Header and tab bar laid out like the official Facebook app:
//   header: noBook · settings, search, messenger (no grey circles)
//   tabs:   home · reels · friends · notifications · menu   (equal slots)
// Facebook's own elements are only hidden or moved with CSS; Messenger in the header and Menu
// in the tab bar are our own buttons that click the hidden originals, so their behaviour
// (Messenger inside Nobook, the menu page) stays Facebook's.
(function() {
    if (window._nbOfficialLayout) return;
    window._nbOfficialLayout = true;

    const MSG_ID = 'nb-header-messenger';
    const MENU_ID = 'nb-tab-menu';
    const TAB_ORDER = ['feed', 'reels', 'friends', 'notifications'];
    const MENU_GLYPH = '\u{F1946}'; // Facebook's icon font: the header menu icon

    // m.facebook stacks the tabs with negative margins, so a hidden tab must keep its box
    // (visibility, not display) or the tabs after it jump up. Each tab gets a fifth of the
    // width; its icon (29px), underline and badge are re-centred in it.
    const slot = (i) => `calc(${i} * 20vw) !important`;
    const ICON_LEFT = 'calc((20vw - 29px) / 2) !important';
    const BADGE_LEFT = 'calc((20vw - 29px) / 2 + 13px) !important';
    const TABS = '[role="tab"], #' + MENU_ID;
    const css = `
        [role="tab"][aria-label^="messages"], [role="tab"][aria-label^="marketplace"],
        [role="button"][aria-label="Facebook menu"] {
            visibility: hidden !important;
            pointer-events: none !important;
        }
        ${TAB_ORDER.map((name, i) => `[role="tab"][aria-label^="${name}"] { margin-left: ${slot(i)}; }`).join('\n')}
        #${MENU_ID} { margin-left: ${slot(4)}; }
        :is(${TABS}) { width: 20vw !important; }
        :is(${TABS}) > div { width: 100% !important; }
        :is(${TABS}) > div:first-child > div:first-child { margin-left: ${ICON_LEFT}; }
        :is(${TABS}) > div:nth-child(3) > div { margin-left: ${BADGE_LEFT}; }
        /* Plain header icons, no grey circles (drawn by ::before). */
        [role="button"][aria-label="Search Facebook"] > div::before,
        #${MSG_ID} > div::before {
            background: transparent !important;
        }
        #${MSG_ID}, #${MENU_ID} { cursor: pointer; }
        /* Facebook containers have pointer-events: none and enable it per button. */
        #${MSG_ID}, #${MENU_ID} { pointer-events: auto !important; }
        /* Settings gear (scripts.js) at the size of the other header icons. */
        #custom-settings-btn svg { width: 24px !important; height: 24px !important; }
        /* Facebook's own pull-to-refresh spinner sits above the tab bar (z-index 1001) and
           covered the middle tab; pull_to_refresh.js draws Nobook's indicator instead. */
        .pull-to-refresh-spinner-container { visibility: hidden !important; }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    const tab = (name) => document.querySelector(`[role="tab"][aria-label^="${name}"]`);

    // Same markup as Facebook's icon buttons, so the icon font, size and theme colours match.
    // The copy drops the data-action-id attributes: Facebook's handlers must not see it.
    const iconCopy = (source) => {
        const icon = source && source.querySelector('.native-text');
        if (!icon) return null;
        const holder = source.querySelector('[data-mcomponent="ServerTextArea"]') || icon.parentElement;
        const copy = holder.cloneNode(true);
        copy.querySelectorAll('*').forEach((el) => {
            [...el.attributes].forEach((a) => { if (a.name.startsWith('data-')) el.removeAttribute(a.name); });
        });
        return copy;
    };

    const proxy = (id, label, target, styleText, iconSource) => {
        const el = document.createElement('div');
        el.id = id;
        el.className = 'm';
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', label);
        el.setAttribute('style', styleText);
        const icon = iconCopy(iconSource);
        if (icon) el.appendChild(icon);
        el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const t = target();
            if (t) t.click();
        });
        return el;
    };

    const ensureMessenger = () => {
        const menu = document.querySelector('[role="button"][aria-label="Facebook menu"]');
        const messages = tab('messages');
        if (!menu || !messages || document.getElementById(MSG_ID)) return;
        // Takes the menu button's place at the right end of the header.
        const btn = proxy(MSG_ID, 'Messenger', () => tab('messages'), menu.getAttribute('style'), menu);
        const glyph = messages.querySelector('.native-text span');
        const span = btn.querySelector('.native-text span');
        if (glyph && span) span.textContent = glyph.textContent;
        menu.after(btn);
    };

    // A copy of a real tab (same size, icon position and separator line) showing the menu
    // icon, without Facebook's attributes or badges.
    const ensureMenuTab = () => {
        const last = tab('marketplace');
        const model = tab('notifications');
        if (!last || !model || document.getElementById(MENU_ID)) return;
        const btn = model.cloneNode(true);
        btn.id = MENU_ID;
        [...btn.attributes].forEach((a) => {
            if (a.name.startsWith('data-') || a.name.startsWith('aria-') || a.name === 'tabindex') btn.removeAttribute(a.name);
        });
        btn.setAttribute('role', 'button');
        btn.setAttribute('aria-label', 'menu');
        btn.querySelectorAll('*').forEach((el) => {
            [...el.attributes].forEach((a) => { if (a.name.startsWith('data-')) el.removeAttribute(a.name); });
        });
        const badges = btn.children[2];
        if (badges) badges.remove();
        const span = btn.querySelector('.native-text span');
        if (span) span.textContent = MENU_GLYPH;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Pages like Reels have no header menu button; /bookmarks/ is the page it opens.
            const t = document.querySelector('[role="button"][aria-label="Facebook menu"]');
            if (t) t.click();
            else location.href = '/bookmarks/';
        });
        last.after(btn);
    };

    // Colours of copied icons follow the original (theme changes repaint the originals).
    const syncColours = () => {
        const idle = TAB_ORDER.map(tab).find((t) => t && t.getAttribute('aria-selected') !== 'true');
        const pairs = [
            [MSG_ID, document.querySelector('[role="button"][aria-label="Search Facebook"] .native-text')],
            [MENU_ID, idle && idle.querySelector('.native-text')]
        ];
        pairs.forEach(([id, src]) => {
            const dst = document.querySelector(`#${id} .native-text`);
            if (src && dst && dst.style.color !== src.style.color) dst.style.color = src.style.color;
        });
    };

    const apply = () => {
        ensureMessenger();
        ensureMenuTab();
        syncColours();
    };

    let timer = null;
    const schedule = () => {
        if (timer) return;
        timer = setTimeout(() => {
            timer = null;
            apply();
        }, 200);
    };

    apply();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
})();
