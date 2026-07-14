'use strict';

const CameraError = (() => {
    const permissionDeniedErrors = ['NotAllowedError', 'SecurityError', 'PermissionDeniedError'];
    const cameraNotFoundErrors = ['NotFoundError', 'DevicesNotFoundError'];
    const cameraUnavailableErrors = ['NotReadableError', 'TrackStartError', 'AbortError'];

    /**
     * カメラAPIのエラーを利用者向けの日本語メッセージへ変換する。
     */
    const toMessage = error => {
        const errorName = error && error.name;

        if (permissionDeniedErrors.includes(errorName)) {
            return 'カメラの使用が許可されていません。ブラウザの設定を確認してください';
        }

        if (cameraNotFoundErrors.includes(errorName)) {
            return '利用できるカメラが見つかりません';
        }

        if (cameraUnavailableErrors.includes(errorName)) {
            return 'カメラを起動できません。他のアプリで使用中でないか確認してください';
        }

        if (error && error.message === 'このブラウザではカメラを利用できません') {
            return error.message;
        }

        return 'カメラを起動できませんでした';
    };

    return { toMessage };
})();

// Node.jsの標準テストから同じ実装を読み込めるようにする。
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CameraError;
}
