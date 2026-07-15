'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const FaceRenderer = require('../js/face-renderer.js');

const createCanvas = (width, height) => {
    const calls = [];
    const gradient = { addColorStop: (...args) => calls.push(['color', ...args]) };
    const context = {
        clearRect: (...args) => calls.push(['clearRect', ...args]),
        beginPath: () => calls.push(['beginPath']),
        arc: (...args) => calls.push(['arc', ...args]),
        clip: () => calls.push(['clip']),
        drawImage: (...args) => calls.push(['drawImage', ...args]),
        createRadialGradient: (...args) => {
            calls.push(['gradient', ...args]);
            return gradient;
        },
        fill: () => calls.push(['fill']),
        getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
        putImageData: (...args) => calls.push(['putImageData', ...args])
    };
    const canvas = { width, height, style: {}, getContext: () => context };
    return { canvas, context, calls };
};

test('顔がない場合はCanvasをゼロサイズへ戻す', () => {
    const { canvas } = createCanvas(100, 80);

    FaceRenderer.clear(canvas);

    assert.equal(canvas.width, 0);
    assert.equal(canvas.height, 0);
    assert.equal(canvas.style.width, '0px');
    assert.equal(canvas.style.height, '0px');
});

test('算出済みの顔領域を円形グラデーション付きで描画する', () => {
    const source = createCanvas(320, 240).canvas;
    const target = createCanvas(0, 0);
    const crop = {
        source: { x: 20, y: 30, width: 100, height: 120 },
        output: { width: 80, height: 96 },
        eyes: null
    };

    const rendered = FaceRenderer.render({
        sourceCanvas: source,
        targetCanvas: target.canvas,
        crop,
        alpha: 0.75,
        privacy: '0'
    });

    assert.equal(rendered, true);
    assert.equal(target.canvas.width, 80);
    assert.equal(target.canvas.height, 96);
    assert.equal(target.context.globalAlpha, 0.75);
    assert.equal(target.context.imageSmoothingEnabled, true);
    assert.equal(target.context.imageSmoothingQuality, 'high');
    assert.ok(target.calls.some(call => call[0] === 'drawImage'));
    assert.ok(target.calls.some(call => call[0] === 'fill'));
});

test('切り出し領域がない場合は描画しない', () => {
    const source = createCanvas(320, 240).canvas;
    const target = createCanvas(0, 0);

    assert.equal(FaceRenderer.render({
        sourceCanvas: source,
        targetCanvas: target.canvas,
        crop: null,
        alpha: 1,
        privacy: '0'
    }), false);
    assert.equal(target.calls.some(call => call[0] === 'drawImage'), false);
});
