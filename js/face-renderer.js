'use strict';

const privacyFilterApi = typeof PrivacyFilter !== 'undefined'
    ? PrivacyFilter
    : require('./privacy-filter.js');
const faceRendererCanvasQualityApi = typeof CanvasQuality !== 'undefined'
    ? CanvasQuality
    : require('./canvas-quality.js');

const FaceRenderer = (() => {
    const edgeFadeInnerRatio = 0.55;
    const glassVeilOffsetRatio = 0.1;

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
     * 顔の中央を保ちつつ、外周へ向けて透明にする範囲を求める。
     */
    const calculateEdgeFade = (width, height) => {
        const outerRadius = width / 2;

        return {
            centerX: width / 2,
            centerY: height / 2,
            innerRadius: outerRadius * edgeFadeInnerRatio,
            outerRadius
        };
    };

    /**
     * 外周へ薄いガラスの膜を重ねる範囲を求める。
     * 内側の中心をずらし、均一な白い輪に見えないようにする。
     */
    const calculateGlassVeil = (width, height) => {
        const outerRadius = width / 2;
        const offset = outerRadius * glassVeilOffsetRatio;

        return {
            innerCenterX: width / 2 - offset,
            innerCenterY: height / 2 - offset,
            innerRadius: outerRadius * edgeFadeInnerRatio,
            outerCenterX: width / 2,
            outerCenterY: height / 2,
            outerRadius
        };
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
        faceRendererCanvasQualityApi.configure(context);
        const width = targetCanvas.width;
        const height = targetCanvas.height;

        context.save();
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
        context.restore();

        const fade = calculateEdgeFade(width, height);
        context.save();
        context.globalAlpha = 1;
        context.globalCompositeOperation = 'destination-in';
        const gradient = context.createRadialGradient(
            fade.centerX,
            fade.centerY,
            fade.innerRadius,
            fade.centerX,
            fade.centerY,
            fade.outerRadius
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
        context.restore();

        const glass = calculateGlassVeil(width, height);
        context.save();
        context.globalAlpha = 1;
        context.globalCompositeOperation = 'source-over';
        const glassGradient = context.createRadialGradient(
            glass.innerCenterX,
            glass.innerCenterY,
            glass.innerRadius,
            glass.outerCenterX,
            glass.outerCenterY,
            glass.outerRadius
        );
        glassGradient.addColorStop(0, 'rgba(236, 244, 248, 0)');
        glassGradient.addColorStop(0.42, 'rgba(236, 244, 248, 0.025)');
        glassGradient.addColorStop(0.72, 'rgba(246, 250, 252, 0.065)');
        glassGradient.addColorStop(0.9, 'rgba(255, 255, 255, 0.085)');
        glassGradient.addColorStop(0.98, 'rgba(255, 255, 255, 0)');
        context.fillStyle = glassGradient;
        context.fillRect(0, 0, width, height);
        context.restore();

        return true;
    };

    return { calculateEdgeFade, calculateGlassVeil, clear, render };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FaceRenderer;
}
