'use strict';

const PreviewLayout = (() => {
    const isPositiveFiniteNumber = value => Number.isFinite(value) && value > 0;

    /**
     * 元の大きさを超えない範囲で、表示領域に収まるサイズと倍率を計算する。
     */
    const calcContainedLayout = (
        contentWidth,
        contentHeight,
        availableWidth,
        availableHeight
    ) => {
        if (
            !isPositiveFiniteNumber(contentWidth)
            || !isPositiveFiniteNumber(contentHeight)
        ) {
            return { scale: 1, width: 0, height: 0 };
        }

        const widthScale = isPositiveFiniteNumber(availableWidth)
            ? availableWidth / contentWidth
            : 1;
        const heightScale = isPositiveFiniteNumber(availableHeight)
            ? availableHeight / contentHeight
            : 1;
        const scale = Math.min(1, widthScale, heightScale);

        return {
            scale,
            width: Math.round(contentWidth * scale),
            height: Math.round(contentHeight * scale)
        };
    };

    /**
     * 正負を維持したまま、表示倍率に合わせて長さを丸める。
     */
    const scaleLength = (length, scale) => {
        if (!Number.isFinite(length) || !isPositiveFiniteNumber(scale)) {
            return 0;
        }

        return Math.sign(length) * Math.round(Math.abs(length) * scale);
    };

    return { calcContainedLayout, scaleLength };
})();

// Node.jsの標準テストから同じ実装を読み込めるようにする。
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PreviewLayout;
}
