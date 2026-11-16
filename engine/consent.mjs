// 免責聲明同意的「技術強制」。
// 單一來源：條款版本更新時只改這個常數（以及網頁上的條款文字），引擎就會拒絕舊版同意。

export const CURRENT_TERMS_VERSION = 'v0.1';

/**
 * 檢查同意物件 `{termsVersion, acceptedAt}`。
 * 只檢查「引擎層」能判斷的事：存在、格式、版本等於目前條款版本、時間可解析且不在未來。
 * （30 天到期、勾選項、確認詞屬於網頁層，不在這裡。）
 *
 * @param {unknown} consent
 * @param {number} nowMs 目前時間（毫秒）
 * @returns {{valid:true, termsVersion:string, acceptedAt:number} | {valid:false, reason:'missing'|'invalid-format'|'version-outdated'|'in-future', termsVersion:string|null}}
 */
export function checkConsent(consent, nowMs) {
  const bad = (reason, termsVersion = null) => ({ valid: false, reason, termsVersion });
  if (consent === undefined || consent === null) return bad('missing');
  if (typeof consent !== 'object' || Array.isArray(consent)) return bad('invalid-format');
  const { termsVersion, acceptedAt } = consent;
  if (termsVersion === undefined || termsVersion === null || acceptedAt === undefined || acceptedAt === null) {
    return bad('missing', typeof termsVersion === 'string' ? termsVersion : null);
  }
  if (typeof termsVersion !== 'string' || termsVersion === '') return bad('invalid-format');
  let at;
  if (typeof acceptedAt === 'string') at = acceptedAt.trim() === '' ? NaN : Date.parse(acceptedAt);
  else if (acceptedAt instanceof Date) at = acceptedAt.getTime();
  else if (typeof acceptedAt === 'number') at = acceptedAt;
  else at = NaN;
  if (!Number.isFinite(at)) return bad('invalid-format', termsVersion);
  if (termsVersion !== CURRENT_TERMS_VERSION) return bad('version-outdated', termsVersion);
  if (at > nowMs) return bad('in-future', termsVersion);
  return { valid: true, termsVersion, acceptedAt: at };
}

/** 深拷貝成純值並凍結，避免之後被外部改動。 */
export function snapshotConsent(consent) {
  if (consent === undefined || consent === null || typeof consent !== 'object' || Array.isArray(consent)) return consent;
  const at = consent.acceptedAt instanceof Date ? consent.acceptedAt.getTime() : consent.acceptedAt;
  return Object.freeze({ termsVersion: consent.termsVersion, acceptedAt: at });
}

export function sameConsent(live, snap) {
  if (live === snap) return true;
  if (!live || !snap || typeof live !== 'object' || typeof snap !== 'object') return false;
  const at = live.acceptedAt instanceof Date ? live.acceptedAt.getTime() : live.acceptedAt;
  return live.termsVersion === snap.termsVersion && at === snap.acceptedAt;
}
