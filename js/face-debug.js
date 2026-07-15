'use strict';

const FaceDebug = (() => {
    const isEnabled = search => {
        return new URLSearchParams(search || '').get('d') === '1';
    };

    /**
     * 顔追跡の内部状態を、必要なときだけ画面へ表示する。
     */
    const create = ({ element, search = '', renderInterval = 30 } = {}) => {
        const enabled = Boolean(element) && isEnabled(search);
        const interval = Number.isInteger(renderInterval) && renderInterval > 0
            ? renderInterval
            : 30;
        const state = {
            camera: '待機',
            tracker: '待機',
            frames: 0,
            positionFrames: 0,
            lastEvent: '-'
        };

        const render = () => {
            if (!enabled) {
                return;
            }

            element.hidden = false;
            element.textContent = [
                `カメラ: ${state.camera}`,
                `追跡: ${state.tracker}`,
                `特徴点フレーム: ${state.positionFrames}/${state.frames}`,
                `イベント: ${state.lastEvent}`
            ].join(' / ');
        };

        const setCamera = (status, detail = '') => {
            if (!enabled) {
                return;
            }
            state.camera = detail ? `${status} ${detail}` : status;
            render();
        };

        const setTracker = status => {
            if (!enabled || state.tracker === status) {
                return;
            }
            state.tracker = status;
            render();
        };

        const recordFrame = hasPositions => {
            if (!enabled) {
                return;
            }

            state.frames += 1;
            if (hasPositions) {
                state.positionFrames += 1;
            }

            const tracker = hasPositions ? '検出' : '探索中';
            const stateChanged = state.tracker !== tracker;
            state.tracker = tracker;
            if (stateChanged || state.frames % interval === 0) {
                render();
            }
        };

        const recordEvent = label => {
            if (!enabled || state.lastEvent === label) {
                return;
            }
            state.lastEvent = label;
            render();
        };

        render();

        return {
            enabled,
            setCamera,
            setTracker,
            recordFrame,
            recordEvent
        };
    };

    return { isEnabled, create };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FaceDebug;
}
