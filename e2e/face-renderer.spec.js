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
            rim: getAlpha(98, 50),
            edge: getAlpha(99, 50),
            centerColor: Array.from(
                context.getImageData(50, 50, 1, 1).data
            ),
            glassColor: Array.from(
                context.getImageData(90, 50, 1, 1).data
            ),
            rimColor: Array.from(
                context.getImageData(98, 50, 1, 1).data
            )
        };
    });

    expect(alpha.center).toBeGreaterThanOrEqual(228);
    expect(alpha.center).toBeLessThanOrEqual(231);
    expect(alpha.inner).toBeGreaterThanOrEqual(200);
    expect(alpha.inner).toBeLessThanOrEqual(212);
    expect(alpha.transition).toBeLessThan(alpha.center);
    expect(alpha.transition).toBeGreaterThan(alpha.rim);
    expect(alpha.rim).toBeGreaterThanOrEqual(25);
    expect(alpha.rim).toBeLessThanOrEqual(100);
    expect(alpha.edge).toBeLessThan(alpha.rim);
    expect(alpha.edge).toBeLessThanOrEqual(40);
    expect(alpha.centerColor[1]).toBeLessThanOrEqual(1);
    expect(alpha.centerColor[2]).toBeLessThanOrEqual(1);
    expect(alpha.glassColor[1]).toBeGreaterThanOrEqual(4);
    expect(alpha.glassColor[2]).toBeGreaterThanOrEqual(4);
    expect(alpha.rimColor[1]).toBeGreaterThanOrEqual(40);
    expect(alpha.rimColor[2]).toBeGreaterThanOrEqual(40);
});

test('横長の output でも真円として描かれる', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = 180;
        sourceCanvas.height = 110;
        const sourceContext = sourceCanvas.getContext('2d');
        sourceContext.fillStyle = '#ff8800';
        sourceContext.fillRect(0, 0, 180, 110);

        const targetCanvas = document.createElement('canvas');
        FaceRenderer.render({
            sourceCanvas,
            targetCanvas,
            crop: {
                source: { x: 0, y: 0, width: 180, height: 110 },
                output: { width: 180, height: 110 },
                eyes: null
            },
            alpha: 0.8,
            privacy: '0'
        });

        const context = targetCanvas.getContext('2d');
        const getAlpha = (x, y) => context.getImageData(x, y, 1, 1).data[3];
        const getColor = (x, y) => Array.from(context.getImageData(x, y, 1, 1).data);

        // 内接円(半径55、中心(90, 55))の縁から中心方向へ53px入った、
        // 上下左右で等距離の点を比較する。
        return {
            topAlpha: getAlpha(90, 2),
            bottomAlpha: getAlpha(90, 108),
            leftAlpha: getAlpha(37, 55),
            rightAlpha: getAlpha(143, 55),
            topColor: getColor(90, 2),
            rightColor: getColor(143, 55)
        };
    });

    // 上下端も左右端と同程度までフェードして落ちていること(修正前は255のまま)
    expect(result.topAlpha).toBeLessThan(100);
    expect(result.bottomAlpha).toBeLessThan(100);
    expect(Math.abs(result.topAlpha - result.leftAlpha)).toBeLessThanOrEqual(20);
    expect(Math.abs(result.bottomAlpha - result.rightAlpha)).toBeLessThanOrEqual(20);

    // 縁のリング(ガラスの明るい色)が上端付近にも出ていること
    // (修正前は元画像の色 rgb(255, 136, 0) のまま、b成分は0)
    expect(result.topColor[1]).toBeGreaterThan(150);
    expect(result.topColor[2]).toBeGreaterThan(50);
    expect(Math.abs(result.topColor[1] - result.rightColor[1])).toBeLessThanOrEqual(40);
});
