'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getOrientation } = require('../js/image-orientation.js');

/**
 * 向き判定に必要な最小構成のAPP1データを作る。
 * 実画像の代わりに必要な位置だけを埋め、向き判定を単体で確認する。
 */
const createApp1Buffer = ({ orientation, littleEndian = true, app0Length = 0 }) => {
    const app1MarkerStart = app0Length === 0 ? 2 : app0Length + 4;
    const buffer = new ArrayBuffer(app1MarkerStart + 36);
    const view = new DataView(buffer);

    view.setUint16(0, 0xFFD8);

    if (app0Length > 0) {
        view.setUint16(2, 0xFFE0);
        view.setUint16(4, app0Length);
    }

    view.setUint16(app1MarkerStart, 0xFFE1);
    view.setUint16(app1MarkerStart + 2, 34);
    view.setUint8(app1MarkerStart + 4, 0x45);
    view.setUint8(app1MarkerStart + 5, 0x78);
    view.setUint8(app1MarkerStart + 6, 0x69);
    view.setUint8(app1MarkerStart + 7, 0x66);
    view.setUint8(app1MarkerStart + 10, littleEndian ? 0x49 : 0x4D);
    view.setUint8(app1MarkerStart + 11, littleEndian ? 0x49 : 0x4D);
    view.setUint16(app1MarkerStart + 12, 42, littleEndian);
    view.setUint32(app1MarkerStart + 14, 8, littleEndian);
    view.setUint16(app1MarkerStart + 18, 1, littleEndian);
    view.setUint16(app1MarkerStart + 20, 0x0112, littleEndian);
    view.setUint16(app1MarkerStart + 22, 3, littleEndian);
    view.setUint32(app1MarkerStart + 24, 1, littleEndian);
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

test('空データは例外にせず向き情報なしとして扱う', () => {
    assert.equal(getOrientation(new ArrayBuffer(0)), 0);
});

test('PNGは例外にせず向き情報なしとして扱う', () => {
    const pngSignature = Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    assert.equal(getOrientation(pngSignature.buffer), 0);
});

test('GIFは例外にせず向き情報なしとして扱う', () => {
    const gifSignature = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);

    assert.equal(getOrientation(gifSignature.buffer), 0);
});

test('途中で切れたJPEGは例外にせず向き情報なしとして扱う', () => {
    const truncatedJpeg = Uint8Array.from([0xFF, 0xD8, 0xFF, 0xE1, 0x00, 0x20, 0x45, 0x78]);

    assert.equal(getOrientation(truncatedJpeg.buffer), 0);
});

test('複数のセグメントを越えてAPP1を探せる', () => {
    const source = new Uint8Array(createApp1Buffer({ orientation: 6 }));
    const buffer = new ArrayBuffer(source.byteLength + 26);
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);

    view.setUint16(0, 0xFFD8);
    view.setUint16(2, 0xFFE0);
    view.setUint16(4, 16);
    view.setUint16(20, 0xFFE2);
    view.setUint16(22, 6);
    bytes.set(source.subarray(2), 28);

    assert.equal(getOrientation(buffer), 6);
});
