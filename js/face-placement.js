'use strict';

const FacePlacement = (() => {
    /**
     * 顔として描画できる有限の正数サイズか確認する。
     */
    const hasValidFaceSize = (faceWidth, faceHeight) => {
        return Number.isFinite(faceWidth)
            && Number.isFinite(faceHeight)
            && faceWidth > 0
            && faceHeight > 0;
    };

    /**
     * プレビュー上の顔の縦位置を計算する。
     */
    const calcPreviewTop = (imageHeight, faceWidth, faceHeight, isTopSide) => {
        if (!hasValidFaceSize(faceWidth, faceHeight)) {
            return 0;
        }

        const fitSize = faceHeight * Math.floor((imageHeight / 2) / faceHeight);
        const remainder = (imageHeight / 2) % faceHeight;
        const totalGap = fitSize + remainder;
        const top = Math.floor(
            totalGap - faceHeight + (faceHeight / 2) + (faceHeight - faceWidth) / 4
        );

        return isTopSide === true ? -top : top;
    };

    /**
     * プレビュー上の顔の横位置を計算する。
     */
    const calcPreviewLeft = (imageWidth, faceWidth, faceHeight, isRightSide) => {
        if (!hasValidFaceSize(faceWidth, faceHeight)) {
            return 0;
        }

        const fitSize = faceWidth * Math.floor((imageWidth / 2) / faceWidth);
        const remainder = (imageWidth / 2) % faceWidth;
        const totalGap = fitSize + remainder;
        const left = Math.floor(
            totalGap - faceWidth + (faceWidth / 2) - (faceHeight - faceWidth) / 4
        );

        return isRightSide === true ? left : -left;
    };

    /**
     * 保存画像上の顔の横位置を計算する。
     */
    const calcOutputX = (imageWidth, faceWidth, faceHeight, isRightSide) => {
        if (!hasValidFaceSize(faceWidth, faceHeight)) {
            return 0;
        }

        if (isRightSide === false) {
            return Math.floor((faceHeight - faceWidth) / 4);
        }

        const fitSize = faceWidth * Math.floor(imageWidth / faceWidth);
        const remainder = imageWidth % faceWidth;
        const totalGap = fitSize + remainder;

        return Math.floor(totalGap - faceWidth - ((faceHeight - faceWidth) / 4));
    };

    /**
     * 保存画像上の顔の縦位置を計算する。
     */
    const calcOutputY = (imageHeight, faceWidth, faceHeight, isTopSide) => {
        if (!hasValidFaceSize(faceWidth, faceHeight)) {
            return 0;
        }

        if (isTopSide === true) {
            return Math.floor(-((faceHeight - faceWidth) / 4));
        }

        const fitSize = faceHeight * Math.floor(imageHeight / faceHeight);
        const remainder = imageHeight % faceHeight;
        const totalGap = fitSize + remainder;

        return Math.floor(totalGap - faceHeight + ((faceHeight - faceWidth) / 4));
    };

    const clampUnit = value => {
        if (!Number.isFinite(value)) {
            return 0.5;
        }

        return Math.min(1, Math.max(0, value));
    };

    /**
     * 自由配置の中心を画像内に保つ。
     * 顔全体ではなく中心を制限し、画像端で自然に一部を切り取れるようにする。
     */
    const clampNormalizedCenter = (x, y) => ({
        x: clampUnit(x),
        y: clampUnit(y)
    });

    /**
     * 顔の左上座標を、画像サイズに依存しない中心座標へ変換する。
     */
    const calcNormalizedCenter = (
        imageWidth,
        imageHeight,
        faceWidth,
        faceHeight,
        x,
        y
    ) => {
        if (
            !hasValidFaceSize(imageWidth, imageHeight)
            || !hasValidFaceSize(faceWidth, faceHeight)
            || !Number.isFinite(x)
            || !Number.isFinite(y)
        ) {
            return clampNormalizedCenter(0.5, 0.5);
        }

        return clampNormalizedCenter(
            (x + (faceWidth / 2)) / imageWidth,
            (y + (faceHeight / 2)) / imageHeight
        );
    };

    /**
     * 画像に対する中心座標から、顔Canvasの左上座標を求める。
     */
    const calcPositionFromNormalizedCenter = (
        imageWidth,
        imageHeight,
        faceWidth,
        faceHeight,
        centerX,
        centerY
    ) => {
        if (
            !hasValidFaceSize(imageWidth, imageHeight)
            || !hasValidFaceSize(faceWidth, faceHeight)
        ) {
            return { x: 0, y: 0 };
        }

        const center = clampNormalizedCenter(centerX, centerY);

        return {
            x: Math.round((imageWidth * center.x) - (faceWidth / 2)),
            y: Math.round((imageHeight * center.y) - (faceHeight / 2))
        };
    };

    /**
     * 原寸画像上の移動量を、自由配置の中心座標へ反映する。
     */
    const moveNormalizedCenter = (
        centerX,
        centerY,
        deltaX,
        deltaY,
        imageWidth,
        imageHeight
    ) => {
        const current = clampNormalizedCenter(centerX, centerY);
        if (!hasValidFaceSize(imageWidth, imageHeight)) {
            return current;
        }

        return clampNormalizedCenter(
            current.x + (Number.isFinite(deltaX) ? deltaX / imageWidth : 0),
            current.y + (Number.isFinite(deltaY) ? deltaY / imageHeight : 0)
        );
    };

    return {
        hasValidFaceSize,
        calcPreviewTop,
        calcPreviewLeft,
        calcOutputX,
        calcOutputY,
        clampNormalizedCenter,
        calcNormalizedCenter,
        calcPositionFromNormalizedCenter,
        moveNormalizedCenter
    };
})();

// Node.jsの標準テストから同じ実装を読み込めるようにする。
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FacePlacement;
}
