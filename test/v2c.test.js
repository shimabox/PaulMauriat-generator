'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const V2C = require('../js/v2c.js');

/**
 * DOMを生成せず、ライフサイクル処理の確認に必要な状態だけを用意する。
 */
const createV2CForLifecycleTest = ({ stream, videoTrack }) => {
    const v2c = Object.create(V2C.prototype);
    v2c.drawLoopFrame = 123;
    v2c.trackingStarted = true;
    v2c.video = { srcObject: stream };
    v2c.videoTrack = videoTrack;

    return v2c;
};

/**
 * DOMを生成せず、カメラ開始処理に必要な状態だけを用意する。
 */
const createV2CForStartTest = () => {
    const v2c = Object.create(V2C.prototype);
    v2c.drawLoopFrame = null;
    v2c.videoLoading = false;
    v2c.videoLoadingPromise = null;
    v2c.videoRequestId = 0;
    v2c.callbackOnDrawing = null;
    v2c._useFrontCamera = true;
    v2c.trackingStarted = false;
    v2c.video = null;
    v2c.videoTrack = null;
    v2c.option = {
        constraintsForFront: { video: { facingMode: 'user' } },
        constraintsForRear: { video: { facingMode: { exact: 'environment' } } },
        constraintsForRearFallback: { video: { facingMode: { ideal: 'environment' } } }
    };

    return v2c;
};

/**
 * カメラ切替処理に必要な表示要素だけを追加する。
 */
const createV2CForSwitchTest = () => {
    const v2c = createV2CForStartTest();
    v2c.video = { srcObject: null, style: {} };
    v2c.canvas = { width: 640, height: 480, style: {} };
    v2c.canvasCtx = { clearRect: () => {} };
    v2c._releaseVideoStream = () => {};

    return v2c;
};

test('停止時に描画ループとMediaStreamの全トラックを解放する', t => {
    const originalCancelAnimationFrame = global.cancelAnimationFrame;
    const cancelledFrames = [];
    const stoppedTracks = [];
    const tracks = [
        { stop: () => stoppedTracks.push('video') },
        { stop: () => stoppedTracks.push('audio') }
    ];
    const stream = { getTracks: () => tracks };
    const v2c = createV2CForLifecycleTest({ stream, videoTrack: tracks[0] });

    global.cancelAnimationFrame = frame => cancelledFrames.push(frame);
    t.after(() => {
        global.cancelAnimationFrame = originalCancelAnimationFrame;
    });

    v2c.stop();

    assert.deepEqual(cancelledFrames, [123]);
    assert.deepEqual(stoppedTracks, ['video', 'audio']);
    assert.equal(v2c.drawLoopFrame, null);
    assert.equal(v2c.trackingStarted, false);
    assert.equal(v2c.video.srcObject, null);
    assert.equal(v2c.videoTrack, null);
});

test('MediaStreamがない場合も保持している映像トラックを解放する', t => {
    const originalCancelAnimationFrame = global.cancelAnimationFrame;
    let stopped = false;
    const videoTrack = { stop: () => { stopped = true; } };
    const v2c = createV2CForLifecycleTest({ stream: null, videoTrack });

    global.cancelAnimationFrame = () => {};
    t.after(() => {
        global.cancelAnimationFrame = originalCancelAnimationFrame;
    });

    v2c.stop();

    assert.equal(stopped, true);
    assert.equal(v2c.videoTrack, null);
});

test('カメラの読み込み中にStartを再実行しても取得要求を重ねない', async () => {
    let resolveVideo;
    let loadCount = 0;
    let drawCount = 0;
    const stream = {};
    const videoPromise = new Promise(resolve => {
        resolveVideo = resolve;
    });
    const v2c = createV2CForStartTest();

    v2c._loadVideo = () => {
        loadCount++;
        return videoPromise;
    };
    v2c._loadSuccess = () => {};
    v2c._drawLoop = () => {
        drawCount++;
        v2c.drawLoopFrame = 456;
    };

    const firstStart = v2c.start(() => {});
    const secondStart = v2c.start(() => {});
    resolveVideo(stream);

    await Promise.all([firstStart, secondStart]);

    assert.equal(loadCount, 1);
    assert.equal(drawCount, 1);
});

test('カメラAPI未対応時は同期例外にせずエラー処理へ渡す', async t => {
    const originalNavigator = global.navigator;
    const expectedError = 'このブラウザではカメラを利用できません';
    const receivedErrors = [];
    let stopped = false;
    const v2c = createV2CForStartTest();

    global.navigator = {};
    t.after(() => {
        global.navigator = originalNavigator;
    });

    v2c._loadFail = error => receivedErrors.push(error.message);
    v2c.stop = () => {
        stopped = true;
    };

    await v2c.start(() => {});

    assert.deepEqual(receivedErrors, [expectedError]);
    assert.equal(stopped, true);
});

