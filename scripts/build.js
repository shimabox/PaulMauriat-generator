'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const defaultRootDirectory = path.resolve(__dirname, '..');
const distributionEntries = ['index.html', 'favicon.svg', 'css', 'js', 'LICENSE', '_headers'];

const addAssetVersions = ({ rootDirectory, outputDirectory }) => {
    const indexPath = path.join(outputDirectory, 'index.html');
    const html = fs.readFileSync(indexPath, 'utf8');
    const versionedHtml = html.replace(
        /((?:href|src)=")((?:css|js)\/[^"?]+\.(?:css|js))(")/g,
        (match, prefix, assetPath, suffix) => {
            const content = fs.readFileSync(path.join(rootDirectory, assetPath));
            // 内容が変わったファイルだけ新しいURLにして、ブラウザの古いキャッシュを避ける。
            const version = crypto.createHash('sha256')
                .update(content)
                .digest('hex')
                .slice(0, 12);

            return `${prefix}${assetPath}?v=${version}${suffix}`;
        }
    );

    fs.writeFileSync(indexPath, versionedHtml);
};

const build = ({
    rootDirectory = defaultRootDirectory,
    outputDirectory = path.join(rootDirectory, 'dist')
} = {}) => {
    const resolvedRootDirectory = path.resolve(rootDirectory);
    const resolvedOutputDirectory = path.resolve(outputDirectory);

    if (resolvedOutputDirectory === resolvedRootDirectory) {
        throw new Error('配布先にプロジェクトルートは指定できません');
    }

    fs.rmSync(resolvedOutputDirectory, { force: true, recursive: true });
    fs.mkdirSync(resolvedOutputDirectory, { recursive: true });

    distributionEntries.forEach(entry => {
        const source = path.join(resolvedRootDirectory, entry);
        const destination = path.join(resolvedOutputDirectory, entry);
        fs.cpSync(source, destination, { recursive: true });
    });

    addAssetVersions({
        rootDirectory: resolvedRootDirectory,
        outputDirectory: resolvedOutputDirectory
    });
};

if (require.main === module) {
    build();
    console.log('Cloudflare Pages用の配布物をdistへ出力しました');
}

module.exports = { build, distributionEntries };
