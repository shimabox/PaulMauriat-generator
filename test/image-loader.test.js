'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const ImageLoader = require('../js/image-loader.js');

const createPngHeader = (width, height) => {
    const png = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
    png.writeUInt32BE(13, 8);
    png.write('IHDR', 12, 'ascii');
    png.writeUInt32BE(width, 16);
    png.writeUInt32BE(height, 20);
    return png.buffer;
};

const createBrowserMocks = ({ readerError = false, imageError = false } = {}) => {
    const state = {
        createdUrls: [],
        revokedUrls: [],
        blobs: [],
        image: null
    };

    class MockFileReader {
        constructor() {
            this.listeners = {};
            this.result = null;
        }

        addEventListener(type, listener) {
            this.listeners[type] = listener;
        }

        readAsArrayBuffer(file) {
            if (readerError) {
                this.listeners.error();
                return;
            }

            this.result = file.content;
            this.listeners.load();
        }
    }

    class MockImage {
        constructor() {
            this.listeners = {};
            state.image = this;
        }

        addEventListener(type, listener) {
            this.listeners[type] = listener;
        }

        set src(value) {
            this.source = value;
            this.listeners[imageError ? 'error' : 'load']();
        }
    }

    class MockBlob {
        constructor(parts, options) {
            this.parts = parts;
            this.type = options.type;
            state.blobs.push(this);
        }
    }

    const urlApi = {
        createObjectURL(blob) {
            state.createdUrls.push(blob);
            return 'blob:test-image';
        },
        revokeObjectURL(url) {
            state.revokedUrls.push(url);
        }
    };

    return {
        dependencies: {
            FileReader: MockFileReader,
            Image: MockImage,
            Blob: MockBlob,
            URL: urlApi
        },
        state
    };
};

const createFile = (content, type = 'image/png') => ({
    type,
    size: content.byteLength,
    content
});

test('画像を読み込み、デコード成功後にObject URLを解放する', async () => {
    const content = createPngHeader(320, 240);
    const { dependencies, state } = createBrowserMocks();

    const result = await ImageLoader.loadImageFile(
        createFile(content),
        dependencies
    );

    assert.equal(result.image, state.image);
    assert.equal(result.orientation, 0);
    assert.equal(state.blobs[0].type, 'image/png');
    assert.deepEqual(state.revokedUrls, ['blob:test-image']);
});

test('ImageBitmapではEXIFの自動回転を無効にしてデコードする', async () => {
    const content = createPngHeader(320, 240);
    const { dependencies, state } = createBrowserMocks();
    const imageBitmap = { width: 320, height: 240 };
    const calls = [];
    dependencies.createImageBitmap = (blob, options) => {
        calls.push({ blob, options });
        return Promise.resolve(imageBitmap);
    };

    const result = await ImageLoader.loadImageFile(
        createFile(content),
        dependencies
    );

    assert.equal(result.image, imageBitmap);
    assert.deepEqual(calls[0].options, { imageOrientation: 'none' });
    assert.deepEqual(state.createdUrls, []);
});

test('FileReaderの失敗を利用者向けエラーにする', async () => {
    const content = createPngHeader(320, 240);
    const { dependencies, state } = createBrowserMocks({ readerError: true });

    await assert.rejects(
        ImageLoader.loadImageFile(createFile(content), dependencies),
        { message: '画像ファイルを読み込めませんでした' }
    );
    assert.deepEqual(state.createdUrls, []);
});

test('上限を超える画像はObject URL作成前に拒否する', async () => {
    const content = createPngHeader(9000, 4000);
    const { dependencies, state } = createBrowserMocks();

    await assert.rejects(
        ImageLoader.loadImageFile(createFile(content), dependencies),
        { message: '画像の寸法が大きすぎます。長辺8192px・4000万画素以下を選択してください' }
    );
    assert.deepEqual(state.createdUrls, []);
});

test('画像デコードに失敗した場合もObject URLを解放する', async () => {
    const content = createPngHeader(320, 240);
    const { dependencies, state } = createBrowserMocks({ imageError: true });

    await assert.rejects(
        ImageLoader.loadImageFile(createFile(content), dependencies),
        { message: '画像を表示できませんでした' }
    );
    assert.deepEqual(state.revokedUrls, ['blob:test-image']);
});

test('ファイル未選択と画像以外を既存ルールで検証する', () => {
    assert.deepEqual(
        ImageLoader.validateFile(),
        { valid: false, error: null }
    );
    assert.deepEqual(
        ImageLoader.validateFile({ type: 'text/plain', size: 10 }),
        { valid: false, error: '画像ファイルを選択してください' }
    );
});

test('generator.jsはブラウザの画像読み込みAPIを直接扱わない', () => {
    const generator = fs.readFileSync(
        path.join(__dirname, '..', 'js', 'generator.js'),
        'utf8'
    );

    assert.match(generator, /ImageLoader\.loadImageFile\(file\)/);
    assert.doesNotMatch(generator, /new FileReader\(\)/);
    assert.doesNotMatch(generator, /new Image\(\)/);
    assert.doesNotMatch(generator, /createImageObjectUrl/);
});
