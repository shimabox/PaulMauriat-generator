'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    calcContainedLayout,
    scaleLength
} = require('../js/preview-layout.js');

test('表示領域に収まる画像は拡大しない', () => {
    assert.deepEqual(
        calcContainedLayout(320, 240, 640, 480),
        { scale: 1, width: 320, height: 240 }
    );
});

test('横幅を超える画像を縦横比を維持して縮小する', () => {
    assert.deepEqual(
        calcContainedLayout(640, 480, 320, 1000),
        { scale: 0.5, width: 320, height: 240 }
    );
});

test('高さを超える画像を縦横比を維持して縮小する', () => {
    assert.deepEqual(
        calcContainedLayout(640, 480, 1000, 240),
        { scale: 0.5, width: 320, height: 240 }
    );
});

test('横幅と高さのうち縮小率が大きい制約を優先する', () => {
    assert.deepEqual(
        calcContainedLayout(800, 400, 600, 200),
        { scale: 0.5, width: 400, height: 200 }
    );
});

test('不正な画像サイズはゼロサイズとして扱う', () => {
    assert.deepEqual(
        calcContainedLayout(0, 240, 640, 480),
        { scale: 1, width: 0, height: 0 }
    );
});

test('顔のサイズと負の配置オフセットを同じ倍率で縮小する', () => {
    assert.equal(scaleLength(120, 0.5), 60);
    assert.equal(scaleLength(-101, 0.5), -51);
});
