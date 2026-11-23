// 刷機引擎（無 DOM、無畫面）。依賴注入：ESPLoader、Transport、serial、now、crypto、io 都由外面傳入。
// 對 esptool-js 0.5.4 的假設都有對照 vendor/esptool-js-0.5.4/bundle.js（見 test/contract.test.mjs）。
// 設計與未驗證事項：見 README.md。

import { md5Hex } from './md5.mjs';
import { CURRENT_TERMS_VERSION, checkConsent, snapshotConsent, sameConsent } from './consent.mjs';
import { FlasherError, isFlasherError } from './errors.mjs';
import {
  PROFILES,
  SECTOR,
  acceptedFlashSizes,
  findProfileByChip,
  inspectBootImage,
  layoutOf,
  normalizeRanges,
  parsePartitionTableProtected,
} from './profiles.mjs';

export const ENGINE_VERSION = '0.4.0';
export { CURRENT_TERMS_VERSION };
const READ_CHUNK = 0x10000; // 64 KB：分塊讀取，才能在塊與塊之間中止、回報進度
// 連線與單塊讀取偶爾會卡住不動，esptool-js 自己要等很久才逾時；重新連線（重新載入 stub）後就能繼續。
// 所以引擎自己設逾時、重連、重試，不等 esptool-js。
const CONNECT_TIMEOUT_MS = 20000; // 單次連線（重置、同步、載入 stub）最長等待
const CHUNK_TIMEOUT_MS = 20000; // 64 KB 單塊讀取最長等待（正常約 1～5 秒）
const CONNECT_ATTEMPTS = 3; // 每種鮑率最多試幾次
const CHUNK_RECOVERIES = 3; // 單塊讀取失敗後，最多重連幾次再重讀

// ---------- 小工具 ----------

