// 設備設定檔。晶片或 flash 容量不符 → 引擎拒絕所有寫入。
// 標示：【文件】來自專案文件／esptool-js 原始碼；【推測】未在真機驗證。
//
// 各設定檔可設定的「晶片相關」欄位（引擎不再假設一定是 ESP32-C3）：
//   chip                 esptool-js 的 loader.chip.CHIP_NAME（ESP32 系列原版是 'ESP32'，不含封裝型號）
//   flashSizeBytes       標稱容量；flashSizeCandidates 另列「也接受」的容量（容量不確定時用，見下）
//   bootloaderAddress    第二階段開機程式在 flash 的位址：C3／C6／S3 = 0x0，ESP32 = 0x1000（bundle 的 BOOTLOADER_FLASH_OFFSET）
//   bootMagic            開機映像第一個位元組 0xE9（ESP_IMAGE_MAGIC=233），位置在 bootloaderAddress
//   imageChipId          映像擴充標頭（開機映像第 12–13 位元組）的晶片 ID，bundle 的 IMAGE_CHIP_ID
//   partitionTableAddress／Length  分區表位置與讀取長度（ESP-IDF 預設 0x8000，ESPHome 沿用）
//   hardwareVerified     是否已在真機驗證過。false 的設定檔「只過假設備測試」，畫面不得標為可用

const MB = 1024 * 1024;

