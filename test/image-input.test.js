'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    DEFAULT_MAX_FILE_SIZE,
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
