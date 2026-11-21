// 進度與格式化（純邏輯）。引擎的 onProgress 事件 {stage, done, total, part, partCount} → 畫面用的百分比、速度、預估剩餘。

/** 各操作的階段（畫面階段清單的順序；引擎 stage 對應到這裡的索引）。 */
export const PHASES = {
  backup: ['reading', 'verifying'], // 存檔在下一個畫面（需要使用者再按一次，瀏覽器才允許開存檔視窗）
  update: ['download', 'writing', 'verifying-write', 'resetting'],
  custom: ['writing', 'verifying-write', 'resetting'], // 刷入自己的韌體：檔案已在本機讀好，沒有下載階段
  restore: ['writing', 'verifying-write', 'resetting'],
};

/** 引擎 stage → 該操作的階段索引；不認得回 -1。 */
export function phaseIndex(op, stage) {
  const list = PHASES[op] || [];
  if (stage === 'done') return list.length; // 全部完成
  return list.indexOf(stage);
}

/** 進度：寫入有多段（part）時，整體比例 = (part + 段內比例) / 段數。 */
export function overallFraction(ev) {
  if (!ev || !Number.isFinite(ev.total) || ev.total <= 0) return 0;
  const inner = Math.min(1, Math.max(0, ev.done / ev.total));
  if (ev.stage === 'writing' && Number.isFinite(ev.partCount) && ev.partCount > 0 && Number.isFinite(ev.part)) {
    return Math.min(1, (ev.part + inner) / ev.partCount);
  }
  return inner;
}

/** 速度與預估剩餘：以「開始以來的平均速度」估計（簡單、穩定）。 */
export function createRateTracker(now = () => Date.now()) {
  let t0 = null;
  let bytes0 = 0;
  return {
    reset() { t0 = null; bytes0 = 0; },
    /** @param {number} doneBytes 已完成位元組 @param {number} totalBytes 總位元組 */
    update(doneBytes, totalBytes) {
      const t = now();
      if (t0 === null) { t0 = t; bytes0 = doneBytes; }
      const dt = (t - t0) / 1000;
      const moved = doneBytes - bytes0;
      const speed = dt > 0.5 && moved > 0 ? moved / dt : null;
      const remaining = Math.max(0, totalBytes - doneBytes);
      const etaSec = speed ? Math.ceil(remaining / speed) : null;
      return { speedBps: speed, etaSec };
    },
  };
}

export function formatMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

/** 小於 1 MB 用 KB，其餘用 MB（一位小數）。 */
export function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatSpeed(bps) {
  if (!Number.isFinite(bps) || bps <= 0) return null;
  return bps >= 1024 * 1024 ? `${(bps / (1024 * 1024)).toFixed(1)} MB/s` : `${Math.round(bps / 1024)} KB/s`;
}

/** 預估剩餘時間，中英各一份。 */
export function formatEta(sec) {
  if (!Number.isFinite(sec) || sec < 0) return null;
  const s = Math.max(1, Math.round(sec));
  if (s < 60) return { zh: `約 ${s} 秒`, en: `${s} s left` };
  const m = Math.floor(s / 60);
  const r = s % 60;
  return {
    zh: r ? `約 ${m} 分 ${r} 秒` : `約 ${m} 分鐘`,
    en: r ? `${m} min ${r} s left` : `${m} min left`,
  };
}

export function formatBytesWithCommas(n) {
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}
