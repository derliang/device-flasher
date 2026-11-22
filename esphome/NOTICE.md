# NOTICE

本資料夾（`esphome/`）的原始碼整體以 **GNU General Public License v3.0** 發布（全文見 [LICENSE](LICENSE)）。
This folder is licensed under the GNU General Public License v3.0 (see [LICENSE](LICENSE)).

## 來源與修改聲明

### `components/ld2410/`：修改自 ESPHome 內建的 ld2410 元件

- 基底：ESPHome **2026.10.1** 的 `esphome/components/ld2410`（版本記在 [components/ld2410/ESPHOME_BASE_VERSION](components/ld2410/ESPHOME_BASE_VERSION)）。
- 原作者（保留於 `components/ld2410/__init__.py` 的 `CODEOWNERS`）：`@sebcaps`、`@regevbr`；著作權屬 ESPHome 專案與其貢獻者（Copyright (c) 2019 ESPHome）。
- ESPHome 的授權：C++／執行期程式碼（`.c`、`.cpp`、`.h`、`.hpp`、`.tcc`、`.ino`）為 GPLv3，Python 與其餘部分為 MIT。
  本元件的 C++ 檔案依 GPLv3 散布；Python 檔案原為 MIT，在本專案中隨整體以 GPLv3 散布，原 MIT 授權文字與著作權聲明保留如下。
- 與 ESPHome 2026.10.1 原版相比，**只有下列 4 個檔案被修改**（其餘檔案與原版逐位元相同），每個被修改的檔案檔頭都有一行修改聲明：
  - `ld2410.cpp`
    - 新增原廠底噪校準指令 `0x0B`（開始）與 `0x1B`（查詢）的處理（協定 V1.08 2.2.20／2.2.21）。
    - 目標狀態 `0x04`／`0x05`／`0x06`（校準中／完成／失敗）另存原始值，不再被當成「有目標」。
    - 記錄最後一次收到資料幀的時間（供雷達斷線偵測）。
    - 將常數 `CMD_BT_PASSWORD` 改名為 `CMD_BT_PASSWD`（只改名稱，值不變）。
  - `ld2410.h`：對應上述功能的宣告與存取函式（`start_factory_calibration`、`query_factory_calibration`、`get_target_state_raw`、`get_frame_age_ms`、`get_calibration_state`）。
  - `number/__init__.py`、`sensor.py`：移除部分實體的 `device_class`（避免 Home Assistant 對這些值套用不適合的單位換算或顯示）。

### 韌體設定與網頁

- `presence-product.yaml`、`presence-common.yaml`、`presence-device.example.yaml`、`presence-web.js`（與縮小版 `presence-web.min.js`）：本專案自行撰寫，以 ESPHome 設定檔語法使用上述元件；網頁介面在編譯時包進韌體。
- `ir-remote-common.yaml`、`ir-remote-nanoc6.yaml`、`ir-remote-atoms3-lite.yaml`、`ir-remote-atomlite.yaml`：本專案自行撰寫（GPL-3.0），只使用 ESPHome 內建元件，沒有複製或修改第三方程式碼。

### 網頁載入的外部資源

- 網址加 `?native` 時，網頁會改載入 ESPHome 官方的原始介面腳本（`https://oi.esphome.io/v3/www.js`），僅此一處，且只有使用者主動切換時才會載入。

## ESPHome 授權文字（保留）

> Copyright (c) 2019 ESPHome
>
> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.

ESPHome 專案：<https://github.com/esphome/esphome>
