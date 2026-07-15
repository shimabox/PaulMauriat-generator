'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const CanvasQuality = require('../js/canvas-quality.js');

test('Canvasの画像補間を高品質に設定する', () => {
    const context = {};

    CanvasQuality.configure(context);

    assert.equal(context.imageSmoothingEnabled, true);
    assert.equal(context.imageSmoothingQuality, 'high');
});

test('描画コンテキストがない場合も例外にしない', () => {
    assert.doesNotThrow(() => CanvasQuality.configure(null));
});

test('背景Canvasは描画サイズを確定してから高品質補間を設定する', () => {
    const generator = fs.readFileSync(
        path.join(__dirname, '..', 'js', 'generator.js'),
        'utf8'
    );
    const start = generator.indexOf('const createTransformedCanvas');
    const end = generator.indexOf('const addCanvasToViewElem');
    const createCanvasSource = generator.slice(start, end);

    assert.ok(
        createCanvasSource.lastIndexOf('canvas.height')
        < createCanvasSource.indexOf('CanvasQuality.configure(ctx)')
    );
});
