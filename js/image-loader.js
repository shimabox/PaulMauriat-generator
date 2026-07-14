'use strict';

const imageInputApi = typeof ImageInput !== 'undefined'
    ? ImageInput
    : require('./image-input.js');
const imageDimensionsApi = typeof ImageDimensions !== 'undefined'
    ? ImageDimensions
    : require('./image-dimensions.js');
const imageOrientationApi = typeof ImageOrientation !== 'undefined'
    ? ImageOrientation
    : require('./image-orientation.js');

const ImageLoader = (() => {
    const MAX_DECODE_SIDE = 2048;
    const getBrowserDependencies = overrides => {
        const createImageBitmap = overrides.createImageBitmap
            || (
                typeof globalThis.createImageBitmap === 'function'
                    ? globalThis.createImageBitmap.bind(globalThis)
                    : undefined
            );

        return {
            FileReader: overrides.FileReader || globalThis.FileReader,
            Image: overrides.Image || globalThis.Image,
            Blob: overrides.Blob || globalThis.Blob,
            URL: overrides.URL || globalThis.URL,
            createImageBitmap
        };
    };

    /**
     * 選択されたファイルを既存の画像入力ルールで検証する。
     */
    const validateFile = file => imageInputApi.validateImageFile(file);

    const readFileAsArrayBuffer = (file, FileReaderConstructor) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReaderConstructor();

            reader.addEventListener('error', () => {
                reject(new Error('画像ファイルを読み込めませんでした'));
            });
            reader.addEventListener('load', () => resolve(reader.result));
            reader.readAsArrayBuffer(file);
        });
    };

    const decodeImageWithObjectUrl = (blob, dependencies) => {
        const imageUrl = dependencies.URL.createObjectURL(blob);

        return new Promise((resolve, reject) => {
            const image = new dependencies.Image();

            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', () => {
                reject(new Error('画像を表示できませんでした'));
            });
            image.src = imageUrl;
        }).then(
            image => {
                dependencies.URL.revokeObjectURL(imageUrl);
                return image;
            },
            error => {
                dependencies.URL.revokeObjectURL(imageUrl);
                throw error;
            }
        );
    };

    const getDecodeOptions = dimensions => {
        if (!dimensions || Math.max(dimensions.width, dimensions.height) <= MAX_DECODE_SIDE) {
            return {};
        }

        const scale = MAX_DECODE_SIDE / Math.max(dimensions.width, dimensions.height);
        return {
            resizeWidth: Math.max(1, Math.round(dimensions.width * scale)),
            resizeHeight: Math.max(1, Math.round(dimensions.height * scale)),
            resizeQuality: 'high'
        };
    };

    const decodeImage = (content, fileType, dimensions, dependencies) => {
        const blob = new dependencies.Blob([content], { type: fileType });

        // ImageBitmapが扱えない形式は従来のImageデコードへ戻す。
        if (typeof dependencies.createImageBitmap === 'function') {
            return Promise.resolve()
                .then(() => dependencies.createImageBitmap(
                    blob,
                    getDecodeOptions(dimensions)
                ))
                .catch(() => decodeImageWithObjectUrl(blob, dependencies));
        }

        return decodeImageWithObjectUrl(blob, dependencies);
    };

    /**
     * 画像ファイルを検証・解析し、描画可能なImageへ変換する。
     */
    const loadImageFile = (file, overrides = {}) => {
        const validation = validateFile(file);

        if (!validation.valid) {
            if (!validation.error) {
                return Promise.resolve(null);
            }

            return Promise.reject(new Error(validation.error));
        }

        const dependencies = getBrowserDependencies(overrides);

        return readFileAsArrayBuffer(file, dependencies.FileReader)
            .then(content => {
                const dimensions = imageDimensionsApi.getImageDimensions(content);
                const dimensionValidation = imageInputApi.validateImageDimensions(dimensions);

                if (!dimensionValidation.valid) {
                    throw new Error(dimensionValidation.error);
                }

                const orientation = imageOrientationApi.getOrientation(content);
                const decodeContent = imageOrientationApi.neutralizeOrientation(content);

                return decodeImage(
                    decodeContent,
                    file.type,
                    dimensions,
                    dependencies
                )
                    .then(image => ({ image, orientation }));
            });
    };

    return { validateFile, loadImageFile };
})();

// Node.jsの標準テストから同じ実装を読み込めるようにする。
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageLoader;
}
