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
    v2c.callbackOnDrawing = null;
    v2c._useFrontCamera = true;
    v2c.option = {
        constraintsForFront: { video: { facingMode: 'user' } },
        constraintsForRear: { video: { facingMode: { exact: 'environment' } } }
    };

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
