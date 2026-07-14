'use strict';

const path = require('node:path');
const { test, expect } = require('@playwright/test');

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
