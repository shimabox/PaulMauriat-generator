'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { build } = require('../scripts/build');

const rootDirectory = path.resolve(__dirname, '..');

const listFiles = (directory, baseDirectory = directory) => fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap(entry => {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            return listFiles(entryPath, baseDirectory);
        }

        return [path.relative(baseDirectory, entryPath)];
    });

test('Cloudflare Pages用の配布物だけをdistへ出力する', t => {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'paulmauriat-build-'));
    const outputDirectory = path.join(temporaryDirectory, 'dist');
    fs.mkdirSync(outputDirectory);
    fs.writeFileSync(path.join(outputDirectory, 'old-file.txt'), '古い配布物');
    t.after(() => fs.rmSync(temporaryDirectory, { force: true, recursive: true }));

    build({ rootDirectory, outputDirectory });

    const expectedFiles = [
        '_headers',
        'LICENSE',
        'favicon.svg',
        'index.html',
        ...listFiles(path.join(rootDirectory, 'css')).map(file => path.join('css', file)),
        ...listFiles(path.join(rootDirectory, 'js')).map(file => path.join('js', file))
    ].sort();
    const actualFiles = listFiles(outputDirectory).sort();

    assert.deepEqual(actualFiles, expectedFiles);
    assert.equal(fs.existsSync(path.join(outputDirectory, 'old-file.txt')), false);
    assert.equal(fs.existsSync(path.join(outputDirectory, 'README.md')), false);
    assert.equal(fs.existsSync(path.join(outputDirectory, 'package.json')), false);
    assert.equal(fs.existsSync(path.join(outputDirectory, 'test')), false);
});

test('配布HTMLのJSとCSSへ内容由来のバージョンを付ける', t => {
    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'paulmauriat-build-'));
    const outputDirectory = path.join(temporaryDirectory, 'dist');
    t.after(() => fs.rmSync(temporaryDirectory, { force: true, recursive: true }));

    build({ rootDirectory, outputDirectory });

    const sourceHtml = fs.readFileSync(path.join(rootDirectory, 'index.html'), 'utf8');
    const distributionHtml = fs.readFileSync(path.join(outputDirectory, 'index.html'), 'utf8');
    const assetPaths = [...sourceHtml.matchAll(/(?:href|src)="((?:css|js)\/[^"]+\.(?:css|js))"/g)]
        .map(match => match[1]);

    assert.ok(assetPaths.length > 0);
    assetPaths.forEach(assetPath => {
        const content = fs.readFileSync(path.join(rootDirectory, assetPath));
        const version = crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);

        assert.match(distributionHtml, new RegExp(`${assetPath}\\?v=${version}`));
        assert.doesNotMatch(sourceHtml, new RegExp(`${assetPath}\\?v=`));
    });
});

test('Cloudflare Pagesがdistを配信しカメラを同一オリジンだけへ許可する', () => {
    const wrangler = JSON.parse(fs.readFileSync(path.join(rootDirectory, 'wrangler.jsonc'), 'utf8'));
    const headers = fs.readFileSync(path.join(rootDirectory, '_headers'), 'utf8');
    const packageJson = JSON.parse(fs.readFileSync(path.join(rootDirectory, 'package.json'), 'utf8'));

    assert.equal(wrangler.name, 'paulmauriat-generator');
    assert.equal(wrangler.pages_build_output_dir, './dist');
    assert.match(wrangler.compatibility_date, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(packageJson.scripts.build, 'node scripts/build.js');
    assert.match(headers, /Permissions-Policy: camera=\(self\)/);
    assert.match(headers, /web-share=\(self\)/);
    assert.doesNotMatch(headers, /camera=\*/);
});
