document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    const containerMaxWidth = 640;
    const container = document.querySelector('.container');
    container.style.maxWidth = containerMaxWidth + 'px';

    const wrapperElem = document.querySelector('#wrapper');

    const buttons = document.querySelector('.buttons');
    const captureButton = document.querySelector('#capture');
    const shareButton = document.querySelector('#share');
    // 保存と共有は追跡停止中かつ顔を描画できている場合だけ許可する。
    const setExportEnabled = enabled => {
        captureButton.disabled = !enabled;
        shareButton.disabled = !enabled;
    };

    const faceStyleElem = document.querySelector('.face-style-wrapper');

    const faceSizeSlider = document.querySelector('#face-size-range');
    const faceSizeVal = document.querySelector('.face-size-val');
    let faceScale = 1;
    const setFaceScale = value => {
        faceScale = FaceGeometry.clampScale(Number.parseFloat(value));
        faceSizeSlider.value = faceScale;
        faceSizeVal.textContent = `${faceScale.toFixed(2)}×`;
    };
    setFaceScale(faceSizeSlider.value);
    faceSizeSlider.addEventListener('input', event => {
        setFaceScale(event.target.value);
        redrawDetectedFace();
    });
    const disabledFaceSizeSlider = () => faceSizeSlider.disabled = true;
    const enabledFaceSizeSlider = () => faceSizeSlider.disabled = false;

    const faceAlphaSlider = document.querySelector('#face-alpha-range');
    const faceAlphaVal = document.querySelector('.face-alpha-val');
    let faceAlpha = 0.85;
    faceAlphaSlider.value  = faceAlpha;
    faceAlphaVal.textContent = faceAlpha.toFixed(2);
    faceAlphaSlider.addEventListener('input', (e) => {
        const alpha = parseFloat(e.target.value);
        faceAlpha = alpha;
        faceAlphaVal.textContent = alpha.toFixed(2);
        redrawDetectedFace();
    });
    const disabledFaceAlphaSlider = () => faceAlphaSlider.disabled = true;
    const enabledFaceAlphaSlider = () => faceAlphaSlider.disabled = false;

    const faceEdgeSlider = document.querySelector('#face-edge-range');
    const faceEdgeVal = document.querySelector('.face-edge-val');
    let faceEdge = 0;
    const formatFaceEdge = value => (value > 0 ? '+' : '') + value.toFixed(1);
    faceEdgeSlider.value = faceEdge;
    faceEdgeVal.textContent = formatFaceEdge(faceEdge);
    faceEdgeSlider.addEventListener('input', (e) => {
        const edge = parseFloat(e.target.value);
        faceEdge = edge;
        faceEdgeVal.textContent = formatFaceEdge(edge);
        redrawDetectedFace();
    });
    const disabledFaceEdgeSlider = () => faceEdgeSlider.disabled = true;
    const enabledFaceEdgeSlider = () => faceEdgeSlider.disabled = false;

    const faceCanvas = document.createElement('canvas');
    faceCanvas.setAttribute('id', 'face-canvas');
    faceCanvas.setAttribute('aria-label', '顔画像。ドラッグまたは矢印キーで移動できます');
    faceCanvas.setAttribute('aria-describedby', 'face-position-hint');
    faceCanvas.tabIndex = -1;
    let imgCanvas = null;
    let previewScale = 1;
    let trackingActive = false;
    const detectedFrameCanvas = document.createElement('canvas');
    const redrawSourceCanvas = document.createElement('canvas');
    let detectedPositions = null;
    const hasDetectedFrame = () => Boolean(
        detectedPositions
        && detectedFrameCanvas.width > 0
        && detectedFrameCanvas.height > 0
    );
    const updateExportAvailability = () => {
        const hasFace = FacePlacement.hasValidFaceSize(
            faceCanvas.width,
            faceCanvas.height
        );
        setExportEnabled(Boolean(imgCanvas) && hasFace && !trackingActive);
    };

    const viewElem = document.querySelector('.view');
    const statusMessageElem = document.querySelector('#status-message');
    const faceDebug = FaceDebug.create({
        element: document.querySelector('#face-debug-status'),
        search: window.location.search
    });
    if (faceDebug.enabled) {
        const faceTrackerEvents = {
            clmtrackrNotFound: '顔検出失敗',
            clmtrackrLost: '追跡喪失',
            clmtrackrConverged: '追跡安定',
            clmtrackrIteration: '追跡更新'
        };
        Object.entries(faceTrackerEvents).forEach(([eventName, label]) => {
            document.addEventListener(eventName, () => faceDebug.recordEvent(label));
        });
    }
    const showStatusMessage = (message, isError = false) => {
        statusMessageElem.textContent = message || '';
        statusMessageElem.classList.toggle('error', isError);
    };
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
    let facePositionMode = '1';
    let customFaceCenter = null;
    const facePositionIsTop = () => facePosition.isTop;
    const facePositionIsRight = () => facePosition.isRight;
    const setFacePosition = v => {
        facePositionMode = v;

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

        if (v !== 'custom') {
            customFaceCenter = null;
        }
    }

    const facePositionList = document.querySelector('#face-position-list');
    setFacePosition(facePositionList.value);
    facePositionList.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            activateCustomFacePosition();
        } else {
            setFacePosition(e.target.value);
        }
        adjustFaceCanvasPosition();
    });

    const facePrivacy = document.querySelector('#face-privacy');
    let facePrivacyVal = facePrivacy.value;
    facePrivacy.addEventListener('change', (e) => {
        facePrivacyVal = e.target.value;
        redrawDetectedFace();
    });
    const disabledFacePrivacy = () => facePrivacy.disabled = true;
    const enabledFacePrivacy = () => facePrivacy.disabled = false;
    const updateFaceControlAvailability = () => {
        const enabled = hasDetectedFrame();
        facePositionList.disabled = !enabled;
        (enabled ? enabledFaceSizeSlider : disabledFaceSizeSlider)();
        (enabled ? enabledFaceAlphaSlider : disabledFaceAlphaSlider)();
        (enabled ? enabledFaceEdgeSlider : disabledFaceEdgeSlider)();
        (enabled ? enabledFacePrivacy : disabledFacePrivacy)();
    };
    updateFaceControlAvailability();

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
                    result.image
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
    const createTransformedCanvas = (orientation, img) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const destW = img.width;
        const destH = img.height;

        if ([5,6,7,8].indexOf(orientation) > -1) {
            canvas.width  = destH;
            canvas.height = destW;
        } else {
            canvas.width  = destW;
            canvas.height = destH;
        }
        CanvasQuality.configure(ctx);

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

        clearDetectedFrame();
        faceCanvas.width = 0;
        faceCanvas.height = 0;
        faceCanvas.tabIndex = -1;
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

        wrapperElem.insertBefore(viewElem, wrapperElem.firstChild);

        v2c.getCanvas().style.position = 'absolute';
        v2c.changeLongSideSize(specifyVideoSize());
    }

    const specifyVideoSize = () => {
        // 中央寄せされた空のwrapperは初期化時に幅0になるため、表示領域から決める。
        const availableWidth = Math.min(containerMaxWidth, container.clientWidth);

        if (availableWidth <= 320) {
            return 240;
        }
        if (availableWidth <= 480) {
            return 320;
        }
        return 480;
    }

    const callbackOnLoadedmetadataVideo = video => {
        showStatusMessage('');
        trackingActive = true;
        faceDebug.setCamera(
            '準備完了',
            `${video.videoWidth}×${video.videoHeight}`
        );
        faceDebug.setTracker('探索中');
        startFaceTracker(video);
    }

    const callbackOnAfterVideoLoadError = err => {
        trackingActive = false;
        faceDebug.setCamera('エラー', err && err.name || '不明');
        startButton.classList.remove('active');
        updateFaceControlAvailability();
        updateExportAvailability();
        showStatusMessage(CameraError.toMessage(err), true);
    }

    const option = {
        'longSideSize': specifyVideoSize(),
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
        trackingActive = true;
        setExportEnabled(false);

        // 画像だけを再選択した場合は、動作中のカメラをそのまま利用する。
        if (v2c.isCameraReady()) {
            showStatusMessage('');
            return;
        }

        showStatusMessage('カメラを起動しています');
        faceDebug.setCamera('取得中');
        faceDebug.setTracker('待機');
        startButton.classList.add('active');
        updateFaceControlAvailability();
        setUseFrontCamera(v2c.useFrontCamera());
        v2c.start(drawLoop);
    }

    const stopButton = document.querySelector('#stop');
    const stopRender = () => {
        trackingActive = false;
        faceDebug.setCamera('停止');
        faceDebug.setTracker('停止');
        startButton.classList.remove('active');
        stopFaceTracker();
        v2c.stop();
        updateFaceControlAvailability();
        updateExportAvailability();
    };
    stopButton.addEventListener('click', stopRender);

    // ページを離れるときはカメラを確実に解放する。
    window.addEventListener('pagehide', stopRender);
    window.addEventListener('resize', updatePreviewLayout);

    captureButton.addEventListener('click', (e) => {
        capture();
    });

    shareButton.addEventListener('click', async () => {
        shareButton.disabled = true;
        showStatusMessage('');

        try {
            const dataUrl = createExportDataUrl();
            const result = await ImageShare.shareImage({
                dataUrl,
                downloadImage: () => downloadGeneratedImage(dataUrl)
            });

            if (result.method === 'x-intent') {
                showStatusMessage('画像を保存しました。Xの投稿画面で画像を添付してください');
            } else {
                showStatusMessage('');
            }
        } catch (error) {
            showStatusMessage(
                '画像を共有できませんでした。保存してからXへ添付してください',
                true
            );
        } finally {
            updateExportAvailability();
        }
    });

    const switchCameraButton = document.querySelector('#switch-camera');
    switchCameraButton.addEventListener('click', (e) => {
        trackingActive = true;
        setExportEnabled(false);
        showStatusMessage('カメラを切り替えています');
        faceDebug.setCamera('切替中');
        faceDebug.setTracker('待機');
        v2c.switchCamera();
        setUseFrontCamera(v2c.useFrontCamera());
        startButton.classList.add('active');
        updateFaceControlAvailability();
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
        faceDebug.recordFrame(positions !== false);
        if (positions !== false) {
            cacheDetectedFrame(canvas, positions);
        }
        const rendered = positions !== false && renderFaceCanvas(positions, canvas);
        if (!rendered) {
            clearDetectedFrame();
            clearFaceCanvas();
        } else {
            updateFaceControlAvailability();
        }
        updateExportAvailability();
    }

    const copyCanvas = (source, target) => {
        if (target.width !== source.width || target.height !== source.height) {
            target.width = source.width;
            target.height = source.height;
        }
        const context = target.getContext('2d');
        CanvasQuality.configure(context);
        context.clearRect(0, 0, target.width, target.height);
        context.drawImage(source, 0, 0);
    };

    const cacheDetectedFrame = (canvas, positions) => {
        copyCanvas(canvas, detectedFrameCanvas);
        detectedPositions = positions.map(position => (
            Array.isArray(position) ? position.slice() : position
        ));
    };

    const clearDetectedFrame = () => {
        detectedFrameCanvas.width = 0;
        detectedFrameCanvas.height = 0;
        redrawSourceCanvas.width = 0;
        redrawSourceCanvas.height = 0;
        detectedPositions = null;
        updateFaceControlAvailability();
    };

    const redrawDetectedFace = () => {
        if (!hasDetectedFrame() || !imgCanvas) {
            return false;
        }

        // 目元加工で保持画像を汚さないよう、再描画ごとに作業用Canvasへ複製する。
        copyCanvas(detectedFrameCanvas, redrawSourceCanvas);
        const rendered = renderFaceCanvas(detectedPositions, redrawSourceCanvas);
        updateExportAvailability();
        return rendered;
    };

    const clearFaceCanvas = () => {
        FaceRenderer.clear(faceCanvas);
        faceCanvas.tabIndex = -1;
    }

    const renderFaceCanvas = (p, canvas) => {
        const crop = FaceGeometry.calculateFaceCrop(
            p,
            canvas.width,
            canvas.height,
            imgCanvas.width,
            imgCanvas.height,
            faceScale
        );

        const rendered = FaceRenderer.render({
            sourceCanvas: canvas,
            targetCanvas: faceCanvas,
            crop,
            alpha: faceAlpha,
            privacy: facePrivacyVal,
            edge: faceEdge
        });
        if (!rendered) {
            return false;
        }

        faceCanvas.tabIndex = 0;
        updateFaceCanvasPresentation();
        adjustFaceCanvasPosition();
        return true;
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

        const position = getFaceOutputPosition();

        faceCanvas.style.top = PreviewLayout.scaleLength(
            position.y,
            previewScale
        ) + 'px';
        faceCanvas.style.left = PreviewLayout.scaleLength(
            position.x,
            previewScale
        ) + 'px';
    }

    const getFaceOutputPosition = () => {
        if (
            !imgCanvas
            || !FacePlacement.hasValidFaceSize(faceCanvas.width, faceCanvas.height)
        ) {
            return { x: 0, y: 0 };
        }

        if (facePositionMode === 'custom' && customFaceCenter) {
            return FacePlacement.calcPositionFromNormalizedCenter(
                imgCanvas.width,
                imgCanvas.height,
                faceCanvas.width,
                faceCanvas.height,
                customFaceCenter.x,
                customFaceCenter.y
            );
        }

        return {
            x: FacePlacement.calcOutputX(
                imgCanvas.width,
                faceCanvas.width,
                faceCanvas.height,
                facePositionIsRight()
            ),
            y: FacePlacement.calcOutputY(
                imgCanvas.height,
                faceCanvas.width,
                faceCanvas.height,
                facePositionIsTop()
            )
        };
    };

    const activateCustomFacePosition = () => {
        if (!customFaceCenter) {
            const position = getFaceOutputPosition();
            customFaceCenter = FacePlacement.calcNormalizedCenter(
                imgCanvas && imgCanvas.width,
                imgCanvas && imgCanvas.height,
                faceCanvas.width,
                faceCanvas.height,
                position.x,
                position.y
            );
        }

        facePositionMode = 'custom';
        facePositionList.value = 'custom';

        return customFaceCenter;
    };

    let faceDrag = null;
    const finishFaceDrag = e => {
        if (!faceDrag || (e.pointerId !== undefined && e.pointerId !== faceDrag.pointerId)) {
            return;
        }

        faceDrag = null;
        faceCanvas.classList.remove('is-dragging');
        faceCanvas.removeAttribute('aria-grabbed');

        if (e.pointerId !== undefined && faceCanvas.hasPointerCapture(e.pointerId)) {
            faceCanvas.releasePointerCapture(e.pointerId);
        }
        e.stopPropagation();
    };

    faceCanvas.addEventListener('pointerdown', e => {
        if (
            !imgCanvas
            || !FacePlacement.hasValidFaceSize(faceCanvas.width, faceCanvas.height)
        ) {
            return;
        }

        const center = activateCustomFacePosition();
        faceDrag = {
            pointerId: e.pointerId,
            clientX: e.clientX,
            clientY: e.clientY,
            centerX: center.x,
            centerY: center.y
        };
        faceCanvas.classList.add('is-dragging');
        faceCanvas.setAttribute('aria-grabbed', 'true');
        faceCanvas.focus({ preventScroll: true });

        try {
            faceCanvas.setPointerCapture(e.pointerId);
        } catch (error) {
            // 合成イベントなどでPointer Captureを使えない場合も移動処理は継続する。
        }

        e.preventDefault();
        e.stopPropagation();
    });

    faceCanvas.addEventListener('pointermove', e => {
        if (!faceDrag || e.pointerId !== faceDrag.pointerId) {
            return;
        }

        const scale = Number.isFinite(previewScale) && previewScale > 0
            ? previewScale
            : 1;
        customFaceCenter = FacePlacement.moveNormalizedCenter(
            faceDrag.centerX,
            faceDrag.centerY,
            (e.clientX - faceDrag.clientX) / scale,
            (e.clientY - faceDrag.clientY) / scale,
            imgCanvas.width,
            imgCanvas.height
        );
        adjustFaceCanvasPosition();
        e.preventDefault();
        e.stopPropagation();
    });

    faceCanvas.addEventListener('pointerup', finishFaceDrag);
    faceCanvas.addEventListener('pointercancel', finishFaceDrag);
    faceCanvas.addEventListener('lostpointercapture', finishFaceDrag);
    faceCanvas.addEventListener('click', e => e.stopPropagation());
    faceCanvas.addEventListener('dragstart', e => e.preventDefault());
    faceCanvas.addEventListener('keydown', e => {
        const movement = {
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0]
        }[e.key];
        if (
            !movement
            || !imgCanvas
            || !FacePlacement.hasValidFaceSize(faceCanvas.width, faceCanvas.height)
        ) {
            return;
        }

        const center = activateCustomFacePosition();
        const step = e.shiftKey ? 10 : 1;
        customFaceCenter = FacePlacement.moveNormalizedCenter(
            center.x,
            center.y,
            movement[0] * step,
            movement[1] * step,
            imgCanvas.width,
            imgCanvas.height
        );
        adjustFaceCanvasPosition();
        e.preventDefault();
        e.stopPropagation();
    });

    const createExportDataUrl = () => ImageExporter.createDataUrl({
        backgroundCanvas: imgCanvas,
        faceCanvas,
        isFrontCamera: useFrontCamera(),
        faceIsRight: facePositionIsRight(),
        faceIsTop: facePositionIsTop(),
        facePosition: getFaceOutputPosition()
    });

    const downloadGeneratedImage = dataUrl => {
        ImageExporter.download({ dataUrl, wrapper: wrapperElem });
    };

    const capture = () => {
        downloadGeneratedImage(createExportDataUrl());
    };

});
