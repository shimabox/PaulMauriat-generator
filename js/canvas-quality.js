'use strict';

const CanvasQuality = (() => {
    /**
     * Canvasの拡大・縮小時に、利用可能な範囲で高品質な画像補間を使う。
     */
    const configure = context => {
        if (!context) {
            return;
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
    };

    return { configure };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanvasQuality;
}
