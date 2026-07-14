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
