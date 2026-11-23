# 韌體原始碼（esphome/）

這個資料夾是線上刷機頁所提供韌體的**對應原始碼**：用它可以自己編譯出同樣功能的韌體（目前刷機頁提供的韌體只有人體感應器；紅外線遙控器只提供原始碼，見下方專節）。整個資料夾以 **GPL-3.0** 發布（見 [LICENSE](LICENSE)），來源與修改聲明見 [NOTICE.md](NOTICE.md)。

韌體與這些原始碼都**不含任何 Wi-Fi 帳密、API 加密金鑰或 OTA 密碼**；Wi-Fi 在裝置上設定（下面〈設定 Wi-Fi〉）。

| 檔案 | 內容 |
|---|---|
| `presence-product.yaml` | HLK-LD2410B 人體感應器（ESP32-C3）韌體，產品版：名稱加 MAC 尾碼、含 `improv_serial` |
| `presence-device.example.yaml` | 單台設定範例（自訂名稱） |
| `presence-common.yaml` | 感應器韌體共用主體 |
| `presence-web.js`、`presence-web.min.js` | 感應器的網頁介面（編譯時包進韌體）；`.min.js` 是 `.js` 縮小後的版本，韌體引用的是縮小版 |
| `components/ld2410/` | 修改自 ESPHome 內建 ld2410 的元件（基底版本見 `ESPHOME_BASE_VERSION`） |
| `ir-remote-nanoc6.yaml` | 紅外線遙控器（發射＋學碼），M5Stack NanoC6（ESP32-C6）產品檔 |
| `ir-remote-atoms3-lite.yaml` | 紅外線遙控器，M5Stack AtomS3 Lite（ESP32-S3）產品檔 |
| `ir-remote-atomlite.yaml` | 紅外線遙控器，M5Stack ATOM Lite（ESP32）產品檔 |
| `ir-remote-common.yaml` | 紅外線遙控器共用主體（三個產品檔都引入它） |

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
esphome compile ir-remote-nanoc6.yaml     # 紅外線遙控器（NanoC6）
esphome compile ir-remote-atoms3-lite.yaml     # 紅外線遙控器（AtomS3 Lite）
esphome compile ir-remote-atomlite.yaml   # 紅外線遙控器（ATOM Lite）
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

- **感應器產品版**含 `improv_serial`：用 USB 線刷好後，用支援 Improv Serial 的工具（例如 ESPHome 的網頁安裝工具）輸入 Wi-Fi 名稱與密碼即可；這個刷機頁本身不設定 Wi-Fi。沒設定 Wi-Fi 時，裝置也會開備援熱點（captive portal，無密碼的開放熱點），連上去會跳設定頁。

第一次打開感應器網頁（裝置的 IP），會出現「第一次使用引導」（調校精靈），依序設定名稱、擺放位置、偵測範圍、校準與走位驗證；網址加 `?welcome` 可重看。網址加 `?native` 可回到 ESPHome 原始介面。

## 紅外線遙控器（NanoC6／AtomS3 Lite／ATOM Lite）

> **刷機頁目前不提供這些韌體，也沒有發布編譯好的 bin，這裡只提供原始碼；尚未經真機驗證。** 下面描述的是設計目標；三份設定目前只通過 ESPHome 設定檢查與編譯，還沒有在真實的板子上測過發射與學碼。多數腳位與下載模式資料來自廠商文件，AtomS3 Lite 的紅外線發射腳不在其中（見下表）；沒有驗證前請把它當作實驗版，要用請自行編譯。

三片板子共用同一份主體（`ir-remote-common.yaml`），差別只有晶片設定與腳位：

| 板子 | 檔案 | 紅外線發射腳 | 學碼接收頭建議接的腳 |
|---|---|---|---|
| M5Stack NanoC6 | `ir-remote-nanoc6.yaml` | GPIO3（板上內建） | GPIO2（Grove 黃線） |
| M5Stack AtomS3 Lite | `ir-remote-atoms3-lite.yaml` | GPIO4（出自社群資料，M5 官方文件未給腳位，待真機驗證） | GPIO2（Grove 黃線） |
| M5Stack ATOM Lite | `ir-remote-atomlite.yaml` | GPIO12（板上內建） | GPIO26（Grove 黃線） |

接收腳是本韌體的設計選擇，不是板子原本就有的功能；要換腳，在產品檔的 `substitutions` 改 `ir_rx_pin`（發射腳是 `ir_tx_pin`）。