function throwIfAborted(signal) {
  if (signal && signal.aborted) throw new FlasherError('aborted');
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** 讓 promise 在 ms 毫秒內沒結果就以 makeErr() 失敗；原 promise 之後的失敗不會變成未處理的拒絕。 */
function withTimeout(promise, ms, makeErr) {
  promise.catch(() => {});
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(makeErr()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function toU8(data) {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  throw new TypeError('expected Uint8Array/ArrayBuffer');
}

/** esptool-js 0.5.4 的 writeFlash 要的 data 是「二進位字串」（bundle 內 bstrToUi8／ui8ToBstr），不是 Uint8Array。 */
export function u8ToBinaryString(u8) {
  const CH = 0x8000;
  let out = '';
  for (let i = 0; i < u8.length; i += CH) out += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
  return out;
}

function hex(buf) {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

function normMac(mac) {
  return String(mac || '').toLowerCase().replace(/[^0-9a-f]/g, '');
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function isAllFF(u8) {
  for (let i = 0; i < u8.length; i++) if (u8[i] !== 0xff) return false;
  return true;
}

/** 從 [a,b) 扣掉 protectedRanges（已排序、合併），回傳剩下的 [{start,end}] */
function subtractRanges(a, b, protectedRanges) {
  const out = [];
  let cur = a;
  for (const p of protectedRanges) {
    if (p.end <= cur || p.start >= b) continue;
    if (p.start > cur) out.push({ start: cur, end: p.start });
    cur = Math.max(cur, p.end);
  }
  if (cur < b) out.push({ start: cur, end: b });
  return out;
}

// ---------- 預設的存檔 io（瀏覽器）----------
// 與畫面無關，但碰 showSaveFilePicker／Blob 下載，所以獨立成可注入的物件。
export function createBrowserIo(scope = globalThis) {
  return {
    async saveFile({ name, bytes, mime = 'application/octet-stream', description = 'file', ext = '' }) {
      if (typeof scope.showSaveFilePicker === 'function') {
        try {
          const handle = await scope.showSaveFilePicker({
            suggestedName: name,
            types: [{ description, accept: { [mime]: [ext || '.' + name.split('.').pop()] } }],
          });
          const w = await handle.createWritable();
          await w.write(bytes);
          await w.close();
          let verified = false;
          try {
            const f = await handle.getFile();
            verified = f.size === bytes.length;
          } catch { /* 讀回失敗就當作沒驗證 */ }
          if (!verified) throw new Error('saved-file-size-mismatch');
          return { method: 'picker', name: handle.name || name, verifiable: true };
        } catch (e) {
          if (e && e.name === 'AbortError') throw e; // 使用者取消，不退回下載
          // 其他情況（不支援、使用者啟動權杖已用掉…）退回 Blob 下載
        }
      }
      if (!scope.document || !scope.URL || typeof scope.Blob !== 'function') {
        throw new Error('no-save-method');
      }
      const url = scope.URL.createObjectURL(new scope.Blob([bytes], { type: mime }));
      try {
        const a = scope.document.createElement('a');
        a.href = url;
        a.download = name;
        a.rel = 'noopener';
        scope.document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        setTimeout(() => scope.URL.revokeObjectURL(url), 10000);
      }
      // 瀏覽器不會告訴我們使用者有沒有真的留下檔案 → verifiable:false，畫面應請使用者確認。
      return { method: 'download', name, verifiable: false };
    },
  };
}

// ---------- 引擎 ----------

export function createFlasher(deps) {
  return new Flasher(deps);
}

export class Flasher {
  #ESPLoader;
  #Transport;
  #serial;
  #now;
  #crypto;
  #io;
  #profiles;
  #terminal;
  #transport = null;
  #loader = null;
  #port = null;
  #baud = 115200;
  #device = null; // identify() 的結果
  #busy = false;
  #backupState = null; // {saved, mac, sha256, files, method, verifiable}
  #noBackupLog = []; // 沒有已存檔備份就寫入的紀錄（只在記憶體，不上傳）
  #consentLive;
  #consentSnap;

  constructor({ ESPLoader, Transport, serial, now, crypto, io, profiles, terminal, consent } = {}) {
    this.#consentLive = consent; // 原物件參考（偵測事後竄改）
    this.#consentSnap = snapshotConsent(consent); // 建立當下的凍結快照
    this.#ESPLoader = ESPLoader;
    this.#Transport = Transport;
    this.#serial = serial;
    this.#now = now || (() => Date.now());
    this.#crypto = crypto || globalThis.crypto;
    this.#io = io || createBrowserIo(globalThis);
    this.#profiles = profiles || PROFILES;
    this.#terminal = terminal;
  }

  get profiles() {
    return this.#profiles;
  }

  /**
   * 免責聲明同意的技術強制：沒有合法同意就一律拒絕（在碰任何 serial／esptool 之前）。
   * 同時檢查凍結快照與原物件；兩者不一致（同意後被竄改）也拒絕。
   */
  #consentStatus() {
    if (!sameConsent(this.#consentLive, this.#consentSnap)) {
      return { valid: false, reason: 'tampered', termsVersion: null };
    }
    return checkConsent(this.#consentSnap, this.#now());
  }

  #assertConsent() {
    const c = this.#consentStatus();
    if (!c.valid) {
      throw new FlasherError('consent-required', { reason: c.reason, requiredVersion: CURRENT_TERMS_VERSION, termsVersion: c.termsVersion });
    }
  }

  getState() {
    const c = this.#consentStatus();
    return {
      consent: { valid: c.valid, termsVersion: c.termsVersion, requiredVersion: CURRENT_TERMS_VERSION, reason: c.valid ? null : c.reason },
      connected: !!this.#loader,
      busy: this.#busy,
      device: this.#device ? { ...this.#device } : null,
      backup: this.#backupState ? { ...this.#backupState } : null,
      writesWithoutBackup: [...this.#noBackupLog],
    };
  }

  // ---------- 內部 ----------

  async #run(fn) {
    if (this.#busy) throw new FlasherError('busy');
    this.#busy = true;
    try {
      return await fn();
    } finally {
      this.#busy = false;
    }
  }

  #requireLoader() {
    if (!this.#loader) throw new FlasherError('not-connected');
    return this.#loader;
  }

  #requireDevice() {
    this.#requireLoader();
    if (!this.#device) throw new FlasherError('not-connected', { reason: 'not-identified' });
    return this.#device;
  }

  async #sha256Hex(u8) {
    return hex(await this.#crypto.subtle.digest('SHA-256', u8));
  }

  #emit(onProgress, ev) {
    if (typeof onProgress === 'function') {
      try { onProgress(ev); } catch { /* 畫面回呼的錯誤不可影響刷機 */ }
    }
  }

  /**
   * 所有寫入（restore／update）的共同閘門：同意、已辨識、設備符合設定檔（晶片與容量）。
   * 備份是建議、不是條件：沒有這台設備已存檔的備份也可以寫入，只在回傳值記下 backup.status:'none'，
   * 並留在 getState().writesWithoutBackup。其他安全檢查（受保護區、MD5 驗證、MAC 確認、擦除確認）不受影響。
   */
  #requireWritable() {
    this.#assertConsent(); // 寫入類操作：進閘門時再檢查一次
    const dev = this.#requireDevice();
    if (!dev.profileMatch) {
      throw new FlasherError(dev.reason === 'wrong-flash' ? 'wrong-flash' : 'wrong-chip', {
        chip: dev.chip,
        flashSizeBytes: dev.flashSizeBytes,
      });
    }
    const b = this.#backupState;
    if (b && b.saved && b.mac === dev.mac) {
      return { status: 'saved', files: b.files, method: b.method, verifiable: b.verifiable, sha256: b.sha256 };
    }
    const rec = { at: new Date(this.#now()).toISOString(), mac: dev.mac, profile: dev.profile };
    this.#noBackupLog.push(rec);
    return { status: 'none', at: rec.at };
  }

  // ---------- connect / disconnect ----------

  /**
   * @param {{baudrate?:number, fallbackBaudrate?:number, port?:object, portFilters?:object[], signal?:AbortSignal}} [opts]
   * @returns {Promise<{baudrate:number, fellBack:boolean}>}
   */
  async connect({ baudrate = 115200, fallbackBaudrate = 115200, port, portFilters, signal, attemptsPerBaud = CONNECT_ATTEMPTS, connectTimeoutMs = CONNECT_TIMEOUT_MS, retryDelayMs = 400 } = {}) {
    this.#assertConsent();
    return this.#run(async () => {
      if (!this.#serial || typeof this.#serial.requestPort !== 'function') {
        throw new FlasherError('serial-unsupported');
      }
      if (this.#loader) await this.#teardown();
      throwIfAborted(signal);
      try {
        this.#port = port || (await this.#serial.requestPort(portFilters ? { filters: portFilters } : {}));
      } catch (e) {
        if (e && e.name === 'NotFoundError') throw new FlasherError('user-cancelled', {}, { cause: e });
        throw new FlasherError('connect-failed', { reason: 'request-port' }, { cause: e });
      }
      // 重置時序偶爾失敗，所以先在目標鮑率重試 attemptsPerBaud 次，都失敗才改用備援鮑率；每次都有逾時（卡住時關掉重來）。
      const bauds = baudrate === fallbackBaudrate ? [baudrate] : [baudrate, fallbackBaudrate];
      const attempts = [];
      for (const b of bauds) for (let round = 0; round < attemptsPerBaud; round++) attempts.push(b);
      let lastErr = null;
      for (let i = 0; i < attempts.length; i++) {
        throwIfAborted(signal);
        const b = attempts[i];
        try {
          const { transport, loader } = await this.#openLoader(b, connectTimeoutMs);
          this.#transport = transport;
          this.#loader = loader;
          this.#baud = b;
          this.#device = null;
          this.#backupState = null;
          return { baudrate: b, fellBack: b !== baudrate, attempt: i + 1 };
        } catch (e) {
          lastErr = e;
          if (i < attempts.length - 1) await delay(retryDelayMs);
        }
      }
      throw new FlasherError('connect-failed', { attempts }, { cause: lastErr });
    });
  }

  /** 開一條新的 Transport＋ESPLoader 並執行 main()；逾時或失敗就把這條連線關掉再丟錯（不留半開的埠）。 */
  async #openLoader(baud, timeoutMs) {
    const transport = new this.#Transport(this.#port, false);
    const loader = new this.#ESPLoader({
      transport,
      baudrate: baud,
      romBaudrate: 115200,
      terminal: this.#terminal,
      debugLogging: false,
    });
    try {
      await withTimeout(loader.main(), timeoutMs, () => new Error('connect-timeout'));
    } catch (e) {
      try { await withTimeout(transport.disconnect(), 5000, () => new Error('disconnect-timeout')); } catch { /* 忽略 */ }
      throw e;
    }
    return { transport, loader };
  }

  /** 設備端 MD5：逾時（依長度，4 MB 約 3 秒，最少給 30 秒）或失敗就重連後重算，最多 2 次；它只讀 flash，重算是安全的。 */
  async #deviceMd5(address, length, timeoutOverrideMs) {
    const timeoutMs = timeoutOverrideMs || Math.max(30000, Math.ceil(length / 0x10000) * 2000);
    let lastErr = null;
    for (let k = 0; k <= 2; k++) {
      try {
        return await withTimeout(this.#requireLoader().flashMd5sum(address, length), timeoutMs, () => new Error('md5-timeout'));
      } catch (e) {
        lastErr = e;
        if (k === 2) break;
        try {
          await this.#recoverLoader();
        } catch (e2) {
          lastErr = e2;
          break;
        }
      }
    }
    throw lastErr;
  }

  /** 讀取卡住或失敗後：關掉舊連線、在同一個埠重新連線（重新載入 stub）。保留 identify 與備份狀態。 */
  async #recoverLoader() {
    const old = this.#transport;
    this.#transport = null;
    this.#loader = null;
    if (old) {
      try { await withTimeout(old.disconnect(), 5000, () => new Error('disconnect-timeout')); } catch { /* 忽略 */ }
    }
    await delay(300);
    let lastErr = null;
    for (let k = 0; k < CONNECT_ATTEMPTS; k++) {
      try {
        const { transport, loader } = await this.#openLoader(this.#baud, CONNECT_TIMEOUT_MS);
        this.#transport = transport;
        this.#loader = loader;
        return;
      } catch (e) {
        lastErr = e;
        await delay(400);
      }
    }
    throw new FlasherError('connect-failed', { reason: 'recover-failed' }, { cause: lastErr });
  }

  async #teardown() {
    const t = this.#transport;
    this.#transport = null;
    this.#loader = null;
    this.#device = null;
    this.#backupState = null;
    if (t) {
      try { await withTimeout(t.disconnect(), 5000, () => new Error('disconnect-timeout')); } catch { /* 忽略 */ }
    }
  }

  async disconnect() {
    await this.#teardown();
  }

  // ---------- identify ----------

  /**
   * @param {{expectedProfile?: string}} [opts] 畫面若已讓使用者選了設備類型，傳進來；不符就當作 wrong-chip。
   */
  async identify({ expectedProfile } = {}) {
    return this.#run(async () => {
      const loader = this.#requireLoader();
      const chip = loader.chip.CHIP_NAME;
      const mac = String(await loader.chip.readMac(loader)).toLowerCase();
      const flashId = await loader.readFlashId();
      const flashKB = await loader.getFlashSize(); // esptool-js 0.5.4 回傳 KB 數（DETECTED_FLASH_SIZES_NUM）
      const flashSizeBytes = typeof flashKB === 'number' && flashKB > 0 ? flashKB * 1024 : null;

      const expected = expectedProfile ? this.#profiles[expectedProfile] : null;
      const chipProfile = expected && expected.chip === chip ? expected : expected ? null : findProfileByChip(chip, this.#profiles);
      let reason = null;
      if (!chipProfile) reason = 'wrong-chip';
      else if (!acceptedFlashSizes(chipProfile).includes(flashSizeBytes)) reason = 'wrong-flash'; // 容量以實際讀到的為準，只要在設定檔接受的清單內

      const dev = {
        chip,
        mac,
        flashId: typeof flashId === 'number' ? '0x' + (flashId >>> 0).toString(16) : String(flashId),
        flashSizeBytes,
        profile: chipProfile ? chipProfile.id : null,
        profileMatch: reason === null,
        reason,
        // 設定檔是否已在真機驗證；false（只過假設備測試）時畫面不得標為可用。與 profileMatch 無關：辨識得出來不代表可用。
        profileVerified: chipProfile ? chipProfile.hardwareVerified === true : false,
      };
      this.#device = dev;
      this.#backupState = null; // 換設備（或重新辨識）就要重新備份
      return { ...dev };
    });
  }

  // ---------- backup ----------

  /**
   * 讀整顆 flash 並驗證。
   * 驗證方式預設 'md5'：讀一次，再用設備端 flashMd5sum 與本機資料的 MD5 比對。
   * 理由：①設備端 MD5 由晶片直接對 flash 內容計算，不經序列線路，能抓到傳輸中的位元錯誤；
   *      ②只讀一次，經 115200～460800 傳 4 MB 的時間不加倍。
   * 'double-read'：讀兩次逐位元組比對（備援，時間加倍）；'both' 兩者都做。
   */
  async backup({ onProgress, signal, verify = 'md5', chunkSize = READ_CHUNK, chunkTimeoutMs = CHUNK_TIMEOUT_MS, md5TimeoutMs } = {}) {
    this.#assertConsent();
    return this.#run(async () => {
      const loader = this.#requireLoader();
      const dev = this.#requireDevice();
      if (!dev.flashSizeBytes) throw new FlasherError('wrong-flash', { flashSizeBytes: null });
      const size = dev.flashSizeBytes;
      const wantMd5 = verify === 'md5' || verify === 'both';
      const wantDouble = verify === 'double-read' || verify === 'both';
      const passes = wantDouble ? 2 : 1;
      const total = size * passes + (wantMd5 ? size : 0);

      // 單塊讀取：逾時或失敗就重連（重新載入 stub）再重讀這一塊，最多 CHUNK_RECOVERIES 次；全部失敗才回報 read-failed。
      const readChunk = async (off, n) => {
        let lastErr = null;
        let lastShort = null;
        for (let k = 0; k <= CHUNK_RECOVERIES; k++) {
          throwIfAborted(signal);
          try {
            const part = await withTimeout(this.#loader.readFlash(off, n), chunkTimeoutMs, () => new Error('chunk-timeout'));
            if (part && part.length === n) return part;
            lastShort = part ? part.length : 0;
            lastErr = null;
          } catch (e) {
            lastErr = e;
            lastShort = null;
          }
          if (k === CHUNK_RECOVERIES) break;
          this.#emit(onProgress, { stage: 'recovering', offset: off, attempt: k + 1 });
          try {
            await this.#recoverLoader();
          } catch (e) {
            lastErr = e;
            lastShort = null;
            break;
          }
        }
        if (lastShort !== null) throw new FlasherError('read-failed', { offset: off, reason: 'short-read', got: lastShort });
        throw new FlasherError('read-failed', { offset: off, reason: 'read-error' }, { cause: lastErr });
      };

      const readAll = async (passIndex) => {
        const buf = new Uint8Array(size);
        for (let off = 0; off < size; off += chunkSize) {
          throwIfAborted(signal);
          const n = Math.min(chunkSize, size - off);
          const part = await readChunk(off, n);
          buf.set(part, off);
          this.#emit(onProgress, { stage: 'reading', done: passIndex * size + off + n, total });
        }
        return buf;
      };

      const bytes = await readAll(0);
      const localMd5 = md5Hex(bytes);

      if (wantMd5) {
        throwIfAborted(signal);
        this.#emit(onProgress, { stage: 'verifying', done: passes * size, total });
        let devMd5;
        try {
          devMd5 = await this.#deviceMd5(0, size, md5TimeoutMs);
        } catch (e) {
          throw new FlasherError('read-failed', { reason: 'device-md5-error' }, { cause: e });
        }
        if (String(devMd5).toLowerCase() !== localMd5) {
          throw new FlasherError('read-failed', { reason: 'md5-mismatch', device: devMd5, local: localMd5 });
        }
      }
      if (wantDouble) {
        const second = await readAll(1);
        if (!bytesEqual(bytes, second)) {
          throw new FlasherError('read-failed', { reason: 'double-read-mismatch' });
        }
      }
      this.#emit(onProgress, { stage: 'verifying', done: total, total });

      const sha256 = await this.#sha256Hex(bytes);
      const warnings = [];
      const bootAt = (this.#profiles[dev.profile] ? layoutOf(this.#profiles[dev.profile]) : { bootloaderAddress: 0 }).bootloaderAddress;
      if (bytes[bootAt] !== 0xe9) warnings.push('no-boot-header'); // 開機程式位置依晶片：C3／C6／S3 在 0x0，ESP32 在 0x1000
      if (isAllFF(bytes)) warnings.push('flash-blank');
      const meta = {
        format: 1,
        chip: dev.chip,
        mac: dev.mac,
        flashSizeBytes: size,
        profile: dev.profile,
        createdAt: new Date(this.#now()).toISOString(),
        sha256,
        md5: localMd5,
        verify,
        engineVersion: ENGINE_VERSION,
      };
      return { bytes, sha256, md5: localMd5, meta, warnings };
    });
  }

  // ---------- saveBackup ----------

  backupFileBase(meta) {
    const d = new Date(meta.createdAt || this.#now());
    const date = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
    return `${meta.profile || 'device'}-${normMac(meta.mac)}-${date}`;
  }

  /**
   * 存檔成功（.bin 與 .json 都存到）才回傳 saved:true 並解鎖寫入。
   * 失敗或取消回 {saved:false, code} ，寫入維持鎖定。
   */
  async saveBackup(result, { io } = {}) {
    const dev = this.#device;
    const theIo = io || this.#io;
    if (!result || !result.bytes || !result.meta) {
      return { saved: false, code: 'save-failed', reason: 'no-backup-result' };
    }
    if (!dev || normMac(dev.mac) !== normMac(result.meta.mac)) {
      return { saved: false, code: 'save-failed', reason: 'backup-device-mismatch' };
    }
    const base = this.backupFileBase(result.meta);
    const metaBytes = new TextEncoder().encode(JSON.stringify(result.meta, null, 2) + '\n');
    try {
      const bin = await theIo.saveFile({
        name: `${base}.bin`,
        bytes: result.bytes,
        mime: 'application/octet-stream',
        description: 'Firmware backup',
        ext: '.bin',
      });
      const json = await theIo.saveFile({
        name: `${base}.json`,
        bytes: metaBytes,
        mime: 'application/json',
        description: 'Backup metadata',
        ext: '.json',
      });
      const verifiable = !!(bin && bin.verifiable && json && json.verifiable);
      const state = {
        saved: true,
        mac: dev.mac,
        sha256: result.sha256,
        files: { bin: bin.name || `${base}.bin`, json: json.name || `${base}.json` },
        method: { bin: bin.method, json: json.method },
        verifiable,
      };
      this.#backupState = state;
      return { ...state };
    } catch (e) {
      if (e && e.name === 'AbortError') return { saved: false, code: 'save-cancelled' };
      return { saved: false, code: 'save-failed', reason: String((e && e.message) || e) };
    }
  }

  // ---------- validateBackup ----------

  /**
   * @returns {Promise<{ok:true, requiresConfirm:boolean, reasons:string[], meta:object} | {ok:false, code:string, reason:string}>}
   */
  async validateBackup(binBytes, metaJson, deviceInfo, { allowNoMeta = false } = {}) {
    const bin = toU8(binBytes);
    const dev = deviceInfo;
    const bad = (reason, extra = {}) => ({ ok: false, code: 'bad-backup', reason, ...extra });

    let meta = null;
    if (metaJson == null) {
      if (!allowNoMeta) return bad('meta-missing');
    } else {
      try {
        meta = typeof metaJson === 'string' ? JSON.parse(metaJson) : metaJson;
      } catch {
        return bad('meta-unparsable');
      }
      if (!meta || typeof meta !== 'object') return bad('meta-invalid');
    }

    if (meta) {
      if (meta.chip !== dev.chip) {
        return { ok: false, code: 'wrong-chip', reason: 'backup-chip-differs', backupChip: meta.chip, deviceChip: dev.chip };
      }
      if (meta.profile && dev.profile && meta.profile !== dev.profile) {
        return { ok: false, code: 'wrong-profile', reason: 'backup-profile-differs', backupProfile: meta.profile };
      }
      if (meta.flashSizeBytes !== bin.length) return bad('meta-size-mismatch', { metaSize: meta.flashSizeBytes, actual: bin.length });
    }
    if (!dev.flashSizeBytes || bin.length !== dev.flashSizeBytes) {
      return bad('size-mismatch', { expected: dev.flashSizeBytes, actual: bin.length });
    }
    const profile = this.#profiles[dev.profile] || findProfileByChip(dev.chip, this.#profiles);
    const magic = profile ? profile.bootMagic : 0xe9;
    const bootAt = profile ? layoutOf(profile).bootloaderAddress : 0;
    if (bin[bootAt] !== magic) return bad('boot-header', { expected: magic, actual: bin[bootAt], at: bootAt });

    if (meta) {
      const sha = await this.#sha256Hex(bin);
      if (!meta.sha256 || String(meta.sha256).toLowerCase() !== sha) {
        return bad('sha256-mismatch', { expected: meta.sha256, actual: sha });
      }
    }

    const reasons = [];
    let requiresConfirm = false;
    if (!meta) {
      requiresConfirm = true;
      reasons.push('mac-unknown'); // 沒有說明檔就不知道來源是哪台
    } else if (normMac(meta.mac) !== normMac(dev.mac)) {
      requiresConfirm = true;
      reasons.push('mac-mismatch');
    }
    return { ok: true, requiresConfirm, reasons, meta };
  }

  // ---------- 寫入共用 ----------

  /**
   * 寫入多段並逐段用設備端 MD5 驗證。任何錯誤都帶 partialWrite:true（寫入已經開始）。
   * @param {{data:Uint8Array,address:number}[]} segments
   */
  async #writeAndVerify(segments, { eraseAll, signal, onProgress }) {
    const loader = this.#requireLoader();
    this.#assertConsent(); // 真正呼叫 writeFlash 之前最後一次檢查
    throwIfAborted(signal);
    const fileArray = segments.map((s) => ({ data: u8ToBinaryString(s.data), address: s.address }));
    const partCount = segments.length;
    try {
      await loader.writeFlash({
        fileArray,
        flashSize: 'keep', // 三個 keep：esptool-js 不改映像標頭（bundle 的 _updateImageFlashParams 在全 keep 時原樣返回）
        flashMode: 'keep',
        flashFreq: 'keep',
        eraseAll: !!eraseAll,
        compress: true,
        reportProgress: (index, written, total) => {
          throwIfAborted(signal); // 在 esptool-js 呼叫內丟出，可在寫入中途中止（此時設備為不完整狀態）
          this.#emit(onProgress, { stage: 'writing', part: index, partCount, done: written, total });
        },
      });
    } catch (e) {
      if (isFlasherError(e)) throw new FlasherError(e.code, e.details, { cause: e, partialWrite: true });
      throw new FlasherError('write-failed', { reason: String((e && e.message) || e) }, { cause: e, partialWrite: true });
    }

    const verified = [];
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      this.#emit(onProgress, { stage: 'verifying-write', part: i, partCount, done: i, total: partCount });
      const expected = md5Hex(s.data);
      let got;
      try {
        got = await this.#deviceMd5(s.address, s.data.length);
      } catch (e) {
        throw new FlasherError('verify-failed', { address: s.address, reason: 'device-md5-error' }, { cause: e, partialWrite: true });
      }
      if (String(got).toLowerCase() !== expected) {
        throw new FlasherError('verify-failed', { address: s.address, length: s.data.length, expected, got }, { partialWrite: true });
      }
      verified.push({ address: s.address, length: s.data.length, md5: expected });
    }
    return verified;
  }

  async #finish(onProgress) {
    this.#emit(onProgress, { stage: 'resetting', done: 0, total: 1 });
    let reset = 'ok';
    try {
      await this.#loader.after('hard_reset');
    } catch {
      reset = 'failed'; // 寫入與驗證已成功；只是自動重開沒成功，請使用者重新插拔
    }
    await this.#teardown(); // 重開後原連線已失效；要再操作必須重新 connect
    this.#emit(onProgress, { stage: 'done', done: 1, total: 1 });
    return reset;
  }

  // ---------- restore ----------

  /**
   * @param {Uint8Array} bytes 備份 .bin
   * @param {{meta?:object|string, confirmedDifferentMac?:boolean, allowNoMeta?:boolean, signal?:AbortSignal, onProgress?:Function}} [opts]
   */
  async restore(bytes, opts = {}) {
    const { meta, confirmedDifferentMac, allowNoMeta, signal, onProgress } = opts;
    this.#assertConsent();
    return this.#run(async () => {
      const backup = this.#requireWritable(); // 設備與容量／晶片；備份狀態只記錄、不阻擋
      const dev = this.#device;
      const bin = toU8(bytes);
      const v = await this.validateBackup(bin, meta, dev, { allowNoMeta });
      if (!v.ok) throw new FlasherError(v.code, { reason: v.reason, ...v });
      if (v.requiresConfirm && confirmedDifferentMac !== true) {
        throw new FlasherError('mac-mismatch-unconfirmed', { reasons: v.reasons, backupMac: v.meta && v.meta.mac, deviceMac: dev.mac });
      }
      // 整顆覆蓋，不需要先擦除（eraseAll:false）；寫入範圍＝位址 0 到 flash 容量，之後全顆 MD5 驗證。
      const verified = await this.#writeAndVerify([{ data: bin, address: 0 }], { eraseAll: false, signal, onProgress });
      const reset = await this.#finish(onProgress);
      return {
        ok: true,
        verified: true,
        parts: verified,
        reset,
        backup,
        mac: dev.mac,
        macConfirmedDifferent: v.requiresConfirm === true,
        warnings: [],
      };
    });
  }

  // ---------- update ----------

  async #protectedRangesFor(profile, parts, signal) {
    const ranges = [...(profile.protectedRegions || [])];
    const warnings = [];
    if (profile.readPartitionTable) {
      const { partitionTableAddress: PT_ADDR, partitionTableLength: PT_LEN } = layoutOf(profile);
      const loader = this.#requireLoader();
      throwIfAborted(signal);
      try {
        const tbl = await loader.readFlash(PT_ADDR, PT_LEN);
        ranges.push(...parsePartitionTableProtected(toU8(tbl)));
      } catch (e) {
        warnings.push('partition-table-unreadable');
      }
      // 新映像若自帶分區表（合併的 factory.bin），NVS 位置也一併保護；位置若與設備上的不同要警告
      for (const p of parts) {
        const end = p.address + p.data.length;
        if (p.address <= PT_ADDR && end >= PT_ADDR + PT_LEN) {
          const rel = PT_ADDR - p.address;
          const incoming = parsePartitionTableProtected(p.data.subarray(rel, rel + PT_LEN));
          const before = ranges.length;
          ranges.push(...incoming);
          if (incoming.length && ranges.length > before) warnings.push('incoming-partition-table-has-nvs');
        }
      }
    }
    return { ranges: normalizeRanges(ranges), warnings };
  }

  /**
   * @param {{data:Uint8Array|ArrayBuffer, address:number}[]} parts
   * @param {{eraseAll?:boolean, confirmedEraseAll?:boolean, onProtectedOverlap?:'split'|'error', signal?:AbortSignal, onProgress?:Function}} [opts]
   *   預設 eraseAll:false。ESPHome 的 factory.bin 是從位址 0 開始的合併映像，中間以 0xFF 填滿，
   *   會蓋到 NVS；所以預設 onProtectedOverlap:'split'：把受保護區從寫入範圍「挖掉」，只寫其餘的段落。
   */
  async update(parts, opts = {}) {
    const { eraseAll = false, confirmedEraseAll, onProtectedOverlap = 'split', signal, onProgress } = opts;
    this.#assertConsent();
    return this.#run(async () => {
      const backup = this.#requireWritable();
      const dev = this.#device;
      const profile = this.#profiles[dev.profile];
      const loader = this.#requireLoader();

      if (!Array.isArray(parts) || parts.length === 0) throw new FlasherError('bad-parts', { reason: 'empty' });
      const norm = parts.map((p, i) => {
        if (!p || !Number.isInteger(p.address) || p.address < 0) throw new FlasherError('bad-parts', { reason: 'bad-address', index: i });
        const data = toU8(p.data);
        if (data.length === 0) throw new FlasherError('bad-parts', { reason: 'empty-part', index: i });
        if (p.address + data.length > dev.flashSizeBytes) throw new FlasherError('bad-parts', { reason: 'beyond-flash', index: i });
        // 會碰到開機程式的段落（位址 0 的合併映像、或剛好在 bootloader 位址）必須是合格的開機映像；位置與晶片 ID 依設定檔。
        const chk = inspectBootImage(profile, data, p.address);
        if (!chk.ok) {
          throw new FlasherError('bad-parts', { reason: chk.reason, index: i, ...(chk.expected != null ? { expected: chk.expected } : {}) });
        }
        return { address: p.address, data };
      });
      const sorted = [...norm].sort((a, b) => a.address - b.address);
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].address < sorted[i - 1].address + sorted[i - 1].data.length) throw new FlasherError('bad-parts', { reason: 'overlap' });
      }
      if (eraseAll && confirmedEraseAll !== true) throw new FlasherError('erase-unconfirmed');

      let segments;
      let protectedRanges = [];
      let warnings = [];
      let preHashes = [];
      if (eraseAll) {
        // 使用者明確同意整顆擦除：所有設定會消失，因此不做受保護區處理。
        segments = sorted;
        warnings.push('erase-all');
      } else {
        const pr = await this.#protectedRangesFor(profile, sorted, signal);
        protectedRanges = pr.ranges;
        warnings = pr.warnings;
        segments = [];
        for (const p of sorted) {
          const pieces = subtractRanges(p.address, p.address + p.data.length, protectedRanges);
          const overlapped = !(pieces.length === 1 && pieces[0].start === p.address && pieces[0].end === p.address + p.data.length);
          if (overlapped) {
            if (onProtectedOverlap === 'error') throw new FlasherError('protected-region', { address: p.address });
            warnings.push('protected-region-skipped');
          }
          for (const s of pieces) segments.push({ address: s.start, data: p.data.subarray(s.start - p.address, s.end - p.address) });
        }
        if (segments.length === 0) throw new FlasherError('bad-parts', { reason: 'nothing-to-write-after-protection' });
        // 寫前先記下每個受保護區的 MD5，寫後必須相同（官方頁的做法）
        for (const r of protectedRanges) {
          const len = Math.min(r.end, dev.flashSizeBytes) - r.start;
          if (len <= 0) continue;
          preHashes.push({ ...r, length: len, md5: String(await this.#deviceMd5(r.start, len)).toLowerCase() });
        }
      }

      const verified = await this.#writeAndVerify(segments, { eraseAll, signal, onProgress });

      for (const h of preHashes) {
        let after;
        try {
          after = String(await this.#deviceMd5(h.start, h.length)).toLowerCase();
        } catch (e) {
          throw new FlasherError('verify-failed', { reason: 'protected-md5-error', region: h.name }, { cause: e, partialWrite: true });
        }
        if (after !== h.md5) {
          throw new FlasherError('verify-failed', { reason: 'protected-region-changed', region: h.name, start: h.start }, { partialWrite: true });
        }
      }

      const reset = await this.#finish(onProgress);
      return {
        ok: true,
        verified: true,
        parts: verified,
        protectedRegions: protectedRanges.map((r) => ({ name: r.name, start: r.start, end: r.end })),
        eraseAll: !!eraseAll,
        reset,
        backup,
        mac: dev.mac,
        warnings: [...new Set(warnings)],
      };
    });
  }
}
