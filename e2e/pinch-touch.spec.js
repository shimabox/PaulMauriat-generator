'use strict';

// CDP Input.dispatchTouchEvent による「実タッチ」でピンチを検証する。
// e2e/basic-ui.spec.js のピンチテストは合成 dispatchEvent 経由のため
// setPointerCapture が throw し、Pointer Capture 機構(gotpointercapture /
// lostpointercapture)自体が動かない。本ファイルは hasTouch: true と
// CDP Input.dispatchTouchEvent を使い、capture が実際に有効化される経路で
// ピンチ操作を確認する。

const path = require('node:path');
const { test, expect } = require('@playwright/test');

test.use({ hasTouch: true });

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
        window.__cameraMock = { mode: 'success', requests: 0, stoppedTracks: 0 };
        window.__faceTrackerMock = { enabled: false, positions: false };

        document.addEventListener('DOMContentLoaded', () => {
            const Tracker = window.clm.tracker;
            window.clm.tracker = function(...args) {
                const tracker = new Tracker(...args);
                return {
                    init: tracker.init.bind(tracker),
                    start: tracker.start.bind(tracker),
                    stop: tracker.stop.bind(tracker),
                    getCurrentPosition() {
                        return window.__faceTrackerMock.enabled
                            ? window.__faceTrackerMock.positions
                            : tracker.getCurrentPosition();
                    }
                };
            };
        });

        const createCameraStream = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 320;
            canvas.height = 240;
            const context = canvas.getContext('2d');
            context.fillStyle = '#c87828';
            context.fillRect(0, 0, canvas.width, canvas.height);
            const stream = canvas.captureStream(5);
            stream.getTracks().forEach(track => {
                track.getSettings = () => ({ facingMode: 'user' });
            });
            return stream;
        };

        Object.defineProperty(navigator, 'mediaDevices', {
            configurable: true,
            value: {
                getUserMedia: () => {
                    const stream = createCameraStream();
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
            }
        });
    });

    await page.goto('/');
});

const setFaceDetected = (page, detected) => page.evaluate(hasFace => {
    window.__faceTrackerMock.enabled = true;
    if (!hasFace) {
        window.__faceTrackerMock.positions = false;
        return;
    }

    const positions = Array.from({ length: 71 }, () => [160, 120]);
    positions[0] = [120, 80];
    positions[8] = [200, 160];
    window.__faceTrackerMock.positions = positions;
}, detected);

test('実タッチのピンチアウトで顔が拡大される(capture機構込み)', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'background.svg');
    await setFaceDetected(page, true);
    await page.locator('#read-file').setInputFiles(fixturePath);

    const faceCanvas = page.locator('#face-canvas');
    const sizeRange = page.locator('#face-size-range');
    const positionList = page.locator('#face-position-list');
    await expect(sizeRange).toBeEnabled();
    await expect.poll(() => faceCanvas.evaluate(canvas => canvas.width)).toBeGreaterThan(0);
    await expect(sizeRange).toHaveValue('1');
    // プリセット位置(初期値 "1" = Top, Right)が選択されている状態から始める。
    await expect(positionList).toHaveValue('1');

    const box = await faceCanvas.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    const cdp = await page.context().newCDPSession(page);
    const touches = (a, b) => [
        { x: a, y: cy, id: 1 },
        { x: b, y: cy, id: 2 }
    ];

    // ほぼ同時に2本指を置く(1本目pointerdown単独のcustom化が起きないことの検証を兼ねる)。
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: touches(cx - 20, cx + 20)
    });

    // 両指を段階的に外側へ動かす(実機のピンチアウト相当)。
    for (let step = 1; step <= 5; step++) {
        await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: touches(cx - 20 - step * 8, cx + 20 + step * 8)
        });
    }

    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: []
    });

    // 距離 40px → 120px(3倍)なので、クランプ上限の 2.00 まで拡大されるはず。
    await expect(sizeRange).toHaveValue('2');
    await expect(page.locator('.face-size-val')).toHaveText('2.00×');
    await expect(faceCanvas).not.toHaveClass(/is-resizing/);
    // ピンチだけではプリセット位置が黙ってcustomへ切り替わらないこと。
    await expect(positionList).toHaveValue('1');
});