注意（ATOM Lite）：GPIO12 是 ESP32 的 strapping 腳（開機時的電位會決定內部 flash 的供電電壓），M5Stack 官方文件把它接到板上的紅外線 LED。這份設定沿用官方腳位，但開機時這個腳位與紅外線 LED 的互相影響**尚未在真機驗證**；如果發現開機異常（不斷重開、刷入後無法啟動），先懷疑這一點。

功能：

- **配網**：含 `improv_serial`，用 USB 線刷好後，用支援 Improv Serial 的工具（例如 ESPHome 的網頁安裝工具）輸入 Wi-Fi 名稱與密碼，或連到裝置自己的備援熱點設定（無密碼的開放熱點，與感應器一致）。名稱加 MAC 尾碼（`ir-remote-xxxxxx`），多台不撞名。
- **從 Home Assistant 送任意原始脈衝**：裝置會在 Home Assistant 提供動作 `esphome.<裝置名>_send_raw`，參數 `carrier_frequency`（Hz，整數，常見 38000）與 `code`（微秒陣列，正數＝發射、負數＝空白）。例如：

  ```yaml
  action: esphome.ir_remote_a1b2c3_send_raw
  data:
    carrier_frequency: 38000
    code: [9000, -4500, 560, -560, 560, -1680, 560, -40000]
  ```
- **學碼**：板子本身都沒有接收元件，要另外把一顆紅外線接收頭（解調後輸出低電位有效的那種）的訊號腳接到上表的接收腳，並共地、供電。**接收頭請選 3.3V 可以工作的型號，並確認它的輸出電平不會超過 3.3V**（這些腳位不耐 5V；常見的 5V 專用接收頭不要直接接）。在 Home Assistant 打開「Learn Mode」（60 秒後自動關閉），用實體遙控器對接收頭按一下鍵：
  - 完整的脈衝陣列顯示在**裝置網頁**的「Last Learned Code」，格式與 `send_raw` 的 `code` 相同，可直接複製；
  - 同時以 Home Assistant 事件 `esphome.ir_remote_learned` 送出（開發者工具的事件頁面訂閱它即可看到；Home Assistant 要在裝置選項裡允許該裝置執行 Home Assistant 動作）；
  - 「Replay Last Learned」按鈕用「Replay Carrier Frequency」指定的載波把最後學到的碼再發射一次，用來當場確認學得對不對。
  - 接收頭看不出載波頻率，學到的碼重送時請自己指定（先試 38000）。
- **裝置網頁**：用 ESPHome 內建 `web_server` 的預設介面（版本 3）。這個預設介面的腳本不在韌體裡，而是開網頁的瀏覽器從 ESPHome 官方網站（`oi.esphome.io`）載入；所以開那個網頁的電腦需要能連上網際網路，沒有網際網路時網頁可能無法顯示（尚未驗證）。要完全離線，需要自己改設定（例如 `web_server` 的 `js_url`／`js_include` 自備腳本）後重新編譯。
- **不含**任何 Wi-Fi 帳密、API 加密金鑰或 OTA 密碼（安全性見下方〈安全性：API 加密與 OTA 密碼〉，同樣適用）。

刷機：目前沒有編譯好的 bin，請自己編譯後用 USB 線第一次刷（例如 `esphome run`）。三片板子都沒有內建紅外線接收元件，學碼要外接接收頭。進下載模式的方式依廠商文件：NanoC6 按住前面的按鈕再接上 USB，接上後放開；AtomS3 Lite 接上 USB 後按住電源鍵直到內部綠燈亮起再放開；ATOM Lite 的文件沒有寫手動進下載模式的方法。這些都尚未在真機確認。

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

紅外線遙控器要改的是 `ir-remote-common.yaml`（同樣的 `api:`／`ota:` 寫法）。另外它的裝置網頁（`web_server`，80 埠）沒有帳號密碼，**網頁上傳韌體（網頁 OTA）也沒有密碼**，同一個網路的人都能開啟、並上傳韌體換掉它，只適合在可信的內網使用，不要開放到網際網路。人體感應器的裝置網頁同樣可以上傳韌體（見〈刷機〉），一樣沒有密碼。

藍牙代理沒有裝置網頁，但設定檔展開後仍帶有網頁 OTA 項目：ESPHome 在備援熱點（captive portal）開著時會一併提供上傳頁，沒有密碼（依 `esphome config` 的展開結果，尚未在真機確認）；熱點只在沒存過 Wi-Fi 或斷線一段時間後才會開。

