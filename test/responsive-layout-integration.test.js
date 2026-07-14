'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const rootDirectory = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(rootDirectory, 'index.html'), 'utf8');
const generator = fs.readFileSync(
    path.join(rootDirectory, 'js', 'generator.js'),
    'utf8'
);

test('画面リサイズと端末回転でプレビュー倍率を更新する', () => {
    assert.match(html, /<script src="js\/preview-layout\.js"><\/script>/);
    assert.match(generator, /PreviewLayout\.calcContainedLayout\(/);
    assert.match(generator, /window\.addEventListener\('resize', updatePreviewLayout\)/);
    assert.match(generator, /'callbackOnOrientationChange': updatePreviewLayout/);
});
