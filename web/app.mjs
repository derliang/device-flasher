// 刷機頁的畫面控制器：同意閘門 → 感應器（連接、備份、更新、還原）／S31（尚未開放）。
// 純邏輯在 consent-gate／releases／checks／progress／route（有 node 測試）；這裡只負責 DOM 與引擎的接線。
// 全部在瀏覽器本機執行：不載入外部資源、不上傳任何東西。引擎見 ../engine/README.md。

import { FlasherError, ERROR_TABLE } from '../engine/errors.mjs';
import { ENGINE_VERSION } from '../engine/flasher-engine.mjs';
import {
  CURRENT_TERMS_VERSION, createConsentStore, evaluateStoredConsent, gateProgress, isScrolledToEnd,
  makeRecord, consentForEngine, consentRecordJson,
} from './consent-gate.mjs';
import { pickRelease, parseReleases, resolveFileUrl, verifyDownload, bytesToHex } from './releases.mjs';
import { macTail, confirmReady, restoreChecks, buildErrorReport, safeFileLabel } from './checks.mjs';
import { PHASES, phaseIndex, overallFraction, createRateTracker, formatEta, formatSpeed, formatSize, formatBytesWithCommas } from './progress.mjs';
import { resolveRoute, serialSupported } from './route.mjs';
import { TERMS_CLAUSES } from './terms-content.mjs';

export const TOOL_VERSION = '0.1';

const ICONS = {
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>',
  warn: '<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  usb: '<path d="M12 3v13"/><circle cx="12" cy="19" r="2"/><path d="M12 8l4 2v3M12 11l-4-2"/><circle cx="8" cy="8.6" r="1"/>',
  file: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/>',
  restore: '<path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8"/><path d="M3 3v5h5"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  download: '<path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M5 21h14"/>',
  wifi: '<path d="M5 12.5a10 10 0 0114 0"/><path d="M8.5 16a5 5 0 017 0"/><path d="M12 19.5h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
};
const svgIcon = (name) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
/** 中英成對的 HTML（文字會跳脫）。 */
export function L(zh, en) {
  return `<span class="l zh">${esc(zh)}</span><span class="l en">${esc(en)}</span>`;
}

const STEP_LABELS = [['連接', 'Connect'], ['備份', 'Backup'], ['更新／還原', 'Update / Restore']];
export function stepsHtml(cur) {
  const items = STEP_LABELS.map(([zh, en], i) => {
    const n = i + 1;
    const cls = n < cur ? 'done' : n === cur ? 'cur' : '';
    return `<li class="${cls}"><span class="lab"><span class="n">${n}</span> ${L(zh, en)}</span></li>`;
  });
  return `<ol class="steps" aria-label="流程 / Progress">${items.join('')}</ol>`;
}

/** 展開 [[中文||English]]、{{I 圖示}}、{{STEPS n}}（頁面內容用這套簡寫撰寫，執行時才展開）。 */
export function expand(s) {
  let out = s.replace(/\{\{I (\w+)\}\}/g, (_, n) => svgIcon(n));
  out = out.replace(/\{\{STEPS (\d)\}\}/g, (_, n) => stepsHtml(Number(n)));
  out = out.replace(/="\[\[([^\]|]*?)\|\|([^\]]*?)\]\]"/g, (_, zh, en) => `="${zh} / ${en}"`);
  out = out.replace(/\[\[([\s\S]*?)\|\|([\s\S]*?)\]\]/g, (_, zh, en) => `<span class="l zh">${zh}</span><span class="l en">${en}</span>`);
  return out;
}

const LOCAL_ERRORS = {
  'download-failed': { 'zh-TW': '韌體檔下載失敗，設備沒有被改動。請檢查網路後再試。', en: 'Downloading the firmware failed; the device was not changed. Check your network and try again.' },
  'download-size-mismatch': { 'zh-TW': '下載的韌體檔大小與發佈資料不符，已中止，設備沒有被改動。', en: 'The downloaded firmware size does not match the release data; aborted, the device was not changed.' },
  'download-hash-mismatch': { 'zh-TW': '下載的韌體檔 SHA-256 與發佈資料不符，已中止，設備沒有被改動。', en: 'The downloaded firmware SHA-256 does not match the release data; aborted, the device was not changed.' },
  'file-read-failed': { 'zh-TW': '讀取檔案失敗。', en: 'Reading the file failed.' },
  unknown: { 'zh-TW': '發生未預期的錯誤。', en: 'An unexpected error occurred.' },
};

/** 任何錯誤 → 有 code／messages 的物件（FlasherError 原樣；其他包成指定錯誤碼）。 */
export function toFlasherLike(e, fallbackCode = 'unknown') {
  if (e && e.code && e.messages) return e;
  if (e && e.code && LOCAL_ERRORS[e.code]) {
    return { code: e.code, messageKey: `flasher.error.${e.code}`, messages: LOCAL_ERRORS[e.code], details: e.details || {}, partialWrite: false };
  }
  if (ERROR_TABLE[fallbackCode]) return new FlasherError(fallbackCode, { reason: String((e && e.message) || e) }, { cause: e });
  return { code: fallbackCode, messageKey: `flasher.error.${fallbackCode}`, messages: LOCAL_ERRORS[fallbackCode] || LOCAL_ERRORS.unknown, details: { reason: String((e && e.message) || e) }, partialWrite: false };
}

