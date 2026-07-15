'use strict';

const fs = require('node:fs');
const path = require('node:path');

const defaultRootDirectory = path.resolve(__dirname, '..');
const distributionEntries = ['index.html', 'css', 'js', 'LICENSE', '_headers'];

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
};

if (require.main === module) {
    build();
    console.log('Cloudflare Pages用の配布物をdistへ出力しました');
}

module.exports = { build, distributionEntries };
