'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const rootDirectory = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(rootDirectory, file), 'utf8');
const html = read('index.html');
const css = read('css/style.css');
const generator = read('js/generator.js');
const v2c = read('js/v2c.js');

test('顔描画ループへ未使用のカメラ向きを渡さない', () => {
    assert.match(generator, /v2c\.start\(drawLoop\)/);
    assert.match(generator, /const drawLoop = canvas =>/);
});

test('V2Cの既定保存名を正しく綴る', () => {
    assert.match(v2c, /const name = n \|\| 'capture';/);
    assert.doesNotMatch(v2c, /caputure/);
});

test('空のCSS規則を残さない', () => {
    assert.doesNotMatch(css, /#[\w-]+\s*\{\s*\}/);
});

test('操作アイコンを外部配信へ依存させない', () => {
    assert.doesNotMatch(html, /use\.fontawesome\.com/);
    assert.doesNotMatch(html, /class="[^"]*\bfa[sr]?\b/);
    assert.match(html, /class="button-icon"/);
});
