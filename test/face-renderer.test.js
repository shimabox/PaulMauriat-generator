'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const FaceRenderer = require('../js/face-renderer.js');

const createCanvas = (width, height) => {
    const calls = [];
    const drawingState = {
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        lineWidth: 1,
        shadowBlur: 0,
        shadowColor: 'rgba(0, 0, 0, 0)'
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
        createLinearGradient: (...args) => {
            calls.push(['linearGradient', ...args]);
            return gradient;
        },
        stroke: () => calls.push(['stroke', { ...drawingState }]),
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
        },
        lineWidth: {
            get: () => drawingState.lineWidth,
            set: value => drawingState.lineWidth = value
        },
        shadowBlur: {
            get: () => drawingState.shadowBlur,
            set: value => drawingState.shadowBlur = value
        },
        shadowColor: {
            get: () => drawingState.shadowColor,
            set: value => drawingState.shadowColor = value
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

test('指定透明度より顔の中央を0.1だけ濃くする', () => {
    assert.deepEqual(FaceRenderer.calculateOpacityProfile(0.85), {
        centerAlpha: 0.95,
        innerMaskAlpha: 0.8947
    });
    assert.deepEqual(FaceRenderer.calculateOpacityProfile(1), {
        centerAlpha: 1,
        innerMaskAlpha: 1
    });
    assert.deepEqual(FaceRenderer.calculateOpacityProfile(0), {
        centerAlpha: 0,
        innerMaskAlpha: 0
    });
});

test('ガラスの膜を外周へ寄せ、反射の中心をわずかにずらす', () => {
    assert.deepEqual(FaceRenderer.calculateGlassVeil(80, 96), {
        innerCenterX: 36,
        innerCenterY: 44,
        innerRadius: 26,
        outerCenterX: 40,
        outerCenterY: 48,
        outerRadius: 40
    });
});

test('ガラスの縁を顔サイズに合わせて細く保つ', () => {
    assert.deepEqual(FaceRenderer.calculateGlassRim(80, 96), {
        blur: 2,
        centerX: 40,
        centerY: 48,
        lineWidth: 1,
        radius: 38.5
    });
    assert.deepEqual(FaceRenderer.calculateGlassRim(400, 480), {
        blur: 4,
        centerX: 200,
        centerY: 240,
        lineWidth: 2.5,
        radius: 196.75
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
    assert.equal(drawCall[1].globalAlpha, 0.85);
    assert.equal(drawCall[1].globalCompositeOperation, 'source-over');
    assert.deepEqual(
        target.calls.find(call => call[0] === 'gradient'),
        ['gradient', 40, 48, 0, 40, 48, 40]
    );
    assert.deepEqual(
        target.calls.filter(call => call[0] === 'color'),
        [
            ['color', 0, 'rgba(0, 0, 0, 1)'],
            ['color', 0.55, 'rgba(0, 0, 0, 0.8824)'],
            ['color', 1, 'rgba(0, 0, 0, 0)'],
            ['color', 0, 'rgba(236, 244, 248, 0)'],
            ['color', 0.42, 'rgba(236, 244, 248, 0.008)'],
            ['color', 0.72, 'rgba(246, 250, 252, 0.02)'],
            ['color', 0.9, 'rgba(255, 255, 255, 0.028)'],
            ['color', 0.98, 'rgba(255, 255, 255, 0)'],
            ['color', 0, 'rgba(255, 255, 255, 0.28)'],
            ['color', 0.35, 'rgba(248, 251, 253, 0.18)'],
            ['color', 0.7, 'rgba(196, 208, 218, 0.15)'],
            ['color', 1, 'rgba(255, 255, 255, 0.24)']
        ]
    );
    const gradients = target.calls.filter(call => call[0] === 'gradient');
    assert.deepEqual(gradients[1], ['gradient', 36, 44, 26, 40, 48, 40]);
    const fillCalls = target.calls.filter(call => call[0] === 'fillRect');
    const maskCall = fillCalls[0];
    assert.equal(maskCall[1].globalAlpha, 1);
    assert.equal(maskCall[1].globalCompositeOperation, 'destination-in');
    const glassCall = fillCalls[1];
    assert.equal(glassCall[1].globalAlpha, 1);
    assert.equal(glassCall[1].globalCompositeOperation, 'source-over');
    assert.deepEqual(
        target.calls.find(call => call[0] === 'linearGradient'),
        ['linearGradient', 0, 0, 80, 96]
    );
    const rimCall = target.calls.find(call => call[0] === 'stroke');
    assert.equal(rimCall[1].lineWidth, 1);
    assert.equal(rimCall[1].shadowBlur, 2);
    assert.equal(rimCall[1].shadowColor, 'rgba(255, 255, 255, 0.09)');
    assert.equal(rimCall[1].globalCompositeOperation, 'source-over');
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
