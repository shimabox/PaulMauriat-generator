'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const generator = fs.readFileSync(path.join(root, 'js/generator.js'), 'utf8');

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

test('操作パネルを明るい配色にして画像より目立たせない', () => {
    assert.match(css, /\.buttons\s*\{[^}]*background:\s*#f4f7fa;/s);
    assert.match(css, /\.action-button\s*\{[^}]*color:\s*#223653;[^}]*background:\s*#fff;/s);
    assert.doesNotMatch(css, /\.buttons\s*\{[^}]*background:\s*#17243a;/s);
});

test('顔設定に見えるラベルを用意する', () => {
    ['位置', '透明度', '目元'].forEach(label => {
        assert.match(html, new RegExp(`<span class="control-label">${label}<`));
    });
});

test('画像を主役にするコンパクトな操作領域にする', () => {
    assert.doesNotMatch(html, /FACE MIX/);
    assert.match(css, /\.buttons\s*\{[^}]*padding:\s*8px;/s);
    assert.match(
        css,
        /\.action-button\s*\{[^}]*min-height:\s*44px;[^}]*flex-direction:\s*row;/s
    );
    assert.match(css, /@media \(max-width: 414px\)/);
    assert.match(css, /grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/);
    assert.doesNotMatch(css, /\.action-button--primary\s*\{[^}]*grid-column:/s);
});

test('カメラ処理用の映像が画面外にはみ出して見えない', () => {
    assert.match(css, /#video,\s*\n#canvas\s*\{[^}]*top:\s*0;[^}]*left:\s*0;[^}]*opacity:\s*0;/s);
});

test('作業領域を画面の高さに応じて安全に天地中央へ配置する', () => {
    assert.match(css, /body\s*\{[^}]*min-height:\s*100dvh;/s);
    assert.match(css, /\.container\s*\{[^}]*min-height:\s*100dvh;/s);
    assert.match(css, /\.app-main\s*\{[^}]*flex:\s*1;[^}]*justify-content:\s*safe center;/s);
});

test('カメラ起動後は案内だけ消してステータス行の余白を残す', () => {
    assert.match(
        generator,
        /const callbackOnLoadedmetadataVideo = video => \{\s*showStatusMessage\(''\);/
    );
    assert.match(css, /\.status-message\s*\{[^}]*min-height:\s*1\.4em;/s);
    assert.doesNotMatch(css, /\.status-message:empty\s*\{[^}]*display:\s*none;/s);
});
