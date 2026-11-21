// 設備設定檔。晶片或 flash 容量不符 → 引擎拒絕所有寫入。
// 標示：【文件】來自專案文件／esptool-js 原始碼；【推測】未在真機驗證。

const MB = 1024 * 1024;

export const PROFILES = {
  // 人體感應器：ESP32-C3，4 MB（ESPHome：variant esp32c3、flash_size 4MB）。目前唯一支援的設備。
  presence: {
    id: 'presence',
    label: { 'zh-TW': '人體感應器', en: 'Presence sensor' },
    chip: 'ESP32-C3',
    flashSizeBytes: 4 * MB,
    // ESP32-C3 USB 原生序列（USB-Serial/JTAG）；建議 460800（921600 在瀏覽器曾不穩，不用）。
    // 網頁以此為連線鮑率，失敗時退回 115200。
    recommendedBaud: 460800,
    // 位址 0 的開機映像第一個位元組：ESP_IMAGE_MAGIC = 0xE9（esptool-js bundle 內 ESP_IMAGE_MAGIC=233）。
    // ESP32-C3 的 bootloader 就在 flash 位址 0x0。
    bootMagic: 0xe9,
    // 映像擴充標頭的晶片 ID（位址 0 開機映像的第 12–13 位元組，little-endian）：ESP32-C3 = 5
    // 【文件】esptool-js bundle 內 ESP32-C3 的 IMAGE_CHIP_ID=5。寫到位址 0 的映像晶片 ID 不符就拒絕。
    imageChipId: 5,
    // 受保護區。靜態部分是「讀不到分區表時」的保底；實際更新時會再讀設備上的分區表，
    // 把 type=data/subtype=nvs（含 nvs_keys）的分區也加進去。
    // 【推測】ESPHome 使用 esp-idf 框架，NVS 的確切範圍要看實際分區表，所以才動態讀。
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

export const PARTITION_TABLE_ADDRESS = 0x8000;
export const PARTITION_TABLE_LENGTH = 0xc00;
