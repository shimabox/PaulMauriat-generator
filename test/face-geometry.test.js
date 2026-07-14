'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const FaceGeometry = require('../js/face-geometry.js');

const createPositions = () => Array.from({ length: 71 }, () => [100, 100]);

test('指定した特徴点から座標範囲を求める', () => {
    const positions = [[10.2, 20.8], [30.7, 40.1], [15.4, 35.6]];

    assert.deepEqual(FaceGeometry.calcRange(positions, {
        minX: [0, 2], minY: [0, 1], maxX: [1, 2], maxY: [1, 2]
    }), { minX: 10, minY: 21, maxX: 31, maxY: 40 });
});

test('映像内の顔特徴点から切り出し領域と出力サイズを求める', () => {
    const positions = createPositions();
    positions[0] = [80, 70];
    positions[7] = [140, 130];
    positions[8] = [150, 140];
    positions[11] = [145, 145];
    positions[16] = [130, 120];
    positions[19] = [90, 80];
    positions[20] = [95, 85];

    const result = FaceGeometry.calculateFaceCrop(
        positions,
        320,
        240,
        300,
        200
    );

    assert.ok(result);
    assert.ok(result.source.width > 0);
    assert.ok(result.source.height > 0);
    assert.ok(result.output.width <= 100);
    assert.ok(result.output.height > 0);
});

test('特徴点が映像外にある顔は描画対象にしない', () => {
    const positions = createPositions();
    positions[0] = [-1, 100];

    assert.equal(
        FaceGeometry.calculateFaceCrop(positions, 320, 240, 300, 200),
        null
    );
});

test('目の特徴点からプライバシー加工領域を求める', () => {
    const positions = createPositions();
    positions[19] = [80, 100];
    positions[20] = [90, 90];
    positions[23] = [100, 80];
    positions[15] = [130, 100];
    positions[16] = [140, 100];
    positions[28] = [150, 100];
    positions[24] = [100, 85];
    positions[30] = [100, 120];

    assert.deepEqual(FaceGeometry.calculateEyeArea(positions), {
        x: 70,
        y: 80,
        width: 90,
        height: 45
    });
});
