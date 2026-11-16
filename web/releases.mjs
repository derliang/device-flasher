// releases.json 的解讀（純邏輯）：決定韌體能不能下載、下載哪一筆、下載後怎麼驗證。
// 容錯：發佈腳本目前輸出「陣列」（每筆有 device／kind／file／size／sha256／available…），
// 設計規範寫的是 {schema, terms_version, releases:[…]}；兩種都收。讀不到或格式錯一律當「尚未開放」，不顯示錯誤頁。

export const DEVICE_ALIASES = { presence: ['presence', 'presence-c3'], s31: ['s31'] };

const SHA256_HEX = /^[0-9a-f]{64}$/;

/** 版本字串以 "." 分段逐段數字比較；回傳 -1／0／1；無法解析的段視為 0。 */
export function compareVersions(a, b) {
  const seg = (v) => String(v ?? '').replace(/^v/i, '').split('.').map((x) => (/^\d+$/.test(x) ? Number(x) : 0));
  const A = seg(a);
  const B = seg(b);
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const d = (A[i] ?? 0) - (B[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

/** 把任何輸入整理成 release 陣列；不是預期格式 → []。 */
export function parseReleases(input) {
  let data = input;
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input);
    } catch {
      return [];
    }
  }
  const list = Array.isArray(data) ? data : data && Array.isArray(data.releases) ? data.releases : [];
  return list.filter((r) => r && typeof r === 'object' && typeof r.device === 'string');
}

/** 一筆 release 是否真的可下載：available 必須嚴格等於 true，且有檔案路徑、大小、64 位小寫十六進位 sha256。 */
export function isDownloadable(r) {
  return (
    !!r &&
    r.available === true &&
    typeof r.file === 'string' &&
    r.file.trim() !== '' &&
    Number.isInteger(r.size) &&
    r.size > 0 &&
    typeof r.sha256 === 'string' &&
    SHA256_HEX.test(r.sha256) &&
    typeof r.version === 'string' &&
    r.version !== ''
  );
}

/**
 * 取某個設備「版本最高且可下載」的一筆；沒有符合者回 null（＝韌體尚未開放）。
 * kind 有指定時只看該種檔（例如感應器更新要 'factory'）；release 沒有 kind 欄位視為符合。
 */
export function pickRelease(releases, device, kind) {
  const names = DEVICE_ALIASES[device] || [device];
  const ok = parseReleases(releases).filter(
    (r) => names.includes(r.device) && (!kind || r.kind === undefined || r.kind === null || r.kind === kind) && isDownloadable(r),
  );
  if (ok.length === 0) return null;
  return ok.reduce((best, r) => (compareVersions(r.version, best.version) > 0 ? r : best));
}

/** S31 解鎖版（日後）：只有 releases 有 s31 且 available:true 才可能顯示；第一版畫面一律不實作，只顯示「尚未開放」。 */
export function s31Unlocked(releases) {
  return parseReleases(releases).some((r) => r.device === 's31' && r.available === true);
}

/** 檔案網址 = 相對於 releases.json 所在網址解析（file 是公開 repo 內的相對路徑）。拒絕跨來源與 data/blob/javascript。 */
export function resolveFileUrl(file, releasesUrl) {
  const url = new URL(file, releasesUrl);
  const base = new URL(releasesUrl);
  if (url.origin !== base.origin || !/^https?:$/.test(url.protocol)) throw new Error('cross-origin-or-bad-scheme');
  return url.href;
}

export function bytesToHex(u8) {
  let s = '';
  for (const b of u8) s += b.toString(16).padStart(2, '0');
  return s;
}

/** 下載後核對：大小與 SHA-256 都要與 releases.json 相同，不符就丟錯（頁面要中止並顯示錯誤，不可寫入）。 */
export async function verifyDownload(bytes, release, subtle) {
  if (bytes.length !== release.size) {
    const e = new Error('download-size-mismatch');
    e.code = 'download-size-mismatch';
    e.details = { expected: release.size, actual: bytes.length };
    throw e;
  }
  const digest = bytesToHex(new Uint8Array(await subtle.digest('SHA-256', bytes)));
  if (digest !== release.sha256) {
    const e = new Error('download-hash-mismatch');
    e.code = 'download-hash-mismatch';
    e.details = { expected: release.sha256, actual: digest };
    throw e;
  }
  return digest;
}
