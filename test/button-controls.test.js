'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');

test('主要操作を名前付きツールバーとしてまとめる', () => {
    assert.match(
        html,
        /<div class="buttons hidden" role="toolbar" aria-label="Image controls">/
    );
    ['reselect', 'start', 'stop', 'capture', 'switch-camera'].forEach(id => {
        assert.match(
            html,
            new RegExp(`<button id="${id}"[^>]+class="[^"]*action-button`)
        );
    });
});

test('外部依存のないSVGアイコンと見える操作名を使う', () => {
    assert.equal((html.match(/<svg class="button-icon"/g) || []).length, 5);
    ['画像', '開始', '停止', '保存', '切替'].forEach(label => {
        assert.match(html, new RegExp(`class="button-label"[^>]*>${label}<`));
    });
    assert.doesNotMatch(html, /class="button-icon"[^>]*>[▧▶■⇩↻]</);
});

test('保存操作を主ボタンとして区別する', () => {
    assert.match(html, /id="capture"[^>]+class="action-button action-button--primary"/);
    assert.match(css, /\.action-button--primary/);
});

test('顔設定に見えるラベルとレスポンシブ配置を用意する', () => {
    ['位置', '透明度', '目元'].forEach(label => {
        assert.match(html, new RegExp(`<span class="control-label">${label}<`));
    });
    assert.match(css, /@media \(max-width: 414px\)/);
    assert.match(css, /grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
});

test('カメラ処理用の映像が画面外にはみ出して見えない', () => {
    assert.match(css, /#video,\s*\n#canvas\s*\{[^}]*top:\s*0;[^}]*left:\s*0;[^}]*opacity:\s*0;/s);
});
