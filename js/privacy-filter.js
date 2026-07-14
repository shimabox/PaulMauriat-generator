'use strict';

const PrivacyFilter = (() => {
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

        for (let x = 0; x < width; x += size) {
            for (let y = 0; y < height; y += size) {
                const index = (x + y * width) * 4;
                const red = data[index];
                const green = data[index + 1];
                const blue = data[index + 2];

                for (let x2 = 0; x2 < size; x2++) {
                    for (let y2 = 0; y2 < size; y2++) {
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

    return { applyEyeLine, applyMosaic };
})();

// Node.jsの標準テストから同じ実装を読み込めるようにする。
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PrivacyFilter;
}
