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

    const readUint24LittleEndian = (view, offset) => {
        return view.getUint8(offset)
            | (view.getUint8(offset + 1) << 8)
            | (view.getUint8(offset + 2) << 16);
    };

    const readWebpDimensions = view => {
        const riff = [0x52, 0x49, 0x46, 0x46];
        const webp = [0x57, 0x45, 0x42, 0x50];
        if (
            view.byteLength < 25
            || !hasBytes(view, riff, 0)
            || !hasBytes(view, webp, 8)
        ) {
            return null;
        }

        const chunkType = String.fromCharCode(
            view.getUint8(12),
            view.getUint8(13),
            view.getUint8(14),
            view.getUint8(15)
        );

        if (chunkType === 'VP8X' && view.byteLength >= 30) {
            return {
                width: readUint24LittleEndian(view, 24) + 1,
                height: readUint24LittleEndian(view, 27) + 1
            };
        }

        if (
            chunkType === 'VP8 '
            && view.byteLength >= 30
            && hasBytes(view, [0x9d, 0x01, 0x2a], 23)
        ) {
            return {
                width: view.getUint16(26, true) & 0x3fff,
                height: view.getUint16(28, true) & 0x3fff
            };
        }

        if (chunkType === 'VP8L' && view.getUint8(20) === 0x2f) {
            const bits = view.getUint32(21, true);
            return {
                width: (bits & 0x3fff) + 1,
                height: ((bits >>> 14) & 0x3fff) + 1
            };
        }

        return null;
    };

    const isAvif = view => {
        if (view.byteLength < 16 || !hasBytes(view, [0x66, 0x74, 0x79, 0x70], 4)) {
            return false;
        }

        for (let offset = 8; offset + 4 <= Math.min(view.byteLength, 64); offset += 4) {
            const brand = String.fromCharCode(
                view.getUint8(offset),
                view.getUint8(offset + 1),
                view.getUint8(offset + 2),
                view.getUint8(offset + 3)
            );
            if (brand === 'avif' || brand === 'avis') {
                return true;
            }
        }
        return false;
    };

    const readAvifDimensions = view => {
        if (!isAvif(view)) {
            return null;
        }

        // ispeは画像空間の幅・高さを持つ20バイトのプロパティボックス。
        for (let typeOffset = 4; typeOffset + 16 <= view.byteLength; typeOffset++) {
            if (!hasBytes(view, [0x69, 0x73, 0x70, 0x65], typeOffset)) {
                continue;
            }

            const boxStart = typeOffset - 4;
            const boxSize = view.getUint32(boxStart, false);
            if (boxSize < 20 || boxStart + boxSize > view.byteLength) {
                continue;
            }

            const width = view.getUint32(boxStart + 12, false);
            const height = view.getUint32(boxStart + 16, false);
            if (width > 0 && height > 0) {
                return { width, height };
            }
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
            || readJpegDimensions(view)
            || readWebpDimensions(view)
            || readAvifDimensions(view);
    };

    return { getImageDimensions };
})();

// Node.jsの標準テストから同じ実装を読み込めるようにする。
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageDimensions;
}