test('カメラの読み込み中に停止した場合は遅れて取得したストリームを破棄する', async t => {
    const originalCancelAnimationFrame = global.cancelAnimationFrame;
    let resolveVideo;
    let loadSuccessCount = 0;
    let drawCount = 0;
    let trackStopped = false;
    const track = { stop: () => { trackStopped = true; } };
    const stream = { getTracks: () => [track] };
    const videoPromise = new Promise(resolve => {
        resolveVideo = resolve;
    });
    const v2c = createV2CForStartTest();

    global.cancelAnimationFrame = () => {};
    t.after(() => {
        global.cancelAnimationFrame = originalCancelAnimationFrame;
    });

    v2c._loadVideo = () => videoPromise;
    v2c._loadSuccess = () => {
        loadSuccessCount++;
    };
    v2c._drawLoop = () => {
        drawCount++;
    };

    const startPromise = v2c.start(() => {});
    await Promise.resolve();

    v2c.stop();
    resolveVideo(stream);
    await startPromise;

    assert.equal(loadSuccessCount, 0);
    assert.equal(drawCount, 0);
    assert.equal(trackStopped, true);
});

test('カメラ切替の読み込み中に再実行しても切替要求を重ねない', async () => {
    let resolveVideo;
    let loadCount = 0;
    let drawCount = 0;
    const videoPromise = new Promise(resolve => {
        resolveVideo = resolve;
    });
    const v2c = createV2CForSwitchTest();

    v2c._loadVideo = () => {
        loadCount++;
        return videoPromise;
    };
    v2c._loadSuccess = () => {};
    v2c._drawLoop = () => {
        drawCount++;
        v2c.drawLoopFrame = 789;
    };

    const firstSwitch = v2c.switchCamera();
    const secondSwitch = v2c.switchCamera();
    resolveVideo({});

    await Promise.all([firstSwitch, secondSwitch]);

    assert.equal(loadCount, 1);
    assert.equal(drawCount, 1);
    assert.equal(v2c.useFrontCamera(), false);
});

test('カメラ切替時は新しい映像のメタデータ完了を待つ', async () => {
    const v2c = createV2CForSwitchTest();
    v2c.trackingStarted = true;
    v2c._startVideo = () => Promise.resolve();

    await v2c.switchCamera();

    assert.equal(v2c.trackingStarted, false);
});

test('背面カメラの厳密指定に失敗した場合は緩い指定で再試行する', async t => {
    const originalNavigator = global.navigator;
    const requestedConstraints = [];
    const expectedStream = {
        getVideoTracks: () => [{
            getSettings: () => ({ facingMode: 'environment' })
        }]
    };
    const v2c = createV2CForStartTest();
    v2c._useFrontCamera = false;

    global.navigator = {
        mediaDevices: {
            getUserMedia: constraints => {
                requestedConstraints.push(constraints);

                if (requestedConstraints.length === 1) {
                    const error = new Error('背面カメラが見つかりません');
                    error.name = 'OverconstrainedError';
                    return Promise.reject(error);
                }

                return Promise.resolve(expectedStream);
            }
        }
    };
    t.after(() => {
        global.navigator = originalNavigator;
    });

    const stream = await v2c._loadVideo();

    assert.equal(stream, expectedStream);
    assert.deepEqual(requestedConstraints, [
        v2c.option.constraintsForRear,
        v2c.option.constraintsForRearFallback
    ]);
});

test('背面カメラの代わりに前面カメラが返された場合は切替失敗にする', async t => {
    const originalNavigator = global.navigator;
    let requestCount = 0;
    let stopped = false;
    const track = {
        getSettings: () => ({ facingMode: 'user' }),
        stop: () => { stopped = true; }
    };
    const frontStream = {
        getVideoTracks: () => [track],
        getTracks: () => [track]
    };
    const v2c = createV2CForStartTest();
    v2c._useFrontCamera = false;

    global.navigator = {
        mediaDevices: {
            getUserMedia: () => {
                requestCount++;
                if (requestCount === 1) {
                    const error = new Error('背面カメラが見つかりません');
                    error.name = 'OverconstrainedError';
                    return Promise.reject(error);
                }
                return Promise.resolve(frontStream);
            }
        }
    };
    t.after(() => {
        global.navigator = originalNavigator;
    });

    await assert.rejects(
        v2c._loadVideo(),
        error => error.name === 'RearCameraNotFoundError'
    );
    assert.equal(requestCount, 2);
    assert.equal(stopped, true);
});

test('カメラの利用拒否では背面カメラの再試行をしない', async t => {
    const originalNavigator = global.navigator;
    let requestCount = 0;
    const expectedError = new Error('カメラの利用が拒否されました');
    expectedError.name = 'NotAllowedError';
    const v2c = createV2CForStartTest();
    v2c._useFrontCamera = false;

    global.navigator = {
        mediaDevices: {
            getUserMedia: () => {
                requestCount++;
                return Promise.reject(expectedError);
            }
        }
    };
    t.after(() => {
        global.navigator = originalNavigator;
    });

    await assert.rejects(v2c._loadVideo(), expectedError);
    assert.equal(requestCount, 1);
});
