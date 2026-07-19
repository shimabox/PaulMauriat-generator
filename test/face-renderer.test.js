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

test('顔の中央を保ち、外周25パーセントをフェード領域にする', () => {
    assert.deepEqual(FaceRenderer.calculateEdgeFade(80, 96), {
        centerX: 40,
        centerY: 48,
        innerRadius: 30,
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

test('縁強度0はデフォルト値(フェード0.75・膜開始比0.65・各倍率1)になる', () => {
    assert.deepEqual(FaceRenderer.calculateEdgeProfile(0), {
        fadeInnerRatio: 0.75,
        veilInnerRatio: 0.65,
        veilAlphaScale: 1,
        rimAlphaScale: 1
    });
    assert.deepEqual(
        FaceRenderer.calculateEdgeProfile(undefined),
        FaceRenderer.calculateEdgeProfile(0)
    );
});

test('縁強度-1は膜を外周へ退避しつつ透け感を出す端点値になる', () => {
    assert.deepEqual(FaceRenderer.calculateEdgeProfile(-1), {
        fadeInnerRatio: 0.62,
        veilInnerRatio: 0.85,
        veilAlphaScale: 0,
        rimAlphaScale: 0
    });
});

test('縁強度+1は切断面をくっきりさせる端点値になる(プラス側は現状維持)', () => {
    assert.deepEqual(FaceRenderer.calculateEdgeProfile(1), {
        fadeInnerRatio: 0.95,
        veilInnerRatio: 0.65,
        veilAlphaScale: 1.5,
        rimAlphaScale: 1.5
    });
});

test('縁強度は範囲外をクランプし、非数は0扱いにする', () => {
    assert.deepEqual(
        FaceRenderer.calculateEdgeProfile(-5),
        FaceRenderer.calculateEdgeProfile(-1)
    );
    assert.deepEqual(
        FaceRenderer.calculateEdgeProfile(5),
        FaceRenderer.calculateEdgeProfile(1)
    );
    assert.deepEqual(
        FaceRenderer.calculateEdgeProfile('not-a-number'),
        FaceRenderer.calculateEdgeProfile(0)
    );
    assert.deepEqual(
        FaceRenderer.calculateEdgeProfile(NaN),
        FaceRenderer.calculateEdgeProfile(0)
    );
});

test('縁強度は区間の中間でも線形補間する', () => {
    assert.deepEqual(FaceRenderer.calculateEdgeProfile(0.5), {
        fadeInnerRatio: 0.85,
        veilInnerRatio: 0.65,
        veilAlphaScale: 1.25,
        rimAlphaScale: 1.25
    });
    assert.deepEqual(FaceRenderer.calculateEdgeProfile(-0.5), {
        fadeInnerRatio: 0.685,
        veilInnerRatio: 0.75,
        veilAlphaScale: 0.5,
        rimAlphaScale: 0.5
    });
});

test('縁強度-1で描画すると白い膜と縁線のアルファが0になり、フェード開始位置・膜開始位置は外側へ退避する', () => {
    const source = createCanvas(320, 240).canvas;
    const target = createCanvas(0, 0);
    const crop = {
        source: { x: 20, y: 30, width: 100, height: 120 },
        output: { width: 80, height: 96 },
        eyes: null
    };

    FaceRenderer.render({
        sourceCanvas: source,
        targetCanvas: target.canvas,
        crop,
        alpha: 0.75,
        privacy: '0',
        edge: -1
    });

    const colorCalls = target.calls.filter(call => call[0] === 'color');
    // gradient(3件) に続く 白い膜(5件)・縁線(4件) の各アルファが0であることを確認する。
    const glassAlphas = colorCalls.slice(3, 8).map(call => call[2]);
    const rimAlphas = colorCalls.slice(8, 12).map(call => call[2]);
    glassAlphas.forEach(rgba => assert.match(rgba, /, 0\)$/));
    rimAlphas.forEach(rgba => assert.match(rgba, /, 0\)$/));

    const rimCall = target.calls.find(call => call[0] === 'stroke');
    assert.equal(rimCall[1].shadowColor, 'rgba(255, 255, 255, 0)');

    // フェード中間stopのアルファは opacity.innerMaskAlpha そのまま(透明度のみで決まる)。
    assert.deepEqual(colorCalls[1], ['color', 0.62, 'rgba(0, 0, 0, 0.8824)']);

    // 白い膜(glassGradient)の内側半径は veilInnerRatio(0.85) 比率まで外周へ退避する。
    const glassGradientCall = target.calls.filter(call => call[0] === 'gradient')[1];
    assert.deepEqual(glassGradientCall, ['gradient', 36, 44, 34, 40, 48, 40]);
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
            ['color', 0.75, 'rgba(0, 0, 0, 0.8824)'],
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