const pad2 = (n) => String(n).padStart(2, '0');
export function fmtDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
export function fmtDateTime(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : `${fmtDate(iso)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
const macDisplay = (mac) => String(mac || '').toUpperCase();
function macHtml(mac) {
  const m = macDisplay(mac);
  const tail = macTail(mac);
  if (!tail || m.length < 4) return esc(m);
  return `${esc(m.slice(0, -4))}<span class="mac-tail">${esc(m.slice(-4))}</span>`;
}

const PHASE_LABELS = {
  backup: {
    reading: ['讀取 flash（4 MB）', 'Read the flash (4 MB)'],
    verifying: ['在設備上計算 MD5，與讀到的資料比對', 'Compare with an MD5 computed on the device'],
  },
  update: {
    download: ['下載韌體並核對 SHA-256', 'Download the firmware and check its SHA-256'],
    writing: ['寫入韌體（受保護的設定區會被避開）', 'Write the firmware (the protected settings area is skipped)'],
    'verifying-write': ['驗證寫入內容（設備端 MD5）', 'Verify what was written (device-side MD5)'],
    resetting: ['重新啟動設備', 'Restart the device'],
  },
  restore: {
    writing: ['寫入整顆 flash（4 MB）', 'Write the entire flash (4 MB)'],
    'verifying-write': ['以 MD5 驗證整顆 flash', 'Verify the entire flash with MD5'],
    resetting: ['重新啟動設備', 'Restart the device'],
  },
};

const RUN_COPY = {
  backup: {
    steps: 2, bar: 'read', lock: 'read', icon: 'eye',
    lockText: ['操作中：請不要拔線、不要關閉或重新整理這一頁', 'In progress: do not unplug the cable or close / reload this page'],
    lockSub: ['備份是唯讀的，即使中斷也不會損壞設備。', 'Backup is read-only; interrupting it cannot damage the device.'],
    title: ['正在備份韌體', 'Backing up firmware'], tag: ['唯讀', 'Read-only'], tagCls: 'read',
  },
  update: {
    steps: 3, bar: 'write', lock: 'write', icon: 'warn',
    lockText: ['寫入中：請不要拔線、不要關閉或重新整理這一頁', 'Writing: do not unplug the cable or close / reload this page'],
    lockSub: ['現在中斷可能讓設備無法開機。', 'Interrupting now may leave the device unable to boot.'],
    title: ['正在更新韌體', 'Updating firmware'], tag: ['寫入中', 'Writing'], tagCls: 'write',
  },
  restore: {
    steps: 3, bar: 'over', lock: 'over', icon: 'warn',
    lockText: ['寫入中：請不要拔線、不要關閉或重新整理這一頁', 'Writing: do not unplug the cable or close / reload this page'],
    lockSub: ['現在中斷可能讓設備無法開機。', 'Interrupting now may leave the device unable to boot.'],
    title: ['正在還原備份', 'Restoring backup'], tag: ['覆寫中', 'Overwriting'], tagCls: 'over',
  },
};

/** 還原逐項檢查的文字。 */
function checkLine(item, dev) {
  const d = item.data;
  const mb = dev.flashSizeBytes ? Math.round(dev.flashSizeBytes / 1048576) : '?';
  const n = (v) => formatBytesWithCommas(v);
  switch (item.id) {
    case 'size':
      return item.level === 'ok'
        ? L(`檔案大小 ${n(d.actual)} 位元組，等於設備 flash ${mb} MB`, `File size ${n(d.actual)} bytes equals the device's ${mb} MB flash`)
        : L(`檔案大小 ${n(d.actual)} 位元組，與設備 flash ${mb} MB 不符`, `File size ${n(d.actual)} bytes does not match the ${mb} MB flash`);
    case 'header':
      return item.level === 'ok' ? L('開機標頭正確（0xE9）', 'Boot header valid (0xE9)') : L('開機標頭不對（位址 0 的第一個位元組不是 0xE9）', 'Boot header invalid (the first byte at address 0 is not 0xE9)');
    case 'meta':
      return L('缺少說明檔（.json），或說明檔讀不懂', 'The metadata (.json) is missing or unreadable');
    case 'chip':
      return item.level === 'ok'
        ? `${L('json 記錄的晶片是 ', 'The chip in the json is ')}${esc(d.backupChip)}${L('，與目前設備相同', ', same as the connected device')}`
        : `${L('json 記錄的晶片是 ', 'The chip in the json is ')}${esc(d.backupChip)}${L('，但目前設備是 ', ', but the connected device is ')}${esc(d.deviceChip)}`;
    case 'sha':
      return item.level === 'ok' ? L('SHA-256 與 json 記錄相同，檔案沒有損壞', 'SHA-256 matches the json, so the file is intact') : L('SHA-256 與 json 記錄不同，檔案可能已損壞', 'SHA-256 differs from the json; the file may be corrupted');
    case 'mac':
      return `<b>${L('MAC 不同：', 'Different MAC: ')}</b>${L('這份備份來自另一台設備', 'this backup comes from another device')}<small class="mono">${esc(macDisplay(d.backupMac))} ≠ ${esc(macDisplay(d.deviceMac))}</small>`;
    default:
      return esc(item.id);
  }
}
const CHECK_ICON = { ok: 'check', no: 'x', warn: 'warn' };

