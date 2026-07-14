'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getOrientation } = require('../js/image-orientation.js');

/**
 * 現行実装が読み取れる最小構成のAPP1データを作る。
 * 実画像の代わりに必要な位置だけを埋め、向き判定を単体で確認する。
 */
const createApp1Buffer = ({ orientation, littleEndian = true, app0Length = 0 }) => {
    const app1MarkerStart = app0Length === 0 ? 2 : app0Length + 4;
    const buffer = new ArrayBuffer(app1MarkerStart + 34);
    const view = new DataView(buffer);

    view.setUint16(0, 0xFFD8);

    if (app0Length > 0) {
        view.setUint16(2, 0xFFE0);
        view.setUint16(4, app0Length);
    }

    view.setUint16(app1MarkerStart, 0xFFE1);
    view.setUint8(app1MarkerStart + 10, littleEndian ? 0x49 : 0x4D);
    view.setUint16(app1MarkerStart + 18, 1, littleEndian);
    view.setUint16(app1MarkerStart + 20, 0x0112, littleEndian);
    view.setUint16(app1MarkerStart + 28, orientation, littleEndian);

    return buffer;
};

test('APP1にあるリトルエンディアンの向きを取得できる', () => {
    const buffer = createApp1Buffer({ orientation: 6 });

    assert.equal(getOrientation(buffer), 6);
});

test('APP1にあるビッグエンディアンの向きを取得できる', () => {
    const buffer = createApp1Buffer({ orientation: 8, littleEndian: false });

    assert.equal(getOrientation(buffer), 8);
});

test('APP0の直後にあるAPP1から向きを取得できる', () => {
    const buffer = createApp1Buffer({ orientation: 3, app0Length: 16 });

    assert.equal(getOrientation(buffer), 3);
});

test('APP1がない場合は0を返す', () => {
    const buffer = new ArrayBuffer(12);
    const view = new DataView(buffer);
    view.setUint16(0, 0xFFD8);
    view.setUint16(2, 0xFFDA);

    assert.equal(getOrientation(buffer), 0);
});

test.todo('PNGは例外にせず向き情報なしとして扱う');
test.todo('GIFは例外にせず向き情報なしとして扱う');
test.todo('途中で切れたJPEGは例外にせず向き情報なしとして扱う');
