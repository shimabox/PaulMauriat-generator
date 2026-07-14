'use strict';

const PrivacyFilter = (() => {
    /**
     * 加工矩形をCanvasの範囲内へ切り詰める。
     */
    const clampRectangle = (x, y, width, height, canvasWidth, canvasHeight) => {
        const maxWidth = Math.max(0, Math.floor(canvasWidth));
        const maxHeight = Math.max(0, Math.floor(canvasHeight));
        const startX = Math.min(maxWidth, Math.max(0, Math.floor(x)));
        const startY = Math.min(maxHeight, Math.max(0, Math.floor(y)));
        const endX = Math.min(
            maxWidth,
            Math.max(startX, Math.ceil(x + Math.max(0, width)))
        );
        const endY = Math.min(
            maxHeight,
            Math.max(startY, Math.ceil(y + Math.max(0, height)))
        );

        return {
            x: startX,
            y: startY,
            width: endX - startX,
            height: endY - startY
        };
    };

    /**
     * ImageDataのRGB値を黒にし、アルファ値は維持する。
     */
    const applyEyeLine = imageData => {
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
        }

        return imageData;
    };

    /**
     * ImageDataを指定サイズのブロック単位でモザイク化する。
     */
    const applyMosaic = (imageData, size = 16) => {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        if (!Number.isInteger(size) || size <= 0) {
            throw new RangeError('モザイクのブロックサイズには正の整数を指定してください');
        }

        for (let y = 0; y < height; y += size) {
            for (let x = 0; x < width; x += size) {
                const index = (x + y * width) * 4;
                const red = data[index];
                const green = data[index + 1];
                const blue = data[index + 2];
                const blockWidth = Math.min(size, width - x);
                const blockHeight = Math.min(size, height - y);

                for (let y2 = 0; y2 < blockHeight; y2++) {
                    for (let x2 = 0; x2 < blockWidth; x2++) {
                        const pixelIndex = (width * (y + y2) + (x + x2)) * 4;
                        data[pixelIndex] = red;
                        data[pixelIndex + 1] = green;
                        data[pixelIndex + 2] = blue;
                    }
                }
            }
        }

        return imageData;
    };

    return { clampRectangle, applyEyeLine, applyMosaic };
})();

// Node.jsの標準テストから同じ実装を読み込めるようにする。
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PrivacyFilter;
}
