// 網址 #hash 的解讀（純邏輯）。規則：
// 1. 未同意（或已按不同意）時，任何 hash 都不能直達功能畫面：一律回閘門。
// 2. 同意後只認兩個安全的入口：#sensor、#terms；其他（例如 #backup-done 這類內部畫面名稱）一律當作 #sensor。
//    功能畫面是依設備與操作狀態一步步到的，不能用網址直接跳（跳過去也沒有備份／設備可用）。

export const VALID_HASH_TARGETS = ['sensor', 'terms'];

/** '#terms' → 'terms'；不認得的回 null。 */
export function parseHash(hash) {
  const h = String(hash || '').replace(/^#/, '').trim().toLowerCase();
  return VALID_HASH_TARGETS.includes(h) ? h : null;
}

/**
 * @param {{hash:string, consented:boolean, declined?:boolean}} s
 * @returns {{view:'gate'|'declined'|'tool', target?:'sensor'|'terms'}}
 */
export function resolveRoute({ hash, consented, declined = false }) {
  if (!consented) return { view: declined ? 'declined' : 'gate' };
  return { view: 'tool', target: parseHash(hash) || 'sensor' };
}

/** 瀏覽器環境是否能刷寫：要有 Web Serial 且是安全環境（https 或 localhost）。 */
export function serialSupported({ nav, secure }) {
  return !!nav && 'serial' in nav && secure === true;
}
