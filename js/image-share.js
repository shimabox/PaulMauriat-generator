'use strict';

const ImageShare = (() => {
    const DEFAULT_FILENAME = 'paulmauriat.png';
    const DEFAULT_SHARE_TEXT = '#ポールモーリアジェネレーター';
    const X_INTENT_BASE_URL = 'https://x.com/intent/post';
    const defaultFileApi = typeof File !== 'undefined' ? File : null;
    const defaultDecodeBase64 = typeof atob !== 'undefined' ? atob : null;
    const defaultNavigatorApi = typeof navigator !== 'undefined' ? navigator : null;
    const defaultWindowApi = typeof window !== 'undefined' ? window : null;

    const dataUrlToFile = ({
        dataUrl,
        filename = DEFAULT_FILENAME,
        FileApi = defaultFileApi,
        decodeBase64 = defaultDecodeBase64
    }) => {
        const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl || '');
        if (!match || !FileApi || !decodeBase64) {
            throw new Error('共有用の画像ファイルを作成できません');
        }

        const binary = decodeBase64(match[2]);
        const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));

        return new FileApi([bytes], filename, { type: match[1] });
    };

    const createXIntentUrl = (text = DEFAULT_SHARE_TEXT) =>
        `${X_INTENT_BASE_URL}?text=${encodeURIComponent(text)}`;

    const shareImage = async ({
        dataUrl,
        filename = DEFAULT_FILENAME,
        text = DEFAULT_SHARE_TEXT,
        navigatorApi = defaultNavigatorApi,
        windowApi = defaultWindowApi,
        FileApi = defaultFileApi,
        decodeBase64 = defaultDecodeBase64,
        downloadImage = null
    }) => {
        let file = null;
        let canShareFile = false;

        if (
            navigatorApi
            && typeof navigatorApi.canShare === 'function'
            && typeof navigatorApi.share === 'function'
            && FileApi
            && decodeBase64
        ) {
            try {
                file = dataUrlToFile({ dataUrl, filename, FileApi, decodeBase64 });
                // titleやtextではなく、対象ファイル自体を共有できるか確認する。
                canShareFile = navigatorApi.canShare({ files: [file] });
            } catch (error) {
                canShareFile = false;
            }
        }

        if (canShareFile) {
            try {
                await navigatorApi.share({
                    files: [file],
                    text
                });
                return { method: 'native' };
            } catch (error) {
                if (error && error.name === 'AbortError') {
                    return { method: 'cancelled' };
                }
                throw error;
            }
        }

        const intentUrl = createXIntentUrl(text);
        if (windowApi && typeof windowApi.open === 'function') {
            windowApi.open(intentUrl, '_blank', 'noopener,noreferrer');
        }

        // Web Intentにはローカル画像を添付できないため、投稿画面とは別に画像を保存する。
        if (typeof downloadImage === 'function') {
            downloadImage();
        }

        return {
            method: 'x-intent',
            intentUrl
        };
    };

    return {
        DEFAULT_SHARE_TEXT,
        createXIntentUrl,
        dataUrlToFile,
        shareImage
    };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageShare;
}
