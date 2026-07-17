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
    const glassRimWidthRatio = 0.025;

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
     * 指定透明度を保ちながら、顔の中央だけを少し濃くする。
     */
    const calculateOpacityProfile = alpha => {
        const numericAlpha = Number(alpha);
        const normalizedAlpha = Number.isFinite(numericAlpha)
            ? Math.min(1, Math.max(0, numericAlpha))
            : 0;
        const round = value => Math.round(value * 10000) / 10000;
        const centerAlpha = normalizedAlpha === 0
            ? 0
            : round(Math.min(1, normalizedAlpha + 0.1));

        return {
            centerAlpha,
            innerMaskAlpha: centerAlpha === 0
                ? 0
                : round(normalizedAlpha / centerAlpha)
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
     * ガラスの切断面として見せる細い縁の位置を求める。
     */
    const calculateGlassRim = (width, height) => {
        const lineWidth = Math.min(
            5,
            Math.max(2, width * glassRimWidthRatio)
        );

        return {
            centerX: width / 2,
            centerY: height / 2,
            lineWidth,
            radius: width / 2 - lineWidth / 2
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
        const opacity = calculateOpacityProfile(alpha);

        context.save();
        context.globalAlpha = opacity.centerAlpha;
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
            0,
            fade.centerX,
            fade.centerY,
            fade.outerRadius
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
        gradient.addColorStop(
            edgeFadeInnerRatio,
            `rgba(0, 0, 0, ${opacity.innerMaskAlpha})`
        );
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
        glassGradient.addColorStop(0.42, 'rgba(236, 244, 248, 0.008)');
        glassGradient.addColorStop(0.72, 'rgba(246, 250, 252, 0.02)');
        glassGradient.addColorStop(0.9, 'rgba(255, 255, 255, 0.028)');
        glassGradient.addColorStop(0.98, 'rgba(255, 255, 255, 0)');
        context.fillStyle = glassGradient;
        context.fillRect(0, 0, width, height);
        context.restore();

        const rim = calculateGlassRim(width, height);
        context.save();
        context.globalAlpha = 1;
        context.globalCompositeOperation = 'source-over';
        context.lineWidth = rim.lineWidth;
        context.lineCap = 'round';
        context.shadowBlur = rim.lineWidth * 0.6;
        context.shadowColor = 'rgba(255, 255, 255, 0.08)';

        const highlightGradient = context.createLinearGradient(
            0,
            0,
            width,
            0
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.32)');
        highlightGradient.addColorStop(0.55, 'rgba(248, 251, 253, 0.18)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        context.strokeStyle = highlightGradient;
        context.beginPath();
        context.arc(
            rim.centerX,
            rim.centerY,
            rim.radius,
            Math.PI * 0.9,
            Math.PI * 1.85
        );
        context.stroke();

        const sideGradient = context.createLinearGradient(
            0,
            0,
            0,
            height
        );
        sideGradient.addColorStop(0, 'rgba(232, 240, 246, 0.12)');
        sideGradient.addColorStop(0.55, 'rgba(216, 227, 234, 0.05)');
        sideGradient.addColorStop(1, 'rgba(216, 227, 234, 0)');
        context.strokeStyle = sideGradient;
        context.beginPath();
        context.arc(
            rim.centerX,
            rim.centerY,
            rim.radius,
            Math.PI * 1.85,
            Math.PI * 2.25
        );
        context.stroke();
        context.restore();

        return true;
    };

    return {
        calculateEdgeFade,
        calculateGlassRim,
        calculateGlassVeil,
        calculateOpacityProfile,
        clear,
        render
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FaceRenderer;
}
