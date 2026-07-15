'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const FaceDebug = require('../js/face-debug.js');

const createElement = () => ({
    hidden: true,
    textContent: ''
});

test('GETパラメータd=1のときだけデバッグ表示を有効にする', () => {
    assert.equal(FaceDebug.isEnabled('?d=1'), true);
    assert.equal(FaceDebug.isEnabled('?d=0'), false);
    assert.equal(FaceDebug.isEnabled('?debug=1'), false);
    assert.equal(FaceDebug.isEnabled(''), false);
});

test('無効時は要素を表示せず状態更新もしない', () => {
    const element = createElement();
    const debug = FaceDebug.create({ element, search: '' });

    debug.setCamera('準備完了', '640×480');
    debug.setTracker('検出');
    debug.recordFrame(true);
    debug.recordEvent('追跡更新');

    assert.equal(debug.enabled, false);
    assert.equal(element.hidden, true);
    assert.equal(element.textContent, '');
});

test('有効時は顔追跡の状態と特徴点取得フレーム数を表示する', () => {
    const element = createElement();
    const debug = FaceDebug.create({ element, search: '?d=1', renderInterval: 2 });

    debug.setCamera('準備完了', '640×480');
    debug.setTracker('探索中');
    debug.recordFrame(false);
    debug.recordFrame(true);
    debug.recordEvent('追跡更新');

    assert.equal(debug.enabled, true);
    assert.equal(element.hidden, false);
    assert.match(element.textContent, /カメラ: 準備完了 640×480/);
    assert.match(element.textContent, /追跡: 検出/);
    assert.match(element.textContent, /特徴点フレーム: 1\/2/);
    assert.match(element.textContent, /イベント: 追跡更新/);
});
