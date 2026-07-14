'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getImageDimensions } = require('../js/image-dimensions.js');

test('PNGのIHDRから画像寸法を取得する', () => {
    const png = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
    png.writeUInt32BE(13, 8);
    png.write('IHDR', 12, 'ascii');
    png.writeUInt32BE(6000, 16);
    png.writeUInt32BE(4000, 20);

    assert.deepEqual(
        getImageDimensions(png.buffer, 'image/png'),
        { width: 6000, height: 4000 }
    );
});

test('GIFヘッダーから画像寸法を取得する', () => {
    const gif = Buffer.alloc(10);
    gif.write('GIF89a', 0, 'ascii');
    gif.writeUInt16LE(640, 6);
    gif.writeUInt16LE(480, 8);

    assert.deepEqual(
        getImageDimensions(gif.buffer, 'image/gif'),
        { width: 640, height: 480 }
    );
});

test('JPEGのSOFセグメントから画像寸法を取得する', () => {
    const jpeg = Buffer.alloc(21);
    jpeg.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08], 0);
    jpeg.writeUInt16BE(4000, 7);
    jpeg.writeUInt16BE(6000, 9);

    assert.deepEqual(
        getImageDimensions(jpeg.buffer, 'image/jpeg'),
        { width: 6000, height: 4000 }
    );
});

test('対応外の形式は寸法不明として扱う', () => {
    assert.equal(
        getImageDimensions(new ArrayBuffer(32), 'image/webp'),
        null
    );
});

test('途中で切れた画像データは例外にせず寸法不明として扱う', () => {
    assert.equal(
        getImageDimensions(Uint8Array.from([0xff, 0xd8, 0xff]).buffer, 'image/jpeg'),
        null
    );
    assert.equal(
        getImageDimensions(new ArrayBuffer(0), 'image/png'),
        null
    );
});
