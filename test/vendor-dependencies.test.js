'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const rootDirectory = path.resolve(__dirname, '..');
const vendorPath = path.join(
    rootDirectory,
    'js',
    'vendor',
    'clmtrackr',
    'clmtrackr.min.js'
);

const readRequiredFile = relativePath => {
    const filePath = path.join(rootDirectory, relativePath);
    assert.equal(fs.existsSync(filePath), true, `${relativePath} が必要です`);
    return fs.readFileSync(filePath, 'utf8');
};

test('clmtrackrは公式v1.1.2の配布ファイルと同じ内容を維持する', () => {
    const content = fs.readFileSync(vendorPath);
    const hash = crypto.createHash('sha256').update(content).digest('hex');

    assert.equal(content.byteLength, 1946530);
    assert.equal(
        hash,
        'e31655ea518d5cb57f4364a20f9b3f33b5a9a4623a6dc176c9f5bd5fb10c398d'
    );
    assert.match(content.toString('utf8'), /version="1\.1\.2",DEFAULT_MODEL=/);
});

test('clmtrackrのMITライセンスを同梱する', () => {
    const license = readRequiredFile('js/vendor/clmtrackr/LICENSE.txt');

    assert.match(license, /MIT License/);
    assert.match(license, /Copyright \(c\) 2017 Audun Mathias Øygard/);
    assert.match(license, /The above copyright notice and this permission notice/);
});

test('clmtrackrの配布元と更新手順を文書化する', () => {
    const vendorDocument = readRequiredFile('VENDOR.md');

    assert.match(vendorDocument, /auduno\/clmtrackr/);
    assert.match(vendorDocument, /v1\.1\.2/);
    assert.match(vendorDocument, /0c702208c70ea19ca0cb8c8ca603a86c45db141f/);
    assert.match(
        vendorDocument,
        /e31655ea518d5cb57f4364a20f9b3f33b5a9a4623a6dc176c9f5bd5fb10c398d/
    );
    assert.match(vendorDocument, /更新手順/);
});
