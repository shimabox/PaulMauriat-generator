'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const ImageShare = require('../js/image-share.js');

class MockFile {
    constructor(parts, name, options) {
        this.parts = parts;
        this.name = name;
        this.type = options.type;
    }
}

test('PNGのData URLを共有用Fileへ変換する', () => {
    const file = ImageShare.dataUrlToFile({
        dataUrl: 'data:image/png;base64,iVBORw==',
        FileApi: MockFile,
        decodeBase64: value => Buffer.from(value, 'base64').toString('binary')
    });

    assert.equal(file.name, 'paulmauriat.png');
    assert.equal(file.type, 'image/png');
    assert.deepEqual([...file.parts[0]], [0x89, 0x50, 0x4e, 0x47]);
});

test('対応端末では生成画像とハッシュタグを共有する', async () => {
    const calls = [];
    const navigatorApi = {
        canShare(data) {
            calls.push(['canShare', data]);
            return true;
        },
        async share(data) {
            calls.push(['share', data]);
        }
    };
    let downloaded = false;

    const result = await ImageShare.shareImage({
        dataUrl: 'data:image/png;base64,iVBORw==',
        navigatorApi,
        FileApi: MockFile,
        decodeBase64: value => Buffer.from(value, 'base64').toString('binary'),
        downloadImage: () => { downloaded = true; }
    });

    assert.equal(result.method, 'native');
    assert.equal(downloaded, false);
    assert.deepEqual(Object.keys(calls[0][1]), ['files']);
    assert.equal(calls[1][1].files[0].name, 'paulmauriat.png');
    assert.equal(calls[1][1].text, ImageShare.DEFAULT_SHARE_TEXT);
    assert.equal('title' in calls[1][1], false);
});

test('共有シートを閉じた場合はエラーにしない', async () => {
    const error = new Error('キャンセル');
    error.name = 'AbortError';
    const result = await ImageShare.shareImage({
        dataUrl: 'data:image/png;base64,iVBORw==',
        navigatorApi: {
            canShare: () => true,
            share: () => Promise.reject(error)
        },
        FileApi: MockFile,
        decodeBase64: value => Buffer.from(value, 'base64').toString('binary')
    });

    assert.deepEqual(result, { method: 'cancelled' });
});

test('ファイル共有に未対応なら画像を保存してXの投稿画面を開く', async () => {
    const opened = [];
    const actions = [];
    let downloaded = false;
    const result = await ImageShare.shareImage({
        dataUrl: 'data:image/png;base64,iVBORw==',
        navigatorApi: { canShare: () => false, share: () => Promise.resolve() },
        FileApi: MockFile,
        decodeBase64: value => Buffer.from(value, 'base64').toString('binary'),
        downloadImage: () => {
            downloaded = true;
            actions.push('download');
        },
        windowApi: {
            open: (...args) => {
                opened.push(args);
                actions.push('open');
                return {};
            }
        }
    });

    assert.equal(downloaded, true);
    assert.equal(result.method, 'x-intent');
    assert.match(result.intentUrl, /^https:\/\/x\.com\/intent\/post\?text=/);
    assert.equal(decodeURIComponent(result.intentUrl),
        `https://x.com/intent/post?text=${ImageShare.DEFAULT_SHARE_TEXT}`);
    assert.deepEqual(opened[0], [result.intentUrl, '_blank', 'noopener,noreferrer']);
    assert.deepEqual(actions, ['open', 'download']);
});
