'use strict';

const privacyFilterApi = typeof PrivacyFilter !== 'undefined'
    ? PrivacyFilter
    : require('./privacy-filter.js');
const faceRendererCanvasQualityApi = typeof CanvasQuality !== 'undefined'
    ? CanvasQuality
    : require('./canvas-quality.js');

const FaceRenderer = (() => {
    const edgeFadeInnerRatio = 0.75;
    const glassVeilInnerRatio = 0.65;
    const glassVeilOffsetRatio = 0.1;
    const glassRimWidthRatio = 0.0125;

    // 縁強度(edge)の [-1, +1] → 描画パラメータの区分線形補間の端点。
    const edgeProfileAnchors = {
        fadeInnerRatio: { min: 0.45, mid: 0.75, max: 0.95 },
        veilAlphaScale: { min: 0, mid: 1, max: 1.5 },
        rimAlphaScale: { min: 0, mid: 1, max: 1.5 }
    };

    // 白い膜(glassGradient)の各色停止点。alphaへ veilAlphaScale を掛けて使う。
    const glassGradientStops = [
        { offset: 0, r: 236, g: 244, b: 248, alpha: 0 },
        { offset: 0.42, r: 236, g: 244, b: 248, alpha: 0.008 },
        { offset: 0.72, r: 246, g: 250, b: 252, alpha: 0.02 },
        { offset: 0.9, r: 255, g: 255, b: 255, alpha: 0.028 },
        { offset: 0.98, r: 255, g: 255, b: 255, alpha: 0 }
    ];

    // 縁線(rimGradient)の各色停止点。alphaへ rimAlphaScale を掛けて使う。
    const rimGradientStops = [
        { offset: 0, r: 255, g: 255, b: 255, alpha: 0.28 },
        { offset: 0.35, r: 248, g: 251, b: 253, alpha: 0.18 },
        { offset: 0.7, r: 196, g: 208, b: 218, alpha: 0.15 },
        { offset: 1, r: 255, g: 255, b: 255, alpha: 0.24 }
    ];

    // 縁線の影(shadowColor)。alphaへ rimAlphaScale を掛けて使う。
    const rimShadowStop = { r: 255, g: 255, b: 255, alpha: 0.09 };

    const round4 = value => Math.round(value * 10000) / 10000;

    /**
     * alpha に scale を掛け、上限1でクランプしたrgba文字列を作る。
     */
    const scaledRgba = ({ r, g, b, alpha }, scale) => {
        const scaledAlpha = round4(Math.min(1, Math.max(0, alpha * scale)));
        return `rgba(${r}, ${g}, ${b}, ${scaledAlpha})`;
    };

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
     * innerRatio省略時は現行値(0.75)を使う。
     */
    const calculateEdgeFade = (width, height, innerRatio = edgeFadeInnerRatio) => {
        const outerRadius = width / 2;

        return {
            centerX: width / 2,
            centerY: height / 2,
            innerRadius: outerRadius * innerRatio,
            outerRadius
        };
    };

    /**
     * 縁強度(edge, [-1, +1])から、フェード開始位置・白い膜・縁線の
     * 濃さ倍率を区分線形補間で求める。
     * edge<0 は [-1, 0] 区間、edge>0 は [0, +1] 区間で線形補間する。
     */
    const calculateEdgeProfile = edge => {
        const numericEdge = Number(edge);
        const normalizedEdge = Number.isFinite(numericEdge)
            ? Math.min(1, Math.max(-1, numericEdge))
            : 0;

        const interpolate = ({ min, mid, max }) => {
            const [from, to, t] = normalizedEdge < 0
                ? [min, mid, normalizedEdge + 1]
                : [mid, max, normalizedEdge];
            return round4(from + (to - from) * t);
        };

        return {
            fadeInnerRatio: interpolate(edgeProfileAnchors.fadeInnerRatio),
            veilAlphaScale: interpolate(edgeProfileAnchors.veilAlphaScale),
            rimAlphaScale: interpolate(edgeProfileAnchors.rimAlphaScale)
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
            innerRadius: outerRadius * glassVeilInnerRatio,
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
            2.5,
            Math.max(1, width * glassRimWidthRatio)
        );
        const blur = Math.min(4, Math.max(2, lineWidth * 1.6));

        return {
            blur,
            centerX: width / 2,
            centerY: height / 2,
            lineWidth,
            radius: width / 2 - lineWidth / 2 - blur / 2
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
        privacy,
        edge = 0
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
        const edgeProfile = calculateEdgeProfile(edge);

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

        const fade = calculateEdgeFade(width, height, edgeProfile.fadeInnerRatio);
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
            edgeProfile.fadeInnerRatio,
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
        glassGradientStops.forEach(stop => {
            glassGradient.addColorStop(
                stop.offset,
                scaledRgba(stop, edgeProfile.veilAlphaScale)
            );
        });
        context.fillStyle = glassGradient;
        context.fillRect(0, 0, width, height);
        context.restore();

        const rim = calculateGlassRim(width, height);
        context.save();
        context.globalAlpha = 1;
        context.globalCompositeOperation = 'source-over';
        const rimGradient = context.createLinearGradient(0, 0, width, height);
        rimGradientStops.forEach(stop => {
            rimGradient.addColorStop(
                stop.offset,
                scaledRgba(stop, edgeProfile.rimAlphaScale)
            );
        });
        context.strokeStyle = rimGradient;
        context.lineWidth = rim.lineWidth;
        context.shadowBlur = rim.blur;
        context.shadowColor = scaledRgba(rimShadowStop, edgeProfile.rimAlphaScale);
        context.beginPath();
        context.arc(
            rim.centerX,
            rim.centerY,
            rim.radius,
            0,
            Math.PI * 2,
            true
        );
        context.stroke();
        context.restore();

        return true;
    };

    return {
        calculateEdgeFade,
        calculateEdgeProfile,
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