## 多台與自訂

多台感應器放在同一個網路：產品版名稱會加 MAC 尾碼，不會撞名。要自訂名稱，複製 `presence-device.example.yaml`，改 `devicename`、`upper_devicename`、`device_label`。時區預設台北（`Asia/Taipei`），可用 `timezone` 覆寫（整點報時用）；溫濕度補償預設 0，可用 `temp_offset_default`、`humi_offset_default` 覆寫。

## 與 ESPHome 內建 ld2410 的差異

見 [NOTICE.md](NOTICE.md)。簡述：加入原廠底噪校準指令、把校準中／成功／失敗的目標狀態和「有目標」分開、記錄資料幀時間供斷線偵測，其餘與 ESPHome 2026.10.1 原版相同。

## 藍牙代理（AtomS3 Lite／ATOM Lite）

> **刷機頁目前不提供這些韌體，也沒有發布編譯好的 bin，這裡只提供原始碼；尚未經真機驗證。** 下面描述的是設計目標；兩份設定目前只通過 ESPHome 設定檢查與編譯，還沒有在真實的板子上測過配網、與 Home Assistant 連線與收發藍牙廣播。沒有驗證前請把它當作實驗版，要用請自行編譯。

兩片板子共用同一份主體（`btproxy-common.yaml`），差別只有晶片設定與日誌介面；這份韌體沒有用到任何板上腳位（沒有燈、沒有按鍵、沒有紅外線）：

| 板子 | 檔案 | 晶片與 flash |
|---|---|---|
| M5Stack AtomS3 Lite（無螢幕版） | `btproxy-atoms3-lite.yaml` | ESP32-S3，8 MB（M5Stack 官方文件） |
| M5Stack ATOM Lite | `btproxy-atomlite.yaml` | ESP32-PICO-D4，4 MB（M5Stack 官方文件） |

編譯（在這個資料夾執行，建置環境與去識別化做法見前面的〈建置環境〉〈編譯〉）：

```
esphome compile btproxy-atoms3-lite.yaml   # AtomS3 Lite
esphome compile btproxy-atomlite.yaml      # ATOM Lite
```

功能：

- **藍牙代理**：板子收附近藍牙裝置的廣播，轉給 Home Assistant，讓離主機太遠的藍牙裝置也看得到。設為「主動」模式（`bluetooth_proxy: active: true`），Home Assistant 也可以透過這塊板子主動連線到藍牙裝置；連線數與掃描間隔、掃描視窗都用 ESPHome 內建預設值，沒有為任何特定環境調整。
- **配網**：含 `improv_serial`，用 USB 線刷好後，用支援 Improv Serial 的工具（例如 ESPHome 的網頁安裝工具）輸入 Wi-Fi 名稱與密碼，或連到裝置自己的備援熱點設定（無密碼的開放熱點，與感應器、紅外線遙控器一致）。名稱加 MAC 尾碼（`bluetooth-proxy-xxxxxx`），多台不撞名。
- **不含**任何 Wi-Fi 帳密、API 加密金鑰或 OTA 密碼（安全性見前面〈安全性：API 加密與 OTA 密碼〉，同樣適用；要改的是 `btproxy-common.yaml` 的 `api:`／`ota:`）。
- **沒有裝置網頁**（沒有 `web_server`）：藍牙代理很吃記憶體，第一版先不開；韌體更新走 ESPHome OTA（`esphome upload btproxy-xxx.yaml --device <裝置 IP>`）。因為沒有 `web_server`，也就沒有「裝置網頁從 ESPHome 官方網站載入腳本」的外連（紅外線遙控器與感應器的 `?native` 才有，見上方各段與 NOTICE）；備援熱點的設定頁是韌體內建的，不需要外網。

放在哪裡、叫什麼名字，都在 Home Assistant 設定；這份原始碼不預設任何位置或房間。

刷機：目前沒有編譯好的 bin，請自己編譯後用 USB 線第一次刷（例如 `esphome run`）。進下載模式的方式依廠商文件：AtomS3 Lite 接上 USB 後按住電源鍵直到內部綠燈亮起再放開；ATOM Lite 的文件沒有寫手動進下載模式的方法。日誌與 `improv_serial` 在 AtomS3 Lite 走晶片內建的 USB-Serial/JTAG、在 ATOM Lite 走 UART0（板上 USB 轉序列），這兩點都**尚未在真機確認**；如果實際不是這樣，improv 與日誌會失效，要改設定。
