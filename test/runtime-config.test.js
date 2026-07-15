'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDirectory = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(rootDirectory, file), 'utf8');

test('mise・npm・CIでNode.js 24を使用する', () => {
    const misePath = path.join(rootDirectory, 'mise.toml');

    assert.equal(fs.existsSync(misePath), true, 'mise.tomlが必要です');

    const mise = read('mise.toml');
    const packageJson = JSON.parse(read('package.json'));
    const workflow = read('.github/workflows/test.yml');

    assert.match(mise, /^\[tools\]\s*\nnode = ['"]24['"]$/m);
    assert.equal(packageJson.engines.node, '>=24');
    assert.match(workflow, /node-version: ['"]24['"]/);
});
