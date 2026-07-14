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
