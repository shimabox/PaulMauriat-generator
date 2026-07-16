'use strict';

const FaceGeometry = (() => {
    const MIN_SCALE = 0.5;
    const MAX_SCALE = 2;
    const FACE_INDEXES = {
        minX: [0, 1, 2, 3, 4, 5, 6, 7, 19, 20],
        minY: [0, 1, 2, 12, 13, 14, 15, 16, 19, 20],
        maxX: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
        maxY: [3, 4, 5, 6, 7, 8, 9, 10, 11]
    };
    const EYE_INDEXES = {
        minX: [19, 20, 23],
        minY: [24, 29, 63, 64, 67, 68],
        maxX: [15, 16, 28],
        maxY: [23, 25, 26, 28, 30, 31, 65, 66, 69, 70]
    };

    const getValues = (positions, indexes, axis) => {
        return indexes
            .map(index => positions[index] && positions[index][axis])
            .filter(Number.isFinite);
    };

    /**
     * 指定した特徴点番号から矩形範囲を計算する。
     */
    const calcRange = (positions, indexes) => {
        const minXValues = getValues(positions, indexes.minX, 0);
        const minYValues = getValues(positions, indexes.minY, 1);
        const maxXValues = getValues(positions, indexes.maxX, 0);
        const maxYValues = getValues(positions, indexes.maxY, 1);

        if (
            minXValues.length === 0
            || minYValues.length === 0
            || maxXValues.length === 0
            || maxYValues.length === 0
        ) {
            return null;
        }

        return {
            minX: Math.round(Math.min(...minXValues)),
            minY: Math.round(Math.min(...minYValues)),
            maxX: Math.round(Math.max(...maxXValues)),
            maxY: Math.round(Math.max(...maxYValues))
        };
    };

    const calculateEyeArea = positions => {
        const range = calcRange(positions, EYE_INDEXES);
        if (!range) {
            return null;
        }

        return {
            x: range.minX - 10,
            y: range.minY - 5,
            width: range.maxX - range.minX + 20,
            height: range.maxY - range.minY + 10
        };
    };

    const clampScale = scale => {
        if (!Number.isFinite(scale)) {
            return 1;
        }

        return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    };

    /**
     * 顔特徴点から映像の切り出し領域と顔Canvasの大きさを計算する。
     */
    const calculateFaceCrop = (
        positions,
        sourceWidth,
        sourceHeight,
        targetWidth,
        targetHeight,
        outputScale = 1
    ) => {
        const range = calcRange(positions, FACE_INDEXES);
        if (!range) {
            return null;
        }

        if (
            range.maxX > sourceWidth
            || range.maxY > sourceHeight
            || range.minX < 0
            || range.minY < 0
        ) {
            return null;
        }

        const faceWidth = range.maxX - range.minX;
        const faceHeight = range.maxY - range.minY;
        if (faceWidth <= 0 || faceHeight <= 0) {
            return null;
        }

        const scale = 1 / 10;
        const marginTopScale = 9 * scale;
        const marginBottomScale = 12 * scale;
        const marginLeftScale = 4 * scale;
        const marginRightScale = 8 * scale;
        const faceMargin = faceHeight * scale;

        let sourceX = range.minX - (faceWidth * marginLeftScale);
        let sourceY = range.minY - (faceHeight * marginTopScale);
        const cropWidth = faceWidth + (faceWidth * marginRightScale);
        const cropHeight = faceHeight + (faceHeight * marginBottomScale);

        sourceY = Math.max(0, sourceY);
        const assignedBottom = Math.round((marginBottomScale - marginTopScale) * 10);
        const marginBottom = faceMargin * assignedBottom;
        if (range.maxY + marginBottom > sourceHeight) {
            sourceY -= (range.maxY + marginBottom) - sourceHeight;
        }

        const assignedLeft = Math.round((marginRightScale - marginLeftScale) * 10);
        const marginLeft = faceMargin * assignedLeft;
        if (range.maxX + marginLeft > sourceWidth) {
            sourceX -= (range.maxX + marginLeft) - sourceWidth;
        }
        sourceX = Math.max(0, sourceX);

        const targetSize = Math.min(targetWidth, targetHeight);
        const sizeFactor = ((targetSize / 3) / cropWidth) * clampScale(outputScale);

        return {
            source: {
                x: Math.round(sourceX),
                y: Math.round(sourceY),
                width: Math.round(cropWidth),
                height: Math.round(cropHeight)
            },
            output: {
                width: Math.round(cropWidth * sizeFactor),
                height: Math.round(cropHeight * sizeFactor)
            },
            eyes: calculateEyeArea(positions)
        };
    };

    return { clampScale, calcRange, calculateEyeArea, calculateFaceCrop };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FaceGeometry;
}
