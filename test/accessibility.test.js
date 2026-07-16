'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDirectory = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(rootDirectory, 'index.html'), 'utf8');
const javascript = fs.readFileSync(path.join(rootDirectory, 'js/generator.js'), 'utf8');
const css = fs.readFileSync(path.join(rootDirectory, 'css/style.css'), 'utf8');

/**
 * 指定IDを持つ開始タグを取得する。
 */
const getElementTagById = id => {
    const match = html.match(new RegExp(`<[^>]+id="${id}"[^>]*>`));
    assert.ok(match, `id="${id}" の要素が必要です`);
    return match[0];
};

test('文書の言語とdescriptionを正しい属性で指定する', () => {
    assert.match(html, /<html lang="en">/);
    assert.match(html, /<meta name="description" content="Image generator like Paul Mauriat\.\">/);
});

test('ファイル選択は画像形式だけを受け付ける', () => {
    const fileInput = getElementTagById('read-file');
    assert.match(fileInput, /accept="image\/\*"/);
});

test('読み込み状態とエラーを支援技術へ通知する', () => {
    const status = getElementTagById('status-message');
    assert.match(status, /role="status"/);
    assert.match(status, /aria-live="polite"/);
});

test('アプリの操作領域をmainランドマークへまとめる', () => {
    assert.match(html, /<main class="app-main">/);
    assert.match(html, /<div id="overlay" aria-hidden="true"><\/div>/);
});

test('カメラエラーも画面内のステータス領域へ表示する', () => {
    assert.match(html, /<script src="js\/camera-error\.js"><\/script>/);
    assert.match(javascript, /CameraError\.toMessage\(err\)/);
    assert.doesNotMatch(javascript, /alert\(err\)/);
});

test('画像選択領域をキーボードで操作できる要素として公開する', () => {
    const view = getElementTagById('image-select-view');
    assert.match(view, /role="button"/);
    assert.match(view, /tabindex="0"/);
    assert.match(view, /aria-label="[^"]+"/);
    assert.match(javascript, /viewElem\.addEventListener\('keydown'/);
    assert.match(javascript, /e\.key === 'Enter'/);
    assert.match(javascript, /e\.key === ' '/);
});

test('アイコンボタンに種類と操作名を指定する', () => {
    ['reselect', 'start', 'stop', 'capture', 'switch-camera'].forEach(id => {
        const button = getElementTagById(id);
        assert.match(button, /type="button"/);
        assert.match(button, /aria-label="[^"]+"/);
    });
});

test('顔の設定項目に操作名を指定する', () => {
    ['face-position-list', 'face-size-range', 'face-alpha-range', 'face-privacy'].forEach(id => {
        assert.match(getElementTagById(id), /aria-label="[^"]+"/);
    });
});

test('キーボードフォーカスを視覚的に表示する', () => {
    assert.match(css, /\.view:focus-visible/);
    assert.match(css, /button:focus-visible/);
});
