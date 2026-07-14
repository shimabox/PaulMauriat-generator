'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { toMessage } = require('../js/camera-error.js');

test('カメラの利用拒否を設定確認メッセージへ変換する', () => {
    assert.equal(
        toMessage({ name: 'NotAllowedError' }),
        'カメラの使用が許可されていません。ブラウザの設定を確認してください'
    );
    assert.equal(
        toMessage({ name: 'SecurityError' }),
        'カメラの使用が許可されていません。ブラウザの設定を確認してください'
    );
});

test('カメラがない場合に分かりやすいメッセージを返す', () => {
    assert.equal(
        toMessage({ name: 'NotFoundError' }),
        '利用できるカメラが見つかりません'
    );
    assert.equal(
        toMessage({ name: 'DevicesNotFoundError' }),
        '利用できるカメラが見つかりません'
    );
});

test('カメラが利用中の場合に確認方法を案内する', () => {
    ['NotReadableError', 'TrackStartError', 'AbortError'].forEach(name => {
        assert.equal(
            toMessage({ name }),
            'カメラを起動できません。他のアプリで使用中でないか確認してください'
        );
    });
});

test('カメラAPI未対応のメッセージを維持する', () => {
    assert.equal(
        toMessage(new Error('このブラウザではカメラを利用できません')),
        'このブラウザではカメラを利用できません'
    );
});

test('不明なエラーや値がない場合は一般的なメッセージを返す', () => {
    assert.equal(toMessage({ name: 'UnknownError' }), 'カメラを起動できませんでした');
    assert.equal(toMessage(), 'カメラを起動できませんでした');
});
