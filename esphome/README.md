# 韌體原始碼（esphome/）

這個資料夾是線上刷機頁所提供韌體的**對應原始碼**：用它可以自己編譯出同樣功能的韌體。整個資料夾以 **GPL-3.0** 發布（見 [LICENSE](LICENSE)），來源與修改聲明見 [NOTICE.md](NOTICE.md)。

韌體與這些原始碼都**不含任何 Wi-Fi 帳密、API 加密金鑰或 OTA 密碼**；Wi-Fi 在裝置上設定（下面〈設定 Wi-Fi〉）。

| 檔案 | 內容 |
|---|---|
| `presence-product.yaml` | HLK-LD2410B 人體感應器（ESP32-C3）韌體，產品版：名稱加 MAC 尾碼、含 `improv_serial` |
| `presence-device.example.yaml` | 單台設定範例（自訂名稱） |
| `presence-common.yaml` | 感應器韌體共用主體 |
| `presence-web.js`、`presence-web.min.js` | 感應器的網頁介面（編譯時包進韌體）；`.min.js` 是 `.js` 縮小後的版本，韌體引用的是縮小版 |
| `components/ld2410/` | 修改自 ESPHome 內建 ld2410 的元件（基底版本見 `ESPHOME_BASE_VERSION`） |

## 建置環境

- **ESPHome 2026.10.1**（`min_version` 為 2026.10.0；元件以 2026.10.1 為基底，換版本前請重新比對 `components/ld2410`）。
  ```
  pip install esphome==2026.10.1
  ```
- Python：以 ESPHome 官方要求為準（建議 3.11 以上）。第一次編譯會自動下載 ESP-IDF（感應器）與工具鏈，需要網路與數 GB 空間。
- Windows：路徑太長會讓 ESP-IDF 編譯失敗。請把原始碼放在短路徑（例如 磁碟機根目錄下的 `build` 資料夾），並設環境變數 `ESPHOME_ESP_IDF_PREFIX` 指向一個短資料夾（例如磁碟機根目錄下的 `esp-idf` 資料夾）。
- 需要 Node.js 的情況只有一種：修改了 `presence-web.js` 後要重新產生縮小檔：
  ```
  npx --yes terser presence-web.js --compress passes=2 --mangle -o presence-web.min.js
  ```

## 編譯

在這個資料夾執行：

```
esphome compile presence-product.yaml     # 人體感應器
```

輸出在 ESPHome 的建置輸出目錄（編譯結束時的訊息會印出 `firmware.factory.bin`、`firmware.ota.bin` 的完整路徑）：

- `firmware.factory.bin`：完整映像（第一次用 USB 刷的就是這個）。
- `firmware.ota.bin`：OTA 更新檔（裝置已經在跑 ESPHome 韌體時用）。

### 編譯時不把本機路徑與時區留在 bin 裡

編譯結果預設會帶入建置環境的資訊：原始碼與工具的絕對路徑（例如除錯字串中的使用者名稱）、以及建置者的時區（編譯時間字串）。**要發布編譯結果（bin）時，請照下面三點做**：

1. **用中性的建置目錄**：把原始碼複製到一個不含使用者名稱、專案名稱的資料夾（例如磁碟機根目錄下的 `build`）再編譯。
2. **設 `TZ=UTC`**：避免把你的時區寫進 bin。
3. **用 `PLATFORMIO_BUILD_FLAGS` 加 `-ffile-prefix-map` 與 `-fmacro-prefix-map`**，把建置目錄、使用者家目錄與工具目錄換成固定字樣。

Linux／macOS 範例（請在中性建置目錄執行）：

```
export TZ=UTC
export PLATFORMIO_BUILD_FLAGS="-ffile-prefix-map=$PWD=/build/src -fmacro-prefix-map=$PWD=/build/src -ffile-prefix-map=$HOME=/home -fmacro-prefix-map=$HOME=/home"
esphome compile presence-product.yaml
```

Windows（PowerShell）範例：路徑請用正斜線寫法，`<你的建置目錄>`、`<你的家目錄>` 換成實際路徑：

