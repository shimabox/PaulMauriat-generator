'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { applyEyeLine, applyMosaic } = require('../js/privacy-filter.js');

/**
 * 画素ごとに異なるRGB値とアルファ値を持つImageData相当の値を作る。
 */
const createImageData = (width, height) => {
    const data = new Uint8ClampedArray(width * height * 4);

    for (let i = 0; i < width * height; i++) {
        const offset = i * 4;
        data[offset] = i + 1;
        data[offset + 1] = i + 21;
        data[offset + 2] = i + 41;
        data[offset + 3] = 100 + i;
    }

    return { data, width, height };
};

test('目線加工はRGBだけを黒にしてアルファ値を維持する', () => {
    const imageData = createImageData(2, 2);
    const originalAlpha = [100, 101, 102, 103];

    applyEyeLine(imageData);

    for (let i = 0; i < 4; i++) {
        const offset = i * 4;
        assert.deepEqual(Array.from(imageData.data.slice(offset, offset + 3)), [0, 0, 0]);
        assert.equal(imageData.data[offset + 3], originalAlpha[i]);
    }
});

test('割り切れる大きさでは各ブロック左上の色でモザイク化する', () => {
    const imageData = createImageData(4, 4);
    const expectedSourceIndexes = [
        0, 0, 2, 2,
        0, 0, 2, 2,
        8, 8, 10, 10,
        8, 8, 10, 10
    ];

    applyMosaic(imageData, 2);

    expectedSourceIndexes.forEach((sourceIndex, pixelIndex) => {
        const offset = pixelIndex * 4;
        assert.equal(imageData.data[offset], sourceIndex + 1);
        assert.equal(imageData.data[offset + 1], sourceIndex + 21);
        assert.equal(imageData.data[offset + 2], sourceIndex + 41);
        assert.equal(imageData.data[offset + 3], 100 + pixelIndex);
    });
});

test.todo('幅がブロックサイズで割り切れなくても次の行へ色が回り込まない');
test.todo('高さがブロックサイズで割り切れなくても範囲外を書き込まない');
