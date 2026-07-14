'use strict';

const ImageOrientation = (() => {
    const JPEG_SOI = 0xFFD8;
    const MARKER_PREFIX = 0xFF;
    const APP1_MARKER = 0xE1;
    const START_OF_SCAN_MARKER = 0xDA;
    const END_OF_IMAGE_MARKER = 0xD9;
    const EXIF_HEADER = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
    const ORIENTATION_TAG = 0x0112;
    const SHORT_TYPE = 3;

    /**
     * 指定範囲をDataViewから安全に読み取れるか確認する。
     */
    const canRead = (start, size, end) => {
        return start >= 0 && size >= 0 && start + size <= end;
    };

    /**
     * APP1セグメント内のTIFFデータから画像の向きを取得する。
     */
    const getOrientationFromApp1 = (
        view,
        segmentStart,
        segmentEnd,
        onOrientationEntry
    ) => {
        if (!canRead(segmentStart, EXIF_HEADER.length + 8, segmentEnd)) {
            return 0;
        }

        for (let i = 0; i < EXIF_HEADER.length; i++) {
            if (view.getUint8(segmentStart + i) !== EXIF_HEADER[i]) {
                return 0;
            }
        }

        const tiffStart = segmentStart + EXIF_HEADER.length;
        const byteOrder = view.getUint16(tiffStart);
        const littleEndian = byteOrder === 0x4949;

        if (!littleEndian && byteOrder !== 0x4D4D) {
            return 0;
        }

        if (view.getUint16(tiffStart + 2, littleEndian) !== 42) {
            return 0;
        }

        const ifdOffset = view.getUint32(tiffStart + 4, littleEndian);
        const ifdStart = tiffStart + ifdOffset;

        if (ifdStart < tiffStart + 8 || !canRead(ifdStart, 2, segmentEnd)) {
            return 0;
        }

        const declaredEntryCount = view.getUint16(ifdStart, littleEndian);
        const readableEntryCount = Math.floor((segmentEnd - (ifdStart + 2)) / 12);
        const entryCount = Math.min(declaredEntryCount, readableEntryCount);

        for (let i = 0; i < entryCount; i++) {
            const entryStart = ifdStart + 2 + i * 12;
            const tag = view.getUint16(entryStart, littleEndian);

            if (tag !== ORIENTATION_TAG) {
                continue;
            }

            const type = view.getUint16(entryStart + 2, littleEndian);
            const count = view.getUint32(entryStart + 4, littleEndian);

            if (type !== SHORT_TYPE || count !== 1) {
                return 0;
            }

            const orientation = view.getUint16(entryStart + 8, littleEndian);
            if (orientation < 1 || orientation > 8) {
                return 0;
            }

            if (typeof onOrientationEntry === 'function') {
                onOrientationEntry(entryStart + 8, littleEndian, orientation);
            }
            return orientation;
        }

        return 0;
    };

    /**
     * JPEGのEXIF情報から画像の向きを取得する。
     *
     * @param {ArrayBuffer} buffer 画像データ
     * @returns {number} EXIF Orientation。見つからない場合は0
     */
    const getOrientation = (buffer, onOrientationEntry) => {
        const dv = new DataView(buffer);
        const dataEnd = dv.byteLength;

        if (!canRead(0, 2, dataEnd) || dv.getUint16(0) !== JPEG_SOI) {
            return 0;
        }

        let offset = 2;

        while (offset < dataEnd) {
            if (dv.getUint8(offset) !== MARKER_PREFIX) {
                return 0;
            }

            // 連続する0xFFはマーカーの埋め草として読み飛ばす。
            while (offset < dataEnd && dv.getUint8(offset) === MARKER_PREFIX) {
                offset++;
            }

            if (!canRead(offset, 1, dataEnd)) {
                return 0;
            }

            const marker = dv.getUint8(offset);
            offset++;

            // 画像データ本体にはEXIFセグメントがないため、ここで探索を終える。
            if (marker === START_OF_SCAN_MARKER || marker === END_OF_IMAGE_MARKER) {
                return 0;
            }

            // TEMとリスタートマーカーにはセグメント長がない。
            if (marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
                continue;
            }

            if (!canRead(offset, 2, dataEnd)) {
                return 0;
            }

            const segmentLength = dv.getUint16(offset);

            if (segmentLength < 2) {
                return 0;
            }

            const segmentStart = offset + 2;
            const segmentEnd = offset + segmentLength;

            if (segmentEnd > dataEnd) {
                return 0;
            }

            if (marker === APP1_MARKER) {
                const orientation = getOrientationFromApp1(
                    dv,
                    segmentStart,
                    segmentEnd,
                    onOrientationEntry
                );

                if (orientation !== 0) {
                    return orientation;
                }
            }

            offset = segmentEnd;
        }

        return 0;
    };

    /**
     * ブラウザの自動回転を防ぐため、デコード用コピーのOrientationだけを1にする。
     * 元データは変更しない。
     */
    const neutralizeOrientation = buffer => {
        let orientationEntry = null;
        getOrientation(buffer, (offset, littleEndian, orientation) => {
            orientationEntry = { offset, littleEndian, orientation };
        });

        if (!orientationEntry || orientationEntry.orientation === 1) {
            return buffer;
        }

        const copy = buffer.slice(0);
        new DataView(copy).setUint16(
            orientationEntry.offset,
            1,
            orientationEntry.littleEndian
        );
        return copy;
    };

    return { getOrientation, neutralizeOrientation };
})();

// Node.jsの標準テストから同じ実装を読み込めるようにする。
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageOrientation;
}
