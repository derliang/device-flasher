// 操作層確認與還原檔案檢查的純邏輯（沒有 DOM）。
// 這裡的檢查只用來「顯示逐項結果」；真正的把關在引擎（restore() 會重新驗證，並丟對應錯誤碼）。

/**
 * 操作層確認：所有（目前看得到的）必勾項都勾了才能按。
 * 2026-11-22 起不再要求輸入 MAC 末 4 碼（使用者決定：設備是自己接上電腦的，MAC 只當資訊顯示）。
 * @param {{checks:boolean[]}} s
 */
export function confirmReady({ checks }) {
  return Array.isArray(checks) && checks.length > 0 && checks.every((v) => v === true);
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

/** 分區表位置與魔數（與引擎 profiles.mjs 一致）。 */
const PT_ADDRESS = 0x8000;

/**
 * 自訂韌體（使用者自己的 .bin）的逐項檢查。只接受「完整映像」（從位址 0 寫入、0x8000 有分區表，
 * 例如 ESPHome 的 factory 型）；只有 app 的 OTA 型映像開頭也是 0xE9，但寫到位址 0 會蓋掉開機程式，一律拒絕。
 * 真正的把關仍在引擎（update() 會重新檢查標頭、晶片 ID、分區表與容量）。
 * @param {{binLength:number, head:Uint8Array|null, sha256:string, device:{flashSizeBytes:number|null}, imageChipId:number, bootMagic?:number}} s
 *   head：檔案開頭至少 0x8002 位元組（檔案較小時就是整個檔案）
 * @returns {{items:{id:string, level:'ok'|'no'|'info', data:object}[], hardFail:boolean, kind:'factory'|'app-only'|'unknown'}}
 */
export function customFirmwareChecks({ binLength, head, sha256, device, imageChipId, bootMagic = 0xe9 }) {
  const items = [];
  const push = (id, level, data = {}) => items.push({ id, level, data });
  const h = head || new Uint8Array(0);
  const max = device && device.flashSizeBytes;

  const sizeOk = Number.isInteger(binLength) && binLength > 0 && !!max && binLength <= max;
  push('size', sizeOk ? 'ok' : 'no', { actual: binLength, max });
  const headerOk = h.length > 0 && h[0] === bootMagic;
  push('header', headerOk ? 'ok' : 'no', { actual: h[0] });
  const chipId = h.length >= 14 ? h[12] | (h[13] << 8) : null;
  push('imgchip', chipId === imageChipId ? 'ok' : 'no', { actual: chipId, expected: imageChipId });
  const hasPt = h.length >= PT_ADDRESS + 2 && h[PT_ADDRESS] === 0xaa && h[PT_ADDRESS + 1] === 0x50;
  const kind = hasPt ? 'factory' : headerOk ? 'app-only' : 'unknown';
  push('layout', hasPt ? 'ok' : 'no', { kind });
  push('sha', 'info', { sha256 });
  return { items, hardFail: items.some((i) => i.level === 'no'), kind };
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
