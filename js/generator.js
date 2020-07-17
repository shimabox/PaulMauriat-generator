document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const containerMaxWidth = 640;
    const container = document.querySelector('.container');
    container.style.maxWidth = containerMaxWidth + 'px';

    const wrapperElem = document.querySelector('#wrapper');

    const buttons = document.querySelector('.buttons');

    const faceStyleElem = document.querySelector('.face-style-wrapper');

    const faceAlphaSlider = document.querySelector('#face-alpha-range');
    const faceAlphaVal = document.querySelector('.face-alpha-val');
    let faceAlpha = 0.85;
    faceAlphaSlider.value  = faceAlpha;
    faceAlphaVal.innerHTML = faceAlpha.toFixed(2);
    faceAlphaSlider.addEventListener('input', (e) => {
        const alpha = parseFloat(e.target.value);
        faceAlpha = alpha;
        faceAlphaVal.innerHTML = alpha.toFixed(2);
    });
    const disabledFaceAlphaSlider = () => faceAlphaSlider.disabled = true;
    const enabledFaceAlphaSlider = () => faceAlphaSlider.disabled = false;

    const faceCanvas = document.createElement('canvas');
    const faceCanvasCtx = faceCanvas.getContext('2d');
    let imgCanvas = null;
    let imgCanvasCtx = null;

    const viewElem = document.querySelector('.view');
    let defaultViewElemWidth = 0;
    let defaultViewElemHeight = 0;
    const setDefaultViewElemSize = elem => {
        defaultViewElemWidth = elem.clientWidth;
        defaultViewElemHeight = elem.clientHeight;
    };
    const getDefaultViewElemWidth = () => defaultViewElemWidth;
    const getDefaultViewElemHeight = () => defaultViewElemHeight;
    viewElem.addEventListener('click', (e) => {
        readFileElem.click();
    });
    viewElem.addEventListener('dragover', (e) => {
        e.preventDefault();
        viewElem.classList.add('dropover');
    });
    viewElem.addEventListener('drop', (e) => {
        e.preventDefault();
        viewElem.classList.remove('dropover');
        readFile(e.dataTransfer.files[0]);
    });
    viewElem.addEventListener('dragleave', (e) => {
        viewElem.classList.remove('dropover');
    });

    // face position.
    let facePosition = {
        "isTop" : true,
        "isRight" : true
    };
    const facePositionIsTop = () => facePosition.isTop;
    const facePositionIsRight = () => facePosition.isRight;
    const setFacePosition = v => {
        switch (v) {
            case '1': // Top, Right
                facePosition.isTop = true;
                facePosition.isRight = true;
                break;
            case '2': // Top, Left
                facePosition.isTop = true;
                facePosition.isRight = false;
                break;
            case '3': // Bottom, Right
                facePosition.isTop = false;
                facePosition.isRight = true;
                break;
            case '4': // Bottom, Left
                facePosition.isTop = false;
                facePosition.isRight = false;
                break;
        }
    }

    const facePositionList = document.querySelector('#face-position-list');
    setFacePosition(facePositionList.value);
    facePositionList.addEventListener('change', (e) => {
        setFacePosition(e.target.value);
        adjustFaceCanvasPosition();
    });

    const facePrivacy = document.querySelector('#face-privacy');
    let facePrivacyVal = facePrivacy.value;
    facePrivacy.addEventListener('change', (e) => {
        facePrivacyVal = e.target.value;
    });
    const disabledFacePrivacy = () => facePrivacy.disabled = true;
    const enabledFacePrivacy = () => facePrivacy.disabled = false;

    const reselect = document.querySelector('#reselect');
    reselect.addEventListener('click', (e) => {
        readFileElem.click();
    });

    const readFileElem = document.querySelector('#read-file');
    readFileElem.addEventListener('change', (e) => {
        readFile(e.target.files[0]);
    });

    const readFile = file => {
        if (file === undefined) { // Reselectボタン押下で画像選択がキャンセルされた場合
            return;
        }
        if (!file.type.match('image.*')) {
            alert('画像を選択してください');
            return;
        }

        const reader = new FileReader();
        reader.addEventListener('load', () => {
            const content     = reader.result;
            const fileType    = file.type;
            const orientation = getOrientation(content);

            const img = new Image();
            img.src = arrayBufferToDataURL(content, fileType);
            img.addEventListener('load', () => {
                window.URL.revokeObjectURL(img.src);
                const canvas = createTransformedCanvas(orientation, img, viewElem);
                addCanvasToViewElem(canvas, viewElem);
                postLoadProcessing();
            });
        });

        reader.readAsArrayBuffer(file);
    }

    // https://qiita.com/zaru/items/0ce7757c721ebd170683
    const getOrientation = buffer => {
        const dv = new DataView(buffer);
        let app1MarkerStart = 2;
        // もし JFIF で APP0 Marker がある場合は APP1 Marker の取得位置をずらす
        if (dv.getUint16(app1MarkerStart) !== 65505) {
            const length = dv.getUint16(4);
            app1MarkerStart += length + 2;
        }

        if (dv.getUint16(app1MarkerStart) !== 65505) {
            return 0;
        }

        // エンディアンを取得
        const littleEndian = dv.getUint8(app1MarkerStart + 10) === 73;
        // フィールドの数を確認
        const count = dv.getUint16(app1MarkerStart + 18, littleEndian);
        for (let i = 0; i < count; i++) {
            const start = app1MarkerStart + 20 + i * 12;
            const tag = dv.getUint16(start, littleEndian);
            // Orientation の Tag は 274
            if (tag === 274) {
                // Orientation は Type が SHORT なので 2byte だけ読む
                return dv.getUint16(start + 8, littleEndian);
            }
        }

        return 0;
    }

    const arrayBufferToDataURL = (arrBuf, type) => {
        const blob = new Blob([arrBuf], { type: type });
        return window.URL.createObjectURL(blob);
    }

    // https://qiita.com/zaru/items/0ce7757c721ebd170683
    const createTransformedCanvas = (orientation, img, viewElem) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const scale = calcScale(img.width, img.height);
        const destW = Math.floor(img.width * scale);
        const destH = Math.floor(img.height * scale);

        if ([5,6,7,8].indexOf(orientation) > -1) {
            canvas.width  = destH;
            canvas.height = destW;
        } else {
            canvas.width  = destW;
            canvas.height = destH;
        }

        switch (orientation) {
            case 2: ctx.transform(-1, 0, 0, 1, destW, 0); break;
            case 3: ctx.transform(-1, 0, 0, -1, destW, destH); break;
            case 4: ctx.transform(1, 0, 0, -1, 0, destH); break;
            case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
            case 6: ctx.transform(0, 1, -1, 0, destH, 0); break;
            case 7: ctx.transform(0, -1, -1, 0, destH, destW); break;
            case 8: ctx.transform(0, -1, 1, 0, 0, destW); break;
        }

        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, destW, destH);

        canvas.setAttribute('id', 'img-canvas');

        return canvas;
    }

    const calcScale = (w, h) => {
        if (w >= h && w >= getDefaultViewElemWidth()) {
            return getDefaultViewElemWidth() / w;
        }

        if (h >= w && h >= getDefaultViewElemHeight()) {
            return getDefaultViewElemHeight() / h;
        }

        return 1;
    }

    const addCanvasToViewElem = (canvas, viewElem) => {
        viewElem.classList.add('after-render');
        viewElem.style.height = canvas.height + 'px';

        viewElem.textContent = null;
        viewElem.appendChild(canvas);
    }

    const postLoadProcessing = () => {
        imgCanvas = document.querySelector('#img-canvas');
        imgCanvasCtx = imgCanvas.getContext('2d');

        faceCanvas.width = 0;
        faceCanvas.height = 0;
        faceCanvas.style.position = 'relative';
        viewElem.appendChild(faceCanvas);

        buttons.classList.remove('hidden');
        faceStyleElem.classList.remove('hidden');

        startRender();
    }

    // Callback function after initialization.
    const callbackOnAfterInit = v2c => {
        viewElem.classList.remove('disp-none');
        viewElem.style.width = wrapperElem.clientWidth + 'px';

        setDefaultViewElemSize(viewElem);

        wrapperElem.insertBefore(viewElem, wrapperElem.firstChild);

        v2c.getCanvas().style.position = 'absolute';
        v2c.changeLongSideSize(specifyVideoSize());
    }

    const specifyVideoSize = () => {
        if (wrapperElem.clientWidth <= 320) {
            return 240;
        }
        if (wrapperElem.clientWidth <= 480) {
            return 320;
        }
        return 480;
    }

    const callbackOnLoadedmetadataVideo = video => {
        startCtracker(video);
    }

    const callbackOnAfterVideoLoadError = err => {
        alert(err);
    }

    const option = {
        'longSideSize': wrapperElem.clientWidth,
        'callbackOnAfterInit': callbackOnAfterInit,
        'callbackOnLoadedmetadataVideo': callbackOnLoadedmetadataVideo,
        'callbackOnAfterVideoLoadError': callbackOnAfterVideoLoadError,
    };

    const ctracker = new clm.tracker();

    const startCtracker = video => {
        ctracker.init();
        ctracker.start(video);
    }

    const stopCtracker = () => {
        ctracker.stop();
    }

    const v2c = new V2C('#wrapper', option);

    const startButton = document.querySelector('#start');
    startButton.addEventListener('click', (e) => {
        startRender();
    });

    const startRender = () => {
        startButton.classList.add('active');
        enabledFaceAlphaSlider();
        enabledFacePrivacy();
        setUseFrontCamera(v2c.useFrontCamera());
        v2c.start((canvas) => drawLoop(canvas, v2c.useFrontCamera()));
    }

    const stopButton = document.querySelector('#stop');
    stopButton.addEventListener('click', (e) => {
        startButton.classList.remove('active');
        disabledFaceAlphaSlider();
        disabledFacePrivacy();
        stopCtracker();
        v2c.stop();
    });

    const captureButton = document.querySelector('#capture');
    captureButton.addEventListener('click', (e) => {
        capture();
    });

    const switchCameraButton = document.querySelector('#switch-camera');
    switchCameraButton.addEventListener('click', (e) => {
        v2c.switchCamera();
        setUseFrontCamera(v2c.useFrontCamera());
        startButton.classList.add('active');
        enabledFaceAlphaSlider();
        enabledFacePrivacy();
    });

    let _useFrontCamera = false;
    const setUseFrontCamera = useFrontCamera => {
        _useFrontCamera = useFrontCamera;

        if (_useFrontCamera === true) {
            faceCanvas.style.transform = 'scaleX(-1)';
        } else {
            faceCanvas.style.transform = 'scaleX(1)';
        }
    }
    const useFrontCamera = () => _useFrontCamera;

    const drawLoop = (canvas, useFrontCamera) => {
        // ctracker.draw(canvas);
        const positions = ctracker.getCurrentPosition();
        if (positions !== false) {
            renderFaceCanvas(positions, canvas);
        } else {
            clearFaceCanvas();
        }
    }

    const clearFaceCanvas = () => {
        faceCanvas.width  = 0;
        faceCanvas.height = 0;
        faceCanvasCtx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
    }

    /**
     * render faceCanvas
     */
    const renderFaceCanvas = (p, canvas) => {
        // 顔部分のマージン設定
        let scale = 1 / 10;
        let marginOfTopScale    = 9 * scale;  // 顔部分の何%分上にマージンを取るか(marginOfBottomScaleとの調整が必要)
        let marginOfBottomScale = 12 * scale; // 顔部分の何%分下にマージンを取るか(marginOfTopScaleとの調整が必要)
        let marginOfLeftScale   = 4 * scale;  // 顔部分の何%分左にマージンを取るか(marginOfRightScaleとの調整が必要)
        let marginOfRightScale  = 8 * scale;  // 顔部分の何%分右にマージンを取るか(marginOfLeftScaleとの調整が必要)

        // 顔領域の矩形座標を求める
        const indexOfMinX = [0, 1, 2, 3, 4, 5, 6, 7, 19, 20];
        const indexOfMinY = [0, 1, 2, 12, 13, 14, 15, 16, 19, 20];
        const indexOfMaxX = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
        const indexOfMaxY = [3, 4, 5, 6, 7, 8, 9, 10, 11];
        const coordinatesOfFace = calcRangeOfCoordinates(p, indexOfMinX, indexOfMinY, indexOfMaxX, indexOfMaxY);

        const faceW = coordinatesOfFace.maxX - coordinatesOfFace.minX;
        const faceH = coordinatesOfFace.maxY - coordinatesOfFace.minY;
        const faceMargin = faceH * scale;

        // 顔検出部分の面積調整(少し広めにしたりとか)
        // transform: scaleX(-1); している場合sxとswの関係性が逆転します
        let sx = coordinatesOfFace.minX - (faceW * marginOfLeftScale);
        let sy = coordinatesOfFace.minY - (faceH * marginOfTopScale);
        let sw = faceW + (faceW * marginOfRightScale);
        let sh = faceH + (faceH * marginOfBottomScale);

        const vcw = canvas.width;
        const vch = canvas.height;

        // 画面上に顔切り取り部分が見切れた場合
        if (sy < 0) {
            sy += Math.abs(sy);
        }

        // 画面下に顔切り取り部分が見切れた場合
        const assignedMarginBottom = Math.round((marginOfBottomScale - marginOfTopScale) * 10);
        const marginOfBottom       = faceMargin * assignedMarginBottom;
        if (coordinatesOfFace.maxY + marginOfBottom > vch) {
            sy -= (coordinatesOfFace.maxY + marginOfBottom) - vch;
        }

        // 画面左に顔切り取り部分が見切れた場合
        const assignedMarginLeft = Math.round((marginOfRightScale - marginOfLeftScale) * 10);
        const marginOfLeft       = faceMargin * assignedMarginLeft;
        if (coordinatesOfFace.maxX + marginOfLeft > vcw) {
            sx -= (coordinatesOfFace.maxX + marginOfLeft) - vcw;
        }

        // 画面右に顔切り取り部分が見切れた場合
        if (sx < 0) {
            sx += Math.abs(sx);
        }

        // 顔が見切れた場合
        if (
            coordinatesOfFace.maxX > vcw
            || coordinatesOfFace.maxY > vch
            || coordinatesOfFace.minX < 0
            || coordinatesOfFace.minY < 0
        ) {
            // clearFaceCanvas();
            return;
        }

        const targetSize = imgCanvas.width <= imgCanvas.height ? imgCanvas.width : imgCanvas.height;

        let clippedSizeFactor = 1.0;
        if (targetSize / 3 < sw) {
            clippedSizeFactor = (targetSize / 3) / sw;
        }

        const w = Math.round(sw * clippedSizeFactor);
        const h = Math.round(sh * clippedSizeFactor);

        faceCanvasCtx.clearRect(0, 0, w, h);

        faceCanvas.width  = w;
        faceCanvas.height = h;

        // 目領域の矩形座標を求める
        const indexOfMinEyeX = [19, 20, 23];
        const indexOfMinEyeY = [24, 29, 63, 64, 67, 68];
        const indexOfMaxEyeX = [15, 16, 28];
        const indexOfMaxEyeY = [23, 25, 26, 28, 30, 31, 65, 66, 69, 70];
        const coordinatesOfEyes = calcRangeOfCoordinates(p, indexOfMinEyeX, indexOfMinEyeY, indexOfMaxEyeX, indexOfMaxEyeY);

        const eyeW = coordinatesOfEyes.maxX - coordinatesOfEyes.minX;
        const eyeH = coordinatesOfEyes.maxY - coordinatesOfEyes.minY;

        // for privacy.
        privacy(facePrivacyVal, canvas, coordinatesOfEyes, eyeW, eyeH);

        faceCanvasCtx.globalAlpha = faceAlpha;
        faceCanvasCtx.arc(w/2, h/2, w/2, 0, Math.PI * 2, true);
        faceCanvasCtx.clip();

        faceCanvasCtx.drawImage(
            canvas,
            Math.round(sx),
            Math.round(sy),
            Math.round(sw),
            Math.round(sh),
            0,
            0,
            w,
            h
        );

        var grad = faceCanvasCtx.createRadialGradient(w/2, h/2, w/2.5, w/2, h/2, w/2);
        grad.addColorStop(0,   'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.8, 'rgba(255, 255, 255, 0.7)');
        grad.addColorStop(1,   'rgba(255, 255, 255, 0.9)');
        faceCanvasCtx.fillStyle = grad;
        faceCanvasCtx.fill();

        adjustFaceCanvasPosition();
    }

    /**
     * 矩形座標を求める
     * @link http://blog.phalusamil.com/entry/2016/07/09/150751
     */
    const calcRangeOfCoordinates = (p, indexOfMinX, indexOfMinY, indexOfMaxX, indexOfMaxY) => {
        let min = {'x': 100000, 'y': 100000};
        let max = {'x': 0, 'y': 0};

        for (let i = 0; i < indexOfMinX.length; i++) {
            let k = indexOfMinX[i];
            min.x = min.x > p[k][0] ? p[k][0] : min.x;
        }
        for (let i = 0; i < indexOfMinY.length; i++) {
            let k = indexOfMinY[i];
            min.y = min.y > p[k][1] ? p[k][1] : min.y;
        }
        for (let i = 0; i < indexOfMaxX.length; i++) {
            let k = indexOfMaxX[i];
            max.x = max.x < p[k][0] ? p[k][0] : max.x;
        }
        for (let i = 0; i < indexOfMaxY.length; i++) {
            let k = indexOfMaxY[i];
            max.y = max.y < p[k][1] ? p[k][1] : max.y;
        }

        return {
            'minX': Math.round(min.x),
            'minY': Math.round(min.y),
            'maxX': Math.round(max.x),
            'maxY': Math.round(max.y)
        };
    }

    const privacy = (facePrivacyVal, canvas, coordinates, w, h) => {
        switch (facePrivacyVal) {
            case "1":
                eyeLine(canvas, coordinates.minX - 10, coordinates.minY - 5, w + 20, h + 10);
                break;
            case "2":
                mosaic(canvas, coordinates.minX - 10, coordinates.minY - 5, w + 20, h + 10);
                break;
            default:
                break;
        }
    }

    const eyeLine = (canvas, sx, sy, cw, ch) => {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(sx, sy, cw, ch);
        const data = imageData.data;

        for(let i = 0; i < data.length; i += 4) {
            data[i]     = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
        }

        ctx.putImageData(imageData, sx, sy);
    }

    const mosaic = (canvas, sx, sy, cw, ch) => {
        const size = 16;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(sx, sy, cw, ch);
        const data = imageData.data;

        for (let x = 0; x < cw; x += size) {
            for (let y = 0; y < ch; y += size) {
                let index = (x + y * cw) * 4;
                let r = data[index + 0];
                let g = data[index + 1];
                let b = data[index + 2];

                for (let x2 = 0; x2 < size; x2++) {
                    for (let y2 = 0; y2 < size; y2++) {
                        let i = (cw * (y + y2) * 4) + ((x + x2) * 4)
                        data[i + 0] = r;
                        data[i + 1] = g;
                        data[i + 2] = b;
                    }
                }
            }
        }

        ctx.putImageData(imageData, sx, sy);
    }

    const adjustFaceCanvasPosition = () => {
        faceCanvas.style.top  = calcPositionTop(imgCanvas, faceCanvas, facePositionIsTop()) + 'px';
        faceCanvas.style.left = calcPositionLeft(imgCanvas, faceCanvas, facePositionIsRight()) + 'px';
    }

    const calcPositionTop = (img, face, isTopSide) => {
        const imgH  = imgCanvas.height;
        const faceW = faceCanvas.width;
        const faceH = faceCanvas.height;

        const fitSize   = faceH * Math.floor((imgH / 2) / faceH);
        const remainder = (imgH / 2) % faceH;
        const totalGap  = fitSize + remainder;
        const top       = Math.floor(totalGap - faceH + (faceH / 2) + (faceH - faceW) / 4);

        return isTopSide === true ? -top : top;
    }

    const calcPositionLeft = (img, face, isRightSide) => {
        const imgW  = imgCanvas.width;
        const faceW = faceCanvas.width;
        const faceH = faceCanvas.height;

        const fitSize   = faceW * Math.floor((imgW / 2) / faceW);
        const remainder = (imgW / 2) % faceW;
        const totalGap  = fitSize + remainder;
        const left      = Math.floor(totalGap - faceW + (faceW / 2) - (faceH - faceW) / 4);

        return isRightSide === true ? left : -left;
    }

    const capture = () => {
        const link    = document.createElement('a');
        const dataUrl = getDataUrl(imgCanvas, faceCanvas);

        wrapperElem.appendChild(link);

        link.setAttribute('download', 'paulmauriat.png');
        link.setAttribute('target', '_blank');
        link.addEventListener('click', (e) => e.target.href = dataUrl);
        link.click();

        wrapperElem.removeChild(link);
    }

    const getDataUrl = (imgCanvas, faceCanvas) => {
        const w  = imgCanvas.width;
        const h  = imgCanvas.height;
        const fw = faceCanvas.width;
        const fh = faceCanvas.height;

        const c   = document.createElement('canvas');
        const ctx = c.getContext('2d');

        c.width = w;
        c.height = h;

        // 画像を描画
        ctx.drawImage(imgCanvas, 0, 0, w, h);

        // 顔を描画(再度別のcanvasに描画しないとscaleが反映されなかった)
        const fc = redrawFaceCanvas(faceCanvas, fw, fh);
        const dx = calcPositionDX(imgCanvas, faceCanvas, facePositionIsRight());
        const dy = calcPositionDY(imgCanvas, faceCanvas, facePositionIsTop());
        ctx.drawImage(fc, 0, 0, fw, fh, dx, dy, fw, fh);

        return c.toDataURL();
    }

    const redrawFaceCanvas = (faceCanvas, w, h) => {
        const c   = document.createElement('canvas');
        const ctx = c.getContext('2d');

        if (w === 0 || h === 0) {
            return c;
        }

        c.width = w;
        c.height = h;
        if (useFrontCamera() === true) {
            ctx.scale(-1, 1);
            ctx.drawImage(faceCanvas, -w, 0, w, h);
        } else {
            ctx.drawImage(faceCanvas, 0, 0, w, h);
        }

        return c;
    }

    const calcPositionDX = (img, face, isRightSide) => {
        const imgW  = imgCanvas.width;
        const faceW = faceCanvas.width;
        const faceH = faceCanvas.height;

        if (isRightSide === false) return Math.floor((faceH - faceW) / 4);

        const fitSize   = faceW * Math.floor(imgW / faceW);
        const remainder = imgW % faceW;
        const totalGap  = fitSize + remainder;

        return Math.floor(totalGap - faceW - ((faceH - faceW) / 4));
    }

    const calcPositionDY = (img, face, isTopSide) => {
        const imgH  = imgCanvas.height;
        const faceW = faceCanvas.width;
        const faceH = faceCanvas.height;

        if (isTopSide === true) return Math.floor( - ((faceH - faceW) / 4));

        const fitSize   = faceH * Math.floor(imgH / faceH);
        const remainder = imgH % faceH;
        const totalGap  = fitSize + remainder;

        return Math.floor(totalGap - faceH + ((faceH - faceW) / 4));
    }
});
