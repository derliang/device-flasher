// 操作層確認與還原檔案檢查的純邏輯（沒有 DOM）。
// 這裡的檢查只用來「顯示逐項結果」；真正的把關在引擎（restore() 會重新驗證，並丟對應錯誤碼）。
import { PROFILES, layoutOf } from '../engine/profiles.mjs';

/**
 * 辨識結果能不能開放操作（畫面層的第一道判斷；引擎另有自己的閘門，不靠這裡）。
 * - 'ok'：設定檔相符、且已在真機驗證 → 可操作。
 * - 'unverified'：設定檔相符、但 profileVerified 不是 true（只過假設備測試）→ 一律不開放任何操作。
 * - 'wrong-flash'／'wrong-chip'：晶片或容量不符 → 不開放；wrong-chip 時 `boards` 列出「晶片相同的其他設定檔」，
 *   只用來告訴使用者「這片可能是哪一種板子」（同一種晶片有很多板子，這只是從晶片推測，不是確認）。
 * @param {{chip?:string, profile?:string|null, profileMatch?:boolean, profileVerified?:boolean, reason?:string|null}|null} device identify() 的回傳
 * @returns {{usable:boolean, state:'ok'|'unverified'|'wrong-flash'|'wrong-chip'|'none', boards:{id:string, label:{'zh-TW':string,en:string}, verified:boolean}[]}}
 */
export function deviceAccess(device) {
  if (!device) return { usable: false, state: 'none', boards: [] };
  if (device.profileMatch === true && device.profileVerified === true) return { usable: true, state: 'ok', boards: [] };
  if (device.profileMatch === true) return { usable: false, state: 'unverified', boards: [] };
  const state = device.reason === 'wrong-flash' ? 'wrong-flash' : 'wrong-chip';
  const boards = Object.values(PROFILES)
    .filter((p) => p.chip === device.chip && p.id !== device.profile)
    .map((p) => ({ id: p.id, label: p.label, verified: p.hardwareVerified === true }));
  return { usable: false, state, boards };
}

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
 * 開機標頭的位置依晶片（設定檔的 bootloaderAddress：C3／C6／S3 = 0，ESP32 = 0x1000）：
 * 給 `bin` 加 `profile` 就讀設定檔指定的位置；沒給就用 `firstByte`（位址 0 的第一個位元組，舊版行為）。
 * @param {{binLength:number, firstByte?:number|undefined, bin?:Uint8Array|null, profile?:object|null, sha256:string, meta:object|null, metaError?:string|null,
 *          device:{chip:string, mac:string, flashSizeBytes:number|null}}} s
 * @returns {{items:{id:string, level:'ok'|'no'|'warn', data:object}[], hardFail:boolean, macDiffers:boolean}}
 */
export function restoreChecks({ binLength, firstByte, bin, profile, sha256, meta, metaError, device }) {
  const items = [];
  const push = (id, level, data = {}) => items.push({ id, level, data });

  push('size', binLength === device.flashSizeBytes ? 'ok' : 'no', { actual: binLength, expected: device.flashSizeBytes });
  const bootAt = profile ? layoutOf(profile).bootloaderAddress : 0;
  const magic = profile && profile.bootMagic != null ? profile.bootMagic : 0xe9;
  const headerByte = bin && profile ? bin[bootAt] : firstByte;
  push('header', headerByte === magic ? 'ok' : 'no', { actual: headerByte, at: bootAt });

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

/** 分區表位置（沒帶設定檔時的預設，與引擎 profiles.mjs 的預設一致）。 */
const PT_ADDRESS = 0x8000;

/**
 * 自訂韌體（使用者自己的 .bin）的逐項檢查。只接受「完整映像」（從位址 0 寫入、0x8000 有分區表，
 * 例如 ESPHome 的 factory 型）；只有 app 的 OTA 型映像開頭也是 0xE9，但寫到位址 0 會蓋掉開機程式，一律拒絕。
 * 真正的把關仍在引擎（update() 會重新檢查標頭、晶片 ID、分區表與容量）。
 * 位置依晶片：`bootloaderAddress`（開機標頭與映像晶片 ID 的位置，ESP32 = 0x1000，其餘 0）、
 * `partitionTableAddress`（預設 0x8000）；都從設定檔的 layoutOf() 取得，沒帶就是 C3 時代的預設。
 * @param {{binLength:number, head:Uint8Array|null, sha256:string, device:{flashSizeBytes:number|null}, imageChipId:number, bootMagic?:number,
 *          bootloaderAddress?:number, partitionTableAddress?:number}} s
 *   head：檔案開頭至少「分區表位置＋2」位元組（檔案較小時就是整個檔案）
 * @returns {{items:{id:string, level:'ok'|'no'|'info', data:object}[], hardFail:boolean, kind:'factory'|'app-only'|'unknown'}}
 */
export function customFirmwareChecks({ binLength, head, sha256, device, imageChipId, bootMagic = 0xe9, bootloaderAddress = 0, partitionTableAddress = PT_ADDRESS }) {
  const items = [];
  const push = (id, level, data = {}) => items.push({ id, level, data });
  const h = head || new Uint8Array(0);
  const max = device && device.flashSizeBytes;

  const sizeOk = Number.isInteger(binLength) && binLength > 0 && !!max && binLength <= max;
  push('size', sizeOk ? 'ok' : 'no', { actual: binLength, max });
  const bl = bootloaderAddress;
  const headerOk = h.length > bl && h[bl] === bootMagic;
  push('header', headerOk ? 'ok' : 'no', { actual: h[bl], at: bl });
  const chipId = h.length >= bl + 14 ? h[bl + 12] | (h[bl + 13] << 8) : null;
  push('imgchip', chipId === imageChipId ? 'ok' : 'no', { actual: chipId, expected: imageChipId });
  const pt = partitionTableAddress;
  const hasPt = h.length >= pt + 2 && h[pt] === 0xaa && h[pt + 1] === 0x50;
  const kind = hasPt ? 'factory' : headerOk ? 'app-only' : 'unknown';
  push('layout', hasPt ? 'ok' : 'no', { kind, at: pt });
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