export const PROFILES = {
  // 人體感應器：ESP32-C3，4 MB（ESPHome：variant esp32c3、flash_size 4MB）。目前唯一支援的設備。
  presence: {
    id: 'presence',
    label: { 'zh-TW': '人體感應器', en: 'Presence sensor' },
    chip: 'ESP32-C3',
    flashSizeBytes: 4 * MB,
    flashSizeCandidates: [4 * MB],
    hardwareVerified: true, // 2026-11-17 真機驗證（見 README〈真機驗證狀況〉）
    // ESP32-C3 USB 原生序列（USB-Serial/JTAG）；建議 460800（921600 在瀏覽器曾不穩，不用）。
    // 網頁以此為連線鮑率，失敗時退回 115200。
    recommendedBaud: 460800,
    // 位址 0 的開機映像第一個位元組：ESP_IMAGE_MAGIC = 0xE9（esptool-js bundle 內 ESP_IMAGE_MAGIC=233）。
    // ESP32-C3 的 bootloader 就在 flash 位址 0x0。
    bootMagic: 0xe9,
    bootloaderAddress: 0x0,
    partitionTableAddress: 0x8000,
    partitionTableLength: 0xc00,
    // 映像擴充標頭的晶片 ID（位址 0 開機映像的第 12–13 位元組，little-endian）：ESP32-C3 = 5
    // 【文件】esptool-js bundle 內 ESP32-C3 的 IMAGE_CHIP_ID=5。寫到位址 0 的映像晶片 ID 不符就拒絕。
    imageChipId: 5,
    // 受保護區。靜態部分是「讀不到分區表時」的保底；實際更新時會再讀設備上的分區表，
    // 把 type=data/subtype=nvs（含 nvs_keys）的分區也加進去。
    // 【推測】ESPHome 使用 esp-idf 框架，NVS 的確切範圍要看實際分區表，所以才動態讀。
    protectedRegions: [{ name: 'nvs-default-guess', start: 0x9000, end: 0xe000 }],
    readPartitionTable: true,
  },

  // ---- 紅外線遙控器（三種板子）：只過假設備測試，每種第一次真機測試前不得標為可用（hardwareVerified:false）----
  // 三者的 bootMagic／partitionTable／受保護區保底猜測沿用 presence 的做法；差異只在晶片名稱、映像晶片 ID、bootloader 位址、容量。
  // 命名：ir-<板子>（ir＝紅外線遙控器，板子＝M5 產品名小寫去空白），日後同板子多種韌體可再加後綴。

  // M5 NanoC6：ESP32-C6（FH4 封裝內建 4 MB flash）。USB 介面【推測】為晶片內建 USB（未真機確認）。
  'ir-nanoc6': {
    id: 'ir-nanoc6',
    label: { 'zh-TW': 'M5 NanoC6 紅外線遙控器', en: 'M5 NanoC6 IR remote' },
    chip: 'ESP32-C6', // 【文件】bundle：CHIP_NAME="ESP32-C6"
    flashSizeBytes: 4 * MB, // 【文件】M5 官方規格為 ESP32-C6FH4（內建 4 MB）；尚未用真機讀回確認
    flashSizeCandidates: [4 * MB],
    hardwareVerified: false,
    recommendedBaud: 460800, // 【推測】同 C3：原生 USB 序列，失敗時網頁退回 115200
    bootMagic: 0xe9,
    bootloaderAddress: 0x0, // 【文件】bundle：ESP32-C6 BOOTLOADER_FLASH_OFFSET=0
    imageChipId: 13, // 【文件】bundle：ESP32-C6 IMAGE_CHIP_ID=13
    partitionTableAddress: 0x8000, // 【文件】ESP-IDF 預設 0x8000；本專案編出的 factory.bin 實測分區表在 0x8000（未寫進真機）
    partitionTableLength: 0xc00,
    protectedRegions: [{ name: 'nvs-default-guess', start: 0x9000, end: 0xe000 }],
    readPartitionTable: true,
  },

  // M5 AtomS3 Lite（無螢幕）：ESP32-S3（8 MB flash）。USB 介面【推測】為晶片內建 USB（未真機確認）。
  'ir-atoms3lite': {
    id: 'ir-atoms3lite',
    label: { 'zh-TW': 'M5 AtomS3 Lite（無螢幕）紅外線遙控器', en: 'M5 AtomS3 Lite (no screen) IR remote' },
    chip: 'ESP32-S3', // 【文件】bundle：CHIP_NAME="ESP32-S3"
    flashSizeBytes: 8 * MB, // 【文件】M5 官方規格為 ESP32-S3FN8（內建 8 MB）；尚未用真機讀回確認
    flashSizeCandidates: [8 * MB],
    hardwareVerified: false,
    recommendedBaud: 460800, // 【推測】
    bootMagic: 0xe9,
    bootloaderAddress: 0x0, // 【文件】bundle：ESP32-S3 BOOTLOADER_FLASH_OFFSET=0
    imageChipId: 9, // 【文件】bundle：ESP32-S3 IMAGE_CHIP_ID=9
    partitionTableAddress: 0x8000, // 【文件】ESP-IDF 預設 0x8000；編譯產物實測同（未寫進真機）
    partitionTableLength: 0xc00,
    protectedRegions: [{ name: 'nvs-default-guess', start: 0x9000, end: 0xe000 }],
    readPartitionTable: true,
  },

  // M5 Atom Lite：ESP32（PICO-D4 封裝，4 MB flash）。外接 USB 轉序列晶片（型號未查證）。
  'ir-atomlite': {
    id: 'ir-atomlite',
    label: { 'zh-TW': 'M5 Atom Lite 紅外線遙控器', en: 'M5 Atom Lite IR remote' },
    chip: 'ESP32', // 【文件】bundle：CHIP_NAME="ESP32"（封裝型號如 PICO-D4 只出現在 getChipDescription，不在 CHIP_NAME）
    flashSizeBytes: 4 * MB, // 【文件】M5 官方規格為 ESP32-PICO-D4（內建 4 MB）；尚未用真機讀回確認
    flashSizeCandidates: [4 * MB],
    hardwareVerified: false,
    recommendedBaud: 115200, // 外接 USB 轉序列晶片（型號未查證），高鮑率穩定性未知，先用最保守值；真機確認後再調
    bootMagic: 0xe9,
    bootloaderAddress: 0x1000, // 【文件】bundle：ESP32 BOOTLOADER_FLASH_OFFSET=4096；位址 0–0xFFF 是空的
    imageChipId: 0, // 【文件】bundle：ESP32 IMAGE_CHIP_ID=0
    partitionTableAddress: 0x8000, // 【文件】ESP-IDF 預設 0x8000；編譯產物實測同（未寫進真機）
    partitionTableLength: 0xc00,
    protectedRegions: [{ name: 'nvs-default-guess', start: 0x9000, end: 0xe000 }],
    readPartitionTable: true,
  },
};

export const SECTOR = 0x1000;

/** 依晶片名稱找設定檔；找不到回 null。 */
export function findProfileByChip(chip, profiles = PROFILES) {
  for (const p of Object.values(profiles)) if (p.chip === chip) return p;
  return null;
}

