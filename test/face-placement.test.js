'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    hasValidFaceSize,
    calcPreviewTop,
    calcPreviewLeft,
    calcOutputX,
    calcOutputY
} = require('../js/face-placement.js');

const imageWidth = 600;
const imageHeight = 400;
const faceWidth = 100;
const faceHeight = 120;

test('プレビュー上の顔を上下へ配置できる', () => {
    assert.equal(calcPreviewTop(imageHeight, faceWidth, faceHeight, true), -145);
    assert.equal(calcPreviewTop(imageHeight, faceWidth, faceHeight, false), 145);
});

test('プレビュー上の顔を左右へ配置できる', () => {
    assert.equal(calcPreviewLeft(imageWidth, faceWidth, faceHeight, true), 245);
    assert.equal(calcPreviewLeft(imageWidth, faceWidth, faceHeight, false), -245);
});

test('保存画像上の顔を左右へ配置できる', () => {
    assert.equal(calcOutputX(imageWidth, faceWidth, faceHeight, true), 495);
    assert.equal(calcOutputX(imageWidth, faceWidth, faceHeight, false), 5);
});

test('保存画像上の顔を上下へ配置できる', () => {
    assert.equal(calcOutputY(imageHeight, faceWidth, faceHeight, true), -5);
    assert.equal(calcOutputY(imageHeight, faceWidth, faceHeight, false), 285);
});

test('顔の幅または高さが不正な場合は配置対象にしない', () => {
    assert.equal(hasValidFaceSize(faceWidth, faceHeight), true);
    assert.equal(hasValidFaceSize(0, faceHeight), false);
    assert.equal(hasValidFaceSize(faceWidth, 0), false);
    assert.equal(hasValidFaceSize(-1, faceHeight), false);
    assert.equal(hasValidFaceSize(Number.NaN, faceHeight), false);
});

test('顔の幅または高さが0の場合は配置計算で0を返す', () => {
    assert.equal(calcPreviewTop(imageHeight, 0, 0, true), 0);
    assert.equal(calcPreviewLeft(imageWidth, 0, 0, true), 0);
    assert.equal(calcOutputX(imageWidth, 0, 0, true), 0);
    assert.equal(calcOutputY(imageHeight, 0, 0, false), 0);
});
