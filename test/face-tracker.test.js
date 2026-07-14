'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const FaceTracker = require('../js/face-tracker.js');

const createTrackerMock = () => {
    const calls = [];
    const positions = [[10, 20], [30, 40]];
    return {
        calls,
        positions,
        init: () => calls.push('init'),
        start: video => calls.push(['start', video]),
        stop: () => calls.push('stop'),
        getCurrentPosition: () => positions
    };
};

test('顔追跡実装を初期化して開始し、特徴点を取得する', () => {
    const implementation = createTrackerMock();
    const tracker = FaceTracker.create({
        trackerFactory: () => implementation
    });
    const video = { id: 'camera-video' };

    tracker.start(video);

    assert.deepEqual(implementation.calls, ['init', ['start', video]]);
    assert.equal(tracker.getPositions(), implementation.positions);
});

test('再開時に実装の初期化を重ねず、停止を冪等にする', () => {
    const implementation = createTrackerMock();
    const tracker = FaceTracker.create({
        trackerFactory: () => implementation
    });

    tracker.start({});
    tracker.stop();
    tracker.stop();
    tracker.start({});

    assert.equal(implementation.calls.filter(call => call === 'init').length, 1);
    assert.equal(implementation.calls.filter(call => call === 'stop').length, 1);
    assert.equal(implementation.calls.filter(call => Array.isArray(call)).length, 2);
});

test('顔追跡ライブラリがない場合は分かりやすいエラーにする', () => {
    assert.throws(
        () => FaceTracker.create({ trackerFactory: null, clmApi: null }),
        { message: '顔追跡ライブラリを初期化できません' }
    );
});

test('generatorはclmtrackrへ直接依存せずアダプターを利用する', () => {
    const root = path.resolve(__dirname, '..');
    const generator = fs.readFileSync(path.join(root, 'js/generator.js'), 'utf8');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

    assert.match(generator, /FaceTracker\.create\(\)/);
    assert.match(generator, /faceTracker\.getPositions\(\)/);
    assert.doesNotMatch(generator, /new clm\.tracker/);
    assert.ok(
        html.indexOf('js/face-tracker.js') < html.indexOf('js/generator.js')
    );
});
