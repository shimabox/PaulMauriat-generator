'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const generator = fs.readFileSync(path.join(root, 'js/generator.js'), 'utf8');

test('顔計算・描画・画像出力モジュールをgeneratorより前に読み込む', () => {
    ['canvas-quality', 'face-geometry', 'face-renderer', 'image-exporter'].forEach(name => {
        const modulePosition = html.indexOf(`<script src="js/${name}.js"></script>`);
        const generatorPosition = html.indexOf('<script src="js/generator.js"></script>');
        assert.notEqual(modulePosition, -1);
        assert.ok(modulePosition < generatorPosition);
    });
});

test('Canvas品質設定を描画・画像出力モジュールより前に読み込む', () => {
    const qualityPosition = html.indexOf('<script src="js/canvas-quality.js"></script>');

    ['face-renderer', 'image-exporter'].forEach(name => {
        assert.ok(
            qualityPosition < html.indexOf(`<script src="js/${name}.js"></script>`)
        );
    });
});

test('generatorは分離した顔処理と画像出力を利用する', () => {
    assert.match(generator, /FaceGeometry\.calculateFaceCrop/);
    assert.match(generator, /FaceRenderer\.render/);
    assert.match(generator, /ImageExporter\.createDataUrl/);
    assert.doesNotMatch(generator, /const calcRangeOfCoordinates/);
    assert.doesNotMatch(generator, /const getDataUrl/);
    assert.doesNotMatch(generator, /const redrawFaceCanvas/);
});
