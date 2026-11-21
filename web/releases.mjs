// releases.json 的解讀（純邏輯）：決定韌體能不能下載、下載哪一筆、下載後怎麼驗證。
// 容錯：發佈腳本目前輸出「陣列」（每筆有 device／kind／file／size／sha256／available…），
// 設計規範寫的是 {schema, terms_version, releases:[…]}；兩種都收。讀不到或格式錯一律當「尚未開放」，不顯示錯誤頁。

export const DEVICE_ALIASES = { presence: ['presence', 'presence-c3'] };

const SHA256_HEX = /^[0-9a-f]{64}$/;

/**
 * 版本字串以 "." 分段逐段數字比較；回傳 -1／0／1；無法解析的段視為 0。
 * 日期編號（2026.11.21、2026.11.21.2）與舊式（4.3.2）都適用：日期編號第一段是年份，一定比舊式大。
 */
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

/** 網頁最多列出幾個可下載版本（發佈腳本也只保留這麼多版）。 */
export const MAX_LISTED_RELEASES = 5;

/** 日期編號版本：YYYY.MM.DD，同一天第二版起加 .N（N ≥ 2），例如 2026.11.21、2026.11.21.2。 */
const DATE_VERSION = /^(\d{4})\.(\d{2})\.(\d{2})(?:\.([2-9]|[1-9]\d+))?$/;

/** 是否為合法的日期編號版本（月 01–12、日 01–31，且是真的存在的日期）。 */
export function isDateVersion(v) {
  const m = DATE_VERSION.exec(String(v ?? ''));
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** 畫面上的版本文字：日期編號原樣顯示；其他（舊式 4.3.2）前面加 v。 */
export function displayVersion(v) {
  const s = String(v ?? '').replace(/^v/i, '');
  if (!s) return '';
  return isDateVersion(s) ? s : `v${s}`;
}

/**
 * 某個設備可下載的版本清單：新到舊、同版本只留第一筆、最多 max 筆（預設 5）。
 * kind 有指定時只看該種檔（例如感應器更新要 'factory'）；release 沒有 kind 欄位視為符合。
 */
export function listReleases(releases, device, kind, max = MAX_LISTED_RELEASES) {
  const names = DEVICE_ALIASES[device] || [device];
  const ok = parseReleases(releases).filter(
    (r) => names.includes(r.device) && (!kind || r.kind === undefined || r.kind === null || r.kind === kind) && isDownloadable(r),
  );
  ok.sort((a, b) => compareVersions(b.version, a.version));
  const out = [];
  const seen = new Set();
  for (const r of ok) {
    const key = String(r.version).replace(/^v/i, '');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length >= max) break;
  }
  return out;
}

/** 取某個設備「版本最高且可下載」的一筆；沒有符合者回 null（＝韌體尚未開放）。 */
export function pickRelease(releases, device, kind) {
  return listReleases(releases, device, kind, 1)[0] || null;
}

/** 發行說明（純文字）：notes 可為 {zh, en}（或 zh-TW）或字串；沒有回 ''。長度上限 500 字，去掉控制字元。 */
export function releaseNotes(r, lang) {
  const n = r && r.notes;
  let s = '';
  if (typeof n === 'string') s = n;
  else if (n && typeof n === 'object') {
    const pick = lang === 'zh' ? n.zh ?? n['zh-TW'] ?? n.en : n.en ?? n.zh ?? n['zh-TW'];
    s = typeof pick === 'string' ? pick : '';
  }
  return s.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').slice(0, 500);
}

/** 發行日期：只接受 YYYY-MM-DD；其他回 ''。 */
export function releaseDate(r) {
  const d = r && typeof r.date === 'string' ? r.date : '';
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '';
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
