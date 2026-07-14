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

test('WebPのVP8Xヘッダーから画像寸法を取得する', () => {
    const webp = Buffer.alloc(30);
    webp.write('RIFF', 0, 'ascii');
    webp.writeUInt32LE(22, 4);
    webp.write('WEBPVP8X', 8, 'ascii');
    webp.writeUIntLE(5999, 24, 3);
    webp.writeUIntLE(3999, 27, 3);

    assert.deepEqual(
        getImageDimensions(webp.buffer, 'image/webp'),
        { width: 6000, height: 4000 }
    );
});

test('WebPのVP8ヘッダーから画像寸法を取得する', () => {
    const webp = Buffer.alloc(30);
    webp.write('RIFF', 0, 'ascii');
    webp.writeUInt32LE(22, 4);
    webp.write('WEBPVP8 ', 8, 'ascii');
    webp.set([0x9d, 0x01, 0x2a], 23);
    webp.writeUInt16LE(640, 26);
    webp.writeUInt16LE(480, 28);

    assert.deepEqual(
        getImageDimensions(webp.buffer, 'image/webp'),
        { width: 640, height: 480 }
    );
});

test('WebPのVP8Lヘッダーから画像寸法を取得する', () => {
    const width = 640;
    const height = 480;
    const bits = (width - 1) | ((height - 1) << 14);
    const webp = Buffer.alloc(25);
    webp.write('RIFF', 0, 'ascii');
    webp.writeUInt32LE(17, 4);
    webp.write('WEBPVP8L', 8, 'ascii');
    webp[20] = 0x2f;
    webp.writeUInt32LE(bits, 21);

    assert.deepEqual(
        getImageDimensions(webp.buffer, 'image/webp'),
        { width, height }
    );
});

test('AVIFのispeボックスから画像寸法を取得する', () => {
    const avif = Buffer.alloc(44);
    avif.writeUInt32BE(24, 0);
    avif.write('ftyp', 4, 'ascii');
    avif.write('avif', 8, 'ascii');
    avif.write('avif', 16, 'ascii');
    avif.writeUInt32BE(20, 24);
    avif.write('ispe', 28, 'ascii');
    avif.writeUInt32BE(6000, 36);
    avif.writeUInt32BE(4000, 40);

    assert.deepEqual(
        getImageDimensions(avif.buffer, 'image/avif'),
        { width: 6000, height: 4000 }
    );
});

test('対応外の形式は寸法不明として扱う', () => {
    assert.equal(getImageDimensions(new ArrayBuffer(32)), null);
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
