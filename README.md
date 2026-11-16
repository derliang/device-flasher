# device-flasher

## 繁體中文

公開的線上韌體工具：在瀏覽器裡**備份、更新、還原**裝置韌體。

網址：<https://derliang.github.io/device-flasher/>

**支援的裝置**

- **人體感應器（ESP32-C3）**：USB 直連，使用 Web Serial，可備份、更新、還原韌體。
  需要桌面版 Chrome 或 Edge，並以 https 或 localhost 開啟頁面。
- **S31 智慧插座**：韌體尚未開放。

**目前狀態**：韌體 bin 尚未提供。

**隱私與安全**

- 檔案只在你的瀏覽器本機處理，**不會上傳**。
- 備份檔可能含有 Wi-Fi 密碼與金鑰，**請勿分享給他人**。
- 使用前須同意使用條款與免責聲明（[TERMS.md](TERMS.md)、[DISCLAIMER.md](DISCLAIMER.md)，版本 v0.1）。

**授權**

- 網頁程式：MIT（見 [LICENSE](LICENSE)）。
- `esphome/`（去識別化的韌體原始碼）：GPL-3.0，見 [esphome/LICENSE](esphome/LICENSE) 與 [esphome/NOTICE.md](esphome/NOTICE.md)。
- `vendor/` 內的 esptool-js 0.5.4：Apache-2.0。
- 第三方細節見 [NOTICE.md](NOTICE.md)。

**回報問題**：請使用本 repo 的 Issues。請勿在 Issues 貼上備份檔、Wi-Fi 密碼或金鑰。

## English

A public online firmware tool: **back up, update and restore** device firmware right in your browser.

URL: <https://derliang.github.io/device-flasher/>

**Supported devices**

- **Presence sensor (ESP32-C3)**: direct USB via Web Serial; back up, update and restore firmware.
  Requires desktop Chrome or Edge, with the page opened over https or localhost.
- **S31 smart plug**: firmware not yet available.

**Current status**: firmware binaries are not provided yet.

**Privacy and safety**

- Files are processed locally in your browser and are **never uploaded**.
- Backup files may contain Wi-Fi passwords and keys. **Do not share them.**
- You must accept the terms of use and disclaimer before use ([TERMS.md](TERMS.md), [DISCLAIMER.md](DISCLAIMER.md), version v0.1).

**Licenses**

- Web page code: MIT (see [LICENSE](LICENSE)).
- `esphome/` (de-identified firmware source): GPL-3.0, see [esphome/LICENSE](esphome/LICENSE) and [esphome/NOTICE.md](esphome/NOTICE.md).
- esptool-js 0.5.4 under `vendor/`: Apache-2.0.
- Third-party details: [NOTICE.md](NOTICE.md).

**Reporting problems**: please use this repository's Issues. Do not post backup files, Wi-Fi passwords or keys in Issues.