// ============================================================================
export function startApp(opts = {}) {
  const win = opts.win || window;
  const doc = opts.doc || win.document;
  const now = opts.now || (() => Date.now());
  const fetchImpl = opts.fetchImpl || ((...a) => win.fetch(...a));
  const subtle = opts.subtle || (win.crypto && win.crypto.subtle);
  const releasesUrls = (opts.releasesUrls || ['./releases.json', '../releases.json']).map((u) => new URL(u, win.location.href).href);
  const makeFlasher = opts.makeFlasher || (async (consent, extra) => {
    const m = await import('../engine/browser.mjs');
    return m.createBrowserFlasher({ consent, ...extra });
  });
  let storage = null;
  try { storage = opts.storage !== undefined ? opts.storage : win.localStorage; } catch { storage = null; }
  const store = createConsentStore(storage);
  const supported = opts.supported !== undefined ? opts.supported : serialSupported({ nav: win.navigator, secure: win.isSecureContext });

  const $ = (sel, root = doc) => root.querySelector(sel);
  const $$ = (sel, root = doc) => [...root.querySelectorAll(sel)];

  const S = {
    lang: /^zh/i.test((win.navigator && win.navigator.language) || '') ? 'zh' : 'en',
    consent: null, declined: false, oldConsent: null,
    tab: 'sensor', screen: null, termsOpen: false,
    flasher: null, device: null, busy: false, abort: null, wake: null,
    backup: null, backupConfirmed: false, skipChecked: false,
    releases: [], releasesUrl: null, release: null,
    erase: false, restore: null,
    lastError: null, lastOp: null,
    run: { op: null, tracker: createRateTracker(now), lastLogPct: -1, log: [] },
  };

  const gateRoot = $('#gate-root');
  const toolRoot = $('#tool-root');
  const tr = (id) => doc.getElementById(id);

  function cloneTemplate(id) {
    const t = doc.createElement('template');
    t.innerHTML = expand(tr(id).innerHTML);
    return t.content;
  }
  // 頁首／頁尾（模板之外的靜態區）也要展開圖示
  const footlinks = $('#footlinks');
  footlinks.innerHTML = expand(footlinks.innerHTML);

  // ---------- 小工具 ----------
  function bind(root, map) {
    for (const [k, v] of Object.entries(map)) {
      for (const el of $$(`[data-b="${k}"]`, root)) el.textContent = v;
      for (const el of $$(`[data-b-html="${k}"]`, root)) el.innerHTML = v;
    }
  }
  const box = (root, name, on) => { for (const el of $$(`[data-box="${name}"],[data-b-box="${name}"]`, root)) el.hidden = !on; };
  const setLangAttr = () => {
    doc.documentElement.dataset.lang = S.lang;
    doc.documentElement.lang = S.lang === 'zh' ? 'zh-Hant' : 'en';
    for (const b of $$('.langsw button')) b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang));
  };
  const msg = (zh, en) => (S.lang === 'zh' ? zh : en);
  const errText = (e) => (e && e.messages ? e.messages[S.lang === 'zh' ? 'zh-TW' : 'en'] : '');
  const focusHeading = (root) => {
    const h = $('[tabindex="-1"]', root);
    if (h) { try { h.focus({ preventScroll: false }); } catch { /* ignore */ } }
  };

  // ---------- 同意閘門 ----------
  function renderTerms(listEl) {
    // 條款內文是 terms-content.mjs 的靜態字串（只含 <b>），不含使用者輸入，可以直接當 HTML。
    listEl.innerHTML = TERMS_CLAUSES.map((c) => `<li><b>${L(c.title.zh, c.title.en)}</b> <span class="l zh">${c.body.zh}</span><span class="l en">${c.body.en}</span></li>`).join('');
  }

  function renderGate() {
    S.declined = false;
    toolRoot.replaceChildren();
    toolRoot.hidden = true;
    gateRoot.hidden = false;
    gateRoot.replaceChildren(cloneTemplate('tpl-gate'));
    bind(gateRoot, { termsVersion: CURRENT_TERMS_VERSION });
    renderTerms(tr('termsList'));
    if (S.oldConsent && S.oldConsent.reason === 'version') {
      bind(gateRoot, { newVer: CURRENT_TERMS_VERSION, oldVer: S.oldConsent.previous.termsVersion, oldDate: fmtDate(S.oldConsent.previous.acceptedAt) });
      box(gateRoot, 'upd-version', true);
    } else if (S.oldConsent && S.oldConsent.reason === 'expired') {
      bind(gateRoot, { oldDate: fmtDate(S.oldConsent.previous.acceptedAt) });
      box(gateRoot, 'upd-expired', true);
    }
    const termsBox = tr('termsBox');
    const checks = $$('.ag', gateRoot);
    const word = tr('agreeWord');
    const agreeBtn = tr('agreeBtn');
    let scrolled = false;
    const update = () => {
      if (!termsBox.isConnected) { win.removeEventListener('resize', update); return; } // 拒絕或同意後閘門已拿掉，不再更新
      if (isScrolledToEnd(termsBox)) scrolled = true; // 一旦到過最底就記住（不會因為縮放又變回沒到）
      const p = gateProgress({ scrolledToEnd: scrolled, checks: checks.map((c) => c.checked), word: word.value });
      const mark = (id, ok) => { const li = tr(id); li.classList.toggle('ok', ok); li.classList.toggle('no', !ok); };
      mark('rq1', p.scrolled); mark('rq2', p.allChecked); mark('rq3', p.wordOk);
      agreeBtn.disabled = !p.canAgree;
      const missing = [];
      if (!p.scrolled) missing.push(L('把條款捲到最底', 'scroll the terms to the bottom'));
      if (!p.allChecked) missing.push(L('逐項勾選四項聲明', 'tick all four statements one by one'));
      if (!p.wordOk) missing.push(L('輸入確認詞', 'type the confirmation word'));
      tr('agreeWhy').innerHTML = p.canAgree
        ? L('三項都完成了，可以按「同意並繼續」。', 'All three are done — you can press “Agree and continue”.')
        : `${L('「同意並繼續」還不能按，還差：', '“Agree and continue” is disabled; still missing: ')}${missing.join(L('、', ', '))}`;
    };
    termsBox.addEventListener('scroll', update, { passive: true });
    termsBox.addEventListener('keyup', update);
    win.addEventListener('resize', update);
    checks.forEach((c) => c.addEventListener('change', update));
    word.addEventListener('input', update);
    tr('declineBtn').addEventListener('click', renderDeclined);
    agreeBtn.addEventListener('click', () => {
      update();
      if (agreeBtn.disabled) return; // 保險：沒有三項齊全一律不放行
      accept();
    });
    update();
    win.requestAnimationFrame(update); // 版面算好後再判斷一次（內容一屏放得下的人不需要捲動）
    focusHeading(gateRoot);
  }

  function renderDeclined() {
    S.declined = true;
    const sc = $('[data-screen="consent"]', gateRoot);
    const dc = $('[data-screen="declined"]', gateRoot);
    sc.remove(); // 閘門整塊拿掉：終止畫面的 DOM 裡沒有任何連接／刷機／下載入口（含灰階停用的按鈕）
    dc.classList.add('on');
    focusHeading(dc);
  }

  function accept() {
    const record = makeRecord(now(), S.lang);
    store.write(record); // 寫不進去（無痕等）也沒關係：這次瀏覽仍可用，下次進來會再問
    S.consent = record;
    S.oldConsent = null;
    enterTool();
  }

  // ---------- 工具 ----------
  async function enterTool() {
    gateRoot.replaceChildren();
    gateRoot.hidden = true;
    toolRoot.hidden = false;
    toolRoot.replaceChildren(cloneTemplate('tpl-tool'));
    footlinks.hidden = false;
    bind(doc, { termsVersion: CURRENT_TERMS_VERSION, toolVersion: TOOL_VERSION });
    renderTerms(tr('termsListView'));
    S.screen = supported ? 'idle' : 'unsupported';
    const route = resolveRoute({ hash: win.location.hash, consented: true });
    S.tab = route.target === 's31' ? 's31' : 'sensor';
    S.termsOpen = route.target === 'terms';
    render();
    loadReleases(); // 同意之後才抓 releases.json（同意前頁面不接觸任何韌體網址）
  }

  async function loadReleases() {
    S.releases = []; S.releasesUrl = null; S.release = null;
    for (const url of releasesUrls) {
      try {
        const res = await fetchImpl(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const list = parseReleases(await res.text());
        S.releases = list; S.releasesUrl = url;
        break;
      } catch { /* 讀不到就當尚未開放，不顯示錯誤頁 */ }
    }
    S.release = pickRelease(S.releases, 'presence', 'factory');
    if (S.consent) refreshScreen();
  }

  function backupUnlocked() {
    return !!(S.backup && S.backup.saved && (S.backup.verifiable || S.backupConfirmed));
  }
  const skipMode = () => S.skipChecked && !backupUnlocked();
  const ver = () => String(S.release ? S.release.version : '').replace(/^v/i, '');

  /** 依目前狀態顯示／隱藏畫面。 */
  function render() {
    const tabsNav = $('nav.tabs', toolRoot);
    const pSensor = tr('panel-sensor');
    const pS31 = tr('panel-s31');
    const tv = tr('scr-terms-view');
    tabsNav.hidden = S.termsOpen;
    pSensor.hidden = S.termsOpen || S.tab !== 'sensor';
    pS31.hidden = S.termsOpen || S.tab !== 's31';
    tv.hidden = !S.termsOpen;
    $$('[data-tab-btn]', toolRoot).forEach((b) => {
      b.setAttribute('aria-selected', String(b.dataset.tabBtn === S.tab));
      b.disabled = S.busy;
    });
    $$('.screen', pSensor).forEach((s) => s.classList.toggle('on', s.dataset.screen === S.screen));
    $('.screen', pS31).classList.add('on');
    tv.classList.toggle('on', S.termsOpen);
    if (S.termsOpen) {
      bind(tv, { acceptedVer: S.consent.termsVersion, acceptedAt: fmtDateTime(S.consent.acceptedAt) });
      tr('scr-terms-view').querySelector('[data-b-html="recordWhere"]').innerHTML = storage ? L('只在這個瀏覽器（不上傳）', 'this browser only (not uploaded)') : L('這個瀏覽器不允許保存，只在這次瀏覽有效', 'this browser blocks storage; valid for this visit only');
    }
    refreshScreen();
  }

  function setScreen(name) {
    S.screen = name;
    render();
    const el = $(`[data-screen="${name}"]`, tr('panel-sensor'));
    if (el) { focusHeading(el); el.scrollIntoView && el.scrollIntoView({ block: 'start' }); }
  }

  /** 把狀態寫進目前畫面的各欄位。 */
  function refreshScreen() {
    const sc = $(`[data-screen="${S.screen}"]`, tr('panel-sensor'));
    if (!sc) return;
    const dev = S.device;
    switch (S.screen) {
      case 'identified': {
        bind(sc, { chip: dev.chip, macHtml: macHtml(dev.mac), flashMb: String(Math.round(dev.flashSizeBytes / 1048576)) });
        const unlocked = backupUnlocked();
        const skip = skipMode();
        const fwOk = !!S.release;
        const open = unlocked || skip;
        box(sc, 'needBackup', !unlocked);
        box(sc, 'haveBackup', unlocked);
        for (const [id, needFw] of [['fnUpdate', true], ['fnRestore', false]]) {
          const card = tr(id);
          const noFw = needFw && !fwOk;
          $('[data-role="locked"]', card).hidden = open;
          $('[data-role="skipped"]', card).hidden = !(skip && !unlocked) || (needFw && noFw);
          const nofw = $('[data-role="nofw"]', card);
          if (nofw) { nofw.hidden = !(open && noFw); }
          const btn = $('button[data-act]', card);
          btn.disabled = !open || noFw;
          card.classList.toggle('locked', !open || noFw);
          card.setAttribute('aria-disabled', String(!open || noFw));
          if (needFw) {
            box(card, 'fwVersion', fwOk);
            if (fwOk) bind(card, { latestVer: 'v' + ver() });
          }
        }
        tr('skipBk').checked = S.skipChecked;
        // 已有備份就不需要「略過備份」選項
        $('[data-b-box="skipbox"]', sc).hidden = unlocked;
        break;
      }
      case 'id-error': {
        const parts = [dev.chip];
        if (dev.flashSizeBytes) parts.push(`${Math.round(dev.flashSizeBytes / 1048576)} MB flash`);
        bind(sc, {
          detSummary: parts.join(' · '),
          mac: macDisplay(dev.mac),
          idErrTitle: dev.reason === 'wrong-flash' ? msg('Flash 容量不符，已拒絕所有操作', 'Unexpected flash size — all operations refused') : msg('不是預期的晶片，已拒絕所有操作', 'Unexpected chip — all operations refused'),
        });
        break;
      }
      case 'backup-done': refreshBackupDone(sc); break;
      case 'update-confirm': {
        bind(sc, { chip: dev.chip, mac: macDisplay(dev.mac), ver: ver(), verDate: S.release && S.release.date ? `(${S.release.date})` : '', fwFile: S.release ? S.release.file.split('/').pop() : '' });
        sc.querySelector('[data-b-html="bkState"]').innerHTML = bkStateHtml();
        box(sc, 'keepList', !S.erase); box(sc, 'eraseList', S.erase);
        $('[data-act="to-op-confirm"]', sc).disabled = !tr('reqUpd').checked;
        break;
      }
      case 'op-confirm': refreshOpConfirm(sc); break;
      case 'restore-confirm': refreshRestoreConfirm(sc); break;
      default: break;
    }
  }

  function bkStateHtml() {
    if (backupUnlocked()) {
      const d = S.backup.result.meta.createdAt;
      return `<span class="ok">${svgIcon('check')} ${L(`已存檔（${fmtDate(d).replace(/-/g, '')}）`, `saved (${fmtDate(d).replace(/-/g, '')})`)}</span>`;
    }
    return `<span class="no">${svgIcon('x')} ${L('沒有備份（已略過）', 'no backup (skipped)')}</span>`;
  }

  function refreshBackupDone(sc) {
    const b = S.backup;
    if (!b) return;
    const meta = b.result.meta;
    const base = S.flasher ? S.flasher.backupFileBase(meta) : 'backup';
    const saved = !!b.saved;
    bind(sc, {
      binName: (b.files && b.files.bin) || `${base}.bin`, jsonName: (b.files && b.files.json) || `${base}.json`,
      binBytes: formatBytesWithCommas(b.result.bytes.length), sha: b.result.sha256,
    });
    box(sc, 'presave', !saved); box(sc, 'saved', saved); box(sc, 'saveBtns', !saved);
    box(sc, 'unverified', saved && !b.verifiable && !S.backupConfirmed);
    for (const kind of ['bin', 'json']) {
      const tag = $(`[data-b-tag="${kind}"]`, sc);
      if (!saved) { tag.className = 'tag off'; tag.innerHTML = L('還沒存檔', 'Not saved'); }
      else if (b.method && b.method[kind] === 'picker') { tag.className = 'tag read'; tag.innerHTML = `${svgIcon('check')}${L('已存檔', 'Saved')}`; }
      else { tag.className = 'tag write'; tag.innerHTML = `${svgIcon('warn')}${L('已下載（無法確認）', 'Downloaded (unverified)')}`; }
    }
    if (saved) {
      const confirmed = b.verifiable || S.backupConfirmed;
      const savedBox = $('[data-box="saved"]', sc);
      savedBox.classList.toggle('ok', confirmed);
      savedBox.classList.toggle('warn', !confirmed);
      sc.querySelector('[data-b-html="savedTitle"]').innerHTML = confirmed ? L('備份完成，已存檔', 'Backup complete and saved') : L('備份已送出下載，還要你確認', 'Backup sent as downloads — please confirm');
      sc.querySelector('[data-b-html="savedText"]').innerHTML = b.verifiable || S.backupConfirmed
        ? L('資料核對無誤（設備端 MD5 一致），檔案也已存到你的電腦。「更新」與「還原」已解鎖。', "The data was verified (the device's MD5 matched) and the files were saved to your computer. “Update” and “Restore” are now unlocked.")
        : L('資料核對無誤，檔案已送出下載，但瀏覽器無法確認檔案是否存好，所以「更新」與「還原」還鎖著。', 'The data was verified and the files were sent as downloads, but the browser cannot confirm they were saved, so “Update” and “Restore” are still locked.');
      const where = sc.querySelector('[data-b-html="savedWhere"]');
      where.hidden = false;
      where.innerHTML = b.method && b.method.bin === 'picker' && b.method.json === 'picker'
        ? L('存到：你選的位置。', 'Saved to the location you picked.')
        : L('存到：瀏覽器的「下載」資料夾（瀏覽器不支援選位置，或存檔視窗被擋時的做法）。', "Saved to your browser's Downloads folder (used when the browser can't ask for a location or the save dialog was blocked).");
    } else {
      sc.querySelector('[data-b-html="savedWhere"]').hidden = true;
    }
    const unlocked = backupUnlocked();
    box(sc, 'next', unlocked);
    const nofw = !S.release;
    $$('[data-b-nofw="update"]', sc).forEach((btn) => { btn.disabled = nofw; });
    box(sc, 'nofwHint', unlocked && nofw);
  }

  // ---------- 操作層確認 ----------
  function visibleReqs(sc) {
    return $$('.req', sc).filter((c) => !c.closest('[hidden]'));
  }
  function updateConfirmButton(sc, tailInput, btnAct, needTail) {
    const checks = visibleReqs(sc).map((c) => c.checked);
    const ok = confirmReady({ checks, needTail, tailInput: tailInput ? tailInput.value : '', mac: S.device ? S.device.mac : '' });
    $(`[data-act="${btnAct}"]`, sc).disabled = !ok;
  }

  function refreshOpConfirm(sc) {
    const dev = S.device;
    const skip = skipMode();
    bind(sc, { ver: ver(), macHtml: macHtml(dev.mac) });
    sc.querySelector('[data-b-html="bkState"]').innerHTML = bkStateHtml();
    sc.querySelector('[data-b-html="opRange"]').innerHTML = S.erase
      ? `<span class="no">${L('整顆 flash 擦除後重寫（Wi-Fi 設定與校準會消失）', 'whole flash erased and rewritten (Wi-Fi settings and calibration are lost)')}</span>`
      : L('開機程式、分區表、主程式（不動設定區）', 'bootloader, partition table, application (settings area untouched)');
    box(sc, 'skipNote', skip); box(sc, 'skipOpt', skip); box(sc, 'eraseOpt', S.erase);
    updateConfirmButton(sc, tr('opMac'), 'start-update', true);
  }

  function refreshRestoreConfirm(sc) {
    const r = S.restore;
    const skip = skipMode();
    bind(sc, { macHtml: macHtml(S.device.mac), bkMac: macDisplay(r.meta.mac) });
    box(sc, 'rcDiff', r.macDiffers); box(sc, 'rcSame', !r.macDiffers); box(sc, 'rcWarns', r.macDiffers);
    box(sc, 'tailField', r.macDiffers);
    box(sc, 'skipNote', skip); box(sc, 'skipOpt', skip);
    updateConfirmButton(sc, tr('resType'), 'start-restore', r.macDiffers);
  }

  // ---------- 進行中 ----------
  function setBusy(on) {
    S.busy = on;
    win.onbeforeunload = on ? (e) => { e.preventDefault(); e.returnValue = ''; return ''; } : null;
    if (on) {
      try {
        const wl = win.navigator.wakeLock;
        if (wl && wl.request) wl.request('screen').then((s) => { S.wake = s; }).catch(() => {});
      } catch { /* 取不到 wake lock 不報錯 */ }
    } else if (S.wake) {
      try { S.wake.release(); } catch { /* ignore */ }
      S.wake = null;
    }
    $$('[data-tab-btn]', toolRoot).forEach((b) => { b.disabled = on; });
  }

  function startRun(op) {
    const c = RUN_COPY[op];
    S.run = { op, tracker: createRateTracker(now), lastLogPct: -1, log: [] };
    setBusy(true);
    setScreen('running');
    const sc = $('[data-screen="running"]', toolRoot);
    bind(sc, {
      stepsHtml: stepsHtml(c.steps),
      lockText: L(...c.lockText), lockSub: L(...c.lockSub), runTitle: L(...c.title),
      runTag: `${svgIcon(op === 'backup' ? 'eye' : op === 'update' ? 'pen' : 'warn')}${L(...c.tag)}`,
      pct: '0%', bytes: '', speed: '', eta: '', log: '',
    });
    const lb = tr('lockbar');
    lb.className = `lockbar ${c.lock}`;
    lb.firstElementChild.outerHTML = svgIcon(c.icon);
    tr('runTag').className = `tag ${c.tagCls}`;
    const bar = tr('bar');
    bar.className = `bar ${c.bar}`;
    setBar(0);
    tr('phases').innerHTML = PHASES[op].map((p, i) => `<li data-phase="${p}" class="${i === 0 ? 'act' : ''}"><span class="dot"></span>${L(...PHASE_LABELS[op][p])}</li>`).join('');
    const cancel = tr('cancelBtn');
    const cancellable = op === 'backup';
    cancel.disabled = !cancellable;
    cancel.innerHTML = cancellable ? L('取消備份', 'Cancel backup') : L('寫入中無法安全取消', "Can't be cancelled safely while writing");
    box(sc, 'cancelNote', false);
    logLine(msg('開始', 'Started'));
  }

  function setBar(pct) {
    const bar = tr('bar');
    bar.setAttribute('aria-valuenow', String(pct));
    bar.firstElementChild.style.width = `${pct}%`;
  }
  function logLine(text) {
    const d = new Date(now());
    S.run.log.push(`${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())} ${text}`);
    const pre = $('[data-b="log"]', toolRoot);
    if (pre) pre.textContent = S.run.log.join('\n');
  }
  function setPhase(idx) {
    $$('#phases li').forEach((li, i) => {
      li.classList.toggle('done', i < idx);
      li.classList.toggle('act', i === idx);
      const dot = $('.dot', li);
      dot.innerHTML = i < idx ? svgIcon('check') : '';
    });
  }

  function onProgress(ev0) {
    let ev = ev0;
    const op = S.run.op;
    const idx = phaseIndex(op, ev.stage);
    if (idx >= 0) setPhase(idx);
    const sc = $('[data-screen="running"]', toolRoot);
    if (ev.stage === 'reading' || ev.stage === 'writing') {
      // 備份的 total 把「設備端 MD5」也算成一個 flash 大小；讀取階段畫面只看「讀了多少 flash」。
      if (op === 'backup' && ev.stage === 'reading' && S.device && S.device.flashSizeBytes) ev = { ...ev, done: Math.min(ev.done, S.device.flashSizeBytes), total: S.device.flashSizeBytes };
      const frac = overallFraction(ev);
      const pct = Math.min(99, Math.floor(frac * 100));
      setBar(pct);
      const rate = S.run.tracker.update(ev.done, ev.total);
      const sp = formatSpeed(rate.speedBps);
      const eta = rate.etaSec != null ? formatEta(rate.etaSec) : null;
      bind(sc, {
        pct: `${pct}%`,
        bytes: ev.stage === 'writing' ? `${formatSize(ev.done)} / ${formatSize(ev.total)}${ev.partCount > 1 ? ` (${ev.part + 1}/${ev.partCount})` : ''}` : `${formatSize(ev.done)} / ${formatSize(ev.total)}`,
        speed: sp ? `${L('速度 ', 'Speed ')}${esc(sp)}` : '',
        eta: eta ? `${L('預估還要 ', 'About ')}${L(eta.zh, eta.en)}` : '',
      });
      if (pct >= S.run.lastLogPct + 10) { S.run.lastLogPct = pct - (pct % 10); logLine(`${ev.stage} ${pct}%`); }
    } else if (ev.stage === 'verifying' || ev.stage === 'verifying-write') {
      setBar(99);
      bind(sc, { pct: '99%', speed: '', eta: '' });
      if (S.run.lastStage !== ev.stage) logLine(ev.stage);
    } else if (ev.stage === 'resetting') {
      bind(sc, { pct: '100%', speed: '', eta: '' });
      setBar(100);
      logLine('resetting');
    } else if (ev.stage === 'recovering') {
      logLine(`recovering (retry ${ev.attempt})`); // 讀取卡住或失敗，引擎正在重新連線後重讀同一塊
    } else if (ev.stage === 'done') {
      logLine('done');
    }
    S.run.lastStage = ev.stage;
  }

  // ---------- 動作 ----------
  async function quietDisconnect() {
    const f = S.flasher;
    S.flasher = null;
    if (f) { try { await f.disconnect(); } catch { /* ignore */ } }
  }
  function resetSession() {
    S.device = null; S.backup = null; S.backupConfirmed = false; S.skipChecked = false; S.erase = false; S.restore = null; S.lastError = null;
  }

  function showIdleError(e) {
    const sc = $('[data-screen="idle"]', toolRoot);
    bind(sc, {
      idleErrorTitle: e.code === 'user-cancelled' ? msg('沒有選擇序列埠', 'No serial port was chosen') : msg('連接失敗', 'Connection failed'),
      idleErrorText: errText(e),
    });
    box(sc, 'idleError', true);
  }

  async function doConnect() {
    const idleBtn = $('[data-screen="idle"] [data-act="connect"]', toolRoot);
    if (S.busy) return;
    resetSession();
    setBusy(true);
    if (S.screen !== 'idle') setScreen('idle');
    box($('[data-screen="idle"]', toolRoot), 'idleError', false);
    if (idleBtn) { idleBtn.disabled = true; idleBtn.innerHTML = `<span class="spin"></span>${L('連接中…', 'Connecting…')}`; }
    try {
      S.flasher = await makeFlasher(consentForEngine(S.consent), {});
      await S.flasher.connect();
      S.device = await S.flasher.identify({ expectedProfile: 'presence' });
      setBusy(false);
      setScreen(S.device.profileMatch ? 'identified' : 'id-error');
    } catch (e) {
      const fe = toFlasherLike(e, 'connect-failed');
      await quietDisconnect();
      setBusy(false);
      setScreen('idle');
      showIdleError(fe);
    } finally {
      if (idleBtn) { idleBtn.disabled = false; idleBtn.innerHTML = `${svgIcon('usb')}${L('連接設備', 'Connect device')}`; }
    }
  }

  async function doBackup() {
    S.abort = new AbortController();
    S.backup = null; S.backupConfirmed = false;
    startRun('backup');
    try {
      const result = await S.flasher.backup({ onProgress, signal: S.abort.signal });
      S.backup = { result, saved: false, verifiable: false };
      setBusy(false); S.abort = null;
      setScreen('backup-done');
    } catch (e) {
      setBusy(false);
      const aborted = e && e.code === 'aborted';
      S.abort = null;
      if (aborted) { setScreen('identified'); return; }
      fail(e, 'backup');
    }
  }

  async function doSaveBackup() {
    const sc = $('[data-screen="backup-done"]', toolRoot);
    const btn = $('[data-act="save-backup"]', sc);
    box(sc, 'saveError', false);
    btn.disabled = true;
    try {
      const s = await S.flasher.saveBackup(S.backup.result);
      if (s.saved) {
        S.backup.saved = true; S.backup.verifiable = s.verifiable; S.backup.files = s.files; S.backup.method = s.method;
        refreshScreen();
        focusHeading(sc);
      } else {
        const fe = new FlasherError(s.code || 'save-failed', { reason: s.reason });
        bind(sc, { saveErrorTitle: msg('沒有存檔，更新與還原維持鎖定', 'Not saved — update and restore stay locked'), saveErrorText: errText(fe) });
        box(sc, 'saveError', true);
      }
    } catch (e) {
      const fe = toFlasherLike(e, 'save-failed');
      bind(sc, { saveErrorTitle: msg('沒有存檔，更新與還原維持鎖定', 'Not saved — update and restore stay locked'), saveErrorText: errText(fe) });
      box(sc, 'saveError', true);
    } finally {
      btn.disabled = false;
    }
  }

  async function downloadFirmware(rel) {
    const url = resolveFileUrl(rel.file, S.releasesUrl);
    let res;
    try { res = await fetchImpl(url, { cache: 'no-store' }); } catch (e) { const err = new Error('download-failed'); err.code = 'download-failed'; err.cause = e; throw err; }
    if (!res.ok) { const err = new Error('download-failed'); err.code = 'download-failed'; err.details = { status: res.status }; throw err; }
    const bytes = new Uint8Array(await res.arrayBuffer());
    await verifyDownload(bytes, rel, subtle);
    return bytes;
  }

  async function doUpdate() {
    const rel = S.release;
    const erase = S.erase;
    const skip = skipMode();
    S.lastOp = 'update';
    startRun('update');
    try {
      const data = await downloadFirmware(rel);
      logLine(`sha256 ok (${rel.version})`);
      setPhase(1);
      const result = await S.flasher.update([{ data, address: 0 }], { eraseAll: erase, confirmedEraseAll: erase === true, skipBackup: skip, onProgress });
      setBusy(false);
      success(result, 'update', erase);
    } catch (e) {
      setBusy(false);
      fail(e, 'update');
    }
  }

  async function doRestore() {
    const r = S.restore;
    const skip = skipMode();
    S.lastOp = 'restore';
    startRun('restore');
    try {
      const result = await S.flasher.restore(r.bin, { meta: r.metaText, confirmedDifferentMac: r.macDiffers, skipBackup: skip, onProgress });
      setBusy(false);
      success(result, 'restore', false);
    } catch (e) {
      setBusy(false);
      fail(e, 'restore');
    }
  }

  function success(result, op, erased) {
    S.flasher = null; // 引擎在寫入後已結束連線
    S.lastError = null;
    setScreen('success');
    const sc = $('[data-screen="success"]', toolRoot);
    const title = op === 'update' ? L(`完成！已更新到 v${ver()}，設備已重新啟動`, `Done! Updated to v${ver()} and the device has restarted`) : L('完成！備份已還原，設備已重新啟動', 'Done! The backup was restored and the device has restarted');
    bind(sc, {
      okTitle: result.reset === 'failed' ? (op === 'update' ? L('完成！韌體已更新', 'Done! The firmware was updated') : L('完成！備份已還原', 'Done! The backup was restored')) : title,
      okVerify: op === 'restore' ? L('整顆 flash MD5 驗證通過', 'Full-flash MD5 verified') : L('寫入的每一段 MD5 驗證通過', 'MD5 verified for every written segment'),
    });
    box(sc, 'resetFailed', result.reset === 'failed');
    box(sc, 'okRestarted', result.reset !== 'failed');
    box(sc, 'okKept', op === 'update' && !erased && Array.isArray(result.protectedRegions) && result.protectedRegions.length > 0);
    box(sc, 'afterErase', erased);
  }

  function fail(e, op) {
    const fe = toFlasherLike(e, op === 'backup' ? 'read-failed' : 'write-failed');
    S.lastError = fe; S.lastOp = op;
    setScreen('failure');
    const sc = $('[data-screen="failure"]', toolRoot);
    const partial = fe.partialWrite === true;
    const titles = { backup: ['備份沒有完成', 'Backup did not finish'], update: ['更新沒有完成', 'Update did not finish'], restore: ['還原沒有完成', 'Restore did not finish'] };
    const [tz, te] = titles[op] || ['操作沒有完成', 'The operation did not finish'];
    const reason = fe.details && fe.details.reason ? ` · ${fe.details.reason}` : '';
    bind(sc, { failTitle: partial ? L(`${tz}：寫入到一半中斷了`, `${te}: writing was interrupted`) : L(tz, te), failCode: `${fe.code}${reason}`, failText: esc(errText(fe)) });
    box(sc, 'failPartial', partial);
    box(sc, 'failClean', !partial && (op === 'update' || op === 'restore'));
    box(sc, 'rescue', partial);
  }

  // ---------- 還原選檔 ----------
  const MAX_BIN = 32 * 1024 * 1024;
  async function readPickedFile(kind, file) {
    if (!S.restore) S.restore = { bin: null, binName: '', binSize: 0, metaText: null, metaName: '', meta: null, metaError: null, result: null };
    const r = S.restore;
    if (kind === 'bin') {
      r.binName = file.name; r.binSize = file.size;
      r.bin = file.size <= MAX_BIN ? new Uint8Array(await file.arrayBuffer()) : null;
    } else {
      r.metaName = file.name;
      if (file.size > 1024 * 1024) { r.metaText = null; r.meta = null; r.metaError = 'too-big'; } else {
        r.metaText = await file.text();
        try { const m = JSON.parse(r.metaText); r.meta = m && typeof m === 'object' && !Array.isArray(m) ? m : null; r.metaError = r.meta ? null : 'bad-json'; } catch { r.meta = null; r.metaError = 'bad-json'; }
      }
    }
    await evaluateRestore();
  }

  async function evaluateRestore() {
    const r = S.restore;
    const sc = $('[data-screen="restore-pick"]', toolRoot);
    bind(sc, { pickBinName: r.binName ? safeFileLabel(r.binName) : '—', pickJsonName: r.metaName ? safeFileLabel(r.metaName) : '—' });
    sc.querySelector('[data-b-html="pickBinInfo"]').innerHTML = r.binName ? `.bin · ${formatBytesWithCommas(r.binSize)} ${L('位元組', 'bytes')}` : '.bin';
    const next = $('[data-act="to-restore-confirm"]', sc);
    next.disabled = true;
    if (!r.binName || !r.metaName) { box(sc, 'pickChecks', false); return; }
    let sha = '';
    if (r.bin) sha = bytesToHex(new Uint8Array(await subtle.digest('SHA-256', r.bin)));
    const chk = restoreChecks({
      binLength: r.binSize, firstByte: r.bin ? r.bin[0] : undefined, sha256: sha, meta: r.meta, metaError: r.metaError, device: S.device,
    });
    let engineOk = false;
    if (r.bin && !chk.hardFail) {
      try { const v = await S.flasher.validateBackup(r.bin, r.metaText, S.device); engineOk = v && v.ok === true; } catch { engineOk = false; }
    }
    r.macDiffers = chk.macDiffers; r.ok = !chk.hardFail && engineOk;
    sc.querySelector('[data-b-html="checksHtml"]').innerHTML = chk.items.map((it) =>
      `<li class="${it.level}">${svgIcon(CHECK_ICON[it.level])}<div>${checkLine(it, S.device)}</div></li>`).join('')
      + (!chk.hardFail && !engineOk ? `<li class="no">${svgIcon('x')}<div>${L('引擎的檢查沒有通過（備份檔與目前設備不相容）', "The engine's own check did not pass (the backup is not compatible with this device)")}</div></li>` : '');
    box(sc, 'pickChecks', true);
    box(sc, 'pickBad', !r.ok);
    box(sc, 'macHint', r.ok && r.macDiffers);
    next.disabled = !r.ok;
  }

  // ---------- 事件 ----------
  async function copyText(text, el) {
    try { await win.navigator.clipboard.writeText(text); if (el) { el.hidden = false; el.textContent = msg('已複製', 'Copied'); } return true; } catch {
      if (el) { el.hidden = false; el.textContent = msg('無法自動複製，請自己選取：', 'Could not copy automatically; select it yourself: ') + text; }
      return false;
    }
  }
  function downloadText(name, text) {
    const url = win.URL.createObjectURL(new win.Blob([text], { type: 'application/json' }));
    const a = doc.createElement('a');
    a.href = url; a.download = name;
    doc.body.appendChild(a); a.click(); a.remove();
    win.setTimeout(() => win.URL.revokeObjectURL(url), 10000);
  }

  function closeTerms() { S.termsOpen = false; render(); }

  async function onAct(name, el) {
    switch (name) {
      case 'copy-url': await copyText(win.location.href.split('#')[0], $('[data-b="copyDone"]', el.closest('.card'))); break;
      case 'goto-s31': S.tab = 's31'; render(); break;
      case 'connect': await doConnect(); break;
      case 'reconnect': await quietDisconnect(); resetSession(); await doConnect(); break;
      case 'disconnect': await quietDisconnect(); resetSession(); setScreen('idle'); break;
      case 'backup': await doBackup(); break;
      case 'cancel-run': if (S.abort) { S.abort.abort(); const n = $('[data-b="cancelNote"]', toolRoot); n.hidden = false; n.textContent = msg('正在取消…', 'Cancelling…'); el.disabled = true; } break;
      case 'save-backup': await doSaveBackup(); break;
      case 'confirm-saved': S.backupConfirmed = true; refreshScreen(); break;
      case 'discard-backup': S.backup = null; S.backupConfirmed = false; setScreen('identified'); break;
      case 'finish-backup': await quietDisconnect(); resetSession(); setScreen('idle'); break;
      case 'update':
        if (!S.release || !(backupUnlocked() || skipMode())) break;
        S.returnTo = S.screen; S.erase = false; setScreen('update-confirm');
        tr('eraseAll').checked = false; tr('reqUpd').checked = false; refreshScreen();
        break;
      case 'back-main': setScreen(S.returnTo === 'backup-done' && S.backup ? 'backup-done' : 'identified'); break;
      case 'to-op-confirm': setScreen('op-confirm'); for (const c of $$('.req', $('[data-screen="op-confirm"]', toolRoot))) c.checked = false; tr('opMac').value = ''; refreshScreen(); break;
      case 'back-update-confirm': setScreen('update-confirm'); break;
      case 'start-update': await doUpdate(); break;
      case 'restore':
        if (!(backupUnlocked() || skipMode())) break;
        S.returnTo = S.screen; S.restore = null; setScreen('restore-pick');
        tr('fileBin').value = ''; tr('fileJson').value = '';
        evaluateRestore0();
        break;
      case 'pick-bin': tr('fileBin').click(); break;
      case 'pick-json': tr('fileJson').click(); break;
      case 'to-restore-confirm': setScreen('restore-confirm'); for (const c of $$('.req', $('[data-screen="restore-confirm"]', toolRoot))) c.checked = false; tr('resType').value = ''; refreshScreen(); break;
      case 'back-restore-pick': setScreen('restore-pick'); break;
      case 'start-restore': await doRestore(); break;
      case 'finish': resetSession(); setScreen('idle'); break;
      case 'copy-report': await copyText(buildErrorReport({ error: S.lastError, engineVersion: ENGINE_VERSION, termsVersion: CURRENT_TERMS_VERSION, stage: S.lastOp, nowIso: new Date(now()).toISOString() }), $('[data-b="copyDone"]', el.closest('.card'))); break;
      case 'copy-sha': await copyText(S.backup ? S.backup.result.sha256 : '', null); break;
      case 'open-terms': if (S.consent) { S.termsOpen = true; render(); focusHeading(tr('scr-terms-view')); } break;
      case 'close-terms': closeTerms(); break;
      case 'dl-consent': if (S.consent) downloadText('consent-record.json', consentRecordJson(S.consent)); break;
      case 'reread': renderGate(); break;
      case 'leave': win.close(); win.setTimeout(() => { try { win.location.replace('about:blank'); } catch { /* ignore */ } }, 150); break;
      default: break;
    }
  }
  function evaluateRestore0() {
    const sc = $('[data-screen="restore-pick"]', toolRoot);
    bind(sc, { pickBinName: '—', pickJsonName: '—' });
    sc.querySelector('[data-b-html="pickBinInfo"]').innerHTML = '.bin';
    box(sc, 'pickChecks', false);
    $('[data-act="to-restore-confirm"]', sc).disabled = true;
  }

  doc.addEventListener('click', (ev) => {
    const el = ev.target.closest && ev.target.closest('[data-act]');
    if (el && !el.disabled) { ev.preventDefault(); onAct(el.dataset.act, el).catch((e) => { console.error(e); }); return; }
    const lb = ev.target.closest && ev.target.closest('.langsw button');
    if (lb) {
      S.lang = lb.dataset.lang === 'en' ? 'en' : 'zh';
      setLangAttr();
      if (S.consent) { S.consent = { ...S.consent, lang: S.lang }; store.write(S.consent); }
      return;
    }
    const tb = ev.target.closest && ev.target.closest('[data-tab-btn]');
    if (tb && !S.busy) { S.tab = tb.dataset.tabBtn; S.termsOpen = false; render(); }
  });
  doc.addEventListener('change', (ev) => {
    const t = ev.target;
    if (!t || !t.id && !t.classList) return;
    if (t.id === 'skipBk') { S.skipChecked = t.checked; refreshScreen(); }
    else if (t.id === 'eraseAll') { S.erase = t.checked; refreshScreen(); }
    else if (t.id === 'reqUpd') { refreshScreen(); }
    else if (t.classList && t.classList.contains('req')) { refreshScreen(); }
    else if (t.id === 'fileBin' && t.files && t.files[0]) { readPickedFile('bin', t.files[0]).catch(() => {}); }
    else if (t.id === 'fileJson' && t.files && t.files[0]) { readPickedFile('json', t.files[0]).catch(() => {}); }
  });
  doc.addEventListener('input', (ev) => {
    if (ev.target && (ev.target.id === 'opMac' || ev.target.id === 'resType')) refreshScreen();
  });
  win.addEventListener('hashchange', () => {
    const route = resolveRoute({ hash: win.location.hash, consented: !!S.consent, declined: S.declined });
    if (route.view !== 'tool') return; // 未同意：維持閘門，不論 hash
    if (S.busy) return;
    S.tab = route.target === 's31' ? 's31' : 'sensor';
    S.termsOpen = route.target === 'terms';
    render();
  });

  // ---------- 啟動 ----------
  setLangAttr();
  bind(doc, { termsVersion: CURRENT_TERMS_VERSION, toolVersion: TOOL_VERSION });
  const ev0 = evaluateStoredConsent(store.read(), now());
  if (ev0.status === 'valid') {
    S.consent = ev0.record; S.lang = ev0.record.lang; setLangAttr();
    enterTool();
  } else {
    if (ev0.status === 'outdated') {
      if (ev0.reason === 'invalid' || ev0.reason === 'future') store.clear();
      else S.oldConsent = ev0;
    }
    renderGate();
  }
  return {
    state: S,
    // 測試用：把目前畫面的 DOM 狀態與內部狀態讓 harness 看得到（不改變行為）
    _screen: () => S.screen,
  };
}

if (typeof window !== 'undefined' && !globalThis.__FLASHER_NO_AUTOSTART__) startApp();
