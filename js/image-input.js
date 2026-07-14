'use strict';

const ImageInput = (() => {
    const DEFAULT_MAX_FILE_SIZE = 20 * 1024 * 1024;

    /**
     * 選択されたファイルが読み込み可能な画像か検証する。
     */
    const validateImageFile = (file, maxFileSize = DEFAULT_MAX_FILE_SIZE) => {
        if (!file) {
            return { valid: false, error: null };
        }

        if (typeof file.type !== 'string' || !file.type.startsWith('image/')) {
            return { valid: false, error: '画像ファイルを選択してください' };
        }

        if (file.size > maxFileSize) {
            const maxMegabytes = Math.floor(maxFileSize / (1024 * 1024));
            return {
                valid: false,
                error: `画像ファイルは${maxMegabytes}MB以下を選択してください`
            };
        }

        return { valid: true, error: null };
    };

    return { DEFAULT_MAX_FILE_SIZE, validateImageFile };
})();

// Node.jsの標準テストから同じ実装を読み込めるようにする。
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageInput;
}
