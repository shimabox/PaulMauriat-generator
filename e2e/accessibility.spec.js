'use strict';

const path = require('node:path');
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

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

test('初期画面に自動検出可能なアクセシビリティ違反がない', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations).toEqual([]);
});

test('画像読み込み後の操作画面に自動検出可能な違反がない', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'background.svg');
    await page.locator('#read-file').setInputFiles(fixturePath);
    await expect(page.locator('#img-canvas')).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations).toEqual([]);
});

test('TabとEnterだけで背景画像を選択できる', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', {
        name: 'Select or drop a background image'
    })).toBeFocused();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.keyboard.press('Enter');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'background.svg'));

    await expect(page.locator('#img-canvas')).toBeVisible();
});

test('Spaceでも背景画像の選択ダイアログを開ける', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.keyboard.press('Space');
    const fileChooser = await fileChooserPromise;

    expect(fileChooser.isMultiple()).toBe(false);
});