test('タップ(移動なし)では位置モードがcustomに変わらない', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'background.svg');
    await setFaceDetected(page, true);
    await page.locator('#read-file').setInputFiles(fixturePath);

    const faceCanvas = page.locator('#face-canvas');
    const positionList = page.locator('#face-position-list');
    await expect.poll(() => faceCanvas.evaluate(canvas => canvas.width)).toBeGreaterThan(0);
    await expect(positionList).toHaveValue('1');
    const initialLeft = await faceCanvas.evaluate(canvas => canvas.style.left);
    const initialTop = await faceCanvas.evaluate(canvas => canvas.style.top);

    const box = await faceCanvas.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: cx, y: cy, id: 1 }]
    });
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: []
    });

    await expect(positionList).toHaveValue('1');
    await expect(faceCanvas).not.toHaveClass(/is-dragging/);
    expect(await faceCanvas.evaluate(canvas => canvas.style.left)).toBe(initialLeft);
    expect(await faceCanvas.evaluate(canvas => canvas.style.top)).toBe(initialTop);
});

test('3px超のドラッグでは位置モードがcustomに変わり顔が移動する', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'background.svg');
    await setFaceDetected(page, true);
    await page.locator('#read-file').setInputFiles(fixturePath);

    const faceCanvas = page.locator('#face-canvas');
    const positionList = page.locator('#face-position-list');
    await expect.poll(() => faceCanvas.evaluate(canvas => canvas.width)).toBeGreaterThan(0);
    await expect(positionList).toHaveValue('1');
    const initialLeft = await faceCanvas.evaluate(canvas => canvas.style.left);
    const initialTop = await faceCanvas.evaluate(canvas => canvas.style.top);

    const box = await faceCanvas.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: cx, y: cy, id: 1 }]
    });
    // 3pxの確定閾値を明確に超える移動量にする。
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: cx + 20, y: cy + 15, id: 1 }]
    });
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: []
    });

    await expect(positionList).toHaveValue('custom');
    const movedLeft = await faceCanvas.evaluate(canvas => canvas.style.left);
    const movedTop = await faceCanvas.evaluate(canvas => canvas.style.top);
    expect(movedLeft === initialLeft && movedTop === initialTop).toBe(false);
});

test('ドラッグ中に2本目の指を置いてもピンチへ移行して拡縮できる(capture active経由)', async ({ page }) => {
    const fixturePath = path.join(__dirname, 'fixtures', 'background.svg');
    await setFaceDetected(page, true);
    await page.locator('#read-file').setInputFiles(fixturePath);

    const faceCanvas = page.locator('#face-canvas');
    const sizeRange = page.locator('#face-size-range');
    await expect(sizeRange).toBeEnabled();
    await expect.poll(() => faceCanvas.evaluate(canvas => canvas.width)).toBeGreaterThan(0);
    await expect(sizeRange).toHaveValue('1');

    const box = await faceCanvas.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    const cdp = await page.context().newCDPSession(page);

    // 1本目でドラッグを開始し、少し動かして capture を active にする。
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: cx, y: cy, id: 1 }]
    });
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: cx - 5, y: cy, id: 1 }]
    });
    await expect(faceCanvas).toHaveClass(/is-dragging/);

    // 2本目を追加してピンチへ移行。ドラッグ中に持っていたPointer Captureの
    // 解放起因で lostpointercapture が誤発火し、ピンチが即終了しないことを確認する。
    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [
            { x: cx - 5, y: cy, id: 1 },
            { x: cx + 10, y: cy, id: 2 }
        ]
    });
    await expect(faceCanvas).toHaveClass(/is-resizing/);

    // 両指を外側へ(距離 15px → 135px)。
    for (let step = 1; step <= 5; step++) {
        await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [
                { x: cx - 5 - step * 12, y: cy, id: 1 },
                { x: cx + 10 + step * 12, y: cy, id: 2 }
            ]
        });
    }

    await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: []
    });

    await expect(sizeRange).toHaveValue('2');
    await expect(page.locator('.face-size-val')).toHaveText('2.00×');
    await expect(faceCanvas).not.toHaveClass(/is-resizing/);
});
