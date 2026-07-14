# 外部依存ライブラリ

この文書は、リポジトリへ直接同梱している外部ライブラリの由来と更新方法を記録する。

## clmtrackr

| 項目 | 内容 |
| --- | --- |
| ライブラリ | `clmtrackr` |
| 使用バージョン | `v1.1.2` |
| 配布元 | [auduno/clmtrackr](https://github.com/auduno/clmtrackr) |
| リリース | [v1.1.2](https://github.com/auduno/clmtrackr/releases/tag/v1.1.2) |
| 上流コミット | `0c702208c70ea19ca0cb8c8ca603a86c45db141f` |
| リリース日 | 2017-09-11 |
| ライセンス | MIT |
| 同梱ライセンス | [`js/vendor/clmtrackr/LICENSE.txt`](js/vendor/clmtrackr/LICENSE.txt) |
| 上流ファイル | `build/clmtrackr.min.js` |
| 同梱ファイル | `js/vendor/clmtrackr/clmtrackr.min.js` |
| ファイルサイズ | 1,946,530 bytes |
| SHA-256 | `e31655ea518d5cb57f4364a20f9b3f33b5a9a4623a6dc176c9f5bd5fb10c398d` |
| ローカル変更 | なし |

2026-07-14に公式タグ`v1.1.2`を取得し、上流の`build/clmtrackr.min.js`と同梱ファイルを`cmp`で比較した。両者はバイト単位で一致し、ファイルサイズとSHA-256も一致した。

同梱ファイル内には`numeric`など上流ビルドが取り込んだ依存コードも含まれる。このリポジトリでは上流の公式生成物を変更せずに同梱し、上流リリースに含まれるMITライセンスを併記している。

アプリ本体との接続は`js/face-tracker.js`へ隔離している。別ライブラリへの交換方法は[`FACE_TRACKER.md`](FACE_TRACKER.md)を参照する。

### 更新手順

1. 更新対象の公式タグを決め、一時ディレクトリへ取得する。

   ```console
   git clone --depth 1 --branch v1.1.2 https://github.com/auduno/clmtrackr.git /tmp/clmtrackr
   ```

2. 上流の生成済みファイルとライセンスを置き換える。

   ```console
   cp /tmp/clmtrackr/build/clmtrackr.min.js js/vendor/clmtrackr/clmtrackr.min.js
   cp /tmp/clmtrackr/LICENSE.txt js/vendor/clmtrackr/LICENSE.txt
   ```

3. ファイルサイズ、バージョン表記、SHA-256を確認し、この文書と`test/vendor-dependencies.test.js`の期待値を更新する。

   ```console
   wc -c js/vendor/clmtrackr/clmtrackr.min.js
   shasum -a 256 js/vendor/clmtrackr/clmtrackr.min.js
   ```

4. 単体テスト、構文チェック、ブラウザテストを実行する。

   ```console
   npm test
   npm run test:syntax
   npm run test:e2e
   ```

5. 顔検出、カメラ切替、目線・モザイク加工、PNG保存を実端末でも確認する。
