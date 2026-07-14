'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const generator = fs.readFileSync(
    path.join(__dirname, '..', 'js', 'generator.js'),
    'utf8'
);

test('ページ離脱時に顔追跡とカメラを停止する', () => {
    assert.match(generator, /const stopRender = \(\) => \{/);
    assert.match(generator, /stopCtracker\(\);/);
    assert.match(generator, /v2c\.stop\(\);/);
    assert.match(generator, /window\.addEventListener\('pagehide', stopRender\);/);
});
