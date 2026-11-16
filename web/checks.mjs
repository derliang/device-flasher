// 操作層確認與還原檔案檢查的純邏輯（沒有 DOM）。
// 這裡的檢查只用來「顯示逐項結果」；真正的把關在引擎（restore() 會重新驗證，並丟對應錯誤碼）。

/** MAC 末 4 碼（十六進位、大寫），例如最後兩組是 34、56 → "3456"。MAC 格式不對回 null。 */
export function macTail(mac) {
  if (typeof mac !== 'string') return null;
  const hex = mac.replace(/[:\-\s]/g, '');
  if (!/^[0-9a-fA-F]{12}$/.test(hex)) return null;
  return hex.slice(-4).toUpperCase();
}

/** 使用者輸入的末 4 碼是否正確（不分大小寫、忽略前後空白）。 */
export function tailMatches(input, mac) {
  const want = macTail(mac);
  if (!want || typeof input !== 'string') return false;
  return input.trim().toUpperCase() === want;
}

/**
 * 操作層確認：所有必勾項都勾了；需要輸入末 4 碼時要輸入正確。
 * @param {{checks:boolean[], needTail:boolean, tailInput:string, mac:string}} s
 */
export function confirmReady({ checks, needTail, tailInput, mac }) {
  if (!Array.isArray(checks) || checks.length === 0 || !checks.every((v) => v === true)) return false;
  if (needTail && !tailMatches(tailInput, mac)) return false;
  return true;
}

/**
 * 還原檔案的逐項檢查（大小、開機標頭、晶片、SHA-256 四項＋MAC 警告）。
 * @param {{binLength:number, firstByte:number|undefined, sha256:string, meta:object|null, metaError?:string|null,
 *          device:{chip:string, mac:string, flashSizeBytes:number|null}}} s
 * @returns {{items:{id:string, level:'ok'|'no'|'warn', data:object}[], hardFail:boolean, macDiffers:boolean}}
 */
export function restoreChecks({ binLength, firstByte, sha256, meta, metaError, device }) {
  const items = [];
  const push = (id, level, data = {}) => items.push({ id, level, data });

  push('size', binLength === device.flashSizeBytes ? 'ok' : 'no', { actual: binLength, expected: device.flashSizeBytes });
  push('header', firstByte === 0xe9 ? 'ok' : 'no', { actual: firstByte });

  if (!meta) {
    push('meta', 'no', { reason: metaError || 'missing' });
    return { items, hardFail: true, macDiffers: false };
  }
  push('chip', meta.chip === device.chip ? 'ok' : 'no', { backupChip: meta.chip, deviceChip: device.chip });
  const shaOk = typeof meta.sha256 === 'string' && meta.sha256.toLowerCase() === sha256;
  push('sha', shaOk ? 'ok' : 'no', {});
  const norm = (m) => String(m || '').toLowerCase().replace(/[^0-9a-f]/g, '');
  const macDiffers = norm(meta.mac) !== norm(device.mac);
  if (macDiffers) push('mac', 'warn', { backupMac: meta.mac, deviceMac: device.mac });
  return { items, hardFail: items.some((i) => i.level === 'no'), macDiffers };
}

/** 備份檔名中的 MAC 是否看得出來是同一台（僅供檔案列顯示用，不作為判斷依據）。 */
export function safeFileLabel(name) {
  return String(name || '').replace(/[\u0000-\u001f<>]/g, '').slice(0, 120);
}

/** 錯誤報告（複製到剪貼簿，不上傳）：只放錯誤碼、細節與環境版本；不含個人資料。 */
export function buildErrorReport({ error, engineVersion, termsVersion, stage, nowIso }) {
  const e = error || {};
  return JSON.stringify(
    {
      report: 'flasher-error',
      at: nowIso,
      stage: stage || null,
      code: e.code || 'unknown',
      messageKey: e.messageKey || null,
      partialWrite: e.partialWrite === true,
      details: e.details || null,
      engineVersion: engineVersion || null,
      termsVersion: termsVersion || null,
    },
    null,
    2,
  );
}
