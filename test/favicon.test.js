'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('小さい表示でも判別しやすいPのSVGファビコンを使用する', () => {
    const favicon = fs.readFileSync(path.join(root, 'favicon.svg'), 'utf8');

    assert.match(html, /<link rel="icon" href="favicon\.svg" type="image\/svg\+xml">/);
    assert.match(favicon, /viewBox="0 0 32 32"/);
    assert.match(favicon, /#223653/);
    assert.match(favicon, /#fff/);
});
