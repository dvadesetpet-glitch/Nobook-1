// Feed ads whose label is split over two spans (e.g. "Ad" + a separate icon span) slip past
// adblock.js, which tests each span on its own. This tests the whole label element instead.
(function() {
    if (window._nbFeedAdFix) return;
    window._nbFeedAdFix = true;

    const words = [
        "Sponsored", "Ad", "Gesponsert", "Sponsorlu",
        "Sponsorowane", "Ispoonsara godhameera", "Geborg", "Bersponsor",
        "Ditaja", "Disponsori", "Giisponsoran", "Sponzorováno",
        "Sponsoreret", "Publicidad", "May Sponsor", "Sponsorisée",
        "Sponsorisé", "Oipytyvôva", "Ɗaukar Nayin", "Sponzorirano",
        "Uterwa inkunga", "Sponsorizzato", "Imedhaminiwa", "Hirdetés",
        "Misy Mpiantoka", "Gesponsord", "Sponset", "Patrocinado",
        "Sponsorizat", "Sponzorované", "Sponsoroitu", "Sponsrat",
        "Được tài trợ", "Χορηγούμενη", "Спонсорирано", "Спонзорирано",
        "Ивээн тэтгэсэн", "Реклама", "Спонзорисано", "במימון",
        "سپانسرڈ", "دارای پشتیبانی مالی", "ስፖንሰር የተደረገ", "प्रायोजित",
        "ተደረገ", "प", "স্পনসর্ড", "ਪ੍ਰਯੋਜਿਤ",
        "પ્રાયોજિત", "ପ୍ରାୟୋଜିତ", "செய்யப்பட்ட செய்யப்பட்ட", "చేయబడినది చేయబడినది",
        "ಪ್ರಾಯೋಜಿಸಲಾಗಿದೆ", "ചെയ്‌തത് ചെയ്‌തത്", "ලද ලද ලද", "สนับสนุน สนับสนุน รับ สนับสนุน สนับสนุน",
        "ကြော်ငြာ ကြော်ငြာ", "ឧបត្ថម្ភ ឧបត្ថម្ភ ឧបត្ថម្ភ", "광고", "贊助",
        "赞助内容", "広告", "സ്‌പോൺസർ ചെയ്‌തത്", "Anzeige",
        "Peye", "Oglas"
    ];

    // U+F078B is the icon glyph Facebook puts right after the sponsored label.
    const adLabel = new RegExp('^(' + words.join('|') + ')\\s*\\u{F078B}', 'iu');

    const scan = () => {
        document.querySelectorAll('.native-text').forEach((el) => {
            const text = el.textContent;
            if (text.length > 40 || !adLabel.test(text)) return;
            const post = el.closest('div[data-tracking-duration-id]');
            if (post && post.style.display !== 'none') post.style.display = 'none';
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
