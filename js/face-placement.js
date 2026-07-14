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

    return {
        hasValidFaceSize,
        calcPreviewTop,
        calcPreviewLeft,
        calcOutputX,
        calcOutputY
    };
})();

// Node.jsの標準テストから同じ実装を読み込めるようにする。
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FacePlacement;
}
