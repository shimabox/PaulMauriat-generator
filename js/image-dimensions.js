'use strict';

const ImageDimensions = (() => {
    const jpegStartOfFrameMarkers = [
        0xc0, 0xc1, 0xc2, 0xc3,
        0xc5, 0xc6, 0xc7,
        0xc9, 0xca, 0xcb,
        0xcd, 0xce, 0xcf
    ];

    const createDataView = data => {
        if (data instanceof ArrayBuffer) {
            return new DataView(data);
        }

        if (ArrayBuffer.isView(data)) {
            return new DataView(data.buffer, data.byteOffset, data.byteLength);
        }

        return null;
    };

    const hasBytes = (view, expected, offset = 0) => {
        if (!view || view.byteLength < offset + expected.length) {
            return false;
        }

        return expected.every((value, index) => {
            return view.getUint8(offset + index) === value;
        });
    };

    const readPngDimensions = view => {
        const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
        const ihdr = [0x49, 0x48, 0x44, 0x52];

        if (
            view.byteLength < 24
            || !hasBytes(view, pngSignature)
            || !hasBytes(view, ihdr, 12)
        ) {
            return null;
        }

        return {
            width: view.getUint32(16, false),
            height: view.getUint32(20, false)
        };
    };

    const readGifDimensions = view => {
        const gif87a = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61];
        const gif89a = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];

        if (
            view.byteLength < 10
            || (!hasBytes(view, gif87a) && !hasBytes(view, gif89a))
        ) {
            return null;
        }

        return {
            width: view.getUint16(6, true),
            height: view.getUint16(8, true)
        };
    };

    const readJpegDimensions = view => {
        if (
            view.byteLength < 4
            || view.getUint16(0, false) !== 0xffd8
        ) {
            return null;
        }

        let offset = 2;
        while (offset < view.byteLength) {
            while (offset < view.byteLength && view.getUint8(offset) === 0xff) {
                offset++;
            }

            if (offset >= view.byteLength) {
                return null;
            }

            const marker = view.getUint8(offset++);
            if (marker === 0xd9 || marker === 0xda) {
                return null;
            }

            if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
                continue;
            }

            if (offset + 2 > view.byteLength) {
                return null;
            }

            const segmentLength = view.getUint16(offset, false);
            if (segmentLength < 2 || offset + segmentLength > view.byteLength) {
                return null;
            }

            if (jpegStartOfFrameMarkers.includes(marker) && segmentLength >= 7) {
                return {
                    width: view.getUint16(offset + 5, false),
                    height: view.getUint16(offset + 3, false)
                };
            }

            offset += segmentLength;
        }

        return null;
    };

    /**
     * 対応している画像ヘッダーから、デコードせずに幅と高さを取得する。
     */
    const getImageDimensions = data => {
        const view = createDataView(data);
        if (!view) {
            return null;
        }

        return readPngDimensions(view)
            || readGifDimensions(view)
            || readJpegDimensions(view);
    };

    return { getImageDimensions };
})();

// Node.jsの標準テストから同じ実装を読み込めるようにする。
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageDimensions;
}
