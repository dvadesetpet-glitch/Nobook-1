// scripts.js wraps URL.createObjectURL and calls FileReader.readAsDataURL on whatever it gets.
// Facebook passes a MediaSource (not a Blob) for video playback, so that call throws
// "parameter 1 is not of type 'Blob'" before the real createObjectURL runs.
// Ignore non-Blob media objects in readAsDataURL so the original createObjectURL is reached.
(function() {
    if (window._nbMediaSourceFix) return;
    window._nbMediaSourceFix = true;

    const original = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function(obj) {
        const isMedia =
            (typeof MediaSource !== 'undefined' && obj instanceof MediaSource) ||
            (typeof MediaStream !== 'undefined' && obj instanceof MediaStream);
        if (isMedia) return;
        return original.call(this, obj);
    };
})();