```
$env:TZ = "UTC"
$env:PLATFORMIO_BUILD_FLAGS = "-ffile-prefix-map=<你的建置目錄>=/build/src -fmacro-prefix-map=<你的建置目錄>=/build/src -ffile-prefix-map=<你的家目錄>=/home -fmacro-prefix-map=<你的家目錄>=/home"
esphome compile presence-product.yaml
```

這些只影響 bin 裡的路徑與時間字串，不影響功能。編譯後建議用 `strings` 之類的工具檢查 bin 裡有沒有殘留你的使用者名稱或路徑。

## 刷機

- **USB 第一次刷（空白或原廠韌體）**：`esphome run presence-product.yaml`，或用線上刷機頁。ESP32-C3 的 USB 口可直接刷。
- **OTA 更新**：裝置已在跑本韌體時，`esphome upload presence-product.yaml --device <裝置 IP>`；或開裝置網頁，用網頁的上傳功能選 `firmware.ota.bin`。
- **從原廠韌體換成這版（感應器）**：原廠韌體開著無密碼的 ESPHome OTA、分區表相同，也可以直接 OTA 換成這版。

## 設定 Wi-Fi

韌體不寫任何 Wi-Fi：

- **感應器產品版**含 `improv_serial`：用 USB 線刷好後，在線上刷機頁或任何 Improv 工具（Improv Serial）輸入 Wi-Fi 名稱與密碼即可。沒設定 Wi-Fi 時，裝置也會開備援熱點（captive portal），連上去會跳設定頁。

第一次打開感應器網頁（裝置的 IP），會出現「第一次使用引導」（調校精靈），依序設定名稱、擺放位置、偵測範圍、校準與走位驗證；網址加 `?welcome` 可重看。網址加 `?native` 可回到 ESPHome 原始介面。

## 時區

裝置的時區預設為**台北時區（`Asia/Taipei`）**，用於整點報時與智慧延時的時間判斷，網頁上顯示的時間也依這個時區。時區是編譯時的設定（`timezone` 這個 substitution），目前網頁介面不能改：要換時區，在你自己的設定檔（例如複製 `presence-device.example.yaml` 的那份）加 `timezone: "Europe/Berlin"`（IANA 名稱）後重新編譯。

注意：這與上面〈編譯時不把本機路徑與時區留在 bin 裡〉的 `TZ=UTC` 無關——`TZ=UTC` 只是讓**建置者**的時區不要寫進 bin，裝置的時區仍照 `timezone` 設定。

## 安全性：API 加密與 OTA 密碼

為了方便第一次設定，韌體**預設沒有 OTA 密碼，API 也沒有固定的加密金鑰**：Home Assistant 連上後會自動產生加密金鑰寫入裝置，之後只收加密連線（要清掉金鑰只能恢復出廠）。同一網路的人在這之前可以連線，所以請在確認可信的網路上完成第一次設定。

要自己指定金鑰與密碼，在你自己的設定檔（例如複製 `presence-device.example.yaml` 的那份）加：

```yaml
api:
  encryption:
    key: !secret api_key
```

OTA 密碼請在 `presence-common.yaml` 的 `ota:` 的 `esphome` 項目加上 `password` 欄位，值寫 `!secret ota_password`。金鑰與密碼放在你自己的 `secrets.yaml`，不要提交到版本控制。

## 多台與自訂

多台感應器放在同一個網路：產品版名稱會加 MAC 尾碼，不會撞名。要自訂名稱，複製 `presence-device.example.yaml`，改 `devicename`、`upper_devicename`、`device_label`。時區預設 UTC，可用 `timezone` 覆寫（整點報時用）；溫濕度補償預設 0，可用 `temp_offset_default`、`humi_offset_default` 覆寫。

## 與 ESPHome 內建 ld2410 的差異

見 [NOTICE.md](NOTICE.md)。簡述：加入原廠底噪校準指令、把校準中／成功／失敗的目標狀態和「有目標」分開、記錄資料幀時間供斷線偵測，其餘與 ESPHome 2026.10.1 原版相同。
