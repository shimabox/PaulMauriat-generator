'use strict';

const facePlacementApi = typeof FacePlacement !== 'undefined'
    ? FacePlacement
    : require('./face-placement.js');

const ImageExporter = (() => {
    const redrawFace = (faceCanvas, isFrontCamera, documentApi) => {
        const canvas = documentApi.createElement('canvas');
        const context = canvas.getContext('2d');
        const width = faceCanvas.width;
        const height = faceCanvas.height;

        canvas.width = width;
        canvas.height = height;
        if (isFrontCamera) {
            context.scale(-1, 1);
            context.drawImage(faceCanvas, -width, 0, width, height);
        } else {
            context.drawImage(faceCanvas, 0, 0, width, height);
        }

        return canvas;
    };

    const createDataUrl = ({
        backgroundCanvas,
        faceCanvas,
        isFrontCamera = false,
        faceIsRight = true,
        faceIsTop = true,
        documentApi = document
    }) => {
        const canvas = documentApi.createElement('canvas');
        const context = canvas.getContext('2d');
        const width = backgroundCanvas.width;
        const height = backgroundCanvas.height;

        canvas.width = width;
        canvas.height = height;
        context.drawImage(backgroundCanvas, 0, 0, width, height);

        if (!facePlacementApi.hasValidFaceSize(faceCanvas.width, faceCanvas.height)) {
            return canvas.toDataURL('image/png');
        }

        const redrawnFace = redrawFace(faceCanvas, isFrontCamera, documentApi);
        const x = facePlacementApi.calcOutputX(
            width,
            faceCanvas.width,
            faceCanvas.height,
            faceIsRight
        );
        const y = facePlacementApi.calcOutputY(
            height,
            faceCanvas.width,
            faceCanvas.height,
            faceIsTop
        );
        context.drawImage(
            redrawnFace,
            0,
            0,
            faceCanvas.width,
            faceCanvas.height,
            x,
            y,
            faceCanvas.width,
            faceCanvas.height
        );

        return canvas.toDataURL('image/png');
    };

    const download = ({
        dataUrl,
        wrapper,
        filename = 'paulmauriat.png',
        documentApi = document
    }) => {
        const link = documentApi.createElement('a');
        link.setAttribute('download', filename);
        link.setAttribute('href', dataUrl);
        wrapper.appendChild(link);
        link.click();
        wrapper.removeChild(link);
    };

    return { createDataUrl, download };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageExporter;
}
