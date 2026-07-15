# PaulMauriat-generator

Image generator like Paul Mauriat.  
(Inspired by [ポール・モーリアのように顔を出したい :: デイリーポータルZ](https://dailyportalz.jp/kiji/11263 "ポール・モーリアのように顔を出したい :: デイリーポータルZ"))

## Demo

https://paulmauriat-generator.orukubami.sh/

<img src="https://github.com/shimabox/assets/blob/master/PaulMauriat-generator/qr.png" alt="demo-qr" width="200px">

## How to play

<img src="https://github.com/shimabox/assets/blob/master/PaulMauriat-generator/first-view.png" alt="first-view" title="first-view" width="560px">

1. Click to select an image or drop an image.
2. Allow access to the camera.
3. Face recognition is performed, and when the face is recognized, the face is projected on the screen.  
※ If face recognition doesn't work, try to release or adjust the face a little  
※ Glasses may also affect face recognition  
※ You can select the position of the face, which will be mentioned later
4. Enjoy!!.  
※ Image download is also possible  
※ In case of iOS, the image opens in another tab, please long-press and save it

## About UI

<img src="https://github.com/shimabox/assets/blob/master/PaulMauriat-generator/ui.png" alt="ui" title="ui" width="560px">

1. You can reselect the image.
2. Start face recognition.
3. Stop face recognition.  
※ Let's stop at a good scene and download  
4. Download as image(png).
5. Switch between the front and rear cameras.
6. You can select the position of the face as Top Right, Top Left, Bottom Right, Bottom Left. You can also drag the face to place it freely. Use the arrow keys for fine adjustment, or Shift + arrow keys to move it by 10 pixels.
7. You can adjust the transparency of the face.
8. Hide your eyes and protect your privacy.
    - none, eyeline, mosaic.
    - The default selection is `none`. 

**I am happy to share the created image with `#ポールモーリアジェネレーター`, `#paulmauriat-generator`.**

## See also

[ポール・モーリア ジェネレーターをつくった | Shimabox Blog](https://blog.shimabox.net/2019/06/10/paulmauriat-generator/ "ポール・モーリア ジェネレーターをつくった | Shimabox Blog")

## License
The MIT License (MIT). Please see [License File](LICENSE) for more information.

同梱している外部ライブラリの配布元、バージョン、ライセンス、更新方法は[VENDOR.md](VENDOR.md)を参照してください。
顔追跡ライブラリの交換方法は[docs/FACE_TRACKER.md](docs/FACE_TRACKER.md)にまとめています。

## Development

Node.js 24を使用します。[mise](https://mise.jdx.dev/)で実行環境を準備してから、依存パッケージとE2Eテスト用のChromiumをインストールしてください。

```console
mise install
npm ci
npx playwright install chromium
```

単体テスト、構文チェック、ブラウザテストは次のコマンドで実行できます。

```console
npm test
npm run test:syntax
npm run test:e2e
```

ローカル画面は次のコマンドで起動できます。

```console
npm run dev
```

本番配布用の静的ファイルは `dist` へ出力します。配布物と同じ内容をローカルで確認する場合は `preview` を使用してください。

```console
npm run build
npm run preview
```

顔追跡を診断するときは、URLへ `d=1` を付けて開いてください。カメラ状態、追跡状態、特徴点を取得できたフレーム数、直近の追跡イベントを画面へ表示します。

```text
http://127.0.0.1:41739/?d=1
```

## Image example

### With the Eiffel Tower.

![example_1](https://github.com/shimabox/assets/blob/master/PaulMauriat-generator/example_1.png)

©Image by <a href="https://pixabay.com/ja/users/TheDigitalArtist-202249/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=3349075">Pete Linforth</a> from <a href="https://pixabay.com/ja/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=3349075">Pixabay</a>

### Cat!!

![example_2](https://github.com/shimabox/assets/blob/master/PaulMauriat-generator/example_2.png)

©Image by <a href="https://pixabay.com/ja/users/maturika-1227075/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=939367">maturika</a> from <a href="https://pixabay.com/ja/?utm_source=link-attribution&amp;utm_medium=referral&amp;utm_campaign=image&amp;utm_content=939367">Pixabay</a>
