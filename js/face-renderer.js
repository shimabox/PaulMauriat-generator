'use strict';

const privacyFilterApi = typeof PrivacyFilter !== 'undefined'
    ? PrivacyFilter
    : require('./privacy-filter.js');

const FaceRenderer = (() => {
    const clear = canvas => {
        canvas.width = 0;
        canvas.height = 0;
        canvas.style.width = '0px';
        canvas.style.height = '0px';
    };

    const applyPrivacy = (privacy, canvas, area) => {
        if (!area || (privacy !== '1' && privacy !== '2')) {
            return;
        }

        const clipped = privacyFilterApi.clampRectangle(
            area.x,
            area.y,
            area.width,
            area.height,
            canvas.width,
            canvas.height
        );
        if (clipped.width === 0 || clipped.height === 0) {
            return;
        }

        const context = canvas.getContext('2d');
        const imageData = context.getImageData(
            clipped.x,
            clipped.y,
            clipped.width,
            clipped.height
        );

        if (privacy === '1') {
            privacyFilterApi.applyEyeLine(imageData);
        } else {
            privacyFilterApi.applyMosaic(imageData, 16);
        }
        context.putImageData(imageData, clipped.x, clipped.y);
    };

    /**
     * 計算済みの切り出し領域を顔Canvasへ描画する。
     */
    const render = ({
        sourceCanvas,
        targetCanvas,
        crop,
        alpha,
        privacy
    }) => {
        if (!crop || crop.output.width <= 0 || crop.output.height <= 0) {
            return false;
        }

        applyPrivacy(privacy, sourceCanvas, crop.eyes);

        targetCanvas.width = crop.output.width;
        targetCanvas.height = crop.output.height;
        const context = targetCanvas.getContext('2d');
        const width = targetCanvas.width;
        const height = targetCanvas.height;

        context.globalAlpha = alpha;
        context.beginPath();
        context.arc(width / 2, height / 2, width / 2, 0, Math.PI * 2, true);
        context.clip();
        context.drawImage(
            sourceCanvas,
            crop.source.x,
            crop.source.y,
            crop.source.width,
            crop.source.height,
            0,
            0,
            width,
            height
        );

        const gradient = context.createRadialGradient(
            width / 2,
            height / 2,
            width / 2.5,
            width / 2,
            height / 2,
            width / 2
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.7)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.9)');
        context.fillStyle = gradient;
        context.fill();

        return true;
    };

    return { clear, render };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FaceRenderer;
}
