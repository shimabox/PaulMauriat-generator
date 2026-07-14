'use strict';

const ImageOrientation = (() => {
    /**
     * JPEGのEXIF情報から画像の向きを取得する。
     *
     * @param {ArrayBuffer} buffer 画像データ
     * @returns {number} EXIF Orientation。見つからない場合は0
     */
    const getOrientation = buffer => {
        const dv = new DataView(buffer);
        let app1MarkerStart = 2;

        // JFIFのAPP0マーカーがある場合は、直後のAPP1マーカーへ移動する。
        if (dv.getUint16(app1MarkerStart) !== 65505) {
            const length = dv.getUint16(4);
            app1MarkerStart += length + 2;
        }

        if (dv.getUint16(app1MarkerStart) !== 65505) {
            return 0;
        }

        const littleEndian = dv.getUint8(app1MarkerStart + 10) === 73;
        const count = dv.getUint16(app1MarkerStart + 18, littleEndian);

        for (let i = 0; i < count; i++) {
            const start = app1MarkerStart + 20 + i * 12;
            const tag = dv.getUint16(start, littleEndian);

            if (tag === 274) {
                return dv.getUint16(start + 8, littleEndian);
            }
        }

        return 0;
    };

    return { getOrientation };
})();

// Node.jsの標準テストから同じ実装を読み込めるようにする。
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageOrientation;
}
