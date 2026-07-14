'use strict';

const path = require('node:path');
const { test, expect } = require('@playwright/test');

const createPngHeader = (width, height) => {
    const png = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
    png.writeUInt32BE(13, 8);
    png.write('IHDR', 12, 'ascii');
    png.writeUInt32BE(width, 16);
    png.writeUInt32BE(height, 20);

    return png;
};

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        const permissionError = new Error('カメラの使用が拒否されました');
        permissionError.name = 'NotAllowedError';

        Object.defineProperty(navigator, 'mediaDevices', {
            configurable: true,
            value: {
                getUserMedia: () => Promise.reject(permissionError)
            }
        });
    });

    await page.goto('/');
});

test('初期画面に画像選択UIを表示する', async ({ page }) => {
    await expect(page).toHaveTitle('PaulMauriat-generator');
    await expect(page.getByRole('button', {
        name: 'Select or drop a background image'
    })).toBeVisible();
    await expect(page.locator('#status-message')).toBeHidden();
});

test('画像選択後に操作ボタンとカメラ拒否メッセージを表示する', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'background.svg');

    await page.locator('#read-file').setInputFiles(fixturePath);

    await expect(page.locator('#img-canvas')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start face tracking' })).toBeVisible();
    await expect(page.locator('#status-message')).toHaveText(
        'カメラの使用が許可されていません。ブラウザの設定を確認してください'
    );
});

test('画面サイズに合わせてプレビューを縮小し、元画像より拡大しない', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'background.svg');
    const imageCanvas = page.locator('#img-canvas');
    const preview = page.locator('#image-select-view');

    await page.locator('#read-file').setInputFiles(fixturePath);
    await expect(imageCanvas).toBeVisible();

    await page.setViewportSize({ width: 240, height: 400 });
    await expect(imageCanvas).toHaveCSS('width', '224px');
    await expect(imageCanvas).toHaveCSS('height', '168px');
    await expect(preview).toHaveCSS('width', '224px');
    await expect(preview).toHaveCSS('height', '168px');

    await page.setViewportSize({ width: 1000, height: 800 });
    await expect(imageCanvas).toHaveCSS('width', '320px');
    await expect(imageCanvas).toHaveCSS('height', '240px');
});

test('上限を超える画像をデコード前に拒否する', async ({ page }) => {
    await page.locator('#read-file').setInputFiles({
        name: 'large.png',
        mimeType: 'image/png',
        buffer: createPngHeader(9000, 4000)
    });

    await expect(page.locator('#status-message')).toHaveText(
        '画像の寸法が大きすぎます。長辺8192px・4000万画素以下を選択してください'
    );
    await expect(page.locator('#img-canvas')).toHaveCount(0);
});
