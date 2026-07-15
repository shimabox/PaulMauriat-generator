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

test('GETパラメータd=1のときだけ顔追跡デバッグ表示を有効にする', async ({ page }) => {
    const debugStatus = page.locator('#face-debug-status');
    await expect(debugStatus).toHaveCount(1);
    await expect(debugStatus).toBeHidden();

    await page.goto('/?d=1');
    await expect(debugStatus).toBeVisible();
    await expect(debugStatus).toContainText('カメラ: 待機');

    const fixturePath = path.join(__dirname, 'fixtures', 'background.svg');
    await page.evaluate(() => { window.__cameraMock.mode = 'success'; });
    await page.locator('#read-file').setInputFiles(fixturePath);

    await expect(debugStatus).toContainText('カメラ: 準備完了 320×240');
    await expect(debugStatus).toContainText('追跡:');
    await expect(debugStatus).toContainText('特徴点フレーム:');
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

test('顔設定の入力欄を同じ高さに揃える', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'background.svg');
    await page.locator('#read-file').setInputFiles(fixturePath);
    await expect(page.locator('#face-position-list')).toBeVisible();

    const controlTops = await Promise.all([
        page.locator('#face-position-list'),
        page.locator('.range-row'),
        page.locator('#face-privacy')
    ].map(async locator => {
        const box = await locator.boundingBox();
        return box.y;
    }));

    expect(Math.max(...controlTops) - Math.min(...controlTops)).toBeLessThanOrEqual(1);
});

test('顔をドラッグして自由配置し、四隅プリセットへ戻せる', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'background.svg');
    await page.locator('#read-file').setInputFiles(fixturePath);
    await expect(page.locator('#img-canvas')).toBeVisible();

    const faceCanvas = page.locator('#face-canvas');
    const positionList = page.locator('#face-position-list');
    await expect(faceCanvas).toHaveCount(1);

    await page.evaluate(() => {
        const canvas = document.querySelector('#face-canvas');
        canvas.width = 60;
        canvas.height = 80;
        canvas.style.width = '60px';
        canvas.style.height = '80px';
        const select = document.querySelector('#face-position-list');
        select.value = '1';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        window.__fileInputClicks = 0;
        document.querySelector('#read-file').addEventListener('click', () => {
            window.__fileInputClicks++;
        });
    });

    await expect(faceCanvas).toHaveCSS('left', '255px');
    await expect(faceCanvas).toHaveCSS('top', '-5px');

    await faceCanvas.dispatchEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'mouse',
        clientX: 280,
        clientY: 20,
        buttons: 1
    });
    await faceCanvas.dispatchEvent('pointermove', {
        pointerId: 1,
        pointerType: 'mouse',
        clientX: 180,
        clientY: 100,
        buttons: 1
    });
    await faceCanvas.dispatchEvent('pointerup', {
        pointerId: 1,
        pointerType: 'mouse',
        clientX: 180,
        clientY: 100
    });

    await expect(positionList).toHaveValue('custom');
    await expect(faceCanvas).toHaveCSS('left', '155px');
    await expect(faceCanvas).toHaveCSS('top', '75px');
    await expect.poll(() => page.evaluate(() => window.__fileInputClicks)).toBe(0);

    await positionList.selectOption('4');
    await expect(faceCanvas).toHaveCSS('left', '5px');
    await expect(faceCanvas).toHaveCSS('top', '165px');

    await faceCanvas.press('Shift+ArrowRight');
    await expect(positionList).toHaveValue('custom');
    await expect(faceCanvas).toHaveCSS('left', '15px');

    await faceCanvas.dispatchEvent('pointerdown', {
        pointerId: 2,
        pointerType: 'touch',
        clientX: 30,
        clientY: 190,
        buttons: 1
    });
    await faceCanvas.dispatchEvent('pointermove', {
        pointerId: 2,
        pointerType: 'touch',
        clientX: 50,
        clientY: 170,
        buttons: 1
    });
    await faceCanvas.dispatchEvent('pointerup', {
        pointerId: 2,
        pointerType: 'touch',
        clientX: 50,
        clientY: 170
    });
    await expect(faceCanvas).toHaveCSS('left', '35px');
    await expect(faceCanvas).toHaveCSS('top', '145px');

    await page.setViewportSize({ width: 240, height: 400 });
    await expect(page.locator('#img-canvas')).toHaveCSS('width', '224px');
    await expect(faceCanvas).toHaveCSS('left', '25px');
    await faceCanvas.dispatchEvent('pointerdown', {
        pointerId: 3,
        pointerType: 'mouse',
        clientX: 40,
        clientY: 120,
        buttons: 1
    });
    await faceCanvas.dispatchEvent('pointermove', {
        pointerId: 3,
        pointerType: 'mouse',
        clientX: 54,
        clientY: 120,
        buttons: 1
    });
    await faceCanvas.dispatchEvent('pointerup', {
        pointerId: 3,
        pointerType: 'mouse',
        clientX: 54,
        clientY: 120
    });
    await expect(faceCanvas).toHaveCSS('left', '39px');
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

test('保存用Canvasは表示サイズへ縮小せず元画像の解像度を維持する', async ({ page }) => {
    test.setTimeout(20000);
    const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">',
        '<rect width="1200" height="800" fill="#abcdef"/>',
        '</svg>'
    ].join('');

    await page.locator('#read-file').setInputFiles({
        name: 'high-resolution.svg',
        mimeType: 'image/svg+xml',
        buffer: Buffer.from(svg)
    });

    const imageCanvas = page.locator('#img-canvas');
    await expect(imageCanvas).toHaveJSProperty('width', 1200);
    await expect(imageCanvas).toHaveJSProperty('height', 800);
    await expect(imageCanvas).toHaveCSS('width', '640px');

    await page.evaluate(() => {
        window.__captureError = null;
        window.addEventListener('error', event => {
            window.__captureError = event.error && event.error.message
                ? event.error.message
                : event.message;
        });
        HTMLAnchorElement.prototype.click = function() {
            window.__capturedDownloadUrl = this.href;
        };
    });
    const captureButton = page.getByRole('button', { name: 'Download generated image' });
    await expect(captureButton).toBeEnabled();
    await captureButton.click();
    const captureError = await page.evaluate(() => window.__captureError);
    expect(captureError).toBeNull();
    await expect.poll(() => page.evaluate(() => window.__capturedDownloadUrl)).toBeTruthy();
    const dataUrl = await page.evaluate(() => window.__capturedDownloadUrl);
    const content = Buffer.from(dataUrl.split(',')[1], 'base64');

    expect(content.readUInt32BE(16)).toBe(1200);
    expect(content.readUInt32BE(20)).toBe(800);
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
