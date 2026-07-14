'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    DEFAULT_MAX_FILE_SIZE,
    DEFAULT_MAX_IMAGE_SIDE,
    DEFAULT_MAX_IMAGE_PIXELS,
    validateImageDimensions,
    validateImageFile
} = require('../js/image-input.js');

test('画像ファイルを受け付ける', () => {
    assert.deepEqual(
        validateImageFile({ type: 'image/png', size: 1024 }),
        { valid: true, error: null }
    );
});

test('画像以外のMIMEタイプを拒否する', () => {
    const expected = { valid: false, error: '画像ファイルを選択してください' };

    assert.deepEqual(validateImageFile({ type: 'text/plain', size: 1024 }), expected);
    assert.deepEqual(validateImageFile({ type: 'notimage/png', size: 1024 }), expected);
    assert.deepEqual(validateImageFile({ type: '', size: 1024 }), expected);
});

test('上限を超える画像ファイルを拒否する', () => {
    assert.deepEqual(
        validateImageFile({ type: 'image/jpeg', size: DEFAULT_MAX_FILE_SIZE + 1 }),
        { valid: false, error: '画像ファイルは20MB以下を選択してください' }
    );
});

test('上限と同じサイズの画像ファイルを受け付ける', () => {
    assert.deepEqual(
        validateImageFile({ type: 'image/webp', size: DEFAULT_MAX_FILE_SIZE }),
        { valid: true, error: null }
    );
});

test('ファイル選択のキャンセルはエラーにしない', () => {
    assert.deepEqual(
        validateImageFile(undefined),
        { valid: false, error: null }
    );
});

test('上限内の画像寸法を受け付ける', () => {
    assert.deepEqual(
        validateImageDimensions({ width: 6000, height: 4000 }),
        { valid: true, error: null }
    );
});

test('長辺の上限を超える画像寸法を拒否する', () => {
    assert.deepEqual(
        validateImageDimensions({ width: DEFAULT_MAX_IMAGE_SIDE + 1, height: 1000 }),
        {
            valid: false,
            error: '画像の寸法が大きすぎます。長辺8192px・4000万画素以下を選択してください'
        }
    );
});

test('総画素数の上限を超える画像寸法を拒否する', () => {
    const width = 8000;
    const height = Math.floor(DEFAULT_MAX_IMAGE_PIXELS / width) + 1;

    assert.deepEqual(
        validateImageDimensions({ width, height }),
        {
            valid: false,
            error: '画像の寸法が大きすぎます。長辺8192px・4000万画素以下を選択してください'
        }
    );
});

test('寸法を取得できない形式はブラウザの画像デコードへ渡す', () => {
    assert.deepEqual(
        validateImageDimensions(null),
        { valid: true, error: null }
    );
});
