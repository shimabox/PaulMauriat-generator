'use strict';

const FaceTracker = (() => {
    const resolveFactory = ({ trackerFactory, clmApi }) => {
        if (typeof trackerFactory === 'function') {
            return trackerFactory;
        }

        const api = clmApi === undefined ? globalThis.clm : clmApi;
        if (api && typeof api.tracker === 'function') {
            return () => new api.tracker();
        }

        return null;
    };

    const validateImplementation = implementation => {
        const requiredMethods = ['init', 'start', 'stop', 'getCurrentPosition'];
        return implementation && requiredMethods.every(method => {
            return typeof implementation[method] === 'function';
        });
    };

    /**
     * 顔追跡ライブラリ固有のAPIをアプリ共通の小さな境界へ変換する。
     */
    const create = (options = {}) => {
        const factory = resolveFactory(options);
        const implementation = factory ? factory() : null;
        if (!validateImplementation(implementation)) {
            throw new Error('顔追跡ライブラリを初期化できません');
        }

        let initialized = false;
        let running = false;

        return {
            start(video) {
                if (!initialized) {
                    implementation.init();
                    initialized = true;
                }
                implementation.start(video);
                running = true;
            },
            stop() {
                if (!running) {
                    return;
                }
                implementation.stop();
                running = false;
            },
            getPositions() {
                return implementation.getCurrentPosition();
            }
        };
    };

    return { create };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FaceTracker;
}
