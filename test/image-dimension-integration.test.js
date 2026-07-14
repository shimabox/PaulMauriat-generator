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

test('Object URLの作成と画像デコードより前に画像寸法を検証する', () => {
    assert.match(html, /<script src="js\/image-dimensions\.js"><\/script>/);

    const dimensionCheck = generator.indexOf('ImageDimensions.getImageDimensions(content');
    const objectUrlCreation = generator.indexOf('createImageObjectUrl(content');

    assert.notEqual(dimensionCheck, -1);
    assert.notEqual(objectUrlCreation, -1);
    assert.ok(dimensionCheck < objectUrlCreation);
});
