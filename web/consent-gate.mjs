// 同意閘門的純邏輯（沒有 DOM，可用 node --test 測）。
// 引擎只檢查「版本＝目前條款版本、時間可解析且不在未來」；30 天到期、捲到底、四項勾選、確認詞都在這裡。
// 條款版本一律來自引擎的 CURRENT_TERMS_VERSION，這裡不另寫死。

import { CURRENT_TERMS_VERSION } from '../engine/consent.mjs';

export { CURRENT_TERMS_VERSION };

export const CONSENT_STORAGE_KEY = 'flasher.consent.v1';
export const CONSENT_MAX_AGE_DAYS = 30;
export const CONSENT_MAX_AGE_MS = CONSENT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
export const AGREE_ITEM_COUNT = 4;
export const SCROLL_TOLERANCE_PX = 4;

/** 判斷條款區是否已捲到最底（內容不需捲動時視為已到底）。 */
export function isScrolledToEnd({ scrollTop, clientHeight, scrollHeight }, tolerance = SCROLL_TOLERANCE_PX) {
  if (![scrollTop, clientHeight, scrollHeight].every((n) => Number.isFinite(n))) return false;
  if (scrollHeight <= clientHeight + tolerance) return true; // 內容一屏放得下，沒有東西可捲
  return scrollTop + clientHeight >= scrollHeight - tolerance;
}

/** 確認詞：「我同意」或 I AGREE，不分大小寫、不分頁面語言、忽略前後與多餘空白（含全形空白）。 */
export function isConfirmWord(input) {
  if (typeof input !== 'string') return false;
  const s = input.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
  return s === '我同意' || s === 'i agree';
}

/**
 * 閘門進度：三項缺一不可。checks 必須恰好四個、且每個都是 true（不可一次全勾由介面保證：每個勾選各自獨立）。
 * @param {{scrolledToEnd:boolean, checks:boolean[], word:string}} s
 */
export function gateProgress({ scrolledToEnd, checks, word }) {
  const arr = Array.isArray(checks) ? checks : [];
  const allChecked = arr.length === AGREE_ITEM_COUNT && arr.every((v) => v === true);
  const wordOk = isConfirmWord(word);
  const scrolled = scrolledToEnd === true;
  return { scrolled, allChecked, wordOk, canAgree: scrolled && allChecked && wordOk };
}

/** 同意紀錄（存在 localStorage 與給網友下載的內容）：只有這三個欄位。 */
export function makeRecord(nowMs, lang, termsVersion = CURRENT_TERMS_VERSION) {
  return { termsVersion, acceptedAt: new Date(nowMs).toISOString(), lang: lang === 'en' ? 'en' : 'zh' };
}

/** 交給引擎的同意物件（引擎的 consent 只收 termsVersion 與 acceptedAt）。 */
export function consentForEngine(record) {
  return { termsVersion: record.termsVersion, acceptedAt: record.acceptedAt };
}

function parseRecord(raw) {
  let obj = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  if (typeof obj.termsVersion !== 'string' || obj.termsVersion === '') return null;
  if (typeof obj.acceptedAt !== 'string') return null;
  const at = Date.parse(obj.acceptedAt);
  if (!Number.isFinite(at)) return null;
  return { termsVersion: obj.termsVersion, acceptedAt: obj.acceptedAt, at, lang: obj.lang === 'en' ? 'en' : 'zh' };
}

/**
 * 判斷本機保存的同意紀錄是否仍有效。
 * @returns {{status:'valid', record:object}
 *          | {status:'none'}
 *          | {status:'outdated', reason:'version'|'expired'|'invalid'|'future', previous:{termsVersion?:string, acceptedAt?:string}|null}}
 */
export function evaluateStoredConsent(raw, nowMs, requiredVersion = CURRENT_TERMS_VERSION) {
  if (raw === null || raw === undefined || raw === '') return { status: 'none' };
  const rec = parseRecord(raw);
  if (!rec) return { status: 'outdated', reason: 'invalid', previous: null };
  const previous = { termsVersion: rec.termsVersion, acceptedAt: rec.acceptedAt };
  if (rec.termsVersion !== requiredVersion) return { status: 'outdated', reason: 'version', previous };
  if (rec.at > nowMs) return { status: 'outdated', reason: 'future', previous };
  if (nowMs - rec.at > CONSENT_MAX_AGE_MS) return { status: 'outdated', reason: 'expired', previous };
  return { status: 'valid', record: { termsVersion: rec.termsVersion, acceptedAt: rec.acceptedAt, lang: rec.lang } };
}

/** localStorage 的包裝：全部 try/catch；讀不到、寫不進都不丟例外（讀不到＝視為未同意）。 */
export function createConsentStore(storage) {
  const safe = (fn, fallback) => {
    try {
      return fn();
    } catch {
      return fallback;
    }
  };
  return {
    read: () => safe(() => (storage ? storage.getItem(CONSENT_STORAGE_KEY) : null), null),
    write: (record) => safe(() => { storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record)); return true; }, false),
    clear: () => safe(() => { storage.removeItem(CONSENT_STORAGE_KEY); return true; }, false),
  };
}

/** 「下載我的同意紀錄」的檔案內容：只有 {termsVersion, acceptedAt, lang}。 */
export function consentRecordJson(record) {
  return JSON.stringify({ termsVersion: record.termsVersion, acceptedAt: record.acceptedAt, lang: record.lang }, null, 2) + '\n';
}
