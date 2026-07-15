'use strict';

const fs = require('node:fs/promises');
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

const addExifOrientation = (jpeg, orientation) => {
    const app1 = Buffer.alloc(36);
    app1.writeUInt16BE(0xffe1, 0);
    app1.writeUInt16BE(34, 2);
    app1.write('Exif', 4, 'ascii');
    app1.write('II', 10, 'ascii');
    app1.writeUInt16LE(42, 12);
    app1.writeUInt32LE(8, 14);
    app1.writeUInt16LE(1, 18);
    app1.writeUInt16LE(0x0112, 20);
    app1.writeUInt16LE(3, 22);
    app1.writeUInt32LE(1, 24);
    app1.writeUInt16LE(orientation, 28);

    return Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]);
};

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        const permissionError = new Error('カメラの使用が拒否されました');
        permissionError.name = 'NotAllowedError';

        window.__cameraMock = {
            mode: 'reject',
            requests: 0,
            stoppedTracks: 0
        };

        const createCameraStream = facingMode => {
            const canvas = document.createElement('canvas');
            canvas.width = 320;
            canvas.height = 240;
            const stream = canvas.captureStream(5);
            stream.getTracks().forEach(track => {
                track.getSettings = () => ({ facingMode });
                const stop = track.stop.bind(track);
                track.stop = () => {
                    window.__cameraMock.stoppedTracks++;
                    stop();
                };
            });
            return stream;
        };

        Object.defineProperty(navigator, 'mediaDevices', {
            configurable: true,
            value: {
                getUserMedia: constraints => {
                    window.__cameraMock.requests++;
                    const facingMode = constraints
                        && constraints.video
                        && constraints.video.facingMode;
                    const requestedFacingMode = typeof facingMode === 'object'
                        ? facingMode.exact || facingMode.ideal
                        : facingMode;
                    const wantsRearCamera = requestedFacingMode === 'environment';

                    if (
                        window.__cameraMock.mode === 'front-only'
                        && facingMode
                        && facingMode.exact === 'environment'
                    ) {
                        const error = new Error('背面カメラが見つかりません');
                        error.name = 'OverconstrainedError';
                        return Promise.reject(error);
                    }

                    if (
                        window.__cameraMock.mode === 'success'
                        || window.__cameraMock.mode === 'front-only'
                    ) {
                        const actualFacingMode = wantsRearCamera
                            && window.__cameraMock.mode === 'success'
                            ? 'environment'
                            : 'user';
                        const stream = createCameraStream(actualFacingMode);

                        if (wantsRearCamera && actualFacingMode !== 'environment') {
                            return Promise.resolve(stream);
                        }

                        setTimeout(() => {
                            const video = document.querySelector('#video');
                            if (!video) {
                                return;
                            }
                            Object.defineProperty(video, 'videoWidth', {
                                configurable: true,
                                value: 320
                            });
                            Object.defineProperty(video, 'videoHeight', {
                                configurable: true,
                                value: 240
                            });
                            video.dispatchEvent(new Event('loadedmetadata'));
                        });
                        return Promise.resolve(stream);
                    }
                    return Promise.reject(permissionError);
                }
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
    const statusMessage = page.locator('#status-message');
    await expect(statusMessage).toHaveText('');
    await expect.poll(async () => {
        const box = await statusMessage.boundingBox();
        return box ? box.height : 0;
    }).toBeGreaterThan(0);
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

test('背景画像だけでもPNGをダウンロードできる', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'background.svg');
    await page.locator('#read-file').setInputFiles(fixturePath);
    await expect(page.locator('#img-canvas')).toBeVisible();

    const captureButton = page.getByRole('button', { name: 'Download generated image' });
    await expect(captureButton).toBeEnabled();

    const downloadPromise = page.waitForEvent('download');
    await captureButton.click();
    const download = await downloadPromise;
    const content = await fs.readFile(await download.path());

    expect(download.suggestedFilename()).toBe('paulmauriat.png');
    expect(content.subarray(0, 8)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
});

test('顔追跡中は保存できず停止後だけ保存できる', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'background.svg');
    const captureButton = page.getByRole('button', { name: 'Download generated image' });
    await page.evaluate(() => { window.__cameraMock.mode = 'success'; });

    await page.locator('#read-file').setInputFiles(fixturePath);
    await expect(page.locator('#status-message')).toHaveText('');
    await expect(captureButton).toBeDisabled();

    await page.getByRole('button', { name: 'Stop face tracking' }).click();
    await expect(captureButton).toBeEnabled();

    await page.getByRole('button', { name: 'Start face tracking' }).click();
    await expect(captureButton).toBeDisabled();
});

