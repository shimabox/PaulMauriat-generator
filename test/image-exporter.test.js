'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const ImageExporter = require('../js/image-exporter.js');

const createDocumentMock = () => {
    const canvases = [];
    const links = [];
    const documentApi = {
        createElement(type) {
            if (type === 'canvas') {
                const calls = [];
                const canvas = {
                    width: 0,
                    height: 0,
                    calls,
                    getContext: () => ({
                        drawImage: (...args) => calls.push(['drawImage', ...args]),
                        scale: (...args) => calls.push(['scale', ...args])
                    }),
                    toDataURL: () => 'data:image/png;base64,test'
                };
                canvases.push(canvas);
                return canvas;
            }

            const link = {
                attributes: {},
                setAttribute(name, value) { this.attributes[name] = value; },
                click() { this.clicked = true; }
            };
            links.push(link);
            return link;
        }
    };

    return { documentApi, canvases, links };
};

test('顔未検出時は背景だけをPNGへ合成する', () => {
    const { documentApi, canvases } = createDocumentMock();
    const backgroundCanvas = { width: 320, height: 240 };
    const faceCanvas = { width: 0, height: 0 };

    const dataUrl = ImageExporter.createDataUrl({
        backgroundCanvas,
        faceCanvas,
        documentApi
    });

    assert.equal(dataUrl, 'data:image/png;base64,test');
    assert.equal(canvases[0].calls.filter(call => call[0] === 'drawImage').length, 1);
});

test('顔がある場合はカメラ向きと配置を反映してPNGへ合成する', () => {
    const { documentApi, canvases } = createDocumentMock();
    const backgroundCanvas = { width: 320, height: 240 };
    const faceCanvas = { width: 60, height: 80 };

    ImageExporter.createDataUrl({
        backgroundCanvas,
        faceCanvas,
        isFrontCamera: true,
        faceIsRight: false,
        faceIsTop: false,
        documentApi
    });

    assert.deepEqual(canvases[1].calls[0], ['scale', -1, 1]);
    assert.equal(canvases[0].calls.filter(call => call[0] === 'drawImage').length, 2);
});

test('自由配置の座標を保存画像へ反映する', () => {
    const { documentApi, canvases } = createDocumentMock();
    const backgroundCanvas = { width: 320, height: 240 };
    const faceCanvas = { width: 60, height: 80 };

    ImageExporter.createDataUrl({
        backgroundCanvas,
        faceCanvas,
        facePosition: { x: 123, y: 45 },
        documentApi
    });

    const faceDraw = canvases[0].calls.filter(call => call[0] === 'drawImage')[1];
    assert.deepEqual(faceDraw.slice(-4), [123, 45, 60, 80]);
});

test('生成したPNGを指定名でダウンロードする', () => {
    const { documentApi, links } = createDocumentMock();
    const wrapper = {
        appendChild(node) { this.child = node; },
        removeChild(node) { this.removed = node; }
    };

    ImageExporter.download({
        dataUrl: 'data:image/png;base64,test',
        wrapper,
        documentApi,
        filename: 'result.png'
    });

    assert.equal(links[0].attributes.download, 'result.png');
    assert.equal(links[0].attributes.href, 'data:image/png;base64,test');
    assert.equal(links[0].clicked, true);
    assert.equal(wrapper.removed, links[0]);
});
