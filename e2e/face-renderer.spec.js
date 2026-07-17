'use strict';

const { test, expect } = require('@playwright/test');

test('顔の中央を保ち、外周へガラス感のある縁を描く', async ({ page }) => {
    await page.goto('/');

    const alpha = await page.evaluate(() => {
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = 100;
        sourceCanvas.height = 100;
        const sourceContext = sourceCanvas.getContext('2d');
        sourceContext.fillStyle = '#ff0000';
        sourceContext.fillRect(0, 0, 100, 100);

        const targetCanvas = document.createElement('canvas');
        FaceRenderer.render({
            sourceCanvas,
            targetCanvas,
            crop: {
                source: { x: 0, y: 0, width: 100, height: 100 },
                output: { width: 100, height: 100 },
                eyes: null
            },
            alpha: 0.8,
            privacy: '0'
        });

        const context = targetCanvas.getContext('2d');
        const getAlpha = (x, y) => context.getImageData(x, y, 1, 1).data[3];

        return {
            center: getAlpha(50, 50),
            inner: getAlpha(77, 50),
            transition: getAlpha(85, 50),
            highlightEdge: getAlpha(1, 50),
            quietEdge: getAlpha(50, 99),
            centerColor: Array.from(
                context.getImageData(50, 50, 1, 1).data
            ),
            glassColor: Array.from(
                context.getImageData(90, 50, 1, 1).data
            ),
            highlightColor: Array.from(
                context.getImageData(1, 50, 1, 1).data
            )
        };
    });

    expect(alpha.center).toBeGreaterThanOrEqual(228);
    expect(alpha.center).toBeLessThanOrEqual(231);
    expect(alpha.inner).toBeGreaterThanOrEqual(200);
    expect(alpha.inner).toBeLessThanOrEqual(210);
    expect(alpha.transition).toBeLessThan(alpha.center);
    expect(alpha.transition).toBeGreaterThan(alpha.quietEdge);
    expect(alpha.highlightEdge).toBeGreaterThanOrEqual(40);
    expect(alpha.highlightEdge).toBeLessThanOrEqual(140);
    expect(alpha.quietEdge).toBeLessThanOrEqual(15);
    expect(alpha.highlightEdge).toBeGreaterThan(alpha.quietEdge);
    expect(alpha.centerColor[1]).toBeLessThanOrEqual(1);
    expect(alpha.centerColor[2]).toBeLessThanOrEqual(1);
    expect(alpha.glassColor[1]).toBeGreaterThanOrEqual(10);
    expect(alpha.glassColor[2]).toBeGreaterThanOrEqual(10);
    expect(alpha.highlightColor[1]).toBeGreaterThanOrEqual(70);
    expect(alpha.highlightColor[2]).toBeGreaterThanOrEqual(70);
});