/** 把一組 [start,end) 區間排序、向外對齊 4 KB、合併相鄰／重疊。 */
export function normalizeRanges(ranges, sector = SECTOR) {
  const aligned = ranges
    .filter((r) => r.end > r.start)
    .map((r) => ({
      ...r,
      start: Math.floor(r.start / sector) * sector,
      end: Math.ceil(r.end / sector) * sector,
    }))
    .sort((a, b) => a.start - b.start);
  const out = [];
  for (const r of aligned) {
    const last = out[out.length - 1];
    if (last && r.start <= last.end) {
      last.end = Math.max(last.end, r.end);
      last.name = `${last.name}+${r.name}`;
    } else out.push({ ...r });
  }
  return out;
}

/** 從分區表位元組取出 NVS（data/nvs=0x02、data/nvs_keys=0x04）分區。 */
export function parsePartitionTableProtected(bytes) {
  const found = [];
  for (let off = 0; off + 32 <= bytes.length; off += 32) {
    if (!(bytes[off] === 0xaa && bytes[off + 1] === 0x50)) break; // 非項目（0xEB 0xEB 為 MD5 標記，0xFF 為空）
    const type = bytes[off + 2];
    const subtype = bytes[off + 3];
    const offset = new DataView(bytes.buffer, bytes.byteOffset + off + 4, 8).getUint32(0, true);
    const size = new DataView(bytes.buffer, bytes.byteOffset + off + 4, 8).getUint32(4, true);
    let label = '';
    for (let i = 0; i < 16 && bytes[off + 12 + i]; i++) label += String.fromCharCode(bytes[off + 12 + i]);
    if (type === 0x01 && (subtype === 0x02 || subtype === 0x04) && size > 0) {
      found.push({ name: `pt:${label || 'nvs'}`, start: offset, end: offset + size });
    }
  }
  return found;
}

export const PARTITION_TABLE_ADDRESS = 0x8000; // 設定檔沒寫 partitionTableAddress 時的預設
export const PARTITION_TABLE_LENGTH = 0xc00;

/** 設定檔的幾個晶片相關欄位（缺少時給 C3 時代的預設，行為與舊版相同）。 */
export function layoutOf(profile) {
  return {
    bootloaderAddress: profile.bootloaderAddress ?? 0,
    partitionTableAddress: profile.partitionTableAddress ?? PARTITION_TABLE_ADDRESS,
    partitionTableLength: profile.partitionTableLength ?? PARTITION_TABLE_LENGTH,
  };
}

/** 這個設定檔接受的 flash 容量（位元組）。容量不確定時列多個；引擎以「實際讀到的容量」為準，只要在清單內就放行。 */
export function acceptedFlashSizes(profile) {
  return profile.flashSizeCandidates && profile.flashSizeCandidates.length ? profile.flashSizeCandidates : [profile.flashSizeBytes];
}

/**
 * 檢查「要寫進 flash 的一段資料」若是從 address 開始，是不是合格的開機映像／完整映像。
 * 只處理會碰到開機程式的兩種情形：address 0（合併的 factory.bin；ESP32 的開機程式在 0x1000，前面是 0xFF 填充）
 * 與 address == bootloaderAddress（單獨的 bootloader.bin）。其他位址一律放行（回 {ok:true}）。
 * 回傳 {ok:true} 或 {ok:false, reason, expected?}，reason 與舊版引擎相同：boot-header／image-chip-id／no-partition-table。
 */
export function inspectBootImage(profile, data, address) {
  const { bootloaderAddress, partitionTableAddress } = layoutOf(profile);
  if (address !== 0 && address !== bootloaderAddress) return { ok: true };
  const off = bootloaderAddress - address; // 開機程式標頭在這段資料裡的位置（address=0 時就是 bootloaderAddress，否則 0）
  if (data[off] !== profile.bootMagic) return { ok: false, reason: 'boot-header' };
  if (profile.imageChipId != null && (data.length < off + 16 || (data[off + 12] | (data[off + 13] << 8)) !== profile.imageChipId)) {
    return { ok: false, reason: 'image-chip-id', expected: profile.imageChipId };
  }
  // 這段資料若涵蓋到分區表位置，就必須是「完整映像」（分區表有 0xAA50 魔數）。
  // 只有 app 的映像（OTA 型）開頭同樣是 0xE9，寫到開機位置會蓋掉開機程式，所以拒絕。
  const rel = partitionTableAddress - address;
  if (rel >= 0 && data.length > rel && !(data[rel] === 0xaa && data[rel + 1] === 0x50)) {
    return { ok: false, reason: 'no-partition-table' };
  }
  return { ok: true };
}
