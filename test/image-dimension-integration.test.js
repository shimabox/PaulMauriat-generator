'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const rootDirectory = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(rootDirectory, 'index.html'), 'utf8');
const imageLoader = fs.readFileSync(
    path.join(rootDirectory, 'js', 'image-loader.js'),
    'utf8'
);

test('画像ローダーを寸法解析後かつgeneratorより前に読み込む', () => {
    const dimensionsScript = html.indexOf(
        '<script src="js/image-dimensions.js"></script>'
    );
    const loaderScript = html.indexOf(
        '<script src="js/image-loader.js"></script>'
    );
    const generatorScript = html.indexOf(
        '<script src="js/generator.js"></script>'
    );

    assert.ok(dimensionsScript < loaderScript);
    assert.ok(loaderScript < generatorScript);
    assert.match(imageLoader, /imageDimensionsApi\.getImageDimensions\(content\)/);
    assert.match(imageLoader, /imageInputApi\.validateImageDimensions\(dimensions\)/);
});
