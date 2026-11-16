# Third-party notices / 第三方聲明

The web page code of this repository is licensed under MIT (see [LICENSE](LICENSE)). The components below remain under their own licenses.
本 repo 的網頁程式以 MIT 授權（見 [LICENSE](LICENSE)）；下列元件仍適用各自的授權。

| Component / 元件 | License / 授權 | Location / 位置 |
|---|---|---|
| ESPHome-derived content (modified `ld2410` component and firmware configuration) / ESPHome 衍生內容 | GPL-3.0; the upstream MIT license text and copyright notice are retained | `esphome/` — see [esphome/NOTICE.md](esphome/NOTICE.md) and [esphome/LICENSE](esphome/LICENSE) |
| esptool-js 0.5.4 | Apache-2.0 | `vendor/esptool-js-0.5.4/` — license text in `vendor/esptool-js-0.5.4/LICENSE` |
| pako 2.1.0 (bundled inside the esptool-js bundle) / 內含於 esptool-js bundle | MIT AND Zlib | `vendor/esptool-js-0.5.4/bundle.js` |

## External resources / 外部資源

The flasher web page itself loads no external resources. The device web page built into the firmware loads the official ESPHome interface script `https://oi.esphome.io/v3/www.js` only when it is opened with the `?native` parameter; see [esphome/NOTICE.md](esphome/NOTICE.md).
刷機網頁本身不載入外部資源。韌體內建的裝置網頁僅在以 `?native` 參數開啟時，才會載入 ESPHome 官方介面腳本 `https://oi.esphome.io/v3/www.js`；詳見 [esphome/NOTICE.md](esphome/NOTICE.md)。

Each component remains under its own license; license texts are kept with the files.
各元件均保留其授權文字。
