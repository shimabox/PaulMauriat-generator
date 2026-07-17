# PaulMauriat-generator

背景画像にカメラで撮影した顔を重ね、ポール・モーリア風の画像を作るWebアプリです。

[ポール・モーリアのように顔を出したい :: デイリーポータルZ](https://dailyportalz.jp/kiji/11263) に着想を得ています。

（わたしはこの記事がとても大好きです❤️）

## デモ

https://paulmauriat-generator.orukubami.sh/

<img src="https://github.com/shimabox/assets/blob/master/PaulMauriat-generator/qr.png" alt="デモサイトのQRコード" width="200px">

## 使い方

<img src="https://github.com/shimabox/assets/blob/master/PaulMauriat-generator/first-view.png" alt="背景画像の選択画面" width="560px">

1. 背景に使う画像を選択するか、画面へドロップします。
2. カメラの使用を許可します。
3. 顔が検出されると、背景画像の上に顔が表示されます。
4. 顔追跡を停止し、位置や目元、透明度、大きさを調整します。
5. 画像を共有または保存します。

顔を検出しにくい場合は、顔の向きやカメラとの距離を少し調整してください。眼鏡などが検出に影響することもあります。

## 画面操作

<img src="https://github.com/shimabox/assets/blob/master/PaulMauriat-generator/ui.png" alt="操作画面の各機能" width="560px">

1. 背景画像の選び直し
2. カメラと顔追跡の開始
3. 顔追跡の停止
4. 画像の共有（対応端末では共有メニューを表示）
5. PNG形式で保存
6. 前面・背面カメラの切り替え
7. 四隅から位置を選択、または顔をドラッグして自由配置（矢印キーでも移動可能）
8. 加工なし・目線・モザイクから選択
9. 顔の透明度を調整
10. 顔の大きさを0.5倍から2.0倍まで拡縮

顔を検出すると顔の設定を変更できます。共有と保存は、追跡を停止すると使用できます。

作った画像は、ぜひ `#ポールモーリアジェネレーター` で共有してください。

## 関連記事

[ポール・モーリア ジェネレーターをつくった | Shimabox Blog](https://blog.shimabox.net/2019/06/10/paulmauriat-generator/)

## ライセンス

MITライセンスです。詳細は[LICENSE](LICENSE)を参照してください。

同梱ライブラリの配布元、バージョン、ライセンス、更新方法は[VENDOR.md](VENDOR.md)、顔追跡ライブラリの交換方法は[docs/FACE_TRACKER.md](docs/FACE_TRACKER.md)にまとめています。

## 開発

Node.js 24を使用します。[mise](https://mise.jdx.dev/)で実行環境を準備し、依存パッケージとE2Eテスト用のChromiumをインストールします。

```console
mise install
npm ci
npx playwright install chromium
```

ローカルサーバーを起動します。

```console
npm run dev
```

以下のURLで遊べます。
```text
http://127.0.0.1:41739/
```

単体テスト、構文チェック、ブラウザテストは次のコマンドで実行します。

```console
npm test
npm run test:syntax
npm run test:e2e
```

本番配布用の静的ファイルは`dist`へ出力します。配布物をローカルで確認する場合は`preview`を使用します。

```console
npm run build
npm run preview
```

顔追跡を診断するときは、URLに`d=1`を付けます。カメラと追跡の状態、特徴点を取得できたフレーム数、直近の追跡イベントを表示します。

```text
http://127.0.0.1:41739/?d=1
```

## 作例

### エッフェル塔

![エッフェル塔の背景に顔を合成した作例](https://github.com/shimabox/assets/blob/master/PaulMauriat-generator/example_1.png)

写真: [Pete Linforth](https://pixabay.com/ja/users/TheDigitalArtist-202249/)（[Pixabay](https://pixabay.com/ja/)）

### 猫

![猫の背景に顔を合成した作例](https://github.com/shimabox/assets/blob/master/PaulMauriat-generator/example_2.png)

写真: [maturika](https://pixabay.com/ja/users/maturika-1227075/)（[Pixabay](https://pixabay.com/ja/)）
