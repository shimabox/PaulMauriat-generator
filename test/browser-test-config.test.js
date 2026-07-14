'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const rootDirectory = path.resolve(__dirname, '..');
const packageJson = require('../package.json');
const workflow = fs.readFileSync(
    path.join(rootDirectory, '.github', 'workflows', 'test.yml'),
    'utf8'
);
const playwrightConfig = fs.readFileSync(
    path.join(rootDirectory, 'playwright.config.js'),
    'utf8'
);
const staticServer = fs.readFileSync(
    path.join(rootDirectory, 'scripts', 'static-server.js'),
    'utf8'
);

test('Playwrightのブラウザテスト用コマンドと設定を用意する', () => {
    assert.equal(packageJson.scripts['test:e2e'], 'playwright test');
    assert.equal(
        fs.existsSync(path.join(rootDirectory, 'playwright.config.js')),
        true
    );
    assert.equal(
        fs.existsSync(path.join(rootDirectory, 'e2e', 'basic-ui.spec.js')),
        true
    );
});

test('CIでChromiumのブラウザテストを実行する', () => {
    assert.match(workflow, /npx playwright install --with-deps chromium/);
    assert.match(workflow, /run: npm run test:e2e/);
});

test('別のローカルサーバーをテスト対象として再利用しない', () => {
    assert.match(playwrightConfig, /baseURL: 'http:\/\/127\.0\.0\.1:41739'/);
    assert.match(playwrightConfig, /reuseExistingServer: false/);
    assert.match(staticServer, /server\.listen\(41739, '127\.0\.0\.1'\)/);
});