test('初回画像選択後に顔追跡用Canvasの描画サイズを確保する', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'background.svg');
    await page.evaluate(() => { window.__cameraMock.mode = 'success'; });

    await page.locator('#read-file').setInputFiles(fixturePath);
    await expect(page.locator('#status-message')).toHaveText('');

    const trackingCanvas = page.locator('#canvas');
    await expect.poll(() => trackingCanvas.evaluate(canvas => canvas.width)).toBeGreaterThan(0);
    await expect.poll(() => trackingCanvas.evaluate(canvas => canvas.height)).toBeGreaterThan(0);
});

test('カメラエラー後に再試行し、停止時にトラックを解放する', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'background.svg');
    await page.locator('#read-file').setInputFiles(fixturePath);
    await expect(page.locator('#status-message')).toContainText('許可されていません');
    await expect(page.getByRole('button', {
        name: 'Download generated image'
    })).toBeEnabled();

    await page.evaluate(() => { window.__cameraMock.mode = 'success'; });
    await page.getByRole('button', { name: 'Start face tracking' }).click();
    await expect(page.locator('#status-message')).toHaveText('');

    await page.getByRole('button', { name: 'Stop face tracking' }).click();
    await expect.poll(() => page.evaluate(() => {
        return window.__cameraMock.stoppedTracks;
    })).toBeGreaterThan(0);
});

test('カメラ切替時に現在のトラックを解放して再取得する', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'background.svg');
    await page.evaluate(() => { window.__cameraMock.mode = 'success'; });
    await page.locator('#read-file').setInputFiles(fixturePath);
    await expect(page.locator('#status-message')).toHaveText('');

    await page.getByRole('button', { name: 'Switch camera' }).click();
    await expect.poll(() => page.evaluate(() => {
        return window.__cameraMock.requests;
    })).toBe(2);
    await expect.poll(() => page.evaluate(() => {
        return window.__cameraMock.stoppedTracks;
    })).toBeGreaterThan(0);
    await expect(page.locator('#status-message')).toHaveText('');
});

test('背面カメラがない場合は前面カメラへ戻すよう案内する', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'background.svg');
    await page.evaluate(() => { window.__cameraMock.mode = 'front-only'; });
    await page.locator('#read-file').setInputFiles(fixturePath);
    await expect(page.locator('#status-message')).toHaveText('');

    await page.getByRole('button', { name: 'Switch camera' }).click();

    await expect(page.locator('#status-message')).toHaveText(
        '背面カメラが見つかりません。前面カメラに戻してください'
    );
});

test('同じ画像を続けて選択しても再読み込みする', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'background.svg');
    const input = page.locator('#read-file');
    await input.setInputFiles(fixturePath);
    await expect(page.locator('#img-canvas')).toBeVisible();
    await page.evaluate(() => { window.__firstImageCanvas = document.querySelector('#img-canvas'); });

    await input.setInputFiles(fixturePath);
    await expect.poll(() => page.evaluate(() => {
        return window.__firstImageCanvas !== document.querySelector('#img-canvas');
    })).toBe(true);
});

test('カメラ動作中に画像を再選択しても起動メッセージを残さない', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'background.svg');
    const input = page.locator('#read-file');
    await page.evaluate(() => { window.__cameraMock.mode = 'success'; });

    await input.setInputFiles(fixturePath);
    await expect(page.locator('#status-message')).toHaveText('');

    await input.setInputFiles(fixturePath);

    await expect(page.locator('#status-message')).toHaveText('');
    await expect.poll(() => page.evaluate(() => {
        return window.__cameraMock.requests;
    })).toBe(1);
});

test('EXIF Orientation 6のJPEGを縦向きへ補正する', async ({ page }) => {
    const jpegBytes = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 40;
        canvas.height = 20;
        const context = canvas.getContext('2d');
        context.fillStyle = '#f00';
        context.fillRect(0, 0, 40, 20);
        const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
        return Array.from(Uint8Array.from(atob(base64), char => char.charCodeAt(0)));
    });
    const orientedJpeg = addExifOrientation(Buffer.from(jpegBytes), 6);

    await page.locator('#read-file').setInputFiles({
        name: 'orientation-6.jpg',
        mimeType: 'image/jpeg',
        buffer: orientedJpeg
    });

    const imageCanvas = page.locator('#img-canvas');
    await expect(imageCanvas).toBeVisible();
    await expect(imageCanvas).toHaveJSProperty('width', 20);
    await expect(imageCanvas).toHaveJSProperty('height', 40);
});
