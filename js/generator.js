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
    faceAlphaVal.textContent = faceAlpha.toFixed(2);
    faceAlphaSlider.addEventListener('input', (e) => {
        const alpha = parseFloat(e.target.value);
        faceAlpha = alpha;
        faceAlphaVal.textContent = alpha.toFixed(2);
    });
    const disabledFaceAlphaSlider = () => faceAlphaSlider.disabled = true;
    const enabledFaceAlphaSlider = () => faceAlphaSlider.disabled = false;

    const faceCanvas = document.createElement('canvas');
    let imgCanvas = null;
    let previewScale = 1;

    const viewElem = document.querySelector('.view');
    const statusMessageElem = document.querySelector('#status-message');
    const showStatusMessage = (message, isError = false) => {
        statusMessageElem.textContent = message || '';
        statusMessageElem.classList.toggle('error', isError);
    };
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
    viewElem.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            readFileElem.click();
        }
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
        // 同じファイルを続けて選択してもchangeイベントが発生するようにする。
        e.target.value = '';
    });

    const readFile = file => {
        const validation = ImageLoader.validateFile(file);

        if (!validation.valid) {
            if (validation.error) {
                showStatusMessage(validation.error, true);
            }
            return;
        }

        showStatusMessage('画像を読み込んでいます');

        ImageLoader.loadImageFile(file)
            .then(result => {
                if (!result) {
                    return;
                }

                const canvas = createTransformedCanvas(
                    result.orientation,
                    result.image,
                    viewElem
                );
                addCanvasToViewElem(canvas, viewElem);
                showStatusMessage('');
                postLoadProcessing();
            })
            .catch(error => {
                const message = error && error.message
                    ? error.message
                    : '画像を読み込めませんでした';
                showStatusMessage(message, true);
            });
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

    /**
     * 保存用Canvasの解像度を維持したまま、プレビューだけを表示領域へ収める。
     */
    const updatePreviewLayout = () => {
        const availableWidth = Math.min(containerMaxWidth, container.clientWidth);

        if (!imgCanvas) {
            viewElem.style.width = availableWidth + 'px';
            return;
        }

        const availableHeight = Math.floor(window.innerHeight * 0.75);
        const layout = PreviewLayout.calcContainedLayout(
            imgCanvas.width,
            imgCanvas.height,
            availableWidth,
            availableHeight
        );

        previewScale = layout.scale;
        viewElem.style.width = layout.width + 'px';
        viewElem.style.height = layout.height + 'px';
        imgCanvas.style.width = layout.width + 'px';
        imgCanvas.style.height = layout.height + 'px';

        updateFaceCanvasPresentation();
        adjustFaceCanvasPosition();
    };

    const postLoadProcessing = () => {
        imgCanvas = document.querySelector('#img-canvas');

        faceCanvas.width = 0;
        faceCanvas.height = 0;
        faceCanvas.style.position = 'relative';
        viewElem.appendChild(faceCanvas);

        buttons.classList.remove('hidden');
        faceStyleElem.classList.remove('hidden');

        updatePreviewLayout();
        startRender();
    }

    // Callback function after initialization.
    const callbackOnAfterInit = v2c => {
        viewElem.classList.remove('disp-none');
        updatePreviewLayout();

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
        showStatusMessage('');
        startFaceTracker(video);
    }

    const callbackOnAfterVideoLoadError = err => {
        startButton.classList.remove('active');
        disabledFaceAlphaSlider();
        disabledFacePrivacy();
        showStatusMessage(CameraError.toMessage(err), true);
    }

    const option = {
        'longSideSize': wrapperElem.clientWidth,
        'callbackOnAfterInit': callbackOnAfterInit,
        'callbackOnOrientationChange': updatePreviewLayout,
        'callbackOnLoadedmetadataVideo': callbackOnLoadedmetadataVideo,
        'callbackOnAfterVideoLoadError': callbackOnAfterVideoLoadError,
    };

    const faceTracker = FaceTracker.create();

    const startFaceTracker = video => {
        faceTracker.start(video);
    }

    const stopFaceTracker = () => {
        faceTracker.stop();
    }

    const v2c = new V2C('#wrapper', option);

    const startButton = document.querySelector('#start');
    startButton.addEventListener('click', (e) => {
        startRender();
    });

    const startRender = () => {
        // 画像だけを再選択した場合は、動作中のカメラをそのまま利用する。
        if (v2c.isCameraReady()) {
            showStatusMessage('');
            return;
        }

        showStatusMessage('カメラを起動しています');
        startButton.classList.add('active');
        enabledFaceAlphaSlider();
        enabledFacePrivacy();
        setUseFrontCamera(v2c.useFrontCamera());
        v2c.start(drawLoop);
    }

    const stopButton = document.querySelector('#stop');
    const stopRender = () => {
        startButton.classList.remove('active');
        disabledFaceAlphaSlider();
        disabledFacePrivacy();
        stopFaceTracker();
        v2c.stop();
    };
    stopButton.addEventListener('click', stopRender);

    // ページを離れるときはカメラを確実に解放する。
    window.addEventListener('pagehide', stopRender);
    window.addEventListener('resize', updatePreviewLayout);

    const captureButton = document.querySelector('#capture');
    captureButton.addEventListener('click', (e) => {
        capture();
    });

    const switchCameraButton = document.querySelector('#switch-camera');
    switchCameraButton.addEventListener('click', (e) => {
        showStatusMessage('カメラを切り替えています');
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

    const drawLoop = canvas => {
        const positions = faceTracker.getPositions();
        if (positions !== false) {
            renderFaceCanvas(positions, canvas);
        } else {
            clearFaceCanvas();
        }
    }

    const clearFaceCanvas = () => {
        FaceRenderer.clear(faceCanvas);
    }

    const renderFaceCanvas = (p, canvas) => {
        const crop = FaceGeometry.calculateFaceCrop(
            p,
            canvas.width,
            canvas.height,
            imgCanvas.width,
            imgCanvas.height
        );

        if (FaceRenderer.render({
            sourceCanvas: canvas,
            targetCanvas: faceCanvas,
            crop,
            alpha: faceAlpha,
            privacy: facePrivacyVal
        })) {
            updateFaceCanvasPresentation();
            adjustFaceCanvasPosition();
        }
    }

    const updateFaceCanvasPresentation = () => {
        if (!FacePlacement.hasValidFaceSize(faceCanvas.width, faceCanvas.height)) {
            return;
        }

        faceCanvas.style.width = PreviewLayout.scaleLength(
            faceCanvas.width,
            previewScale
        ) + 'px';
        faceCanvas.style.height = PreviewLayout.scaleLength(
            faceCanvas.height,
            previewScale
        ) + 'px';
    };

    const adjustFaceCanvasPosition = () => {
        if (
            !imgCanvas
            || !FacePlacement.hasValidFaceSize(faceCanvas.width, faceCanvas.height)
        ) {
            return;
        }

        const top = FacePlacement.calcPreviewTop(
            imgCanvas.height,
            faceCanvas.width,
            faceCanvas.height,
            facePositionIsTop()
        );
        const left = FacePlacement.calcPreviewLeft(
            imgCanvas.width,
            faceCanvas.width,
            faceCanvas.height,
            facePositionIsRight()
        );

        faceCanvas.style.top = PreviewLayout.scaleLength(top, previewScale) + 'px';
        faceCanvas.style.left = PreviewLayout.scaleLength(left, previewScale) + 'px';
    }

    const capture = () => {
        const dataUrl = ImageExporter.createDataUrl({
            backgroundCanvas: imgCanvas,
            faceCanvas,
            isFrontCamera: useFrontCamera(),
            faceIsRight: facePositionIsRight(),
            faceIsTop: facePositionIsTop()
        });
        ImageExporter.download({ dataUrl, wrapper: wrapperElem });
    }

});
