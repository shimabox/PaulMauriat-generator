'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const FaceRenderer = require('../js/face-renderer.js');

const createCanvas = (width, height) => {
    const calls = [];
    const drawingState = {
        globalAlpha: 1,
        globalCompositeOperation: 'source-over'
    };
    const drawingStateStack = [];
    const gradient = { addColorStop: (...args) => calls.push(['color', ...args]) };
    const context = {
        clearRect: (...args) => calls.push(['clearRect', ...args]),
        save: () => {
            drawingStateStack.push({ ...drawingState });
            calls.push(['save']);
        },
        restore: () => {
            Object.assign(drawingState, drawingStateStack.pop());
            calls.push(['restore']);
        },
        beginPath: () => calls.push(['beginPath']),
        arc: (...args) => calls.push(['arc', ...args]),
        clip: () => calls.push(['clip']),
        drawImage: (...args) => calls.push([
            'drawImage',
            { ...drawingState },
            ...args
        ]),
        createRadialGradient: (...args) => {
            calls.push(['gradient', ...args]);
            return gradient;
        },
        fillRect: (...args) => calls.push([
            'fillRect',
            { ...drawingState },
            ...args
        ]),
        getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
        putImageData: (...args) => calls.push(['putImageData', ...args])
    };
    Object.defineProperties(context, {
        globalAlpha: {
            get: () => drawingState.globalAlpha,
            set: value => drawingState.globalAlpha = value
        },
        globalCompositeOperation: {
            get: () => drawingState.globalCompositeOperation,
            set: value => drawingState.globalCompositeOperation = value
        }
    });
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

test('顔の中央を保ち、外周45パーセントをフェード領域にする', () => {
    assert.deepEqual(FaceRenderer.calculateEdgeFade(80, 96), {
        centerX: 40,
        centerY: 48,
        innerRadius: 22,
        outerRadius: 40
    });
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
    assert.equal(target.context.globalAlpha, 1);
    assert.equal(target.context.globalCompositeOperation, 'source-over');
    assert.equal(target.context.imageSmoothingEnabled, true);
    assert.equal(target.context.imageSmoothingQuality, 'high');
    const drawCall = target.calls.find(call => call[0] === 'drawImage');
    assert.equal(drawCall[1].globalAlpha, 0.75);
    assert.equal(drawCall[1].globalCompositeOperation, 'source-over');
    assert.deepEqual(
        target.calls.find(call => call[0] === 'gradient'),
        ['gradient', 40, 48, 22, 40, 48, 40]
    );
    assert.deepEqual(
        target.calls.filter(call => call[0] === 'color'),
        [
            ['color', 0, 'rgba(0, 0, 0, 1)'],
            ['color', 1, 'rgba(0, 0, 0, 0)']
        ]
    );
    const maskCall = target.calls.find(call => call[0] === 'fillRect');
    assert.equal(maskCall[1].globalAlpha, 1);
    assert.equal(maskCall[1].globalCompositeOperation, 'destination-in');
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
