# 顔追跡アダプター

アプリ本体は `clmtrackr` を直接呼び出さず、`../js/face-tracker.js` の次のインターフェースだけを利用する。

| メソッド | 役割 |
| --- | --- |
| `start(video)` | video要素を入力として顔追跡を開始する |
| `stop()` | 顔追跡を停止する。複数回呼び出しても安全 |
| `getPositions()` | 現在の顔特徴点配列、未検出時は`false`を返す |

## 別ライブラリへ交換する場合

`FaceTracker.create()` が返す上記3メソッドを維持し、内部の生成処理だけを差し替える。テストでは `trackerFactory` を渡して任意の実装を注入できる。

```js
const tracker = FaceTracker.create({
    trackerFactory: () => ({
        init() {},
        start(video) {},
        stop() {},
        getCurrentPosition() { return false; }
    })
});
```

アプリ側の座標計算は `../js/face-geometry.js`、描画は `../js/face-renderer.js` に分離されているため、新しいライブラリではclmtrackrと同じ `[x, y]` 形式の特徴点へ変換すればよい。
