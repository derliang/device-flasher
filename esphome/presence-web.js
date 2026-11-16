// 感應器網頁。
// 只在瀏覽器執行：裝置只負責傳這個檔案。網址加 ?native 回 ESPHome 原始介面（要連外網）。
// 實體名稱要和 presence-common.yaml 的 name 完全一致；實體新增或改名要同步這支檔案。
// 網頁版本：改了這支檔案的外觀或行為就加一（和韌體版本 firmware_version 分開算）
const WEB_VERSION = '4.25';
const GATES = 9;
const HOST = location.hostname || 'presence';
const NS = 'http://www.w3.org/2000/svg';
const CAL = 'text_sensor/Calibration Status';
const ENG = 'switch/Radar Engineering Mode';
const DEVICE_NAME = 'text/Device Name';
const MELODY = 'text/Buzzer Melody';
const TRIG = 'text_sensor/Trigger Log';
const NMAX = 'text_sensor/Noise Max';
const NAVG = 'text_sensor/Noise Avg';
const BT = 'switch/Radar Bluetooth';
const WIFI_PW = 'text/WiFi New Password';
const AUTOOFF = 'number/Engineering Auto Off';
const PRES = 'binary_sensor/Radar Presence';
const CAL_KEY = 'presence-last-calibration';
const BK_KEY = 'presence-backups';
const OWN_KEY = 'presence-own-preset', PRESETS_KEY = 'presence-presets';
// 負載規則：單一 EventSource；背景分頁超過 HIDE_MS 就關連線；設定指令一次一條、間隔 GAP_MS
const THEME_KEY = 'presence-theme';
const MODE_KEY = 'presence-mode';
const TI = { auto: ['跟隨系統', '<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>'], light: ['日間', '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'], dark: ['夜間', '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>'] };
const HIDE_MS = 15000;
const GAP_MS = 150;
// 瀏覽器不給存（私密視窗）時只留在這次，不影響功能
const store = {
  get(k) { try { const v = localStorage.getItem(k); return JSON.parse(v); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 同上 */ } },
};

const CSS = `
/* 感應器網頁 CSS。 */

:root{color-scheme:dark;--bg:#0b1730;--bg2:#10224a;--text:#fff;--sub:rgba(255,255,255,.72);--faint:rgba(255,255,255,.4);--card:rgba(255,255,255,.075);--line:rgba(255,255,255,.15);--hair:rgba(255,255,255,.08);--soft:rgba(255,255,255,.09);--soft2:rgba(255,255,255,.16);--primary:#4cc3ff;--link:#4cc3ff;--ok:#3ddc84;--warn:#ff9a9a;--alert:#ff5a5f;--amber:#ffb340;--amberf:#ffb340;--teal:#2ec4b6;--off:rgba(255,255,255,.28);--sel:#0b1730;--hud:rgba(76,195,255,.7);--glow:rgba(76,195,255,.30);--grid:rgba(255,255,255,.09);--sheen:linear-gradient(180deg,rgba(255,255,255,.055),transparent 42%);--shadow:0 1px 2px rgba(0,0,0,.30),0 10px 30px rgba(0,0,0,.26),inset 0 1px 0 rgba(255,255,255,.12);--nav:rgba(18,34,72,.82);--prop:#b794ff}
@media(prefers-color-scheme:light){:root:not([data-theme=dark]){color-scheme:light;--bg:#dfe8f6;--bg2:#cddcf3;--text:#0f1d3a;--sub:rgba(15,29,58,.68);--faint:rgba(15,29,58,.38);--card:rgba(255,255,255,.58);--line:rgba(255,255,255,.8);--hair:rgba(15,29,58,.09);--soft:rgba(15,29,58,.06);--soft2:rgba(15,29,58,.1);--primary:#1f7ae0;--pfill:#1970d0;--link:#1560b8;--ok:#0e7439;--warn:#c92a30;--alert:#e5484d;--amber:#9a5d00;--amberf:#e08a00;--teal:#12907f;--off:rgba(15,29,58,.32);--sel:#fff;--hud:rgba(31,122,224,.65);--glow:rgba(31,122,224,.25);--grid:rgba(15,29,58,.1);--sheen:linear-gradient(180deg,rgba(255,255,255,.26),transparent 42%);--shadow:0 1px 2px rgba(40,70,140,.10),0 10px 26px rgba(40,70,140,.12),inset 0 1px 0 rgba(255,255,255,.70);--nav:rgba(255,255,255,.8);--prop:#7c5cf0}}
:root[data-theme=light]{color-scheme:light;--bg:#dfe8f6;--bg2:#cddcf3;--text:#0f1d3a;--sub:rgba(15,29,58,.68);--faint:rgba(15,29,58,.38);--card:rgba(255,255,255,.58);--line:rgba(255,255,255,.8);--hair:rgba(15,29,58,.09);--soft:rgba(15,29,58,.06);--soft2:rgba(15,29,58,.1);--primary:#1f7ae0;--pfill:#1970d0;--link:#1560b8;--ok:#0e7439;--warn:#c92a30;--alert:#e5484d;--amber:#9a5d00;--amberf:#e08a00;--teal:#12907f;--off:rgba(15,29,58,.32);--sel:#fff;--hud:rgba(31,122,224,.65);--glow:rgba(31,122,224,.25);--grid:rgba(15,29,58,.1);--sheen:linear-gradient(180deg,rgba(255,255,255,.26),transparent 42%);--shadow:0 1px 2px rgba(40,70,140,.10),0 10px 26px rgba(40,70,140,.12),inset 0 1px 0 rgba(255,255,255,.70);--nav:rgba(255,255,255,.8);--prop:#7c5cf0}
/* ===== v3 配置 =====
   只改配置，不動功能、外觀質感與雷達圖、頻譜圖：
   ① 12 欄對齊格線：每一列卡片欄寬加起來剛好滿版、列內等高，不再各欄各自堆疊。
   ② 字級階層固定六級（--fs-*），全頁不得出現第七種字級。
   ③ 改成 單欄式：頂端標題列加分頁列、單一主欄；舊的左側導覽拿掉（手機仍是下方膠囊）。
   ④ 系統頁診斷改成小磚加篩選，不再是一長串。 */
:root{--fs-hero:64px;--fs-num:28px;--fs-title:20px;--fs-body:14px;--fs-label:12px;--fs-micro:12px;--gap:16px;--pad:20px}
*{box-sizing:border-box}
[hidden]{display:none!important}
/* 3.5：第一次使用引導、為什麼有人、聲音說明 */
.ob{position:fixed;inset:0;z-index:90;display:grid;place-items:center;padding:16px;background:color-mix(in srgb,var(--bg) 70%,transparent);backdrop-filter:blur(6px)}
.obox{width:min(480px,100%);max-height:calc(100vh - 32px);overflow:auto;background:var(--bg2)}
.why{margin:4px 0 0}
.tones b{font-weight:600}
body{margin:0;background:var(--bg);color:var(--text);font:var(--fs-body)/1.45 -apple-system,"SF Pro Text","PingFang TC","Noto Sans TC",sans-serif}
.mono,.big,.num,.cap,.val{font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
button{font-family:inherit}

/* ===== 殼：頂端標題列（常駐）＋分頁列＋單一主欄 ===== */
.shell{display:flex;flex-direction:column;min-height:640px}
.bar{position:sticky;top:var(--stick,0px);z-index:40;display:flex;flex-direction:column;gap:12px;padding:20px 24px 14px;border-radius:28px 28px 0 0;background:color-mix(in srgb,var(--bg) 84%,transparent);backdrop-filter:blur(18px) saturate(110%);-webkit-backdrop-filter:blur(18px) saturate(110%)}
.hdr{display:flex;align-items:center;justify-content:space-between;gap:12px 24px;flex-wrap:wrap}
.hright{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.brand h1{margin:0;display:flex;align-items:center;gap:12px;font-size:var(--fs-title);font-weight:600;letter-spacing:.005em;line-height:1.2}
.brand h1::before{content:"";width:28px;height:28px;border-radius:9px;flex:none;background:radial-gradient(circle at 50% 120%,#fff 0 2.5px,transparent 3px),conic-gradient(from 210deg at 50% 100%,var(--primary),var(--teal),var(--primary));box-shadow:0 0 16px var(--glow),inset 0 0 0 1.5px rgba(255,255,255,.35)}
.who{margin:4px 0 0 40px;font:var(--fs-micro)/1.5 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.04em;color:var(--sub)}
.lv{display:inline-flex;align-items:center;gap:8px;min-height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--line);background:var(--card);font:var(--fs-label) ui-monospace,Menlo,Consolas,monospace;color:var(--text);white-space:nowrap}
.lv.state::before,.lv.ok::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--off)}
.lv.state.on{color:var(--amber)}.lv.state.on::before{background:var(--amberf);box-shadow:0 0 8px var(--amberf)}
.lv.ok{color:var(--ok);background:linear-gradient(180deg,color-mix(in srgb,var(--ok) 10%,transparent),transparent),var(--card);box-shadow:0 0 16px color-mix(in srgb,var(--ok) 22%,transparent)}
.lv.ok::before{background:currentColor;box-shadow:0 0 8px currentColor}
.nav{display:flex;gap:4px;padding:5px;border-radius:999px;border:1px solid var(--line);background:var(--nav);backdrop-filter:blur(24px) saturate(110%);-webkit-backdrop-filter:blur(24px) saturate(110%);box-shadow:var(--shadow),0 0 28px color-mix(in srgb,var(--primary) 10%,transparent)}
.nav button{flex:1 1 0;min-width:0;min-height:52px;display:flex;align-items:center;justify-content:center;gap:10px;border:0;border-radius:999px;background:none;color:var(--sub);font-size:var(--fs-body);cursor:pointer}
.nav button svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.nav button[aria-current=page]{background:linear-gradient(135deg,var(--pfill,var(--primary)),color-mix(in srgb,var(--pfill,var(--primary)) 62%,var(--teal)));color:var(--sel);font-weight:600;box-shadow:0 4px 18px var(--glow),inset 0 1px 0 rgba(255,255,255,.35)}
.nav button:not([aria-current]):hover{background:var(--soft)}
.nav.dock{position:sticky;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:30;width:calc(100% - 24px);margin:0 auto}
.nav.dock button{flex-direction:column;gap:2px;font-size:var(--fs-micro)}
.content{flex:1;padding:8px 24px 32px;min-width:0}
.pane[hidden]{display:none}

/* ===== 12 欄對齊格線：一列的欄寬加起來＝12，列內卡片等高 ===== */
.grid{display:flex;flex-direction:column;gap:var(--gap)}
@container (min-width:720px){
  .grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr))}
  .s12{grid-column:span 12}.s7{grid-column:span 7}.s6{grid-column:span 6}.s5{grid-column:span 5}
  .split{grid-template-columns:1fr 1fr!important}
  /* 4.0 基本模式重排：卡片被藏掉後，剩下的重新填滿 12 欄（Bs(n) 設 data-bs），不拉高、不留空 */
  [data-mode=basic] .grid>[data-bs="6"]{grid-column:span 6}[data-mode=basic] .grid>[data-bs="12"]{grid-column:span 12}
  .grid>.lt-led{grid-column:1/span 7;grid-row:1/span 2}.grid>.lt-snd{grid-column:8/span 5;grid-row:1}.grid>.lt-tone{grid-column:8/span 5;grid-row:2}
  [data-mode=basic] .grid>.lt-led{grid-column:1/span 6;grid-row:1}[data-mode=basic] .grid>.lt-tone{grid-column:1/span 6;grid-row:2}[data-mode=basic] .grid>.lt-snd{grid-column:7/span 6;grid-row:1/span 2}
  [data-mode=basic] .rgrid{display:grid;grid-template-columns:1fr 1fr;gap:0 24px}
}
.sechd{margin:8px 0 0;font-size:var(--fs-label);font-weight:600;letter-spacing:.06em;color:var(--sub)}
@container (max-width:719px){
  .shell{--fs-hero:48px;--fs-num:24px;--pad:16px;--gap:12px}
  .bar{padding:12px 12px 8px;gap:8px}.who{display:none}.content{padding:8px 12px 20px}
}

/* ===== 卡片與元件（字級只用六級） ===== */
.card{position:relative;padding:var(--pad);border-radius:24px;border:1px solid var(--line);background:var(--sheen),var(--card);box-shadow:var(--shadow),0 0 0 1px color-mix(in srgb,var(--text) 3%,transparent);display:flex;flex-direction:column;gap:12px;min-width:0;backdrop-filter:blur(24px) saturate(110%);-webkit-backdrop-filter:blur(24px) saturate(110%)}
.hud::before,.hud::after{content:"";position:absolute;width:14px;height:14px;pointer-events:none;border:1.5px solid var(--hud)}
.hud::before{top:8px;left:8px;border-right:0;border-bottom:0;border-top-left-radius:8px}
.hud::after{bottom:8px;right:8px;border-left:0;border-top:0;border-bottom-right-radius:8px}
.cap{display:flex;align-items:center;gap:10px;font-weight:700;font-size:var(--fs-title);line-height:1.25;letter-spacing:.01em;color:var(--text);margin:0}
.cap::before{content:"";width:8px;height:8px;border-radius:3px;background:var(--primary);box-shadow:0 0 9px var(--glow);flex:none}
.cap::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--hair),transparent)}
.sub{font-size:var(--fs-label);color:var(--sub);letter-spacing:.02em}
.blk>div.sub{font-size:var(--fs-body);font-weight:600;color:var(--text);letter-spacing:.01em;margin-bottom:2px}
.blk.rng>div.sub{font-size:var(--fs-label);font-weight:400;color:var(--sub);margin:0}
.blk{display:flex;flex-direction:column;gap:8px;min-width:0}
.fillcard{justify-content:space-between}
.row{min-height:56px;flex-shrink:0;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:4px 12px;padding:6px 0;border-top:1px solid color-mix(in srgb,var(--text) 6%,transparent)}
.row.first{border-top:0}
.name{flex:1 1 140px;min-width:0;font-size:var(--fs-body)}.note{font-size:var(--fs-label);color:var(--sub);margin-top:2px;line-height:1.45}
.val{font-size:var(--fs-label);color:var(--sub);overflow-wrap:anywhere;text-align:right}
.sw{position:relative;width:52px;height:32px;padding:3px;border:0;border-radius:999px;background:var(--off);display:flex;justify-content:flex-start;cursor:pointer;flex:none;transition:background .15s}
.sw::before{content:"";position:absolute;inset:-8px 0}
.sw[aria-checked=true]{background:linear-gradient(135deg,var(--pfill,var(--primary)),color-mix(in srgb,var(--pfill,var(--primary)) 62%,var(--teal)));justify-content:flex-end;box-shadow:0 0 14px var(--glow)}
.sw::after{content:"";width:26px;height:26px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.35)}
.seg{display:flex;flex-wrap:wrap;gap:3px;padding:3px;border-radius:14px;background:var(--soft);box-shadow:inset 0 1px 2px rgba(0,0,0,.14)}
.seg button{min-width:44px;min-height:44px;padding:0 12px;border:0;border-radius:11px;font-size:var(--fs-label);background:none;color:var(--text);cursor:pointer}
.seg button[aria-pressed=true],.chip[aria-pressed=true]{background:linear-gradient(135deg,var(--pfill,var(--primary)),color-mix(in srgb,var(--pfill,var(--primary)) 66%,var(--teal)));color:var(--sel);font-weight:600;box-shadow:0 2px 10px var(--glow),inset 0 1px 0 rgba(255,255,255,.3)}
.slide{flex:2 1 220px;display:flex;align-items:center;gap:12px}
.slide input[type=range]{flex:1 1 auto;min-width:0;height:44px;accent-color:var(--primary);margin:0}
.slide .val{min-width:70px}
.btns{display:flex;flex-wrap:wrap;gap:8px}
.btn{min-height:44px;padding:0 18px;border-radius:14px;border:1px solid var(--line);background:var(--soft);color:var(--text);font-size:var(--fs-body);cursor:pointer;box-shadow:inset 0 1px 0 color-mix(in srgb,var(--text) 8%,transparent)}
.btn.primary{background:linear-gradient(135deg,var(--pfill,var(--primary)),color-mix(in srgb,var(--pfill,var(--primary)) 66%,var(--teal)));border-color:transparent;color:var(--sel);font-weight:600;box-shadow:0 4px 18px var(--glow),inset 0 1px 0 rgba(255,255,255,.35)}
.btn.danger{border-color:var(--alert);background:color-mix(in srgb,var(--alert) 7%,transparent);color:var(--warn)}.btn:disabled{opacity:.45;cursor:default;box-shadow:none}
.field{flex:1 1 150px;min-width:0;min-height:44px;padding:0 12px;border:1px solid var(--line);border-radius:13px;background:var(--soft);color:var(--text);font-size:var(--fs-body);box-shadow:inset 0 1px 2px rgba(0,0,0,.12)}
.field option{background:var(--bg);color:var(--text)}
.num{width:76px;flex:none;min-height:44px;text-align:center;border:1px solid var(--line);border-radius:13px;background:var(--soft);color:var(--text);font-size:var(--fs-body);box-shadow:inset 0 1px 2px rgba(0,0,0,.12)}
.field:focus-visible,.num:focus-visible{outline:2px solid var(--primary);outline-offset:1px}
.hint{flex:1 1 100%;font-size:var(--fs-label);color:var(--sub);line-height:1.5;margin:0}
a{font-size:var(--fs-label);color:var(--link)}
pre{flex:1 1 auto;min-height:120px;max-height:320px;margin:0;padding:12px 14px;border-radius:14px;background:var(--soft);font:var(--fs-label)/1.6 ui-monospace,Menlo,Consolas,monospace;color:var(--sub);white-space:pre-wrap;overflow:auto}
form{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding-top:12px;border-top:1px solid var(--hair)}
form input[type=file]{flex:1 1 180px;min-width:0;font-size:var(--fs-label);color:var(--sub)}
.map{display:none;margin:0;padding:6px 8px;border-radius:8px;border:1px dashed var(--faint);font:var(--fs-micro)/1.5 ui-monospace,Menlo,Consolas,monospace;color:var(--sub);overflow-wrap:anywhere}
body.showmap .map{display:block}
.btn,.chip,.seg button,.nav button,.step,.led{transition:transform .12s ease,filter .12s ease,background .18s,color .18s}
.btn:active,.chip:active,.seg button:active,.nav button:active,.step:active,.led:active{transform:scale(.97);filter:brightness(1.18)}
@media(prefers-reduced-motion:reduce){.btn:active,.chip:active,.seg button:active,.nav button:active,.step:active,.led:active{transform:none}}
.chip{min-height:44px;padding:0 14px;border-radius:999px;border:1px solid var(--line);background:var(--soft);color:var(--text);font-size:var(--fs-label);cursor:pointer}
.targets{display:flex;flex-wrap:wrap;gap:6px}

/* ===== 小磚（讀數、環境、診斷、統計共用；左上小標、下方等寬數字） ===== */
.tile,.read,.etile,.dt,.sig{border-radius:16px;background:linear-gradient(180deg,color-mix(in srgb,var(--text) 5%,transparent),transparent 70%),var(--soft);box-shadow:inset 0 1px 0 color-mix(in srgb,var(--text) 7%,transparent);min-width:0}
.tile,.read,.dt{padding:12px 14px;display:flex;flex-direction:column;gap:6px}
.l,.read span.l,.dt .l{font-size:var(--fs-label);color:var(--sub)}
.read b,.tile b{font:300 var(--fs-num)/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.read i,.tile i{font:var(--fs-label) ui-monospace,Menlo,Consolas,monospace;font-style:normal;color:var(--sub);margin-left:4px}
.reads,.tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.sigs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.sig{min-height:52px;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:var(--fs-label);color:var(--sub)}
.sig b{font:600 var(--fs-label) ui-monospace,Menlo,Consolas,monospace;color:var(--text);display:flex;align-items:center;gap:6px}
.sig b::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--off)}
.sig.on b::before{background:var(--amberf)}
.sig.on{color:var(--text);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--amberf) 45%,transparent),0 0 16px color-mix(in srgb,var(--amberf) 14%,transparent)}

/* ===== 總覽 ===== */
.radar{gap:4px}
.stateline{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.state{display:flex;align-items:center;gap:14px}
.state .dot{width:14px;height:14px;border-radius:50%;background:var(--off);flex:none}
.state.on .dot{background:var(--amberf);animation:pulse 2.4s infinite}
@keyframes pulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--amberf) 55%,transparent)}70%,100%{box-shadow:0 0 0 12px transparent}}
@media(prefers-reduced-motion:reduce){.state.on .dot{animation:none}}
.big{font-size:var(--fs-hero);font-weight:300;line-height:1;letter-spacing:-.025em}
.state.on .big{color:var(--amber);text-shadow:0 0 34px color-mix(in srgb,var(--amberf) 45%,transparent)}
.kind{font-size:var(--fs-label);color:var(--sub);flex:1 1 180px}
svg.fan{width:100%;height:auto;display:block;margin-top:4px}
.ptools .field{flex:1 1 220px}.pwrap{display:flex;flex-direction:column;gap:8px}
.pgrp{border:1px solid var(--hair);border-radius:16px;background:var(--soft)}
.pgrp>summary{min-height:52px;padding:6px 14px;display:flex;align-items:center;gap:10px;cursor:pointer;font-weight:700;font-size:var(--fs-body);list-style:none}
.pgrp>summary::before{content:"▸";transition:transform .15s}.pgrp[open]>summary::before{transform:rotate(90deg)}
.pgrp .pcnt{margin-left:auto;white-space:nowrap;font:var(--fs-label) ui-monospace,Menlo,Consolas,monospace;color:var(--sub);font-weight:400}
.pgrp .pbody{padding:0 14px 8px}
.pgrp .row{min-height:64px}.pgrp .rg{font-family:ui-monospace,Menlo,Consolas,monospace;color:var(--sub)}
.pgrp .unit{min-width:24px;font-size:var(--fs-label);color:var(--sub)}
.pgrp .tag{font-size:var(--fs-micro);font-weight:700;color:#1a1200;background:var(--amberf);border-radius:6px;padding:1px 6px}
.pgrp .saved{font:var(--fs-micro) ui-monospace,Menlo,Consolas,monospace;color:var(--ok)}.pgrp .saved.bad{color:var(--alert)}
.rctl{display:flex;flex-direction:column;gap:10px;margin-top:8px}
.rrow{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px}
.lbls .lbrow{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px}
.lbls .lbrow .field{flex:1 1 140px;min-width:0}.lbls .lbg{display:flex;align-items:center;gap:6px;flex:none}.lbls .lbrow .num{width:72px}
.fan text{font:var(--fan-fs,11px) ui-monospace,Menlo,Consolas,monospace;fill:var(--sub);paint-order:stroke;stroke:var(--bg);stroke-width:3px;stroke-linejoin:round}
.env{display:flex;flex-direction:column;gap:8px}
.etile{padding:12px 16px;display:flex;align-items:center;gap:12px}
.etile .l{flex:1 1 auto}
.etile .v{font:300 var(--fs-num)/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:-.02em;white-space:nowrap}
.etile .v i{font:var(--fs-label) ui-monospace,Menlo,Consolas,monospace;font-style:normal;color:var(--sub);margin-left:4px}
.etile .off{display:flex;align-items:center;gap:8px;font-size:var(--fs-label);color:var(--sub);flex:none}
.etile .off input{width:68px}
.trend svg{width:100%;height:40px;display:block}
.ax{display:flex;justify-content:space-between;font-size:var(--fs-micro);color:var(--sub);margin-top:2px}

/* ===== 偵測調教：頻譜圖與單格編輯 ===== */
.spec{width:100%;display:block}
.spec text{font:var(--fs-micro) ui-monospace,Menlo,Consolas,monospace;fill:var(--sub);paint-order:stroke;stroke:var(--bg);stroke-width:2.5px;stroke-linejoin:round}
.spec .gl{font-size:var(--fs-label);fill:var(--text)}
.spec .col{cursor:pointer;outline:none}
.spec .col:focus-visible rect.hit{stroke:var(--primary);stroke-width:2}
.spec .col:hover rect.hit{fill:color-mix(in srgb,var(--text) 6%,transparent)}
.spec .col rect[fill^="url"]{filter:drop-shadow(0 0 5px color-mix(in srgb,var(--primary) 35%,transparent))}
.legend{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:var(--fs-label);color:var(--sub)}
.lg{display:inline-flex;align-items:center;gap:6px}
.lg::before{content:"";width:10px;height:10px;border-radius:3px;background:var(--primary)}
.lg.s::before{background:var(--teal)}
.lg.t::before{width:12px;height:2px;border-radius:0;background:var(--text)}
.lg.a::before{background:var(--amberf)}
.banner{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:14px;background:linear-gradient(90deg,color-mix(in srgb,var(--amberf) 14%,transparent),transparent),var(--soft);border:1px solid color-mix(in srgb,var(--amberf) 55%,transparent);font-size:var(--fs-label)}
.gedit{gap:8px}
.ghead{display:flex;align-items:center;justify-content:space-between;gap:8px}
.ghead b{font:500 var(--fs-title) ui-monospace,Menlo,Consolas,monospace}
.ghead small{font:var(--fs-label) ui-monospace,Menlo,Consolas,monospace;color:var(--sub);margin-left:8px}
.step{width:44px;height:44px;border-radius:14px;border:1px solid var(--line);background:var(--soft);color:var(--text);font-size:var(--fs-title);cursor:pointer;box-shadow:inset 0 1px 0 color-mix(in srgb,var(--text) 8%,transparent)}
.gedit .row{padding:2px 0}
.gedit .tag{font-size:var(--fs-body);display:flex;align-items:center;gap:8px;flex:1 1 130px}
.gedit .tag i{width:10px;height:10px;border-radius:3px;background:var(--primary);display:inline-block}
.gedit .tag.s i{background:var(--teal)}
.gedit .live{font:var(--fs-label) ui-monospace,Menlo,Consolas,monospace;color:var(--sub)}
.gedit .slide{flex:2 1 200px}
.steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;font-size:var(--fs-label);color:var(--sub)}
.steps div{padding-top:6px;border-top:3px solid var(--soft2);border-radius:2px;transition:border-color .2s}
.steps div.done{border-color:var(--ok);color:var(--text)}
.steps div.cur{border-color:var(--primary);color:var(--text);font-weight:600}
.calstat{font-size:var(--fs-num);font-weight:300;line-height:1.3;letter-spacing:-.01em}
.prog{height:10px;border-radius:999px;background:var(--soft2);overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,.2)}
.prog i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--primary),var(--teal));box-shadow:0 0 12px var(--glow);transition:width .25s}
.eta{font-size:var(--fs-label);color:var(--sub)}
.cmp{display:grid;grid-template-columns:auto repeat(9,minmax(0,1fr));gap:2px;font:var(--fs-micro) ui-monospace,Menlo,Consolas,monospace;color:var(--sub)}
.cmp span{text-align:center;padding:4px 0;border-radius:6px;background:var(--soft)}
.cmp .lab{background:none;text-align:left;padding-right:8px}
.cmp .up{color:var(--warn)}.cmp .dn{color:var(--ok)}
.hgrid{display:grid;grid-template-columns:minmax(0,1fr);gap:12px 28px;align-items:start}
@container (min-width:720px){.hgrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.hprog{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 12px;font-size:var(--fs-label);color:var(--sub)}
.hprog b{font-weight:400;color:var(--text);font-variant-numeric:tabular-nums}
.hsec{font-size:var(--fs-body);font-weight:700;color:var(--text);margin-top:4px}
.subnav .dot{display:inline-block;width:8px;height:8px;margin-left:6px;border-radius:50%;background:var(--amberf);box-shadow:0 0 8px var(--amberf);vertical-align:middle}
.pset{display:flex;flex-direction:column;gap:12px}
.bklist{display:flex;flex-direction:column}
.bkrow{min-height:56px;display:flex;align-items:center;gap:12px;padding:6px 0;border-top:1px solid var(--hair)}
.bkrow:first-child{border-top:0}
.bkrow .name{flex:1 1 auto}

/* ===== 燈光與聲音 ===== */
.device{display:flex;justify-content:center;padding:20px 8px 12px;border-radius:20px;background:radial-gradient(260px 120px at 50% 0%,var(--glow),transparent 75%),var(--soft);border:1px solid var(--hair);position:relative}
.bezel{display:flex;align-items:center;justify-content:center;gap:clamp(14px,5vw,34px);padding:28px 22px 12px;border-radius:26px;border:1.5px solid var(--line);background:linear-gradient(180deg,color-mix(in srgb,var(--text) 7%,transparent),transparent 60%),rgba(0,0,0,.14);box-shadow:inset 0 1px 0 color-mix(in srgb,var(--text) 10%,transparent),inset 0 -8px 18px rgba(0,0,0,.12);position:relative}
.bezel .grp{display:flex;flex-direction:column;gap:10px;position:relative}
.bezel>.grp:first-child{flex-direction:column-reverse}
.bezel .dome{width:84px;height:84px;border-radius:50%;flex:none;border:2px solid var(--line);background:radial-gradient(circle at 38% 30%,color-mix(in srgb,var(--text) 22%,transparent),var(--soft2) 70%);box-shadow:inset 0 -6px 14px rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;font:var(--fs-micro) ui-monospace,Menlo,Consolas,monospace;color:var(--sub);letter-spacing:.14em}
.bezel .rad{position:absolute;left:50%;bottom:-2px;transform:translateX(-50%);padding:2px 14px;border-radius:6px 6px 0 0;border:1px solid var(--line);border-bottom:0;font:var(--fs-micro) ui-monospace,Menlo,Consolas,monospace;color:var(--sub);letter-spacing:.14em}
.glab{position:absolute;top:-17px;left:0;right:0;text-align:center;font:var(--fs-micro) ui-monospace,Menlo,Consolas,monospace;color:var(--sub);letter-spacing:.14em}
.led{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:46px;min-height:56px;padding:0;border:0;background:none;color:var(--sub);font:var(--fs-label) ui-monospace,Menlo,Consolas,monospace;cursor:pointer}
.led i{width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 35% 28%,color-mix(in srgb,var(--text) 20%,transparent),var(--soft2) 62%);border:2px solid var(--line);box-shadow:inset 0 -3px 6px rgba(0,0,0,.18);transition:background .2s,box-shadow .2s}
.led.on i{box-shadow:0 0 20px 3px currentColor,inset 0 0 0 2px rgba(255,255,255,.38),inset 0 -3px 6px rgba(0,0,0,.12)}
.led[aria-pressed=true]{color:var(--text);font-weight:700}
.led[aria-pressed=true] i{border-color:var(--primary)}
.colors{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.colors button{width:40px;height:40px;border-radius:50%;border:2px solid var(--line);cursor:pointer;padding:0;box-shadow:inset 0 0 0 2px rgba(255,255,255,.35),0 2px 8px rgba(0,0,0,.25)}
.colors button:active{transform:scale(.94)}
.colors input{width:44px;height:44px;padding:0;border:0;background:none;cursor:pointer}

/* ===== 系統：診斷小磚＋篩選 ===== */
.dtools{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 16px}
.dtools .field{flex:0 1 280px}
.dgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px}
.dh{grid-column:1/-1;font-size:var(--fs-body);font-weight:700;letter-spacing:.04em;color:var(--text);margin-top:12px;padding-top:12px;border-top:1px solid var(--hair)}.dh:first-child{margin-top:0;padding-top:0;border-top:0}
.dh{display:flex;align-items:center;gap:10px}
.dh::before{content:"";width:4px;height:18px;border-radius:2px;background:var(--ga,var(--primary));box-shadow:0 0 10px color-mix(in srgb,var(--ga,var(--primary)) 55%,transparent)}
.dh::after{content:attr(data-n);margin-left:auto;font-weight:500;font-size:var(--fs-label);color:var(--sub);letter-spacing:0}
.dt{border-top:3px solid var(--ga,var(--line));background:linear-gradient(180deg,color-mix(in srgb,var(--ga,transparent) 13%,var(--soft)),var(--soft))}
.dt .l{color:color-mix(in srgb,var(--ga,var(--sub)) 55%,var(--sub))}
.dt .v{font:500 var(--fs-body) ui-monospace,Menlo,Consolas,monospace;overflow-wrap:anywhere}

/* ===== 自訂滑桿：細軌道＋進度＋發光圓鈕（--p 由程式填） ===== */
input[type=range]{-webkit-appearance:none;appearance:none;background:transparent;cursor:pointer}
input[type=range]::-webkit-slider-runnable-track{height:6px;border-radius:999px;background:linear-gradient(90deg,var(--primary) var(--p,50%),var(--soft2) var(--p,50%))}
input[type=range]::-moz-range-track{height:6px;border-radius:999px;background:var(--soft2)}
input[type=range]::-moz-range-progress{height:6px;border-radius:999px;background:var(--primary)}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;margin-top:-8px;border-radius:50%;background:#fff;border:0;box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 45%,transparent),0 2px 8px rgba(0,0,0,.35)}
input[type=range]::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:#fff;border:0;box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 45%,transparent),0 2px 8px rgba(0,0,0,.35)}
input[type=range]:focus-visible{outline:none}
input[type=range]:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 4px var(--primary)}

.split{display:grid;grid-template-columns:1fr;gap:var(--gap)}

/* ===== v3 追加：熱圖、子分頁、說明清單 ===== */
.subnav{align-self:flex-start}
.dwrap{display:flex;flex-direction:column;gap:var(--gap)}
.hm{display:grid;grid-template-columns:auto 1fr;gap:8px}
.hmlab{display:grid;grid-template-rows:repeat(9,1fr);font:var(--fs-micro) ui-monospace,Menlo,Consolas,monospace;color:var(--sub);height:216px}
.hmlab span{display:flex;align-items:center}
.hmsvg{width:100%;height:216px;border-radius:12px;background:var(--soft);display:block}
.dt.mut .v{color:var(--sub);font-weight:400}
.steps-list{margin:0;padding-left:22px;display:flex;flex-direction:column;gap:8px;font-size:var(--fs-body);line-height:1.5}
.steps-list li::marker{color:var(--primary);font-weight:600}
/* ===== 實作限制的畫面處理 ===== */
.lv.warnc{color:var(--amber)}.lv.warnc::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--amberf);box-shadow:0 0 8px var(--amberf)}
.content.re>.pane{opacity:.5;pointer-events:none}
.wstrip{position:sticky;bottom:16px;z-index:35;display:flex;flex-direction:column;gap:8px;margin-top:var(--gap);padding:12px 16px;border-radius:18px;border:1px solid var(--line);background:var(--nav);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);box-shadow:var(--shadow);font-size:var(--fs-label)}
@container (max-width:719px){.wstrip{bottom:calc(84px + env(safe-area-inset-bottom,0px))}}
.banner.danger{border-color:var(--alert);background:linear-gradient(90deg,color-mix(in srgb,var(--alert) 14%,transparent),transparent),var(--soft);color:var(--text)}
details.adv>summary{min-height:44px;display:flex;align-items:center;gap:8px;cursor:pointer;font-size:var(--fs-body);color:var(--sub);list-style:none}
details.adv>summary::before{content:"▸";transition:transform .15s}details.adv[open]>summary::before{transform:rotate(90deg)}
details.adv>.blk{margin-top:12px}
/* ===== v3.1 追加：偵測範圍摘要、時間序列、觸發日誌、底噪統計 ===== */
.rng{gap:8px}
.lgrow{display:grid;grid-template-columns:auto auto minmax(0,1fr) minmax(0,1fr);gap:4px 12px;align-items:center;min-height:44px;border-top:1px solid var(--hair);font:var(--fs-label) ui-monospace,Menlo,Consolas,monospace;color:var(--sub)}
.bklist>.lgrow:first-child{border-top:0}
.lgrow b{font-weight:600;color:var(--text)}.lgrow b.on{color:var(--amber)}
.series{display:flex;flex-direction:column;gap:6px}
.series svg{width:100%;height:84px;display:block;border-radius:12px;background:var(--soft)}
.series .top{display:flex;justify-content:space-between;gap:8px;font-size:var(--fs-label);color:var(--sub)}
.nz .cmp .up{color:var(--alert);font-weight:700;background:color-mix(in srgb,var(--alert) 14%,var(--soft))}
.tseg{flex:none}.tseg button{min-width:44px;min-height:44px;padding:0;display:inline-flex;align-items:center;justify-content:center}.tseg svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.stage{padding:12px 0 40px;display:flex;justify-content:center}
.frame{container-type:inline-size;width:100%;max-width:1240px;position:relative;border-radius:28px;background:radial-gradient(1000px 520px at 10% -12%,var(--glow),transparent 66%),radial-gradient(760px 420px at 104% 6%,color-mix(in srgb,var(--prop) 16%,transparent),transparent 70%),radial-gradient(circle at 1px 1px,var(--grid) 1px,transparent 1.3px) 0 0/24px 24px,var(--bg)}

/* ===== 實機專有：訊息條、寫入進度條、表格、熱圖畫布 ===== */
.dgrid .dt.wide{grid-column:span 2}
.toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(20px + env(safe-area-inset-bottom,0px));z-index:60;max-width:calc(100% - 32px);padding:10px 16px;border-radius:14px;background:var(--bg2);border:1px solid var(--line);box-shadow:var(--shadow);font-size:var(--fs-label);color:var(--text)}
.toast[hidden],.qbar[hidden]{display:none}
.qbar{position:fixed;left:12px;right:12px;max-width:520px;margin:0 auto;bottom:calc(72px + env(safe-area-inset-bottom,0px));z-index:55;padding:12px 14px;border-radius:16px;background:var(--bg2);border:1px solid var(--line);box-shadow:var(--shadow);font-size:var(--fs-label)}

/* ===== v2.2 精緻化：結構、功能、文案、色碼都不動，只加質感與動態；沿用既有 tokens ===== */
/* 1 版面節奏：卡片之間多一點呼吸，標題列更清楚 */
.card{padding:20px 22px;gap:9px}
h2.cap{padding-bottom:10px;margin-bottom:2px;border-bottom:1px solid color-mix(in srgb,var(--text) 7%,transparent)}
.row{padding:6px 8px;margin:0 -8px;border-radius:12px;border-top-color:transparent;position:relative;transition:background .18s}
.row+.row::before{content:"";position:absolute;left:8px;right:8px;top:0;height:1px;background:color-mix(in srgb,var(--text) 6%,transparent)}
.row:hover{background:color-mix(in srgb,var(--text) 3.5%,transparent)}
.row:hover::before,.row:hover+.row::before{opacity:0}
.first.row::before{display:none}
.note,.hint,.sub{line-height:1.55}
/* 2 卡片：懸停時邊緣泛一點主色光（HUD 角標保留不動） */
.card{transition:box-shadow .25s,border-color .25s}
.card:hover{border-color:color-mix(in srgb,var(--primary) 30%,var(--line));box-shadow:var(--shadow),0 0 26px color-mix(in srgb,var(--primary) 9%,transparent)}
/* 4 開關：旋鈕滑動，不是瞬間跳 */
.sw{justify-content:flex-start;transition:background .22s,box-shadow .22s}
.sw::after{transition:transform .22s cubic-bezier(.3,.7,.2,1);box-shadow:0 1px 4px rgba(0,0,0,.35),0 0 0 .5px rgba(0,0,0,.08)}
.sw[aria-checked=true]{justify-content:flex-start}
.sw[aria-checked=true]::after{transform:translateX(20px)}
/* 5 滑桿：已填的部分帶一點光 */
input[type=range]::-webkit-slider-runnable-track{box-shadow:0 0 10px color-mix(in srgb,var(--primary) 18%,transparent)}
input[type=range]:hover::-webkit-slider-thumb{box-shadow:0 0 0 5px color-mix(in srgb,var(--primary) 40%,transparent),0 2px 8px rgba(0,0,0,.35)}
/* 6 分段與膠囊：選中那顆有輕微浮起 */
.seg{padding:3px}
.seg button{transition:background .2s,color .2s,box-shadow .2s}
.chip{transition:background .2s,box-shadow .2s,border-color .2s}
.chip:not([aria-pressed=true]):hover{border-color:color-mix(in srgb,var(--primary) 45%,var(--line))}
/* 7 提示條：左側一條色帶，一眼分辨一般／警告 */
.banner{position:relative;overflow:hidden;padding-left:18px;flex:none}
.banner::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--amberf);box-shadow:0 0 12px color-mix(in srgb,var(--amberf) 60%,transparent)}
.banner.danger::before{background:var(--alert);box-shadow:0 0 12px color-mix(in srgb,var(--alert) 60%,transparent)}
.banner.danger{box-shadow:0 0 22px color-mix(in srgb,var(--alert) 12%,transparent)}
/* 4.12 */
.since{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 10px;margin-top:2px}
.since b{font:500 var(--fs-body) ui-monospace,Menlo,Consolas,monospace;color:var(--text)}
.since span{font-size:var(--fs-label);color:var(--sub)}
.chip.far{border-style:dashed;color:var(--sub);background:transparent}
.banner.info{background:linear-gradient(90deg,color-mix(in srgb,var(--primary) 12%,transparent),transparent),var(--soft);border-color:color-mix(in srgb,var(--primary) 45%,transparent)}
.banner.info::before{background:var(--primary);box-shadow:0 0 12px color-mix(in srgb,var(--primary) 60%,transparent)}
.calstat.warn{color:var(--amber)}
.bkline{font-size:var(--fs-label);color:var(--sub);flex:1 1 100%;margin:0}
.bkline b{color:var(--text);font-weight:600;font-family:ui-monospace,Menlo,Consolas,monospace}
/* 8 狀態點呼吸：有人時標題列狀態與雷達中心緩慢呼吸 */
@keyframes br{0%,100%{box-shadow:0 0 6px currentColor}50%{box-shadow:0 0 14px 2px currentColor}}
.pill::before{animation:br 3.2s ease-in-out infinite}
/* 9 進場：卡片依序淡入上浮（只在換頁時，尊重減少動態設定） */
@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.grid>.card{animation:rise .38s cubic-bezier(.2,.7,.2,1) both}
.grid>.card:nth-child(2){animation-delay:.04s}.grid>.card:nth-child(3){animation-delay:.08s}.grid>.card:nth-child(4){animation-delay:.12s}.grid>.card:nth-child(n+5){animation-delay:.16s}
/* 10 細節：捲軸、選取色、焦點環 */
*{scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--text) 22%,transparent) transparent}
::selection{background:color-mix(in srgb,var(--primary) 40%,transparent)}
:focus-visible{outline:2px solid var(--primary);outline-offset:2px;border-radius:10px}
.obox:focus-visible{outline:none}
/* 3.6 基本／進階模式：同一個殼，基本模式只把進階卡藏起來 */
[data-mode=basic] .adv-only,[data-mode=adv] .basic-only{display:none!important}
.mseg{flex:none}.mseg button{min-height:44px;font-size:var(--fs-body)}
.more{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px}
.more .hint{margin:0;flex:1 1 260px}
.rsteps{margin:0;padding-left:22px;display:flex;flex-direction:column;gap:6px;font-size:var(--fs-body)}
.rsteps li.done{color:var(--ok)}.rsteps li.cur{font-weight:600}
/* 3.6 總覽雷達圖改版（2a）：全寬、扇形圖＋資訊欄 */
.rlay{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:16px 24px;align-items:start;container-type:inline-size}
.rlay>.rside{display:flex;flex-direction:column;gap:10px;min-width:0}
@container (max-width:720px){.rlay{grid-template-columns:minmax(0,1fr)}.rlay>.rside{order:-1}}
@media(max-width:720px){.rlay{grid-template-columns:minmax(0,1fr)}.rlay>.rside{order:-1}}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.rread{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.rread div{padding:8px 10px;border-radius:12px;background:var(--soft)}
.rread span{display:block;font-size:var(--fs-micro);color:var(--sub)}.rread b{font-size:var(--fs-body)}
.fan .gl{font-size:var(--fs-micro);fill:var(--sub)}
.fan .tl{font-weight:700;font-family:inherit}
.fan.narrow .gl,.fan.narrow .wide{display:none}
.card svg.tline{width:100%;height:auto;max-height:none;aspect-ratio:720/170;flex:none;display:block}
.tline text{font:var(--fs-micro) ui-monospace,Menlo,Consolas,monospace;fill:var(--sub)}
@media(prefers-reduced-motion:reduce){.pill::before,.grid>.card{animation:none}.sw::after{transition:none}}
/* ===== 4.2 手機捲動不跳動、不卡：預留空間、橫幅浮動、標題列瘦身、減少特效（只動窄螢幕，桌機不變） ===== */
.banner.flt{position:fixed;left:50%;top:calc(8px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:75;width:min(640px,calc(100% - 24px));background:var(--bg2);box-shadow:0 6px 24px rgba(0,0,0,.35)}
.banner.flt.danger{top:calc(64px + env(safe-area-inset-top,0px))}
.brk,.themefoot{display:none}
.radar .why:empty{display:none}
@container (max-width:719px){
  .radar .chips{min-height:80px;align-content:flex-start}
  .radar .why:empty{display:block}.radar .why{min-height:54px}
  .radar .kind{min-height:18px}
  .hdr{justify-content:flex-start;gap:8px}
  .hdr>.brand{order:1;flex:1 1 0;min-width:0}
  .hdr>.hright,.hdr>.hright>.hright{display:contents}
  .hdr .mseg{order:2}.hdr .brk{order:3;display:block;flex:0 0 100%;height:0}.hdr .lv{order:4}
  .themefoot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 4px 0}
  .bar{background:var(--bg);backdrop-filter:none;-webkit-backdrop-filter:none}
  .nav,.wstrip{backdrop-filter:none;-webkit-backdrop-filter:none}.nav{background:var(--bg2)}
  .shell{--shadow:0 1px 2px rgba(0,0,0,.22)}
  .state.on .dot,.pill::before,.grid>.card{animation:none}
}

/* ===== 4.9 基本模式改善：圖表設定收合、離開後多久轉無人、裝置健康 ===== */
[data-mode=adv] .rwrap>summary{display:none}
.rwrap>summary{margin:0 0 8px}
.tpre{margin-top:4px}
.tpre .seg{display:flex;flex-wrap:wrap;gap:2px}
.tpre .seg button{flex:1 1 auto}
.eta>div[hidden]{display:none}
.tiles .tile .l{display:block}
.dt[hidden]{display:none}

/* 調校精靈 */
.wz{width:min(640px,100%)}
.wzhd{display:flex;justify-content:space-between;align-items:center;gap:8px}
.wzpg{display:flex;gap:4px;margin:10px 0}.wzpg i{flex:1;height:4px;border-radius:2px;background:var(--soft2)}.wzpg i.d{background:var(--primary);box-shadow:0 0 8px var(--glow)}
.wzbd{min-height:260px}.wzft{justify-content:space-between;margin-top:12px}
.wzrow{display:flex;gap:10px;align-items:center}.wzrow input[type=range]{flex:1}
.wzrange{display:flex;gap:2px;height:10px;margin:10px 0}.wzrange i{flex:1;border-radius:2px;background:var(--soft2)}.wzrange i.a{background:var(--primary)}.wzrange i.t{background:var(--amberf)}
.wzlive{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;position:sticky;top:0;background:var(--bg2);padding:4px 0}
.wzitem{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px 0;border-top:1px solid var(--hair)}
.wztab{width:100%;border-collapse:collapse}.wztab td{padding:6px 0;border-bottom:1px solid var(--hair)}.wztab td:last-child{text-align:right}
@media(max-width:719px){.ob:has(.wz){padding:0}.wz{width:100%;min-height:100dvh;max-height:none;border-radius:0;display:flex;flex-direction:column}.wzbd{flex:1}.wzft{position:sticky;bottom:0;background:var(--bg2);padding:10px 0}.wzft .btn{min-height:44px}}
`;

/* ============ 小工具 ============ */
const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const sv = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.append(e); return e; };
const entities = {};
const val = (id) => entities[id]?.value;
// 數字實體的 value 是字串、感測器沒資料時是 null，這裡統一成數字或 null
const num = (id) => { const v = val(id); if (v === null || v === undefined || v === '') return null; const n = +v; return Number.isFinite(n) ? n : null; };
const isOn = (id) => val(id) === true;
const fx = (v, n = 0) => typeof v === 'number' ? v.toFixed(n) : '—';
/* ============ 設定指令佇列：一次一條、間隔 GAP_MS、失敗不重送 ============ */
const queue = [];
let pumping = false, toastTimer = 0, barEl = null;
const zhName = {};  // 實體 id → 畫面上的中文名稱（失敗提示用；由各列元件登記）
function zhOf(id) {  // 失敗提示用的中文名稱：先看各列元件登記的，再看固定幾個，最後才退回英文實體名
  if (zhName[id]) return zhName[id];
  const fixed = { [ENG]: '工程模式', [BT]: '雷達藍牙', [DEVICE_NAME]: '裝置名稱', [MELODY]: '旋律', 'button/Buzzer Play Melody': '播放旋律', 'button/Restore Factory Defaults': '恢復原廠設定', 'button/Restore Recommended': '套用建議值', 'text/WiFi New SSID': 'Wi-Fi 名稱', [WIFI_PW]: 'Wi-Fi 密碼', 'button/WiFi Apply': '套用 Wi-Fi' };
  if (fixed[id]) return fixed[id];
  let m = /^number\/Gate (\d+) (Move|Still) Threshold$/.exec(id);
  if (m) return `G${m[1]} ${m[2] === 'Move' ? '移動' : '靜止'}門檻`;
  m = /^number\/Zone (\d+) (Start|End) Gate$/.exec(id);
  if (m) return `區域 ${m[1]} ${m[2] === 'Start' ? '起點' : '終點'}格`;
  if (id.startsWith('light/')) return '燈光';
  return id.split('/').slice(1).join('/');
}
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = h('div', 'toast'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 4500);
}
// 4.5：裝置卡住不回應時請求不會自己失敗，佇列會整個停住；加逾時，超過就當失敗、繼續下一條
// 4.14 閃動統計：記「有人↔無人」切換時間（只在網頁開著且連線時累計，存這個瀏覽器的 localStorage，保留 1 小時）
const FLIP_KEY = 'presence-flips', FLIP_MS = 3600000, FLICK_MS = 3000;
let flips = (() => { const v = store.get(FLIP_KEY); return Array.isArray(v) ? v.filter((x) => Array.isArray(x) && Number.isFinite(x[0]) && Date.now() - x[0] < FLIP_MS).slice(-400) : []; })();
function flipTrack(on) { const t = Date.now(); flips = flips.filter((x) => t - x[0] < FLIP_MS).concat([[t, on ? 1 : 0]]).slice(-400); store.set(FLIP_KEY, flips); }
// 閃動＝有人只持續 ≤3 秒，且前一段無人也 ≤3 秒（順序：無人→有人→無人）
function flipStats() {
  const now = Date.now(), w = flips.filter((x) => now - x[0] < FLIP_MS);
  let flick = 0;
  for (let i = 2; i < w.length; i++) if (w[i][1] === 0 && w[i - 1][1] === 1 && w[i - 2][1] === 0 && w[i][0] - w[i - 1][0] <= FLICK_MS && w[i - 1][0] - w[i - 2][0] <= FLICK_MS) flick++;
  return { switches: w.length, flick, since: w.length ? w[0][0] : null };
}
const SEND_TIMEOUT_MS = 10000;
const rawSend = (id, act, keepalive) => {
  const [domain, ...name] = id.split('/'), ac = new AbortController(), t = setTimeout(() => ac.abort(), SEND_TIMEOUT_MS);
  return fetch(`/${domain}/${encodeURIComponent(name.join('/'))}/${act}`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, keepalive: !!keepalive, signal: ac.signal,
  }).finally(() => clearTimeout(t));
};
function drawBar(b) {
  if (!barEl) { barEl = h('div', 'qbar'); barEl.setAttribute('role', 'status'); barEl.append(h('span'), h('div', 'prog')); barEl.lastChild.append(h('i')); document.body.append(barEl); }
  barEl.hidden = false;
  barEl.firstChild.textContent = `${b.label}：第 ${Math.min(b.done + 1, b.total)} / ${b.total} 項${b.fail ? `（失敗 ${b.fail}）` : ''}`;
  barEl.lastChild.firstChild.style.width = (b.done / b.total * 100) + '%';
}
async function pump() {
  if (pumping) return;
  pumping = true;
  while (queue.length) {
    const j = queue.shift();
    try {
      const r = await rawSend(j.id, j.act);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      j.res(true);
    } catch (err) {
      console.error('Action error:', j.id, err);
      toast((err && err.name === 'AbortError' ? '指令逾時（裝置沒有回應）：' : '指令失敗：') + zhOf(j.id));
      if (j.batch) j.batch.fail++;
      j.res(false);
    }
    if (j.batch) { j.batch.done++; drawBar(j.batch); if (j.batch.done >= j.batch.total) setTimeout(() => { if (barEl && !queue.some((q) => q.batch)) barEl.hidden = true; }, 1500); }
    await new Promise((r) => setTimeout(r, GAP_MS));
  }
  pumping = false;
}
// 同一個實體的 set 還在排隊時，新的值直接取代舊的（拖滑桿連按不會堆積）
function send(id, act) {
  return new Promise((res) => {
    const same = /^set\?/.test(act) && queue.find((q) => !q.batch && q.id === id && /^set\?/.test(q.act));
    if (same) { const old = same.res; same.act = act; same.res = (v) => { old(v); res(v); }; return; }
    queue.push({ id, act, res }); pump();
  });
}
// 一次寫很多項（套用情境、還原設定檔、匯入）：顯示進度、逐條送
function batch(label, jobs) {
  const b = { label, total: jobs.length, done: 0, fail: 0 };
  drawBar(b);
  const ps = jobs.map(([id, act]) => new Promise((res) => queue.push({ id, act, res, batch: b })));
  pump();
  return Promise.all(ps).then(() => b);
}

const dur = (s) => {
  if (!(s >= 0)) return '—';
  const d = Math.floor(s / 86400), hh = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60;
  if (d) return `${d} 天 ${hh} 小時`;
  if (hh) return m ? `${hh} 小時 ${m} 分` : `${hh} 小時`;
  return m ? `${m} 分` : `${Math.round(s)} 秒`;
};
const moveE = (g) => num(`sensor/Gate ${g} Move Energy`);
const stillE = (g) => num(`sensor/Gate ${g} Still Energy`);
const moveT = (g) => num(`number/Gate ${g} Move Threshold`);
const stillT = (g) => num(`number/Gate ${g} Still Threshold`);
const res = () => val('select/Radar Distance Resolution') === '0.2m' ? 0.2 : 0.75;
const facState = () => num('sensor/Radar Target State');
const facCal = () => { const t = facState(); return t !== null && t >= 4 && t <= 6; };
const IGN_KEY = 'presence-ignore-prev';
const gateRange = (g) => `${(g * res()).toFixed(2)}–${((g + 1) * res()).toFixed(2)} m`;
const WORD = {
  'Leave the room, starting soon': '請離開房間，即將開始', 'Sampling, keep the room empty': '取樣中，請保持房間淨空',
  'Sit still at your usual spot': '請回到你平常待的位置坐下不動，坐好就自動開始', 'Sit still at the desk': '請回到你平常待的位置坐下不動，坐好就自動開始', 'Seated, sampling': '已偵測到你坐好，取第二點中', 'Writing thresholds': '正在寫入門檻', Verifying: '驗證中：確認寫入後雷達仍看得到坐著的你', Cancelled: '已取消',
  'Aborted: someone in the room, thresholds unchanged': '已中止：取樣時房間裡有人（PIR 觸發或移動能量很大），門檻沒有改，請離開房間後重來',
  off: '關閉', below: '低於門檻', above: '高於門檻', low: '低電位', high: '高電位',
};
const say = (t) => {
  t = String(t ?? '');
  if (!t) return '—';
  if (t.startsWith('Done')) return `完成（${(t.match(/\d+/) || ['?'])[0]} 筆樣本${t.includes('history used') ? '，底噪用歷史資料' : ''}${t.includes('seated step skipped') ? '，沒等到你坐回，第二點略過' : ''}）`;
  if (t.startsWith('Aborted')) return WORD['Aborted: someone in the room, thresholds unchanged'];
  if (t.startsWith('Failed')) return '失敗：沒有收到能量資料，門檻未變';
  return WORD[t] || t;
};

/* ============ 畫面更新：最多每 200 毫秒一次、只更新目前分頁、分頁在背景或連線中斷時不畫 ============ */
const KEYS = ['global', 'overview', 'detect_live', 'detect_cal', 'detect_zone', 'detect_param', 'lights', 'system'];
const regs = Object.fromEntries(KEYS.map((k) => [k, []]));
let building = 'global', paintTimer = 0, conn = 'reconnect';
const route = { tab: 'overview', sub: 'live' };
const activeKey = () => route.tab === 'detect' ? 'detect_' + route.sub : route.tab;
const watch = (fn) => { regs[building].push(fn); fn(); };
// 4.2 手機捲動不跳動：iOS 的 Safari／Chrome（WebKit）沒有「捲動錨定」，上方內容變高變矮時畫面會跳；
// ①手指還在滑（最近 250 毫秒有捲動）就先不更新畫面，滑完再更新（也省下捲動中的重畫）
// ②更新前記下畫面頂端第一個看得到的元素位置，更新後若位置被推動就補捲回去（只在捲動停止時做，不打斷慣性捲動）
let lastScroll = 0;
window.addEventListener('scroll', () => { lastScroll = Date.now(); }, { passive: true });
function anchorEl() {
  const bar = document.querySelector('.bar'), top = bar ? bar.getBoundingClientRect().bottom : 0;
  for (const e of document.querySelectorAll('.pane:not([hidden]) :is(.row,.dt,.tile,.etile,.cap,.hint,.btns,.pgrp,.rread,.calstat,.hprog,svg.fan)')) {
    if (e.offsetParent === null) continue;
    const r = e.getBoundingClientRect();
    if (r.height > 0 && r.top >= top) return [e, r.top];
  }
  return null;
}
function paint(deferrable) {
  paintTimer = 0;
  if (document.hidden) return;
  if (deferrable && Date.now() - lastScroll < 250) { paintTimer = setTimeout(() => paint(true), 250); return; }
  const a = window.scrollY > 4 ? anchorEl() : null;
  regs.global.forEach((f) => f());
  regs[activeKey()].forEach((f) => f());
  if (a && a[0].isConnected) { const d = a[0].getBoundingClientRect().top - a[1]; if (Math.abs(d) > 0.5) window.scrollBy(0, d); }
}
const schedule = () => { if (!paintTimer) paintTimer = setTimeout(() => paint(true), 200); };

function card(title, ...kids) { const c = h('section', 'card'); if (title) c.append(h('h2', 'cap', title)); c.append(...kids); return c; }
function row(label, note, first) { const r = h('div', 'row' + (first ? ' first' : '')), n = h('div', 'name', label); if (note) n.append(h('div', 'note', note)); r.append(n); return r; }
function textRow(label, f, first) { const r = row(label, null, first), v = h('span', 'val', '—'); r.append(v); watch(() => { v.textContent = f(); }); return r; }
function switchRow(label, id, note, first) {
  zhName[id] = label;
  const r = row(label, note, first), b = h('button', 'sw');
  b.type = 'button'; b.setAttribute('role', 'switch'); b.setAttribute('aria-label', label);
  b.onclick = () => send(id, isOn(id) ? 'turn_off' : 'turn_on');
  r.append(b); watch(() => b.setAttribute('aria-checked', String(isOn(id)))); return r;
}
function segRow(label, id, note, first) {
  zhName[id] = label;
  const r = row(label, note, first), s = h('div', 'seg'); let built = ''; r.append(s);
  watch(() => {
    const opts = entities[id]?.option || [];
    if (opts.join() !== built) {
      built = opts.join();
      s.replaceChildren(...opts.map((o) => { const b = h('button', '', say(o)); b.type = 'button'; b.dataset.o = o; b.onclick = () => send(id, `set?option=${encodeURIComponent(o)}`); return b; }));
    }
    s.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.o === val(id))));
  });
  return r;
}
const paintRange = (i) => { const mn = +i.min || 0, mx = +i.max || 100; i.style.setProperty('--p', ((+i.value - mn) / (mx - mn || 1) * 100) + '%'); };
// range：滑桿範圍，不給就用裝置回報的；box：滑桿旁放數字框，可輸入超過滑桿範圍的值
function sliderRow(label, id, { fmt = (v) => String(v), note, first, range, box } = {}) {
  zhName[id] = label;
  const r = row(label, note, first), w = h('label', 'slide'), i = h('input'), v = box ? h('input', 'num') : h('span', 'val', '—');
  i.type = 'range'; i.setAttribute('aria-label', label);
  i.oninput = () => { paintRange(i); if (box) v.value = i.value; else v.textContent = fmt(+i.value); };
  i.onchange = () => send(id, `set?value=${i.value}`);
  if (box) { v.type = 'number'; v.setAttribute('aria-label', label); v.onchange = () => send(id, `set?value=${v.value}`); }
  w.append(i, v); r.append(w);
  watch(() => {
    const d = entities[id]; if (!d) return;
    const [min, max, step] = range || [d.min_value, d.max_value, d.step];
    Object.assign(i, { min, max, step });
    if (box) Object.assign(v, { min: d.min_value, max: d.max_value, step: d.step });
    const cur = num(id);
    if (cur === null || i.matches(':active')) return;
    i.value = cur; paintRange(i);
    if (!box) v.textContent = fmt(cur); else if (document.activeElement !== v) v.value = cur;
  });
  return r;
}
function btn(label, cls, ask, fn) { const b = h('button', 'btn ' + (cls || ''), label); b.type = 'button'; b.onclick = () => { if (ask && !confirm(ask)) return; fn && fn(); }; return b; }
const press = (id) => () => send(id, 'press');
// 3.6 基本／進階模式：A(el) 只在進階模式顯示，B(el) 只在基本模式顯示
const A = (el) => { el.classList.add('adv-only'); return el; };
const B = (el) => { el.classList.add('basic-only'); return el; };
const Bs = (n, el) => { el.dataset.bs = n; return el; };
let mode = 'adv';
const setMode = (m, save) => { mode = m === 'basic' ? 'basic' : 'adv'; document.documentElement.dataset.mode = mode; if (save) store.set(MODE_KEY, mode); };
function moreCard(list) {
  const c = card(null), r = h('div', 'more');
  r.append(h('p', 'hint', '進階模式還有：' + list), btn('切到進階模式', null, null, () => { setMode('adv', true); paint(); window.dispatchEvent(new Event('modechange')); }));
  c.append(r); return B(c);
}
const col = (...k) => { const d = h('div', 'col'); d.append(...k); return d; };

/* ============ 總覽 ============ */
// 4.0：雷達圖方向可選（預設感應器在上、扇形往下開；也可改成感應器在下），存在這個瀏覽器
const ORI_KEY = 'presence-radar-ori', LAY_KEY = 'presence-radar-layers', LBL_KEY = 'presence-radar-labels';
let ori = store.get(ORI_KEY) === 'up' ? 'up' : 'down';
const polar = (cx, cy, r, a) => [cx + r * Math.sin(a), cy + (ori === 'up' ? -1 : 1) * r * Math.cos(a)];
const sweep = () => ori === 'up' ? 1 : 0;
function band(cx, cy, r0, r1, a0, a1) {
  const [x0, y0] = polar(cx, cy, r1, a0), [x1, y1] = polar(cx, cy, r1, a1), [x2, y2] = polar(cx, cy, r0, a1), [x3, y3] = polar(cx, cy, r0, a0);
  return `M${x0},${y0}A${r1},${r1} 0 0 ${sweep()} ${x1},${y1}L${x2},${y2}A${r0},${r0} 0 0 ${1 - sweep()} ${x3},${y3}Z`;
}
// 停留熱度：每秒一筆，記有人時目標所在的格（只存在這個分頁的記憶體；LD2410B 沒有角度，只能記距離）
const dwell = new Array(GATES).fill(0);
const DEF_LAY = { zone: true, target: true, heat: false, label: true };
const loadJson = (k, d) => { const v = store.get(k); return v && typeof v === 'object' ? v : d; };
const layers = Object.assign({}, DEF_LAY, loadJson(LAY_KEY, {}));
const labels = (() => { const v = loadJson(LBL_KEY, []); return Array.isArray(v) ? v.filter((x) => x && typeof x.n === 'string' && Number.isFinite(+x.a) && Number.isFinite(+x.b)).slice(0, 6) : []; })();
// 3.5：為什麼判定有人（韌體 3.2 Presence Reason：m,格,能量,門檻;s,格,能量,門檻;p,PIR;r,殘留;h,保持中）
function whyText() {
  const t = val('text_sensor/Presence Reason');
  if (!t) return '';
  const f = {}; String(t).split(';').forEach((x) => { const a = x.split(','); f[a[0]] = a.slice(1).map(Number); });
  const out = [];
  if (f.r && f.r[0]) out.push('判定是離開後的殘留回波（靜止能量持續下降、沒有移動、PIR 沒動），不算有人');
  const part = (k, word) => { const a = f[k]; if (!a) return; const [g, e, th] = a; out.push(th < 0 ? `第 ${g} 格${word}能量 ${e}（門檻還在讀取）` : `第 ${g} 格${word}能量 ${e}，${e >= th ? '高於' : '低於'}門檻 ${th}`); };
  part('m', '移動'); part('s', '靜止');
  if (f.p && f.p[0]) out.push('PIR 有動');
  if (f.b && f.b[0]) out.push('雷達旗標掉線、但靜止能量仍高，韌體橋接中（b=1，最久撐 Dropout Bridge Seconds 秒），先當作有人');
  else if (f.h && f.h[0]) out.push('雷達已放開，延時保持中');
  const st = val('text_sensor/Presence State');
  return (st && PSTATE[st] ? `狀態：${PSTATE[st]}。` : '') + (out.length ? '為什麼：' + out.join('；') : '');
}
// 4.9 基本模式的白話句（進階模式維持 whyText 的工程字）：韌體 Presence Reason 的判斷翻成一句人話
function whyPlain() {
  const f = reasonF();
  const m = num('sensor/Radar Moving Distance'), st = num('sensor/Radar Still Distance');
  const out = [];
  if (f.r && f.r[0]) return '雷達看到的是人離開後的殘留訊號，不算有人。';
  if (f.b && f.b[0]) return '雷達暫時看不到，但靜止能量還在，先當作有人。';
  if (f.m && f.m[0] !== undefined) out.push(`有人在走動${m > 0 ? '，約 ' + (m / 100).toFixed(1) + ' 公尺' : ''}`);
  else if (f.s && f.s[0] !== undefined) out.push(`有人坐著不動${st > 0 ? '，約 ' + (st / 100).toFixed(1) + ' 公尺' : ''}`);
  if (f.p && f.p[0]) out.push('紅外線也感覺到動靜');
  if (f.h && f.h[0]) out.push('人好像離開了，延時時間到了才會轉成無人');
  return out.length ? out.join('；') + '。' : '';
}
// 3.6 雷達圖改版：LD2410B 只量得到距離，目標畫成整條弧，不再畫左右偏移的點
const reasonF = () => { const f = {}; String(val('text_sensor/Presence Reason') || '').split(';').forEach((x) => { const a = x.split(','); if (a[0]) f[a[0]] = a.slice(1).map(Number); }); return f; };
let holdAt = 0;
const holdLeft = () => {
  const f = reasonF(), on = !!(f.h && f.h[0]) && !(f.b && f.b[0]) && isOn(PRES) && isOn('switch/Smart Delay');
  if (!on) { holdAt = 0; return null; }
  if (!holdAt) holdAt = Date.now();
  const tot = num('sensor/Presence Hold') ?? 0;
  return { left: Math.max(0, tot - (Date.now() - holdAt) / 1000), tot };
};
const offAtMin = (id) => { const v = val(id); if (!v) return null; const t2 = Date.parse(v); return Number.isFinite(t2) ? Math.max(0, Math.ceil((t2 - Date.now()) / 60000)) : null; };
// 4.0：雷達圖下方的控制列：圖的方向、四層開關、我的標註編輯（都只存在這個瀏覽器，不動裝置）
function radarControls(invalidate, repaint) {
  const box = h('div', 'rctl'), on = () => { invalidate(); repaint(); };
  const o = h('div', 'seg'); o.setAttribute('role', 'group'); o.setAttribute('aria-label', '雷達圖方向');
  [['down', '感應器在上'], ['up', '感應器在下']].forEach(([k, l]) => { const b = h('button', '', l); b.type = 'button'; b.onclick = () => { ori = k; store.set(ORI_KEY, k); o.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); on(); }; b.setAttribute('aria-pressed', String(ori === k)); o.append(b); });
  const ch = h('div', 'btns'); ch.setAttribute('role', 'group'); ch.setAttribute('aria-label', '雷達圖顯示的內容');
  [['zone', '區域與忽略格'], ['target', '雷達與 PIR'], ['heat', '停留熱度'], ['label', '我的標註']].forEach(([k, l]) => { const b = h('button', 'chip', l); b.type = 'button'; b.setAttribute('aria-pressed', String(!!layers[k])); b.onclick = () => { layers[k] = !layers[k]; b.setAttribute('aria-pressed', String(layers[k])); store.set(LAY_KEY, layers); on(); }; ch.append(b); });
  const row1 = h('div', 'rrow'); row1.append(h('span', 'hint', '圖的方向'), o);
  const d = h('details', 'adv'), sm = h('summary', '', '編輯我的標註（最多 6 個，只存在這個瀏覽器）'), body = h('div', 'blk lbls'); d.append(sm, body);
  const save = () => { store.set(LBL_KEY, labels); on(); };
  const drawList = () => {
    body.replaceChildren(h('p', 'hint', '標出「書桌」「沙發」「門口」這類位置的距離區間。LD2410B 只量得到距離，所以標註只有起訖距離（公尺），沒有方位。'));
    labels.forEach((lb, i) => {
      const r = h('div', 'lbrow'), n = h('input', 'field'), a = h('input', 'num'), b = h('input', 'num'), x = h('button', 'btn', '刪除');
      n.type = 'text'; n.maxLength = 12; n.value = lb.n; n.setAttribute('aria-label', '標註名稱');
      [a, b].forEach((e, j) => { e.type = 'number'; e.min = 0; e.max = 12; e.step = 0.05; e.value = j ? lb.b : lb.a; e.setAttribute('aria-label', j ? '標註結束距離（公尺）' : '標註起始距離（公尺）'); });
      n.onchange = () => { lb.n = n.value.trim() || '標註'; save(); };
      a.onchange = () => { lb.a = Math.max(0, +a.value || 0); save(); };
      b.onchange = () => { lb.b = Math.max(0, +b.value || 0); save(); };
      x.type = 'button'; x.onclick = () => { labels.splice(i, 1); drawList(); save(); };
      const g2 = h('div', 'lbg'); g2.append(a, h('span', 'hint', '～'), b, h('span', 'hint', 'm'), x); r.append(n, g2); body.append(r);
    });
    const add = h('button', 'btn', '新增標註'); add.type = 'button'; add.disabled = labels.length >= 6;
    add.onclick = () => { labels.push({ n: '書桌', a: 0.5, b: 1.5 }); drawList(); save(); };
    const bs = h('div', 'btns'); bs.append(add); body.append(bs);
  };
  drawList();
  const wd = h('details', 'adv rwrap'), ws = h('summary', '', '圖表設定：方向、顯示內容、我的標註');
  wd.append(ws, row1, ch, d); wd.open = mode === 'adv'; box.append(wd); return box;
}
function radarCard() {
  const c = h('section', 'card radar hud'); c.setAttribute('aria-label', '存在狀態');
  const lay = h('div', 'rlay'), left = h('div', 'blk'), side = h('div', 'rside');
  const head = h('div', 'stateline'), st = h('div', 'state'), dot = h('span', 'dot'), big = h('span', 'big', '—'), kind = h('div', 'kind');
  st.append(dot, big); head.append(st, kind);
  const since = h('div', 'since'), sinceB = h('b', '—'), sinceS = h('span'); since.append(sinceB, sinceS);
  const W = 740, cx = 370, R = 300, A2 = Math.PI / 3;
  let H = 340, cy = 326;
  const svg = sv('svg', { class: 'fan', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '雷達偵測範圍與目標距離' });
  const rd = sv('defs', {}, svg), rg = sv('radialGradient', { id: 'gWedge', cx, cy, r: R, gradientUnits: 'userSpaceOnUse' }, rd), pat = sv('pattern', { id: 'gIgn', width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, rd);
  sv('line', { x1: 0, y1: 0, x2: 0, y2: 8, style: 'stroke:var(--off);stroke-width:2' }, pat);
  sv('stop', { offset: '0%', style: 'stop-color:var(--primary);stop-opacity:.20' }, rg);
  sv('stop', { offset: '100%', style: 'stop-color:var(--primary);stop-opacity:.02' }, rg);
  const gBands = sv('g', {}, svg), gLines = sv('g', {}, svg), gTarget = sv('g', {}, svg);
  new ResizeObserver(() => svg.classList.toggle('narrow', svg.getBoundingClientRect().width < 480)).observe(svg);
  const chips = h('div', 'chips'), cState = h('span', 'lv state'), cZone = h('span', 'lv'), cPir = h('span', 'lv'), cEng = h('span', 'lv warnc');
  chips.append(cState, cZone, cPir, cEng);
  const why = h('div', 'hint why');
  const trow = h('div', 'blk'), tl = h('div', 'hprog'), tlab = h('span', '', '無人逾時'), tval = h('b', '', '—'), tprog = h('div', 'prog'), tpi = h('i');
  tl.append(tlab, tval); tprog.append(tpi); trow.append(tl, tprog);
  // 4.9 基本模式：離開後多久轉無人（韌體 Presence Timeout Preset：Away 5 s／Work 60 s／Sleep 120 s／Custom）
  const TOUT = 'number/Radar Presence Timeout', TPRE = 'select/Presence Timeout Preset';
  const PRE = [['快速 5 秒', 5, 'Away 5 s'], ['工作 60 秒', 60, 'Work 60 s'], ['睡眠 120 秒', 120, 'Sleep 120 s']];
  const tpre = B(h('div', 'blk tpre')), tseg = h('div', 'seg'), thint = h('p', 'hint');
  tseg.setAttribute('role', 'group'); tseg.setAttribute('aria-label', '離開後多久轉無人');
  const pbtn = PRE.map(([l, sec, opt]) => { const b = h('button', '', l); b.type = 'button'; b.onclick = () => { if (entities[TPRE]) send(TPRE, `set?option=${encodeURIComponent(opt)}`); else send(TOUT, `set?value=${sec}`); }; tseg.append(b); return b; });
  const cbtn = h('button', '', '自訂'); cbtn.type = 'button'; cbtn.onclick = () => toast('要設成其他秒數，請切到進階模式，在「偵測調教 → 即時調教」調整'); tseg.append(cbtn);
  tpre.append(tseg, thint);
  const rr3 = h('div', 'rread'), rv = ['距離', '運動能量', '靜止能量'].map((l) => { const d = h('div'), b = h('b', '', '—'); d.append(h('span', '', l), b); rr3.append(d); return b; });
  side.append(head, since, chips, why, trow, tpre, rr3, h('p', 'hint', 'LD2410B 只量得到距離、量不到方向：弧線表示這個距離上的某處。'));
  let last = '';
  const ctl = radarControls(() => { last = ''; }, () => paint()), rw = ctl.querySelector('.rwrap'); let rwMode = mode;
  left.append(svg, ctl, rangeBox());
  lay.append(left, side); c.append(lay);
  watch(() => {
    const present = isOn(PRES), moving = isOn('binary_sensor/Radar Moving Target'), still = isOn('binary_sensor/Radar Still Target');
    st.classList.toggle('on', present); big.textContent = present ? '有人' : '無人';
    const md0 = num('sensor/Radar Moving Distance'), sd0 = num('sensor/Radar Still Distance'), dd = num('sensor/Radar Detection Distance');
    kind.textContent = present ? (moving ? `運動中 · ${md0 > 0 ? Math.round(md0) + ' cm' : '—'}` : still ? `靜止（坐著不動） · ${sd0 > 0 ? Math.round(sd0) + ' cm' : '—'}` : '') : '';
    // 4.12 最後變動時間：「空房 12 分鐘 · 14:03 起」「有人已 23 分鐘 · 14:12 進來」，文字沒變不重寫；開機後還沒有轉換寫「—」
    {
      since.hidden = !entities['text_sensor/Presence Changed At'];
      const chg = Date.parse(val('text_sensor/Presence Changed At') || '');
      let b1 = '—', s1 = '';
      if (Number.isFinite(chg)) {
        const mins = Math.max(0, Math.floor((Date.now() - chg) / 60000)), span = mins < 1 ? '不到 1 分鐘' : mins < 60 ? `${mins} 分鐘` : `${Math.floor(mins / 60)} 小時 ${mins % 60} 分`;
        const d0 = new Date(chg), td = new Date(), day = d0.toDateString() === td.toDateString() ? '' : (new Date(td.getTime() - 864e5).toDateString() === d0.toDateString() ? '昨天 ' : `${d0.getMonth() + 1}/${d0.getDate()} `);
        b1 = present ? `有人已 ${span}` : `空房 ${span}`; s1 = `· ${day}${hhmm(chg)} ${present ? '進來' : '起'}`;
      }
      if (sinceB.textContent !== b1) sinceB.textContent = b1;
      if (sinceS.textContent !== s1) sinceS.textContent = s1;
    }
    const ps = val('text_sensor/Presence State');
    cState.textContent = PSTATE[ps] || '—'; cState.classList.toggle('on', present); cState.hidden = !ps || ps === 'Empty';
    const z1 = isOn('binary_sensor/Zone 1 Occupied'), z2 = isOn('binary_sensor/Zone 2 Occupied');
    cZone.textContent = z1 && z2 ? '區域 1、2 有人' : z1 ? '區域 1 有人' : z2 ? '區域 2 有人' : ''; cZone.hidden = !(z1 || z2);
    cPir.textContent = 'PIR 有動'; cPir.hidden = !isOn('binary_sensor/PIR Motion');
    const em = offAtMin('text_sensor/Engineering Mode Off At');
    cEng.textContent = mode === 'basic' ? (em === null ? '雷達回報詳細資料中' : `雷達回報詳細資料中，${em} 分後自動關`) : (em === null ? '工程模式開著' : `工程模式 ${em} 分後自動關`); cEng.hidden = !isOn(ENG);
    if (rwMode !== mode) { rwMode = mode; rw.open = mode === 'adv'; }
    why.textContent = mode === 'basic' ? whyPlain() : whyText();
    const hl = holdLeft(), base = num('sensor/Presence Hold') ?? num('number/Radar Presence Timeout');
    const sm = val('text_sensor/Smart Delay Mode'), smw = { extended: '（延長中）', shortened: '（縮短中）' }[sm] || '';
    if (hl) { tlab.textContent = '轉無人'; tval.textContent = `約 ${Math.ceil(hl.left)} 秒後轉無人`; tpi.style.width = (hl.tot > 0 ? hl.left / hl.tot * 100 : 0) + '%'; tprog.hidden = false; }
    else if (reasonF().b?.[0]) { tlab.textContent = '橋接中'; tval.textContent = mode === 'basic' ? '雷達暫時看不到，先當作有人' : `雷達旗標掉線、靜止能量仍高，最久撐 ${fx(num('number/Dropout Bridge Seconds'))} 秒`; tprog.hidden = true; }
    else { tlab.textContent = mode === 'basic' ? '離開後多久轉無人' : '無人逾時'; tval.textContent = `${fx(base)} 秒${smw}`; tprog.hidden = true; }
    const tn = num(TOUT), hit = PRE.findIndex(([, sec]) => sec === tn);
    tpre.hidden = tn === null;
    pbtn.forEach((b, i) => b.setAttribute('aria-pressed', String(i === hit))); cbtn.setAttribute('aria-pressed', String(tn !== null && hit < 0));
    const smWhy = { extended: '你坐著不動，系統自動拉長了等待時間', shortened: '偵測到你正在離開，系統自動縮短了等待時間' }[sm];
    const smNote = mode === 'basic' && smWhy && tn !== null && base !== null && base !== tn ? `目前實際等 ${fx(base)} 秒：${smWhy}；上面選的是平常的基準。` : '';
    thint.textContent = smNote + (tn !== null && hit < 0 ? `目前是自訂的 ${tn} 秒，要改請到進階模式的「即時調教」。` : '5 秒適合走道，60 秒適合久坐不動的書桌，120 秒適合睡覺（翻身不會被判成無人）。');
    rv[0].textContent = dd > 0 ? Math.round(dd) + ' cm' : '—'; rv[1].textContent = fx(num('sensor/Radar Moving Energy')); rv[2].textContent = fx(num('sensor/Radar Still Energy'));
  });
  watch(() => {
    const moving = isOn('binary_sensor/Radar Moving Target'), still = isOn('binary_sensor/Radar Still Target'), pir = isOn('binary_sensor/PIR Motion');
    const maxG = Math.max(num('number/Radar Max Move Gate') ?? 8, num('number/Radar Max Still Gate') ?? 8), eng = isOn(ENG), rr = res() * GATES;
    const energy = [], hits = [];
    for (let g = 0; g < GATES; g++) {
      const me = moveE(g) ?? 0, se = stillE(g) ?? 0;
      energy.push(eng ? Math.max(me, se) : 0);
      hits.push(eng && (me > (moveT(g) ?? 101) || se > (stillT(g) ?? 101)));
    }
    const md = num('sensor/Radar Moving Distance'), sd = num('sensor/Radar Still Distance'), f = reasonF();
    const zs = [[num('number/Zone 1 Start Gate'), num('number/Zone 1 End Gate'), isOn('binary_sensor/Zone 1 Occupied')], [num('number/Zone 2 Start Gate'), num('number/Zone 2 End Gate'), isOn('binary_sensor/Zone 2 Occupied')]];
    const dmax = Math.max(1, ...dwell);
    const sig = JSON.stringify([ori, layers, labels, maxG, rr, energy, hits, moving && md, still && sd, f, zs, pir, layers.heat ? dwell.map((v) => Math.round(v / dmax * 20)) : 0]);
    if (sig === last) return;
    last = sig;
    H = ori === 'up' ? 340 : 362; cy = ori === 'up' ? 326 : 30;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); rg.setAttribute('cy', cy);
    gBands.replaceChildren(); gLines.replaceChildren(); gTarget.replaceChildren();
    sv('path', { d: band(cx, cy, 0, R, -A2, A2), fill: 'url(#gWedge)' }, gBands);
    if (layers.heat) for (let g = 0; g < GATES; g++) { if (dwell[g] > 0) sv('path', { d: band(cx, cy, R * g / GATES, R * (g + 1) / GATES, -A2, A2), fill: 'var(--amberf)', 'fill-opacity': (0.08 + 0.55 * dwell[g] / dmax).toFixed(2), stroke: 'none' }, gBands); }
    for (let g = 0; g < GATES; g++) {
      const r0 = R * g / GATES, r1 = R * (g + 1) / GATES;
      sv('path', { d: band(cx, cy, r0, r1, -A2, A2), fill: hits[g] ? 'var(--amberf)' : 'var(--primary)', 'fill-opacity': g > maxG ? 0 : (0.05 + energy[g] / 100 * 0.55).toFixed(2), stroke: 'none' }, gBands);
      if (g > maxG) { sv('path', { d: band(cx, cy, r0, r1, -A2, A2), fill: 'url(#gIgn)', 'fill-opacity': .5, stroke: 'none' }, gBands); sv('path', { d: band(cx, cy, r0, r1, -A2, A2), fill: 'none', stroke: 'var(--faint)', 'stroke-dasharray': '2 5', 'stroke-width': 1 }, gBands); }
      const [gx, gy] = polar(cx, cy, (r0 + r1) / 2, A2 - 0.07);
      sv('text', { x: gx, y: gy + 3, 'text-anchor': 'end', class: 'gl' }, gLines).textContent = 'G' + g;
    }
    // 為什麼有人指出的那一格加框（運動琥珀、靜止青綠），右緣外側寫能量／門檻
    if (layers.target) [['m', 'var(--amberf)', '運動'], ['s', 'var(--teal)', '靜止']].forEach(([k, color, w]) => {
      const a = f[k]; if (!a || a[0] === undefined) return;
      const g = Math.min(8, Math.max(0, a[0])), r0 = R * g / GATES, r1 = R * (g + 1) / GATES;
      sv('path', { d: band(cx, cy, r0, r1, -A2, A2), fill: 'none', stroke: color, 'stroke-width': 2 }, gBands);
      const [tx, ty] = polar(cx, cy, (r0 + r1) / 2, A2 + 0.03);
      sv('text', { x: tx + 4, y: ty + (k === 'm' ? -2 : 12), 'text-anchor': 'start', class: 'wide', style: `fill:${color}` }, gLines).textContent = `${w} ${a[1]}${a[2] < 0 ? '' : `／門檻 ${a[2]}`}`;
    });
    for (let g = 1; g <= GATES; g++) {
      const rg2 = R * g / GATES, [x0, y0] = polar(cx, cy, rg2, -A2), [x1, y1] = polar(cx, cy, rg2, A2);
      sv('path', { d: `M${x0},${y0}A${rg2},${rg2} 0 0 ${sweep()} ${x1},${y1}`, fill: 'none', stroke: 'var(--grid)', 'stroke-width': g % 3 === 0 ? 1.4 : 1 }, gLines);
      if (g % 3 === 0) sv('text', { x: x0 - 22, y: y0 + 3, 'text-anchor': 'end' }, gLines).textContent = (rr * g / GATES).toFixed(rr < 3 ? 1 : 2) + ' m';
    }
    // 4.12 偵測上限：琥珀虛線弧＋「超出最遠格，不參與判斷」
    if (maxG < GATES - 1) {
      const ru = R * (maxG + 1) / GATES, [ux0, uy0] = polar(cx, cy, ru, -A2), [ux1, uy1] = polar(cx, cy, ru, A2), [lx, ly] = polar(cx, cy, ru, 0), [hx, hy] = polar(cx, cy, (ru + R) / 2, 0);
      sv('path', { d: `M${ux0},${uy0}A${ru},${ru} 0 0 ${sweep()} ${ux1},${uy1}`, fill: 'none', stroke: 'var(--amberf)', 'stroke-width': 2, 'stroke-dasharray': '7 5' }, gLines);
      sv('text', { x: lx, y: ly + (ori === 'up' ? -7 : 15), 'text-anchor': 'middle', class: 'wide', style: 'fill:var(--amber)' }, gLines).textContent = `偵測上限 ${(res() * (maxG + 1)).toFixed(2)} m（第 ${maxG} 格）`;
      sv('text', { x: hx, y: hy + 4, 'text-anchor': 'middle', style: 'fill:var(--sub)' }, gLines).textContent = '超出最遠格，不參與判斷';
    }
    for (const a of [-A2, A2]) { const [x, y] = polar(cx, cy, R, a); sv('path', { d: `M${cx},${cy}L${x},${y}`, stroke: 'var(--hud)', 'stroke-width': 1.2, fill: 'none' }, gLines); }
    // 左緣外側：區域色帶（有人那段加粗變亮）
    if (layers.zone) zs.forEach(([a0, a1, on], i) => {
      if (a0 === null || a1 === null) return;
      const ang = -A2 - 0.05 - i * 0.045, [x0, y0] = polar(cx, cy, R * a0 / GATES, ang), [x1, y1] = polar(cx, cy, R * (a1 + 1) / GATES, ang), color = i ? 'var(--teal)' : 'var(--primary)';
      sv('path', { d: `M${x0},${y0}L${x1},${y1}`, stroke: color, 'stroke-width': on ? 6 : 3, 'stroke-opacity': on ? 1 : .45, 'stroke-linecap': 'round', fill: 'none' }, gLines);
      if (on) sv('text', { x: (x0 + x1) / 2 - 12, y: (y0 + y1) / 2, 'text-anchor': 'end', class: 'tl wide', style: `fill:${color}` }, gLines).textContent = `區域 ${i + 1} · 有人`;
    });
    // PIR 有動：外緣弧亮起
    if (pir && layers.target) {
      const [x0, y0] = polar(cx, cy, R + 6, -A2), [x1, y1] = polar(cx, cy, R + 6, A2);
      sv('path', { d: `M${x0},${y0}A${R + 6},${R + 6} 0 0 ${sweep()} ${x1},${y1}`, fill: 'none', stroke: 'var(--amberf)', 'stroke-width': 3, style: 'filter:drop-shadow(0 0 6px var(--amberf))' }, gTarget);
      sv('text', { x: cx, y: ori === 'up' ? cy - R + 2 : cy + R + 18, 'text-anchor': 'middle', class: 'tl', style: 'fill:var(--amber)' }, gTarget).textContent = 'PIR 有動';
    }
    // 目標：該距離的整條弧（粗淡底＋2 px 亮線），標籤沿弧放（靜止偏左、運動偏右）；殘留回波畫虛線
    const arc = (dcm, k, dashed) => {
      if (!(dcm > 0)) return;
      const color = k === 'm' ? 'var(--amberf)' : 'var(--teal)', r = Math.min(R - 2, dcm / 100 / rr * R);
      const [x0, y0] = polar(cx, cy, r, -A2), [x1, y1] = polar(cx, cy, r, A2), d = `M${x0},${y0}A${r},${r} 0 0 ${sweep()} ${x1},${y1}`;
      sv('path', { d, fill: 'none', stroke: color, 'stroke-width': 12, 'stroke-opacity': .22, 'stroke-linecap': 'round' }, gTarget);
      sv('path', { d, fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-dasharray': dashed ? '6 5' : null, style: `filter:drop-shadow(0 0 6px ${color})` }, gTarget);
      const [lx, ly] = polar(cx, cy, r, k === 'm' ? A2 * 0.45 : -A2 * 0.45);
      sv('text', { x: lx, y: ly - 9, 'text-anchor': 'middle', class: 'tl', style: `fill:${color}` }, gTarget).textContent = (k === 'm' ? '運動 ' : '靜止 ') + Math.round(dcm) + ' cm' + (dashed ? '（不算有人）' : '');
    };
    const residue = !!(f.r && f.r[0]);
    if (layers.target) { if (moving) arc(md, 'm', false); if (still || residue) arc(sd, 's', residue); }
    // 我的標註：右緣外側的距離區間（沒有方位，因為雷達只量距離）
    if (layers.label) labels.forEach((lb) => {
      const a0 = Math.min(+lb.a, +lb.b), a1 = Math.max(+lb.a, +lb.b), r0 = Math.min(R, a0 / rr * R), r1 = Math.min(R, a1 / rr * R), ang = A2 + 0.09;
      if (!(r1 > r0)) return;
      const [x0, y0] = polar(cx, cy, r0, ang), [x1, y1] = polar(cx, cy, r1, ang), [tx, ty] = polar(cx, cy, (r0 + r1) / 2, ang);
      sv('path', { d: `M${x0},${y0}L${x1},${y1}`, stroke: 'var(--amberf)', 'stroke-width': 4, 'stroke-linecap': 'round', fill: 'none', 'stroke-opacity': .85 }, gLines);
      const far = tx > 560;
      sv('text', { x: far ? tx - 8 : tx + 8, y: ty + 4, 'text-anchor': far ? 'end' : 'start', class: 'tl wide', style: 'fill:var(--amber)' }, gLines).textContent = `${lb.n} ${+lb.a}–${+lb.b} m`;
    });
    sv('circle', { cx, cy, r: 5, fill: 'var(--primary)' }, gTarget);
    sv('text', { x: cx + 12, y: ori === 'up' ? cy + 16 : cy - 8, 'text-anchor': 'start', class: 'wide' }, gTarget).textContent = '感應器';
  });
  return c;
}
// 3.6 最近 60 秒的距離（只在進階模式；網頁每秒記一筆，只存在這個分頁）
const tl60 = []; let tlVer = 0;
function recordTl() {
  tlVer++;
  const f = reasonF();
  tl60.push({ m: isOn('binary_sensor/Radar Moving Target') ? num('sensor/Radar Moving Distance') : null, s: isOn('binary_sensor/Radar Still Target') ? num('sensor/Radar Still Distance') : null, p: isOn(PRES), h: !!(f.h && f.h[0]), pir: isOn('binary_sensor/PIR Motion') });
  if (tl60.length > 60) tl60.shift();
  const t = tl60[tl60.length - 1], dcm = t.s ?? t.m;
  if (t.p && dcm > 0) dwell[Math.min(GATES - 1, Math.floor(dcm / 100 / res()))]++;
}
function timelineCard() {
  const c = card('最近 60 秒的距離'), W = 720, H = 170, T = 14, B = 26, L = 44, maxD = 675;
  const svg = sv('svg', { class: 'tline', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '最近 60 秒運動與靜止目標的距離' });
  const lg = h('div', 'legend'); lg.innerHTML = '<span style="color:var(--amberf)">━ 運動</span><span style="color:var(--teal)">━ 靜止</span><span>▒ 有人</span><span>┅ 保持中</span><span>▮ PIR</span>';
  c.append(svg, lg, h('p', 'hint', '每秒記一筆，只存在這個分頁，關掉就清空；不增加裝置負擔。'));
  let lastV = -1;
  watch(() => {
    if (lastV === tlVer) return;  // 4.4：每秒才多一筆，沒新資料就不重畫
    lastV = tlVer;
    svg.replaceChildren();
    const x = (i) => L + (W - L - 8) * i / 59, y = (d) => T + (H - T - B) * (1 - Math.min(d, maxD) / maxD);
    [0, 225, 450, 675].forEach((d) => { sv('path', { d: `M${L},${y(d)}H${W - 8}`, stroke: 'var(--grid)', fill: 'none' }, svg); sv('text', { x: L - 6, y: y(d) + 3, 'text-anchor': 'end' }, svg).textContent = (d / 100).toFixed(1) + ' m'; });
    const off = 60 - tl60.length;
    tl60.forEach((e, i) => {
      const xi = x(i + off), w = (W - L - 8) / 59;
      if (e.p) sv('rect', { x: xi - w / 2, y: T, width: w, height: H - T - B, fill: 'var(--amberf)', 'fill-opacity': .1 }, svg);
      if (e.h) sv('rect', { x: xi - w / 2, y: T, width: w, height: H - T - B, fill: 'none', stroke: 'var(--amberf)', 'stroke-dasharray': '3 3', 'stroke-opacity': .5 }, svg);
      if (e.pir) sv('rect', { x: xi - 1.5, y: H - B + 6, width: 3, height: 8, fill: 'var(--amberf)' }, svg);
    });
    [['m', 'var(--amberf)'], ['s', 'var(--teal)']].forEach(([k, color]) => {
      let d = '';
      tl60.forEach((e, i) => { const v = e[k]; if (v > 0) d += (d && tl60[i - 1] && tl60[i - 1][k] > 0 ? 'L' : 'M') + x(i + off).toFixed(1) + ',' + y(v).toFixed(1); });
      if (d) sv('path', { d, fill: 'none', stroke: color, 'stroke-width': 2 }, svg);
    });
    sv('text', { x: L, y: H - 4 }, svg).textContent = '60 秒前'; sv('text', { x: W - 8, y: H - 4, 'text-anchor': 'end' }, svg).textContent = '現在';
  });
  return c;
}
// 4.19：拿掉「雷達 OUT 腳」與「雷達回報的 OUT 狀態」兩格（韌體 4.2 移除這兩個實體）
function signalsCard() {
  const c = card('訊號與讀數'), g = h('div', 'sigs'); c.classList.add('fillcard');
  const defs = [['雷達有人', 'binary_sensor/Radar Presence'], ['運動目標', 'binary_sensor/Radar Moving Target'], ['靜止目標', 'binary_sensor/Radar Still Target'], ['PIR 紅外', 'binary_sensor/PIR Motion']];
  const cells = defs.map(([l, k]) => { const d = h('div', 'sig'), b = h('b', '', '—'); d.append(h('span', '', l), b); g.append(d); return [d, b, k]; });
  const reads = h('div', 'reads');
  const mk = (l, k, u) => { const d = h('div', 'read'), line = h('div'), b = h('b', '', '—'); line.append(b, h('i', '', u)); d.append(h('span', '', l), line); reads.append(d); return [b, k]; };
  const rv = [mk('運動距離', 'sensor/Radar Moving Distance', 'cm'), mk('靜止距離', 'sensor/Radar Still Distance', 'cm'), mk('偵測距離', 'sensor/Radar Detection Distance', 'cm'), mk('運動能量', 'sensor/Radar Moving Energy', '%'), mk('靜止能量', 'sensor/Radar Still Energy', '%'), mk('雷達光感', 'sensor/Radar Light', '')];
  const b1 = h('div', 'blk'), b2 = h('div', 'blk'); b1.append(h('div', 'sub', '距離與能量'), reads); b2.append(h('div', 'sub', '感測訊號'), g);
  c.append(b1, b2);
  watch(() => {
    cells.forEach(([d, b, k]) => {
      const known = entities[k], v = known && isOn(k);
      d.classList.toggle('on', !!v); b.textContent = known ? (v ? 'ON' : 'OFF') : '—';
    });
    rv.forEach(([b, k]) => { b.textContent = fx(num(k), 0); });
  });
  return c;
}
function envCard() {
  const c = card('環境與補償'), g = h('div', 'env');
  const tile = (label, id, n, u, off, offUnit) => {
    const t = h('div', 'etile'), v = h('div', 'v'), vv = h('span'); v.append(vv, h('i', '', u)); t.append(h('div', 'l', label), v);
    if (off) {
      const o = h('label', 'off'), i = h('input', 'num'); i.type = 'number'; i.setAttribute('aria-label', label + '補償');
      i.onchange = () => send(off, `set?value=${i.value}`); o.append(h('span', '', '補償 ' + offUnit), i); t.append(o);
      watch(() => { const d = entities[off]; if (!d) return; Object.assign(i, { min: d.min_value, max: d.max_value, step: d.step }); if (document.activeElement !== i) i.value = num(off); });
    }
    watch(() => { vv.textContent = fx(num(id), n); }); g.append(t);
  };
  tile('溫度', 'sensor/Temperature', 1, '°C', 'number/Temperature Offset', '°C');
  tile('濕度', 'sensor/Humidity', 1, '%', 'number/Humidity Offset', '%');
  tile('照度', 'sensor/Illuminance', 0, 'lx');
  c.append(g, h('p', 'hint', '溫濕度補償用來扣掉晶片自身發熱造成的偏差，預設 0。若讀值和另一支準確的溫濕度計差很多，再調整。'));
  return c;
}
// 最近 10 分鐘：每 2 秒記一格，只存在這個分頁的記憶體
const SLOTS = 300, slots = [];
let slotTick = 0;
function recordSlot() {
  if (document.hidden || conn !== 'live') return;
  slots.push(isOn('binary_sensor/Radar Moving Target') ? 2 : isOn('binary_sensor/Radar Still Target') ? 1 : 0);
  if (slots.length > SLOTS) slots.shift();
  slotTick++; schedule();
}
/* ============ 偵測調教 ============ */
let selGate = 2;
const pick = (g) => { selGate = g; paint(); };
function spectrumCard(){
  const c=card('各格能量');
  const banner=h('div','banner'), bText=h('span'), bBtn=btn('','primary',null,()=>toggleEng()); banner.append(bText,bBtn); c.append(banner);
  const x0=38; let W=1100,Hh=320,cw=120,ax=160,k=1.27,lastW=0;
  const svg=sv('svg',{class:'spec',viewBox:`0 0 ${W} ${Hh}`,role:'group','aria-label':'各格移動與靜止能量'});
  const defs=sv('defs',{},svg);
  [['gMove','var(--primary)'],['gStill','var(--teal)'],['gHit','var(--amberf)']].forEach(([id,col])=>{ const g=sv('linearGradient',{id,x1:0,y1:0,x2:0,y2:1},defs); sv('stop',{offset:'0%',style:`stop-color:${col};stop-opacity:1`},g); sv('stop',{offset:'100%',style:`stop-color:${col};stop-opacity:.62`},g); });
  const gs=sv('linearGradient',{id:'gSel',x1:0,y1:0,x2:0,y2:1},defs); sv('stop',{offset:'0%',style:'stop-color:var(--primary);stop-opacity:.16'},gs); sv('stop',{offset:'100%',style:'stop-color:var(--primary);stop-opacity:.03'},gs);
  const gg=sv('g',{},svg); c.append(svg);
  let drag=null;
  svg.addEventListener('pointerdown',e=>{ const th=e.target.closest('[data-thr]'); if(!th) return; drag={k:th.dataset.thr,g:+th.dataset.g,v:null}; selGate=drag.g; try{ svg.setPointerCapture(e.pointerId); }catch(_){ } e.preventDefault(); });
  svg.addEventListener('pointermove',e=>{ if(!drag) return; const r=svg.getBoundingClientRect(), y=(e.clientY-r.top)*(Hh/r.height); const v=Math.max(0,Math.min(100,Math.round(drag.k==='m'?(ax-y)/k:(y-ax)/k))); drag.v=v; paint(); });
  const endDrag=()=>{ const d=drag; drag=null; if(d&&d.v!=null&&d.v!==(d.k==='m'?moveT(d.g):stillT(d.g))) send(`number/Gate ${d.g} ${d.k==='m'?'Move':'Still'} Threshold`,`set?value=${d.v}`); paint(); };
  svg.addEventListener('pointerup',endDrag); svg.addEventListener('pointercancel',()=>{ drag=null; paint(); });
  const lg=h('div','legend'); lg.innerHTML='<span class="lg">移動能量（向上）</span><span class="lg s">靜止能量（向下）</span><span class="lg t">門檻（拖曳白線可調）</span><span class="lg a">超過門檻</span><span class="sub">能量約每 0.5 秒更新一次</span>'; c.append(lg);
  let lastSig='';
  watch(()=>{
    const pw=Math.round(svg.getBoundingClientRect().width); if(pw>=200) W=pw; Hh=Math.max(250,Math.min(340,Math.round(W*.28))); cw=(W-x0-4)/GATES; k=(Hh-62)/200; ax=22+100*k;
    // 4.4：輸入（尺寸、工程模式、各格能量與門檻、選取格、拖曳中的值）沒變就不重畫；順便不再每 0.2 秒搶走鍵盤焦點
    const eng0=isOn(ENG), sgv=[];
    for(let g=0;g<GATES;g++) sgv.push(eng0?(moveE(g)??0):0, eng0?(stillE(g)??0):0, drag&&drag.g===g&&drag.k==='m'&&drag.v!=null?drag.v:moveT(g), drag&&drag.g===g&&drag.k==='s'&&drag.v!=null?drag.v:stillT(g));
    const sig0=JSON.stringify([W,Hh,eng0,num('number/Radar Max Move Gate'),num('number/Radar Max Still Gate'),res(),selGate,sgv]);
    if(sig0===lastSig) return;
    lastSig=sig0;
    const bw=Math.round(Math.min(64,cw*.52)); svg.setAttribute('viewBox',`0 0 ${W} ${Hh}`); svg.style.height=Hh+'px';
    const eng=isOn(ENG); bText.textContent=eng?'工程模式開著：雷達會持續回報各格能量，裝置負擔較高；這頁開的會在離開時自動關。':'工程模式沒開：雷達不會回報各格能量，長條是空的。門檻仍可調。'; bBtn.textContent=eng?'關閉工程模式':'開啟工程模式'; bBtn.className=eng?'btn':'btn primary'; gg.replaceChildren();
    const maxG=Math.max(num('number/Radar Max Move Gate')??8,num('number/Radar Max Still Gate')??8);
    sv('text',{x:4,y:ax-k*100+8},gg).textContent='移動';
    sv('text',{x:4,y:ax+k*100-2},gg).textContent='靜止';
    for(const v of [25,50,75,100]){ for(const sgn of [-1,1]) sv('line',{x1:x0,x2:W-2,y1:ax+sgn*v*k,y2:ax+sgn*v*k,stroke:'var(--grid)','stroke-width':.8,'stroke-dasharray':v===100?'':'2 4'},gg); }
    for(let g=0;g<GATES;g++){
      const x=x0+g*cw, mid=x+cw/2, out=g>maxG, G=sv('g',{class:'col',tabindex:0,role:'button','aria-label':`第 ${g} 格 ${gateRange(g)}`,opacity:out?.4:1},gg);
      G.onclick=()=>pick(g); G.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(g);} };
      sv('rect',{class:'hit',x:x+2,y:6,width:cw-4,height:Hh-12,rx:10,fill:g===selGate?'url(#gSel)':'transparent',stroke:g===selGate?'var(--primary)':'none','stroke-width':1.4},G);
      if(out) sv('rect',{x:x+2,y:6,width:cw-4,height:Hh-12,rx:10,fill:'none',stroke:'var(--faint)','stroke-width':1.2,'stroke-dasharray':'3 5'},G);
      const me=eng?(moveE(g)??0):0, se=eng?(stillE(g)??0):0, mt=(drag&&drag.g===g&&drag.k==='m'&&drag.v!=null?drag.v:moveT(g))??0, stt=(drag&&drag.g===g&&drag.k==='s'&&drag.v!=null?drag.v:stillT(g))??0;
      if(me>0) sv('rect',{x:mid-bw/2,y:ax-me*k,width:bw,height:me*k,rx:7,fill:me>mt?'url(#gHit)':'url(#gMove)'},G);
      if(se>0) sv('rect',{x:mid-bw/2,y:ax,width:bw,height:se*k,rx:7,fill:se>stt?'url(#gHit)':'url(#gStill)'},G);
      sv('line',{x1:mid-bw/2-5,x2:mid+bw/2+5,y1:ax-mt*k,y2:ax-mt*k,stroke:'var(--text)','stroke-width':2.4,'stroke-linecap':'round'},G);
      sv('line',{x1:mid-bw/2-5,x2:mid+bw/2+5,y1:ax+stt*k,y2:ax+stt*k,stroke:'var(--text)','stroke-width':2.4,'stroke-linecap':'round'},G);
      sv('rect',{x:mid-bw/2-8,y:ax-mt*k-10,width:bw+16,height:20,fill:'transparent','data-thr':'m','data-g':g,style:'cursor:ns-resize;touch-action:none'},G);
      sv('rect',{x:mid-bw/2-8,y:ax+stt*k-10,width:bw+16,height:20,fill:'transparent','data-thr':'s','data-g':g,style:'cursor:ns-resize;touch-action:none'},G);
      if(eng&&me>0) sv('text',{x:mid,y:ax-me*k-5,'text-anchor':'middle'},G).textContent=me;
      if(eng&&se>0) sv('text',{x:mid,y:ax+se*k+12,'text-anchor':'middle'},G).textContent=se;
      sv('text',{x:mid,y:Hh-18,'text-anchor':'middle',class:'gl'},G).textContent='G'+g;
      sv('text',{x:mid,y:Hh-5,'text-anchor':'middle'},G).textContent=((g+1)*res()).toFixed(2)+'m';
    }
    sv('line',{x1:x0,x2:W-2,y1:ax,y2:ax,stroke:'var(--faint)'},gg);
  });
  new ResizeObserver(()=>{ const w=Math.round(svg.getBoundingClientRect().width); if(w>=200&&Math.abs(w-lastW)>2){ lastW=w; paint(); } }).observe(svg);
  return c;
}
function gateEditor() {
  const c = card('單格門檻'); c.classList.add('gedit');
  const head = h('div', 'ghead'), prev = h('button', 'step', '‹'), next = h('button', 'step', '›'), t = h('div'), tb = h('b'), ts = h('small');
  t.append(tb, ts); head.append(prev, t, next);
  prev.type = next.type = 'button'; prev.setAttribute('aria-label', '上一格'); next.setAttribute('aria-label', '下一格');
  prev.onclick = () => pick((selGate + GATES - 1) % GATES); next.onclick = () => pick((selGate + 1) % GATES);
  const mk = (kind) => {
    const r = h('div', 'row'), tag = h('div', 'tag' + (kind === 'Still' ? ' s' : '')), nm = h('span'), live = h('span', 'live');
    tag.append(h('i'), nm, live);
    const w = h('label', 'slide'), rg = h('input'), n = h('input', 'num');
    Object.assign(rg, { type: 'range', min: 0, max: 100, step: 1 }); Object.assign(n, { type: 'number', min: 0, max: 100, step: 1 });
    rg.setAttribute('aria-label', (kind === 'Still' ? '靜止' : '移動') + '門檻'); n.setAttribute('aria-label', (kind === 'Still' ? '靜止' : '移動') + '門檻數值');
    const set = (v) => send(`number/Gate ${selGate} ${kind} Threshold`, `set?value=${Math.max(0, Math.min(100, +v || 0))}`);
    rg.oninput = () => { paintRange(rg); n.value = rg.value; }; rg.onchange = () => set(rg.value); n.onchange = () => set(n.value);
    w.append(rg, n); r.append(tag, w); return { r, nm, live, rg, n, kind };
  };
  const m = mk('Move'), s = mk('Still'); c.append(head, m.r, s.r);
  watch(() => {
    tb.textContent = 'G' + selGate; ts.textContent = gateRange(selGate);
    const eng = isOn(ENG);
    [[m, moveT, moveE, '移動門檻'], [s, stillT, stillE, '靜止門檻']].forEach(([x, tf, ef, l]) => {
      x.nm.textContent = l; const now = ef(selGate); x.live.textContent = eng && now !== null ? `現在 ${Math.round(now)}` : '';
      const v = tf(selGate); if (v === null) return;
      if (!x.rg.matches(':active')) { x.rg.value = v; paintRange(x.rg); }
      if (document.activeElement !== x.n && !x.rg.matches(':active')) x.n.value = v;
    });
  });
  return c;
}
// 校準階段由裝置的狀態文字判斷；進度條由網頁依兩個秒數計時（不新增實體）
// 4.9 校準階段優先讀韌體的 Calibration Phase（固定代碼，不靠解析人看的英文狀態字串）；舊韌體沒有這個實體就退回解析狀態字串
const CAL_PH = 'text_sensor/Calibration Phase', CAL_FAIL = 'text_sensor/Calibration Failure Reason', CAL_ENDS = 'text_sensor/Calibration Ends At', CAL_FIN = 'text_sensor/Calibration Finished At', CAL_DONE = 'switch/Calibration Done';
const PH_MAP = { wait_leave: 'wait', sampling_empty: 'sample', wait_seated: 'sit', sampling_seated: 'sit', writing: 'write', verifying: 'write', done: 'done', done_warning: 'done', restoring: 'idle', idle: 'idle', failed: 'idle', aborted: 'idle', cancelled: 'idle' };
const calPhaseStr = () => { const t = String(val(CAL) || ''); return t.startsWith('Leave') ? 'wait' : t.startsWith('Sampling') ? 'sample' : (t.startsWith('Sit') || t.startsWith('Seated')) ? 'sit' : (t.startsWith('Writing') || t.startsWith('Verifying')) ? 'write' : t.startsWith('Done') ? 'done' : 'idle'; };
const calPhaseRaw = () => String(val(CAL_PH) || '');
const RST_ID = 'button/Restore Calibration';
const calPhase = () => { const c = val(CAL_PH); return typeof c === 'string' && c in PH_MAP ? PH_MAP[c] : calPhaseStr(); };
// 失敗原因：none／no_data／params_not_read／someone_in_room／cancelled；舊韌體沒有就看狀態字串開頭
const calFail = () => {
  const c = val(CAL_PH);
  if (typeof c === 'string' && c in PH_MAP) return c === 'failed' ? (val(CAL_FAIL) === 'params_not_read' ? 'params_not_read' : 'no_data') : c === 'aborted' ? (val(CAL_FAIL) === 'unstable' ? 'unstable' : 'someone_in_room') : c === 'cancelled' ? 'cancelled' : null;
  const t = String(val(CAL) || '');
  return t.startsWith('Failed: radar parameters') ? 'params_not_read' : t.startsWith('Failed') ? 'no_data' : t.startsWith('Aborted: unstable') ? 'unstable' : t.startsWith('Aborted') ? 'someone_in_room' : t.startsWith('Cancelled') ? 'cancelled' : null;
};
const CAL_FAIL_TXT = {
  someone_in_room: ['校準時偵測到有人，已中止，門檻沒有改動。請離開房間、保持淨空後再試一次；風扇、窗簾或寵物走動也會被當成有人。', true],
  unstable: ['取樣期間各格能量波動太大（環境不穩，例如冷氣、風扇、窗簾在動），已中止，門檻沒有改動。請把冷氣風扇關掉、確認房裡沒有人或寵物走動後再試一次。', true],
  no_data: ['雷達沒有回傳資料，校準失敗，門檻沒有改動。請確認雷達有通電、沒被遮住後再試一次；還是不行，到「系統」看雷達連線。', true],
  params_not_read: ['雷達參數（最大格數、門檻）還沒讀回，校準沒有開始，門檻沒有改動。請到「偵測調教」按「Radar Query Params」（查詢雷達參數），確認最大格數不是 0 之後再按一鍵校準。', true],
  cancelled: ['你已取消校準，門檻沒有改動。需要時再按「一鍵校準」。', false],
};
const hhmm = (ms) => { const d = new Date(ms); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
const mdhm = (ms) => { const d = new Date(ms); return `${d.getMonth() + 1}/${d.getDate()} ${hhmm(ms)}`; };
const fmtRem = (sec) => sec >= 60 ? `${Math.floor(sec / 60)} 分 ${Math.round(sec % 60)} 秒` : `${Math.max(0, Math.round(sec))} 秒`;
// 3.5：第二點結果（韌體 3.2 完成訊息 "seated N gates, lowered M, seen|not seen"）
const seatResult = (t) => {
  const m = String(t || '').match(/seated (\d+) gates, lowered (\d+), (seen|not seen)/);
  if (!m) return null;
  const n = +m[1], low = +m[2], seen = m[3] === 'seen';
  return { ok: n > 0 && seen, text: n === 0 ? '第二點：你坐著時沒有一格明顯高於空房底噪，雷達可能照不到你坐的位置（看一下擺放方向），門檻照空房結果寫入。'
    : `第二點：${n} 格看得到你坐著，其中 ${low} 格調低了靜止門檻；寫入後${seen ? '雷達仍判定你在，驗證通過。' : '雷達沒有判定你在，建議把「餘裕」調小後重做一次。'}` };
};
const RUNNING = ['wait', 'sample', 'sit', 'write'];
let phaseNow = null, phaseAt = Date.now(), seatAt = 0, calBefore = null, calCompare = null, calVersion = 0;
calCompare = store.get(CAL_KEY);
const thresholds = () => ({ move: Array.from({ length: GATES }, (_, g) => moveT(g)), still: Array.from({ length: GATES }, (_, g) => stillT(g)) });
function trackCalibration() {
  const p = calPhase();
  const seated = String(val(CAL) || '').startsWith('Seated');
  if (seated && !seatAt) seatAt = Date.now(); else if (!seated) seatAt = 0;
  if (p === phaseNow) return;
  const before = phaseNow; phaseNow = p; phaseAt = Date.now();
  if (p === 'wait') calBefore = thresholds();
  if (before === 'write' && p === 'done' && calBefore) {
    calCompare = { before: calBefore, after: thresholds() }; calBefore = null; calVersion++;
    store.set(CAL_KEY, calCompare);
  }
}
function calCard() {
  // v3.3 方案 B：「校準精靈」改「一鍵校準」，不再選方法；第二點開關移到這張卡；原廠校準改同列次要按鈕
  const c = card('一鍵校準'), pc = card('校準參數'), cc = card('校準前後對照');
  const mdesc = h('p', 'hint');
  const st = h('div', 'calstat', '—'), steps = h('div', 'steps'), prog = h('div', 'prog'), pf = h('i'), eta = h('div', 'eta'), etaA = h('div'), etaB = h('div'); eta.append(etaA, etaB);
  const TWO = 'switch/Calibration Two Point', SIT = 'number/Calibration Sit Duration', SIT_GRACE = 10;
  prog.append(pf);
  const go = btn('一鍵校準', 'primary', null, () => { if (confirm('開始前請先離開房間並保持淨空。校準會依序：等你離開 → 空房取樣' + (isOn(TWO) ? ' → 請你回到平常待的位置坐著不動' : '') + ' → 把各格門檻改成「底噪最大值＋餘裕」。確定開始？')) press('button/Auto Calibrate')(); });
  const two = switchRow('加做第二點：回到平常待的位置坐著不動', TWO, '先取空房底噪，再請你回到平常待的位置坐著不動取第二點，靜止門檻就不會設到把你自己漏掉', true);
  const stop = btn('取消校準', null, null, press('button/Cancel Calibration'));
  const fgo = btn('改用雷達原廠校準', null, '改用雷達原廠校準：開始前請先離開房間並保持淨空，約 70 秒。雷達會直接改寫各格門檻（建議先在下方「設定備份與還原」存一份目前設定）。確定開始？', press('button/Radar Factory Calibrate'));
  const fst = h('div', 'hint', '');
  // 4.12 原廠校準上次結果：韌體 3.8 起為固定代碼 running／success／failed／none ＋ Finished At；舊韌體是中文字串，照舊顯示
  watch(() => {
    const t = val('text_sensor/Radar Factory Calibration'), fin = Date.parse(val('text_sensor/Radar Factory Calibration Finished At') || '');
    fst.textContent = t === 'running' ? '原廠校準：校準中（約 70 秒）' : t === 'success' || t === 'failed' ? `上次結果：${t === 'success' ? '成功' : '失敗'}${Number.isFinite(fin) ? ' · ' + mdhm(fin) : ''}`
      : t === 'none' ? '開機後還沒校準過' : t && t !== '未校準' ? `原廠校準：${t}` : '';
    fgo.disabled = RUNNING.includes(calPhase()) || calPhaseRaw() === 'restoring';
  });
  // 4.12 還原校準（韌體 3.8：Calibration Backup 18 個門檻、Calibration Backup At、按鈕 Restore Calibration）
  const BAK = 'text_sensor/Calibration Backup', BAK_AT = 'text_sensor/Calibration Backup At';
  const rs = btn('還原校準', null, null, () => calRestoreFlow()), bkline = h('p', 'bkline');
  watch(() => {
    const has = !!entities[RST_ID], bk = csv18(val(BAK)), at = Date.parse(val(BAK_AT) || '');
    rs.hidden = !has; bkline.hidden = !has;
    rs.disabled = !bk || RUNNING.includes(calPhase()) || calPhaseRaw() === 'restoring';
    bkline.replaceChildren(document.createTextNode('校準前備份：'), h('b', '', bk ? (Number.isFinite(at) ? mdhm(at) : '已備份') : '尚無'), document.createTextNode(bk ? '（每次一鍵校準寫入前自動存在裝置上）' : '（做一次一鍵校準後才會有；沒有備份時不能還原）'));
  });
  const bs = h('div', 'btns'); bs.append(go, rs, A(fgo), stop); A(fst);
  const sl = h('div', 'blk');
  sl.append(sliderRow('等你離開', 'number/Calibration Start Delay', { fmt: (v) => `${v} 秒`, first: true }),
    sliderRow('取樣時間', 'number/Calibration Duration', { fmt: (v) => `${v} 秒` }),
    sliderRow('第二點取樣時間', SIT, { fmt: (v) => `${v} 秒`, note: '只有開啟「加做第二點」才會用到' }),
    sliderRow('餘裕', 'number/Calibration Margin', { fmt: (v) => `+${v}`, note: '門檻＝底噪最大值＋餘裕（上限 100）' }));
  const cmp = h('div', 'blk');
  const warn = h('div', 'banner', '校準中，有人狀態暫不可信：雷達在原廠校準時會回報目標狀態 4／5／6，ESPHome 元件會把它當成有人。這段時間請不要依「有人」判斷，總覽與標題列也會改顯示「校準中」。');
  warn.hidden = true; watch(() => { warn.hidden = !facCal(); });
  const tstate = readRow('雷達資料幀目標狀態', () => { const t = facState(); return t === null ? '—' : `${t}（${['無目標', '移動', '靜止', '移動＋靜止', '檢測中', '成功', '失敗'][t] ?? '—'}）`; }, '原廠校準時雷達回報 4＝檢測中、5＝成功、6＝失敗；平常是 0～3');
  const fail = h('div', 'banner'); fail.hidden = true; fail.setAttribute('role', 'status');
  const rbox = h('div', 'tiles'); rbox.hidden = true;
  const rt = ['上次完成', '取樣', '歷史資料', '品質'].map((l) => { const d = h('div', 'tile'), b = h('b', '', '—'); d.append(h('span', 'l', l), b); rbox.append(d); return [d, b]; });
  const seat = h('div', 'banner'); seat.hidden = true; seat.setAttribute('role', 'status');
  watch(() => { const r = seatResult(val(CAL)); seat.hidden = !r; if (r) { seat.textContent = r.text; seat.classList.toggle('danger', !r.ok); } });
  const wbn = h('div', 'banner'); wbn.hidden = true; wbn.setAttribute('role', 'status');
  wbn.textContent = '已寫入，但取樣時各格能量波動偏大（品質「不穩」），門檻可能偏高。建議關掉冷氣、風扇、確認房裡沒人後重做一次，或按「還原校準」改回校準前的門檻。';
  c.append(mdesc, two, warn, st, fail, wbn, rbox, seat, steps, prog, eta, fst, bs, bkline, A(tstate));
  pc.append(sl);
  cc.append(cmp);
  let drawn = -1;
  watch(() => {
    const phase = calPhase(), running = RUNNING.includes(phase), t = (Date.now() - phaseAt) / 1000;
    go.disabled = running; stop.disabled = !running;
    const tw = isOn(TWO) || phase === 'sit', keys = ['wait', 'sample', ...(tw ? ['sit'] : []), 'write', 'done'];
    if (steps.children.length !== keys.length) {
      steps.style.gridTemplateColumns = `repeat(${keys.length},minmax(0,1fr))`;
      steps.replaceChildren(...['等你離開', '取樣', ...(tw ? ['坐著取樣'] : []), '寫入門檻', '完成'].map((l) => h('div', '', l)));
    }
    const idx = keys.indexOf(phase);
    [...steps.children].forEach((d, i) => { d.className = i < idx || phase === 'done' ? 'done' : i === idx ? 'cur' : ''; });
    const D = num('number/Calibration Start Delay') ?? 0, T = num('number/Calibration Duration') ?? 0, T2 = num(SIT) ?? 0, S2 = tw ? T2 + 10 : 0, all = D + T + S2 + 6;
    mdesc.textContent = `按一下就會依序做完：等你離開 → 空房取樣${tw ? ' → 請你回到平常待的位置坐著不動' : ''} → 寫入門檻，約 ${Math.max(1, Math.ceil(all / 60))} 分鐘，不用再選方法。${tw ? '輪到回到平常位置時蜂鳴器會響三聲，' : ''}完成時響上升三音。取樣時房間裡有人（PIR 觸發或移動能量很大）會自動中止、不改門檻。歷史學習資料足夠時，底噪改用長期資料，結果更穩定。${tw ? '做完會驗證一次寫入後雷達仍看得到坐著的你。' : ''}`;
    let p = 0, e = '';
    if (phase === 'wait') { p = t / all; e = `等待離開：剩 ${Math.max(0, Math.ceil(D - t))} 秒`; }
    else if (phase === 'sample') { p = (D + t) / all; e = `空房取樣：${Math.min(T, Math.floor(t))} / ${T} 秒`; }
    else if (phase === 'sit') { p = (D + T + t) / all; e = seatAt ? `請坐著不動：${Math.min(T2, Math.floor((Date.now() - seatAt) / 1000))} / ${T2} 秒` : `請回到平常待的位置坐下不動（聽到三聲提示音就是這一步）；偵測到你坐好 3 秒後自動開始，最多等 ${Math.max(0, Math.ceil(90 - t))} 秒`; }
    else if (phase === 'write') { p = (D + T + S2 + t) / all; e = String(val(CAL) || '').startsWith('Verifying') ? '驗證中：請繼續坐著約 3 秒' : '寫入 18 個門檻（每格一次指令，共 9 次）…'; }
    else if (phase === 'done') { p = 1; e = mode === 'basic' ? '雷達已回到平常狀態' : '完成，工程模式已自動關閉'; }
    // 4.9 預估結束時間由裝置回報（重新整理或換手機打開都一樣）；沒有就維持網頁自己的計時
    const endMs = Date.parse(val(CAL_ENDS) || ''), tot = num('sensor/Calibration Total Seconds');
    let eA = '';
    if (running && Number.isFinite(endMs)) {
      const rem = Math.max(0, (endMs - Date.now()) / 1000);
      eA = rem > 0 ? `約剩 ${fmtRem(rem)}（預計 ${hhmm(endMs)} 完成）` : '快好了…';
      if (tot > 0 && rem <= tot) p = 1 - rem / tot;
    }
    pf.style.width = (Math.min(1, p) * 100) + '%'; etaA.textContent = eA; etaB.textContent = e; etaA.hidden = !eA;
    const fr = running ? null : calFail(), ft = fr && CAL_FAIL_TXT[fr];
    fail.hidden = !ft; if (ft) { fail.textContent = ft[0]; fail.classList.toggle('danger', ft[1]); }
    const finMs = Date.parse(val(CAL_FIN) || ''), okRun = !running && !fr && val(CAL_FAIL) === 'none' && Number.isFinite(finMs);
    rbox.hidden = !okRun;
    const warnDone = okRun && calPhaseRaw() === 'done_warning';
    st.textContent = fr && fr !== 'cancelled' ? '校準中止' : warnDone ? '完成（有警告）' : okRun && String(val(CAL) || '').startsWith('Done') ? `完成${String(val(CAL)).includes('seated step skipped') ? '（沒等到你坐回，第二點略過）' : ''}` : say(val(CAL));
    st.classList.toggle('warn', warnDone); wbn.hidden = !warnDone;
    if (okRun) {
      rt[0][1].textContent = mdhm(finMs);
      const sm = num('sensor/Calibration Samples'); rt[1][1].textContent = sm === null ? '—' : `${Math.round(sm)} 筆`;
      rt[2][0].hidden = !entities['binary_sensor/Calibration Used History']; rt[2][1].textContent = isOn('binary_sensor/Calibration Used History') ? '有參考' : '沒用到';
      const qv = String(val('text_sensor/Calibration Quality') || ''), qm = qv.match(/max spread (\d+)/);
      rt[3][0].hidden = !entities['text_sensor/Calibration Quality'] || !qv; rt[3][1].textContent = qv.startsWith('saturated') ? '底噪飽和' : qv.startsWith('unknown') ? '參數未讀回' : qv.startsWith('unstable') ? `不穩（差 ${qm ? qm[1] : '?'}）` : qv.startsWith('stable') ? `穩定（差 ${qm ? qm[1] : '?'}）` : '—';
    }
    if (drawn === calVersion) return;
    drawn = calVersion;
    const g = h('div', 'cmp'), mark = (a, b) => h('span', a > b ? 'up' : a < b ? 'dn' : '', a);
    g.append(h('span', 'lab', ''), ...Array.from({ length: GATES }, (_, i) => h('span', '', `G${i}`)));
    if (calCompare) {
      g.append(h('span', 'lab', '移動 前'), ...calCompare.before.move.map((v) => h('span', '', v)), h('span', 'lab', '移動 後'), ...calCompare.after.move.map((v, i) => mark(v, calCompare.before.move[i])));
      g.append(h('span', 'lab', '靜止 前'), ...calCompare.before.still.map((v) => h('span', '', v)), h('span', 'lab', '靜止 後'), ...calCompare.after.still.map((v, i) => mark(v, calCompare.before.still[i])));
    }
    cmp.replaceChildren(h('span', 'cap', '上次校準前後（裝置端校準）'), calCompare ? g : h('p', 'hint', '還沒有校準紀錄：完成一次校準後，這裡會列出前後對照。'), h('p', 'hint', '綠色＝變靈敏，紅色＝變遲鈍。只在這個瀏覽器記得，不新增實體。'));
  });
  return { main: c, params: pc, cmp: cc };
}
/* 4.12 還原校準對話：並排「目前」與「還原後」，有差的格標色；執行中顯示第 N／18 項；備份留在裝置上，可重複還原 */
function calRestoreFlow() {
  const bak = csv18(val('text_sensor/Calibration Backup'));
  if (!bak) return;
  const ov = h('div', 'ob'), box = h('section', 'card obox'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
  const title = h('h2', 'cap', '還原校準'), body = h('div', 'blk'); box.append(title, body); ov.append(box); document.body.append(ov);
  title.id = 'crs-title'; ov.setAttribute('aria-labelledby', 'crs-title');
  let mk = null, busy = false;
  const close = () => { ov.remove(); if (mk) mk.restore(); };
  mk = modalKeys(ov, () => { if (!busy) close(); });
  const b2 = (l, cls, fn) => { const b = h('button', 'btn ' + (cls || ''), l); b.type = 'button'; b.onclick = fn; return b; };
  const bs = (...b) => { const d = h('div', 'btns'); d.append(...b); return d; };
  const cur = thresholds(), after = { move: Array.from({ length: GATES }, (_, g) => bak[2 * g]), still: Array.from({ length: GATES }, (_, g) => bak[2 * g + 1]) };
  let diff = 0;
  const mark = (to, now) => { if (to !== now) diff++; return h('span', to > now ? 'up' : to < now ? 'dn' : '', to); };
  const g = h('div', 'cmp');
  g.append(h('span', 'lab', ''), ...Array.from({ length: GATES }, (_, i) => h('span', '', `G${i}`)),
    h('span', 'lab', '移動 目前'), ...cur.move.map((v) => h('span', '', v ?? '—')), h('span', 'lab', '移動 還原後'), ...after.move.map((v, i) => mark(v, cur.move[i])),
    h('span', 'lab', '靜止 目前'), ...cur.still.map((v) => h('span', '', v ?? '—')), h('span', 'lab', '靜止 還原後'), ...after.still.map((v, i) => mark(v, cur.still[i])));
  const at = Date.parse(val('text_sensor/Calibration Backup At') || '');
  const matches = () => { const now = thresholds(); return [...now.move.map((v, i) => v === after.move[i]), ...now.still.map((v, i) => v === after.still[i])]; };
  const run = async () => {
    busy = true;
    const stat = h('div', 'calstat', '第 0／18 項'), prog = h('div', 'prog'), pi = h('i'); prog.append(pi);
    title.textContent = '還原校準中'; body.replaceChildren(stat, prog, h('p', 'hint', '請不要關掉這一頁。'));
    mk.focus();
    await send(RST_ID, 'press');
    const t0 = Date.now();
    await new Promise((ok) => {
      const iv = setInterval(() => {
        const k = matches().filter(Boolean).length;
        stat.textContent = `第 ${k}／18 項`; pi.style.width = (k / 18 * 100) + '%';
        if ((k === 18 && val('text_sensor/Calibration Status') === 'Restored') || Date.now() - t0 > 30000) { clearInterval(iv); ok(); }
      }, 300);
    });
    const same = matches().every(Boolean);
    busy = false; title.textContent = same ? '已還原校準' : '還原可能沒完成';
    body.replaceChildren(h('p', same ? 'hint' : 'banner danger', same ? '18 個門檻已改回校準前的值。備份還留在裝置上，需要時可以再還原一次。' : '有些門檻沒有改回來，請到「即時調教」檢查，或再按一次「還原校準」。'), bs(b2('關閉', 'primary', close)));
    mk.focus();
  };
  body.replaceChildren(h('p', 'hint', `把 18 個門檻改回一鍵校準前的值${Number.isFinite(at) ? '（備份時間 ' + mdhm(at) + '）' : ''}。有差的格會標色（紅＝變遲鈍、綠＝變靈敏）；備份會保留，之後還能再還原。`),
    diff === 0 ? h('div', 'banner', '目前的門檻和備份完全相同，還原不會有變化。') : g, bs(b2('還原校準', 'primary', run), b2('取消', null, close)));
  mk.focus();
}
/* ============ 偵測調教：歷史最佳化（v3.3 方案 B，韌體 3.0 的 History 實體） ============ */
const HS = 'text_sensor/History Status', HC = 'sensor/History Changes', HEH = 'sensor/History Empty Hours', HOS = 'sensor/History Occupied Samples';
const HSUG = 'text_sensor/History Suggestion', HBAK = 'text_sensor/History Backup', HREADY_H = 5.6;
const HWORD = {
  Collecting: '收集中', Applying: '套用中…', Applied: '已套用建議', 'Applied automatically': '已自動套用建議', Undoing: '還原中…',
  Undone: '已還原上次的門檻', 'Not enough data': '資料不足，門檻沒有改', 'No backup': '沒有可還原的備份', 'Busy, try later': '忙碌中，請稍後再試', Reset: '已清除歷史資料',
};
// 4.25：橫幅「略過這個建議」。建議每 10 分鐘重算，常常只微調 1～2 個百分點，橫幅就永遠不消失。
// 按略過時把當下的建議（18 個值）存在這個瀏覽器；之後建議與被略過的那份「每一格都差不到 HGAP」就不再提醒，
// 任一格差到 HGAP 以上才再出現。只影響橫幅與標題列的點，不改韌體、不改門檻；「校準與備份」頁照常看得到差異
const HDISMISS = 'presence-hist-dismissed', HGAP = 5;
const histDismissed = () => { const a = store.get(HDISMISS); return Array.isArray(a) && a.length === 18 && a.every(Number.isFinite) ? a : null; };
const histCovered = () => { const d = histDismissed(), s = csv18(val(HSUG)); return !!d && !!s && s.every((v, i) => Math.abs(v - d[i]) < HGAP); };
const histNew = () => val(HS) === 'Ready' && (num(HC) ?? 0) > 0 && !histCovered();
const csv18 = (v) => { const a = String(v ?? '').split(',').filter((x) => x !== '').map(Number); return a.length === 18 && a.every(Number.isFinite) ? a : null; };
// 4.5 即時調教頁最下方：歷史最佳化進度（唯讀）。調門檻時工程模式一直開著、歷史資料也在收；這裡只看進度，
// 建議與「套用建議」「還原上次」都在「校準與備份」，這張卡不放任何會改門檻的鈕
function histBrief() {
  const c = card('歷史最佳化（進度，唯讀）');
  const st = h('div', 'calstat', '—'), sum = h('p', 'hint');
  const pbar = (lab) => { const t = h('div', 'hprog'), l = h('span', '', lab), v = h('b', '', '—'), p = h('div', 'prog'), i = h('i'); t.append(l, v); p.append(i); const b = h('div', 'blk'); b.append(t, p); return { b, v, i }; };
  const pe = pbar('空房資料'), po = pbar('有人資料');
  const left = h('div', 'blk'); left.append(st, pe.b, po.b);
  const go = btn('前往校準與備份', null, null, () => { location.hash = '#detect/cal'; });
  const bs = h('div', 'btns'); bs.append(go);
  const right = h('div', 'blk'); right.append(sum, bs, h('p', 'hint', '這裡只看進度，不會改門檻；建議與套用請到「校準與備份」。'));
  const top = h('div', 'hgrid'); top.append(left, right);
  c.append(top);
  watch(() => {
    const s = val(HS), n = num(HC) ?? 0, eh = num(HEH), on = num(HOS);
    if (s === undefined && eh === null) { st.textContent = '設備韌體尚未支援'; sum.textContent = '這台的韌體沒有歷史最佳化的資料。'; pe.v.textContent = po.v.textContent = '—'; pe.i.style.width = po.i.style.width = '0%'; go.disabled = true; return; }
    go.disabled = false;
    st.textContent = s === 'Ready' ? (n > 0 ? `有新的建議：${n} 個門檻不同` : '建議與目前相同') : s ? (HWORD[s] || s) : '—';
    pe.v.textContent = `${eh === null ? '—' : eh.toFixed(1)} / ${HREADY_H} 小時（以最少的那一格計）`;
    pe.i.style.width = (Math.min(1, (eh ?? 0) / HREADY_H) * 100) + '%';
    po.v.textContent = `${on === null ? '—' : Math.round(on)} 筆`;
    po.i.style.width = (on > 0 ? 100 : 0) + '%';
    sum.textContent = eh !== null && eh >= HREADY_H ? (n > 0 ? `建議調整 ${n} 個門檻。` : '資料夠了，建議與目前相同。') : `資料不足：空房資料要滿 ${HREADY_H} 小時才有建議。`;
  });
  return c;
}
function histCard() {
  const c = card('歷史最佳化');
  const st = h('div', 'calstat', '—'), desc = h('p', 'hint', '工程模式開著時，感應器每秒把各格能量分「確定空房」和「確定有人」記下來，資料夠了就算出建議門檻。只算不改，按「套用建議」或開「自動套用」才會寫入。');
  const pbar = (lab) => { const t = h('div', 'hprog'), l = h('span', '', lab), v = h('b', '', '—'), p = h('div', 'prog'), i = h('i'); t.append(l, v); p.append(i); const b = h('div', 'blk'); b.append(t, p); return { b, v, i }; };
  const pe = pbar('空房資料'), po = pbar('有人資料');
  const ap = btn('套用建議', 'primary', '把 18 個門檻改成建議值？套用前會自動備份目前的門檻，之後可以按「還原上次」改回來。', press('button/History Apply'));
  const un = btn('還原上次', null, '把門檻改回上次套用建議之前的值？', press('button/History Undo'));
  const bs = h('div', 'btns'), lack = h('p', 'hint'), intf = h('p', 'hint'); bs.append(ap, un);
  intf.hidden = true;
  const left = h('div', 'blk'); left.append(st, desc, pe.b, A(po.b), bs, lack, intf);
  const rr = row('清除歷史資料', '換了擺放位置或房間家具大搬動後再清；收集要重新開始（約 1～2 天）');
  rr.append(btn('清除', null, '清除所有歷史資料？收集會從頭開始，目前門檻不會改。', press('button/History Reset')));
  const right = h('div', 'blk');
  right.append(switchRow('歷史學習', 'switch/History Learning', '關掉就不再收集，已收的資料保留', true),
    switchRow('自動套用', 'switch/History Auto Apply', '每 7 天最多一次、每格一次最多改 10、空房 10 分鐘以上才套用、套用前自動備份'), rr);
  const top = h('div', 'hgrid'); top.append(left, A(right));
  const g = A(h('div', 'cmp'));
  c.append(top, A(h('div', 'hsec', '目前與建議的門檻')), g,
    A(h('p', 'hint', '綠色＝建議比目前低（變靈敏），紅色＝建議比目前高（變遲鈍）；相差不到 2 的不算不同。')),
    h('p', 'hint adv-only', '建議門檻怎麼算：空房時各格能量的 99.9 百分位＋餘裕（同校準的「餘裕」）；有人資料夠時，靜止門檻不超過「有人時 10 百分位」與底噪的中點。'));
  let sig = '';
  watch(() => {
    const s = val(HS), n = num(HC) ?? 0, eh = num(HEH), on = num(HOS), sug = csv18(val(HSUG)), busy = s === 'Applying' || s === 'Undoing' || RUNNING.includes(calPhase());
    st.textContent = s === 'Ready' ? (n > 0 ? `有新的建議：${n} 個門檻不同` : '建議與目前相同') : s ? (HWORD[s] || s) : '—';
    pe.v.textContent = `${eh === null ? '—' : eh.toFixed(1)} / ${HREADY_H} 小時（以最少的那一格計）`;
    pe.i.style.width = (Math.min(1, (eh ?? 0) / HREADY_H) * 100) + '%';
    po.v.textContent = `${on === null ? '—' : Math.round(on)} 筆`;
    po.i.style.width = (on > 0 ? 100 : 0) + '%';
    const enough = !!sug && eh !== null && eh >= HREADY_H;
    ap.disabled = !enough || busy;
    un.disabled = !val(HBAK) || busy;
    lack.textContent = enough ? '' : `資料不足：空房資料要滿 ${HREADY_H} 小時才有建議，「套用建議」暫時不能按。`;
    lack.hidden = enough;
    const ig = val('text_sensor/Interference Gates');
    intf.hidden = !ig || ig === 'collecting' || ig === 'none';
    if (!intf.hidden) {
      const gs = [...new Set([...ig.matchAll(/G(\d+)/g)].map((m) => +m[1]))];
      intf.textContent = mode === 'basic' && gs.length
        ? `${gs.map((g) => `第 ${g} 格（${gateRange(g)}）`).join('、')}的空房雜訊長期偏高，可能是風扇、冷氣或窗簾在動；那幾格建議的門檻會比較高。`
        : '干擾提示：' + ig.replace(/move/g, '移動').replace(/still/g, '靜止') + ' 的空房能量長期明顯高於其他格，附近可能有風扇、冷氣或窗簾等干擾源；這幾格的建議門檻會偏高。';
    }
    const cur = thresholds(), s2 = JSON.stringify([cur, sug]);
    if (s2 === sig) return;
    sig = s2;
    const mark = (now, to) => h('span', to === null ? '' : to < now - 1 ? 'dn' : to > now + 1 ? 'up' : '', to === null ? '—' : to);
    const pick = (k) => sug ? Array.from({ length: GATES }, (_, i) => sug[i * 2 + k]) : Array(GATES).fill(null);
    const sm = pick(0), ss = pick(1);
    g.replaceChildren(h('span', 'lab', ''), ...Array.from({ length: GATES }, (_, i) => h('span', '', `G${i}`)),
      h('span', 'lab', '移動 目前'), ...cur.move.map((v) => h('span', '', v ?? '—')), h('span', 'lab', '移動 建議'), ...sm.map((v, i) => mark(cur.move[i], v)),
      h('span', 'lab', '靜止 目前'), ...cur.still.map((v) => h('span', '', v ?? '—')), h('span', 'lab', '靜止 建議'), ...ss.map((v, i) => mark(cur.still[i], v)));
  });
  return c;
}
// 總覽最上方的提醒（方案 B）：有新的建議才出現
function histNotice() {
  const c = h('section', 'card'), ban = h('div', 'banner'), t = h('span');
  const bs = h('span', 'btns');
  bs.append(btn('前往查看', 'primary', null, () => { location.hash = '#detect/cal'; }),
    btn('略過這個建議', '', null, () => { const s = csv18(val(HSUG)); if (s) { store.set(HDISMISS, s); paint(false); } }));
  ban.append(t, bs);
  c.append(ban);
  watch(() => {
    // 建議已套用（差異歸零）：清掉略過記錄，之後的新建議不會被舊的略過擋住
    if (val(HS) === 'Ready' && num(HC) === 0 && histDismissed()) store.set(HDISMISS, null);
    const on = histNew(); c.hidden = !on; if (on) t.textContent = `感應器根據最近的資料，有新的建議門檻（${num(HC)} 個不同）。到「偵測調教 → 校準與備份」看差異，按一下就能套用。`; });
  return c;
}
function tuneCard() {
  const c = card('偵測參數');
  const gate = (v) => `G${v} · ${((v + 1) * res()).toFixed(2)} m`;
  c.append(
    rangeBox(),
    sliderRow('無人逾時', 'number/Radar Presence Timeout', { range: [0, 120, 1], fmt: (v) => `${v} 秒`, first: true, note: '最後一次偵測到人之後，等多久才轉為無人' }),
    sliderRow('最遠移動距離格', 'number/Radar Max Move Gate', { fmt: gate }),
    sliderRow('最遠靜止距離格', 'number/Radar Max Still Gate', { fmt: gate }),
    segRow('距離解析度', 'select/Radar Distance Resolution', '換解析度後每格代表的距離會變，建議重新校準'),
    segRow('雷達光感功能', 'select/Radar Light Function'),
    sliderRow('光感門檻', 'number/Radar Light Threshold'),
    segRow('雷達 OUT 腳電位', 'select/Radar OUT Pin Level', '只影響雷達 OUT 腳的讀法；判斷有沒有人以雷達回報為準，一般不用改'),
    sliderRow('工程模式自動關閉', AUTOOFF, { fmt: (v) => v + ' 分鐘', note: '開著超過這段時間裝置會自己關掉（保險）；校準進行中不會被關；進入即時調教頁會自動開、離開就自動關。空房時裝置每 30 分鐘會自己短暫開一次，量空房底噪用，這是正常的' }));
  const bs = h('div', 'btns'); bs.append(btn('重新讀取雷達參數', null, null, press('button/Radar Query Params'))); c.append(bs);
  return c;
}

/* ============ 網頁端暫存資料（只在這個分頁的記憶體，重新整理就清空；分頁在背景時不累積） ============ */
const pad2 = (n) => String(n).padStart(2, '0');
// 熱圖：每 2 秒一欄、共 10 分鐘；環狀緩衝
const HR = { '10 分鐘': { step: 5000 }, '1 小時': { step: 30000 }, '今日': { step: 720000 } };
Object.values(HR).forEach((r) => { r.e = new Uint8Array(120 * GATES); r.x = new Uint8Array(120 * GATES); r.n = 0; r.t0 = 0; r.ce = new Uint8Array(GATES); r.cx = new Uint8Array(GATES); });
const heat = { ver: 0 };
function pushHeat() {
  const eng = isOn(ENG), now = Date.now();
  const e = new Uint8Array(GATES), x = new Uint8Array(GATES);
  for (let g = 0; g < GATES; g++) {
    const me = moveE(g), se = stillE(g);
    if (eng && (me !== null || se !== null)) { e[g] = Math.min(100, Math.round(Math.max(me ?? 0, se ?? 0))) + 1; x[g] = (me ?? -1) > (moveT(g) ?? 101) || (se ?? -1) > (stillT(g) ?? 101) ? 1 : 0; }
  }
  Object.values(HR).forEach((r) => {
    if (!r.t0) r.t0 = now;
    for (let g = 0; g < GATES; g++) { if (e[g] > r.ce[g]) r.ce[g] = e[g]; if (x[g]) r.cx[g] = 1; }
    if (now - r.t0 >= r.step) {
      r.e.copyWithin(0, GATES); r.x.copyWithin(0, GATES);
      r.e.set(r.ce, (120 - 1) * GATES); r.x.set(r.cx, (120 - 1) * GATES);
      r.n = Math.min(120, r.n + 1); r.t0 = now; r.ce.fill(0); r.cx.fill(0); heat.ver++;
    }
  });
}
// 距離與光感：1 秒 ×600（10 分鐘）、10 秒平均 ×360（1 小時）、60 秒平均 ×1440（一天）
const mkRing = (n) => ({ n, d: new Float32Array(n).fill(NaN), l: new Float32Array(n).fill(NaN), i: 0, c: 0 });
const ser = { '10m': mkRing(600), '1h': mkRing(360), '1d': mkRing(1440) };
const acc = { k: 0, sd: 0, nd: 0, sl: 0, nl: 0, k2: 0, sd2: 0, nd2: 0, sl2: 0, nl2: 0, ver: 0 };
const ringPush = (r, d, l) => { r.d[r.i] = d; r.l[r.i] = l; r.i = (r.i + 1) % r.n; r.c = Math.min(r.n, r.c + 1); };
function sampleSeries() {
  const d = num('sensor/Radar Detection Distance'), l = isOn(ENG) ? num('sensor/Radar Light') : null;
  ringPush(ser['10m'], d ?? NaN, l ?? NaN);
  if (d !== null) { acc.sd += d; acc.nd++; } if (l !== null) { acc.sl += l; acc.nl++; }
  if (++acc.k >= 10) {
    const ad = acc.nd ? acc.sd / acc.nd : NaN, al = acc.nl ? acc.sl / acc.nl : NaN;
    ringPush(ser['1h'], ad, al);
    if (!isNaN(ad)) { acc.sd2 += ad; acc.nd2++; } if (!isNaN(al)) { acc.sl2 += al; acc.nl2++; }
    acc.k = 0; acc.sd = acc.nd = acc.sl = acc.nl = 0;
    if (++acc.k2 >= 6) { ringPush(ser['1d'], acc.nd2 ? acc.sd2 / acc.nd2 : NaN, acc.nl2 ? acc.sl2 / acc.nl2 : NaN); acc.k2 = 0; acc.sd2 = acc.nd2 = acc.sl2 = acc.nl2 = 0; }
  }
  acc.ver++;
}
// 今日統計：只算網頁開著的期間
const day = { on: 0, trig: 0, longest: 0, absent: 0, hours: new Array(24).fill(0), since: Date.now() };
function tickDay() {
  if (!entities[PRES]) return;
  if (isOn(PRES)) { day.on++; day.hours[new Date().getHours()]++; day.absent = 0; }
  else { day.absent++; if (day.absent > day.longest) day.longest = day.absent; }
}

/* ============ 偵測範圍摘要（N16） ============ */
function rangeBox() {
  const w = h('div', 'blk rng'), tx = h('div', 'sub'), warn = h('div', 'banner info'); w.append(tx, warn);
  watch(() => {
    const m = num('number/Radar Max Move Gate'), s2 = num('number/Radar Max Still Gate'), r = res();
    if (m === null || s2 === null) { tx.textContent = '實際偵測範圍：—'; warn.hidden = true; return; }
    const lo = Math.min(m, s2);
    tx.textContent = `偵測範圍到 ${((m + 1) * r).toFixed(2)} m（運動，最遠 G${m}）、${((s2 + 1) * r).toFixed(2)} m（靜止，最遠 G${s2}）；取格子的距離區間上緣（第 N 格的區間是 ${r} m × N 到 ${r} m × (N+1)），全開（G8）為 ${(9 * r).toFixed(2)} m。`;
    warn.hidden = lo >= 8; warn.textContent = `最遠格數小於 8（運動 G${m}、靜止 G${s2}）：${((lo + 1) * r).toFixed(2)} m 以外的格不參與有人判斷，那邊的人偵測不到。要看到整個房間，把最遠格調到 G8。`;
  });
  return w;
}

/* ============ 活動統計（N4） ============ */
/* ============ 偵測調教：即時調教的新卡 ============ */
function heatCard() {
  const c = card('能量歷史熱圖');
  const rng = h('div', 'seg'); let range = '10 分鐘';
  Object.keys(HR).forEach((r) => { const b = h('button', '', r); b.type = 'button'; b.onclick = () => { range = r; last = -1; paint(); }; rng.append(b); });
  const top = h('div', 'dtools'); top.append(h('span', 'sub', '橫軸＝時間，縱軸＝距離格；顏色越亮能量越高，琥珀色＝超過門檻（誤觸發）。'), rng);
  const wrap = h('div', 'hm'), labs = h('div', 'hmlab'), svg = sv('svg', { viewBox: '0 0 120 9', preserveAspectRatio: 'none', class: 'hmsvg', role: 'img', 'aria-label': '各距離格的能量歷史' });
  for (let g = 0; g < 9; g++) labs.append(h('span', '', `G${g}`));
  wrap.append(labs, svg);
  const ax = h('div', 'ax'), chips = h('div', 'sub');
  c.append(top, wrap, ax, chips, h('p', 'hint', '能量約每 0.5 秒才更新一次；每欄取該段時間的最大值。需要工程模式開著才有資料，離開頁面就停；只在這個瀏覽器暫存（重新整理即清空）。'));
  let last = -1;
  watch(() => {
    [...rng.children].forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === range)));
    const sig = heat.ver + range; if (sig === last + '') return;
    last = sig;
    const r = HR[range], hot = Array(9).fill(0);
    svg.replaceChildren();
    for (let col = 0; col < r.n; col++) {
      const x = 120 - r.n + col, at = (120 - r.n + col) * GATES;
      for (let g = 0; g < GATES; g++) {
        const e = r.e[at + g]; if (!e) continue;
        const over = r.x[at + g] === 1; if (over) hot[g]++;
        sv('rect', { x, y: 8 - g, width: 1.02, height: 1.02, fill: over ? 'var(--amberf)' : 'var(--primary)', 'fill-opacity': Math.min(.95, .06 + (e - 1) / 100 * .9).toFixed(2) }, svg);
      }
    }
    ax.replaceChildren(h('span', '', range === '10 分鐘' ? '10 分前' : range === '1 小時' ? '1 小時前' : '0 時'), h('span', '', range === '今日' ? '12 時' : ''), h('span', '', '現在'));
    const top3 = hot.map((n, g) => [n, g]).sort((a, b) => b[0] - a[0]).slice(0, 3).filter((a) => a[0] > 0).map(([n, g]) => `G${g}（${gateRange(g)}）${n} 格`);
    chips.textContent = top3.length ? '最常超過門檻：' + top3.join('、') + '。' : (r.n ? '沒有超過門檻的紀錄。' : '還沒有資料（工程模式要開著）。');
  });
  return c;
}
let serRange = '10m';
const SERL = [['10m', '10 分鐘'], ['1h', '1 小時'], ['1d', '今日']];
function seriesCard() {
  const c = card('距離與光感趨勢'), rng = h('div', 'seg');
  SERL.forEach(([k, t]) => { const b = h('button', '', t); b.type = 'button'; b.dataset.k = k; b.onclick = () => { serRange = k; last = -1; paint(); }; rng.append(b); });
  const top = h('div', 'dtools'); top.append(h('span', 'sub', '偵測距離與光感值隨時間的變化，看人什麼時候來、離開，以及光線有沒有影響。'), rng);
  const mk = (label) => { const w = h('div', 'series'), hd = h('div', 'top'), cur = h('span'); hd.append(h('span', '', label), cur); const s2 = sv('svg', { viewBox: '0 0 600 80', preserveAspectRatio: 'none', role: 'img', 'aria-label': label + '趨勢' }); w.append(hd, s2); return { w, s2, cur }; };
  const a = mk('偵測距離（cm）'), b = mk('光感值（0～255，需工程模式）');
  const ax = h('div', 'ax'); c.append(top, a.w, b.w, ax, h('p', 'hint', '只在這個瀏覽器暫存（重新整理即清空）；10 分鐘每秒一點，1 小時與今日用平均值。分頁在背景時不記。'));
  const series = (r, key) => { const out = []; for (let k = 0; k < r.c; k++) out.push(r[key][(r.i - r.c + k + r.n * 2) % r.n]); return out; };
  const line = (o, data, max, color) => {
    o.s2.replaceChildren();
    const pts = data.map((v, k) => Number.isFinite(v) ? `${(600 - (data.length - 1 - k) * 600 / (ser[serRange].n - 1)).toFixed(1)},${(78 - Math.min(1, v / max) * 74).toFixed(1)}` : null).filter(Boolean);
    if (pts.length < 2) return;
    sv('polyline', { points: `${pts[0].split(',')[0]},80 ${pts.join(' ')} 600,80`, fill: color, 'fill-opacity': .14, stroke: 'none' }, o.s2);
    sv('polyline', { points: pts.join(' '), fill: 'none', stroke: color, 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' }, o.s2);
  };
  let last = -1;
  watch(() => {
    [...rng.children].forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.k === serRange)));
    const sig = acc.ver + serRange; if (sig === last + '') return;
    last = sig;
    const r = ser[serRange], dist = series(r, 'd'), lux = series(r, 'l'), fd = dist.filter(Number.isFinite), fl = lux.filter(Number.isFinite);
    line(a, dist, res() * GATES * 100, 'var(--teal)'); line(b, lux, 255, 'var(--amberf)');
    a.cur.textContent = fd.length ? `現在 ${Math.round(fd[fd.length - 1])} cm　最遠 ${Math.round(Math.max(...fd))} cm` : '尚無資料';
    b.cur.textContent = fl.length ? `現在 ${Math.round(fl[fl.length - 1])}　範圍 ${Math.round(Math.min(...fl))}～${Math.round(Math.max(...fl))}` : '尚無資料（工程模式要開著）';
    const lab = SERL.find((x) => x[0] === serRange)[1];
    ax.replaceChildren(h('span', '', lab === '10 分鐘' ? '10 分前' : lab === '1 小時' ? '1 小時前' : '0 時'), h('span', '', lab === '今日' ? '12 時' : ''), h('span', '', '現在'));
  });
  return c;
}
function trigCard() {
  const c = card('觸發日誌'), list = h('div', 'bklist');
  c.append(h('p', 'sub', '裝置端記錄最近 20 次有人／無人轉換（時間為裝置時區，預設台北，另記轉換當下的距離與能量）；重開機會清空，重新整理或換手機都看得到。'), list);
  let last = null;
  watch(() => {
    const raw = String(val(TRIG) ?? '');
    if (raw === last) return;
    last = raw;
    const rows = raw.split('\n').filter(Boolean).map((l) => l.split(','));
    if (!rows.length) { list.replaceChildren(h('p', 'hint', '還沒有記錄：有人／無人轉換一次就會出現一筆。')); return; }
    list.replaceChildren(...rows.map(([ts, st, d, me, se]) => {
      const e = Math.max(+me, +se), r = h('div', 'lgrow'), b = h('b', +st ? 'on' : '', +st ? '有人' : '無人');
      r.append(h('span', '', ts), b, h('span', '', +d >= 0 ? d + ' cm' : '—'), h('span', '', e >= 0 ? e + '%' : '—')); return r;
    }));
  });
  return c;
}
const fmtHM = (sec) => { const m = Math.round((sec || 0) / 60), hh = Math.floor(m / 60), mm = m % 60; return hh ? `${hh}<i>時</i>${mm}<i>分</i>` : `${mm}<i>分</i>`; };
function activityCard() {
  const c = card('活動記錄'), t1 = h('div', 'blk trend'), t2 = h('div', 'blk');
  const svg = sv('svg', { viewBox: '0 0 600 40', preserveAspectRatio: 'none', role: 'img', 'aria-label': '最近十分鐘有人狀態' });
  sv('rect', { x: 0, y: 10, width: 600, height: 20, rx: 4, fill: 'var(--soft)' }, svg);
  const g = sv('g', {}, svg), ax = h('div', 'ax');
  ax.innerHTML = '<span>10 分前</span><span><b style="color:var(--teal)">■</b> 靜止　<b style="color:var(--amberf)">■</b> 運動</span><span>現在</span>';
  t1.append(h('div', 'sub', '最近 10 分鐘'), svg, ax);
  const tiles = h('div', 'tiles'), vals = ['今日有人', '觸發次數', '最長無人'].map((l) => { const d = h('div', 'tile'), b = h('b', '', '—'); d.append(h('span', 'l', l), b); tiles.append(d); return b; });
  const hs = sv('svg', { viewBox: '0 0 480 36', preserveAspectRatio: 'none', role: 'img', 'aria-label': '今日每小時有人程度' });
  const bars = Array.from({ length: 24 }, (_, i) => sv('rect', { x: i * 20 + 1, width: 18, rx: 3, fill: 'var(--teal)' }, hs));
  const tr = h('div', 'trend'), ax2 = h('div', 'ax'); ['0', '6', '12', '18', '24 時'].forEach((t) => ax2.append(h('span', '', t))); tr.append(hs, ax2);
  t2.append(h('div', 'sub', '今日（0～24 時，每格 1 小時）'), tiles, tr);
  c.append(t1, t2, h('p', 'hint', '兩者都只在這個瀏覽器記錄，重新整理即清空；不新增裝置實體。'));
  let last = -1, lastDay = '';
  watch(() => {
    // 4.4：先把要顯示的字和長條高度算成字串，和上次一樣就不寫（秒數每秒在變，但畫面以「分」和 0.1 像素為單位）
    const hm = [fmtHM(day.on), day.trig + '<i>次</i>', fmtHM(day.longest)].join('|');
    if (hm !== lastDay) { lastDay = hm; vals[0].innerHTML = fmtHM(day.on); vals[1].innerHTML = day.trig + '<i>次</i>'; vals[2].innerHTML = fmtHM(day.longest); }
    bars.forEach((r, i) => {
      const v = Math.min(1, day.hours[i] / 3600), hh = Math.max(3, v * 30), a = { y: (34 - hh).toFixed(1), height: hh.toFixed(1), 'fill-opacity': day.hours[i] ? (.35 + v * .6).toFixed(2) : '0.18' };
      for (const k in a) if (r.getAttribute(k) !== a[k]) r.setAttribute(k, a[k]);
    });
    if (last === slotTick) return;
    last = slotTick; g.replaceChildren();
    const w = 600 / SLOTS, off = SLOTS - slots.length;
    for (let i = 0; i < slots.length;) {
      let j = i; while (j < slots.length && slots[j] === slots[i]) j++;
      if (slots[i]) sv('rect', { x: (off + i) * w, y: 10, width: (j - i) * w, height: 20, fill: slots[i] === 2 ? 'var(--amberf)' : 'var(--teal)' }, g);
      i = j;
    }
  });
  return c;
}
function readRow(label, fn, note, first) {
  const r = row(label, note, first), v = h('span', 'val', '—'); r.append(v);
  watch(() => { v.textContent = fn(); });
  return r;
}
function qualityCard() {
  const c = card('運行品質診斷'), cnt = (id) => { const n = num(id); return n === null ? '—' : `${n} 次`; };
  const ban = h('div', 'banner'), bt = h('span'); ban.hidden = true; ban.append(bt, btn('前往校準', 'primary', null, () => { location.hash = '#detect/cal'; }));
  watch(() => {
    const d = num('sensor/Radar Floor Drift'), lv = num('sensor/Radar Floor Level'), ref = d !== null && lv !== null ? lv - d : null;
    ban.hidden = d === null || d < 5;
    if (!ban.hidden) bt.textContent = `底噪比上次校準時升高${ref > 0 ? `約 ${Math.round(d / ref * 100)}%` : ` ${d.toFixed(1)}`}，建議重新校準；校準完成後回到這裡按「重設底噪基準」。`;
  });
  c.append(ban);
  c.append(readRow('雷達與 PIR 不一致', () => cnt('sensor/Radar PIR Mismatch Count'), 'PIR 動作 3 秒後雷達仍說無人才算一次；重開機歸零', true),
    readRow('能量飆到 100', () => cnt('sensor/Radar Energy Spike Count'), '確定空房（雷達與 PIR 都無人滿 30 秒）時任一格能量到 100 的次數；有人時到 100 是正常，不算。偏多可能是供電不穩'),
    readRow('雷達連線', () => (val('binary_sensor/Radar Link') === undefined ? '—' : isOn('binary_sensor/Radar Link') ? '正常' : '斷線（自動重啟雷達中）'), '超過逾時秒數收不到雷達資料就視為斷線，並自動重啟雷達'),
    sliderRow('雷達斷線判定時間', 'number/Radar Link Timeout', { fmt: (v) => `${v} 秒`, note: '超過這段時間收不到雷達資料就判定斷線並自動重啟雷達；預設 5 秒' }),
    readRow('雷達斷線次數', () => cnt('sensor/Radar Link Drops'), '重開機歸零'),
    readRow('近 1 小時有人↔無人切換', () => String(flipStats().switches) + ' 次', '網頁開著期間累計（關掉網頁或在背景時不計），存在這個瀏覽器；用來看韌體 4.0 燒錄後是否還有來回跳'),
    readRow('近 1 小時閃動', () => String(flipStats().flick) + ' 次', '有人只持續 3 秒內、前一段無人也 3 秒內，算一次閃動；4.0 燒錄後應該歸零'),
    readRow('目標狀態', () => ['無目標', '移動', '靜止', '移動＋靜止', '校準中', '校準成功', '校準失敗'][num('sensor/Radar Target State')] ?? '—'));
  const fd = () => num('sensor/Radar Floor Drift');
  c.append(readRow('空房底噪', () => { const n = num('sensor/Radar Floor Level'); return n === null ? '收集中' : n.toFixed(1); }, '空房 1 分鐘後、工程模式開著時，各格靜止能量平均的 30 分鐘移動平均'),
    readRow('底噪漂移', () => { const d = fd(); return d === null ? '收集中' : `${d > 0 ? '+' : ''}${d.toFixed(1)}${d >= 5 ? '（建議重新校準）' : ''}`; }, '相對基準；基準在收集滿 30 分鐘後自動建立'));
  const rr = row('重設底噪基準', '把目前底噪設為新基準（校準後建議按一次）'); rr.append(btn('重設', '', null, press('button/Radar Floor Reference Reset'))); c.append(rr);
  c.append(h('p', 'hint', '7 天以上趨勢請看 HA 的歷史圖（實體：空房底噪、底噪漂移、PIR 不一致次數、能量飆次數，HA 會自動保留長期統計）。'));
  return c;
}
function zoneCard() {
  const c = card('區域與忽略格'), occ = (id) => (val(id) === undefined ? '—' : isOn(id) ? '有人' : '無人'), fmt = (v) => `第 ${v} 格`;
  const chips = h('div', 'targets'); chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', '忽略的距離格');
  const prevs = () => store.get(IGN_KEY) || {}, isIgn = (g) => moveT(g) === 100 && stillT(g) === 100;
  const igb = Array.from({ length: GATES }, (_, g) => {
    const b = h('button', 'chip'); b.type = 'button';
    b.onclick = async () => {
      if (b.disabled) return;
      if (isIgn(g)) {
        const pv = prevs()[g];
        if (!pv) { toast(`G${g} 沒有記錄忽略前的值，請到「即時調教」頁手動設定門檻`); return; }
        b.disabled = true; await Promise.all([send(`number/Gate ${g} Move Threshold`, `set?value=${pv[0]}`), send(`number/Gate ${g} Still Threshold`, `set?value=${pv[1]}`)]);
        const o = prevs(); delete o[g]; store.set(IGN_KEY, o);
      } else {
        const m = moveT(g), st = stillT(g); if (m === null || st === null) return;
        store.set(IGN_KEY, { ...prevs(), [g]: [m, st] });
        b.disabled = true; await Promise.all([send(`number/Gate ${g} Move Threshold`, 'set?value=100'), send(`number/Gate ${g} Still Threshold`, 'set?value=100')]);
      }
      b.disabled = false; paint();
    };
    chips.append(b); return b;
  });
  watch(() => igb.forEach((b, g) => { const on = isIgn(g), far = g > Math.max(num('number/Radar Max Move Gate') ?? 8, num('number/Radar Max Still Gate') ?? 8); b.textContent = `G${g} ${(g * res()).toFixed(1)}m${on ? ' · 忽略' : far ? ' · 超出範圍' : ''}`; b.classList.toggle('far', far && !on); b.setAttribute('aria-pressed', String(on)); }));
  c.append(h('p', 'sub', '把冷氣出風口或門口那幾格「忽略」（門檻設 100），誤報就不會進來；再把相鄰的格組成區域，各自回報有人或無人。'), h('div', 'sub', '忽略這些距離格（點一下切換）'), chips, h('div', 'sub', '區域（起始格到結束格，各自一個有人／無人狀態）'));
  c.append(sliderRow('區域 1 起始格', 'number/Zone 1 Start Gate', { fmt, first: true }), sliderRow('區域 1 結束格', 'number/Zone 1 End Gate', { fmt }),
    readRow('區域 1', () => occ('binary_sensor/Zone 1 Occupied')),
    sliderRow('區域 2 起始格', 'number/Zone 2 Start Gate', { fmt }), sliderRow('區域 2 結束格', 'number/Zone 2 End Gate', { fmt }),
    readRow('區域 2', () => occ('binary_sensor/Zone 2 Occupied')));
  c.append(h('p', 'hint', '區域有人＝雷達有人，且移動或靜止目標所在的格落在區間內；區域只依雷達回報的單一距離判定，遠處靜止的人可能被算到較近的區域，要判斷房裡有沒有人請看總覽的整體有人。忽略會把該格的移動與靜止門檻設為 100，取消忽略會還原成忽略前的值（記在這個瀏覽器，換瀏覽器就沒有）。'));
  return c;
}
const PSTATE = { Empty: '無人', Entering: '剛進來', Moving: '走動', Still: '靜坐', Leaving: '正在離開' };
const PS_MODE = { Entering: '基本', Moving: '沿用', Still: '延長中', Leaving: '縮短中', Empty: '基本' };
function smartCard() {
  const c = card('智慧無人延時');
  const now = textRow('目前狀態與逾時', () => {
    const st = val('text_sensor/Presence State'), hold = num('sensor/Presence Hold'), on = isOn('switch/Smart Delay');
    if (st == null) return '—';
    return `${PSTATE[st] ?? st} · ${fx(hold)} 秒${on ? `（${PS_MODE[st] ?? ''}）` : '（智慧延時關閉，固定）'}`;
  });
  c.append(switchRow('智慧延時', 'switch/Smart Delay', '依狀態用不同逾時：剛進來與走動＝基本；近處靜止滿 10 秒＝延長；只剩遠處目標 2 秒，或判定是離開後的殘留回波（靜止能量持續下降、沒有移動、PIR 沒動）＝縮短，殘留回波直接不算有人。從無人轉有人要能量高於門檻＋遲滯餘裕（或 PIR）。由感應器自己計時，不會讓雷達重啟', true),
    now,
    sliderRow('近處範圍', 'number/Delay Near Range', { fmt: (v) => `${v} 格以內` }),
    sliderRow('靜止在近處：延長', 'number/Delay Extend Still Near', { fmt: (v) => `+${v} 秒` }),
    sliderRow('移動離開：縮短', 'number/Delay Shorten Move Away', { fmt: (v) => `-${v} 秒` }),
    sliderRow('進入遲滯餘裕', 'number/Hysteresis Margin', { fmt: (v) => v ? `門檻＋${v}` : '關閉', note: '只在智慧延時開著時作用：門檻附近的能量跳動不會讓空房誤報有人' }));
  c.append(h('p', 'hint', '基本延時仍是「無人逾時」。智慧延時的基準與狀態存在裝置，重開機不會丟。狀態（剛進來／走動／靜坐／正在離開）關著時也會顯示，只是不調逾時。'));
  return c;
}

/* ============ 偵測調教：情境預設組、設定檔備份與還原（N3、N2） ============ */
const THR_IDS = [];
for (let g = 0; g < GATES; g++) THR_IDS.push(`number/Gate ${g} Move Threshold`, `number/Gate ${g} Still Threshold`);
const ORDER = [...THR_IDS, 'number/Radar Presence Timeout', 'number/Radar Max Move Gate', 'number/Radar Max Still Gate', 'number/Radar Light Threshold', 'select/Radar Light Function', 'select/Radar Distance Resolution'];
const isSel = (id) => id.startsWith('select/');
// 3.9：進階參數也進設定檔、備份與套用（舊韌體沒有這些實體就略過）
const allIds = () => [...ORDER, ...PARAM_IDS];
function snapshot() {
  const values = {};
  allIds().forEach((id) => { const v = isSel(id) ? val(id) : num(id); if (v !== undefined && v !== null && v !== '') values[id] = v; });
  return { kind: 'presence-settings', v: 1, at: new Date().toISOString(), values, cal: calCompare };
}
// 匯入的檔案不可信：只收已知的實體、數字要在裝置回報的範圍內、選項要在清單內
function validate(o) {
  if (!o || o.kind !== 'presence-settings' || typeof o.values !== 'object' || !o.values) throw new Error('不是這個頁面匯出的設定檔');
  const out = {};
  for (const id of allIds()) {
    if (!(id in o.values)) continue;
    if (PARAM_IDS.includes(id) && !entities[id]) continue;  // 這台韌體沒有這個參數：略過
    const v = o.values[id], d = entities[id] || {};
    if (isSel(id)) { if (!(d.option || []).includes(v)) throw new Error(`${id} 的選項「${v}」不存在`); }
    else if (typeof v !== 'number' || !Number.isFinite(v) || v < +d.min_value || v > +d.max_value) throw new Error(`${id} 的值 ${v} 超出範圍`);
    out[id] = v;
  }
  if (!Object.keys(out).length) throw new Error('檔案裡沒有可套用的設定');
  return out;
}
const bkList = () => store.get(BK_KEY) || [];
const bkPush = (name) => { const d = new Date(); store.set(BK_KEY, [{ name, t: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`, s: snapshot() }, ...bkList()].slice(0, 4)); };
async function applyValues(values, label) {
  const jobs = [];
  for (const id of allIds()) {
    if (!(id in values)) continue;
    if (PARAM_IDS.includes(id) && !entities[id]) continue;
    const want = values[id], cur = isSel(id) ? val(id) : num(id);
    if (want === cur) continue;
    jobs.push([id, isSel(id) ? `set?option=${encodeURIComponent(want)}` : `set?value=${want}`]);
  }
  if (!jobs.length) { toast('目前設定與這份相同，不需要寫入'); return; }
  const secs = Math.ceil(jobs.length * (GAP_MS + 120) / 1000), rst = jobs.some(([id]) => id === 'select/Radar Distance Resolution');
  if (!confirm(`要把 ${jobs.length} 項設定寫入雷達（約 ${secs} 秒，期間請不要關閉頁面）？\n寫入前會先自動備份目前的設定，可從「最近的備份」復原。${rst ? '\n其中包含距離解析度：寫入後雷達會重啟。' : ''}`)) return;
  bkPush(label + '前自動備份');
  const b = await batch(label, jobs);
  toast(b.fail ? `${label}完成，但有 ${b.fail} 項失敗` : `${label}完成：已寫入 ${b.total} 項`);
}
const PRESETS = [
  ['長時間坐著（範例）', { 'number/Radar Presence Timeout': 60 }, '無人逾時 60 秒：坐著不動也不容易被判無人'],
  ['走道經過（範例）', { 'number/Radar Presence Timeout': 5 }, '無人逾時 5 秒：人一走就轉無人'],
  ['睡眠（範例）', { 'number/Radar Presence Timeout': 120 }, '無人逾時 120 秒：翻身不動也維持有人'],
];
function presetCard() {
  const c = card('情境預設組'), chips = h('div', 'targets'), info = h('p', 'hint'), nm = h('input', 'field');
  const own = () => store.get(PRESETS_KEY) || [];
  const save = btn('存成新情境', null, null, () => { const n = nm.value.trim(); if (!n) return; store.set(PRESETS_KEY, [...own().filter((x) => x[0] !== n), [n, snapshot()]].slice(-6)); nm.value = ''; paint(); });
  nm.type = 'text'; nm.placeholder = '情境名稱，例如：沙發看電視'; nm.maxLength = 20; nm.setAttribute('aria-label', '新情境名稱');
  const sv2 = h('div', 'row first'); sv2.style.cssText = 'border-top:0;gap:8px;flex-wrap:nowrap'; sv2.append(nm, save);
  c.append(h('p', 'sub', '一鍵換一組設定；內建三組是範例（只調「無人逾時」，秒數依你的習慣自己改），自己存的包含全部雷達設定。套用前會先自動備份目前設定。'), chips, info, sv2);
  let built = '';
  watch(() => {
    const list = [...PRESETS.map(([n, v, d]) => [n, v, d]), ...own().map(([n, v]) => [n, v, '自己存的情境（全部雷達設定）'])];
    const sig = JSON.stringify(list.map((x) => x[0]));
    if (sig !== built) {
      built = sig; chips.replaceChildren();
      list.forEach(([n, v]) => { const b = h('button', 'chip', n); b.type = 'button'; b.dataset.n = n; b.onclick = () => { try { applyValues(v.kind ? validate(v) : v, '套用「' + n + '」'); } catch (e) { toast(String(e.message || e)); } }; chips.append(b); });
    }
    let hit = null;
    [...chips.children].forEach((b, i) => { const v = list[i][1]; const on = PRESETS[i] && num('number/Radar Presence Timeout') === v['number/Radar Presence Timeout']; if (on && hit === null) hit = i; b.setAttribute('aria-pressed', String(!!on)); });
    info.textContent = hit !== null ? `目前套用：${list[hit][0]}。${list[hit][2]}。` : '目前是自訂值（和內建情境都不同）。';
  });
  return c;
}
function download(name, obj) {
  const a = h('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' })); a.download = name;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function backupCard() {
  const c = card('設定備份與還原'), wrap = h('div', 'blk'), left = h('div', 'blk'), right = h('div', 'blk'), list = h('div', 'bklist');
  const bs = h('div', 'btns'), file = h('input'), imp = h('button', 'btn', '匯入並套用');
  const stamp = () => { const d = new Date(); return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`; };
  bs.append(btn('儲存目前設定', 'primary', null, () => { bkPush('手動備份'); paint(); toast('已儲存目前設定（只存在這個瀏覽器）'); }),
    btn('匯出成檔案', null, null, () => download(`presence-settings-${stamp()}.json`, snapshot())));
  file.type = 'file'; file.accept = '.json,application/json'; file.setAttribute('aria-label', '匯入設定檔'); imp.disabled = true; file.onchange = () => { imp.disabled = !file.value; };
  const f = h('form');
  f.onsubmit = async (e) => {
    e.preventDefault();
    try { const o = JSON.parse(await file.files[0].text()); await applyValues(validate(o), '匯入設定'); paint(); }
    catch (err) { toast('匯入失敗：' + (err.message || err)); }
    file.value = ''; imp.disabled = true;
  };
  f.append(file, imp);
  left.append(h('div', 'sub', '備份內容：雷達全部設定——18 個門檻、無人逾時、最遠距離格、距離解析度、光感功能與門檻，以及校準前後結果（不含 Wi-Fi 與名稱）。原廠 App 的「保存模版」是外部功能，這裡自己補。'), bs, h('div', 'sub', '從檔案匯入'), f, h('p', 'hint', '匯入前會先檢查範圍，並自動備份目前設定。'));
  right.append(h('div', 'sub', '最近的備份（還原會先自動再備份一次）'), list);
  wrap.append(left, right); c.append(wrap);
  let built = '';
  watch(() => {
    const bk = bkList(), sig = JSON.stringify(bk.map((b) => b.t + b.name));
    if (sig === built) return;
    built = sig;
    list.replaceChildren(...bk.map((b) => {
      const r = h('div', 'bkrow'), n = h('div', 'name', b.name); n.append(h('div', 'note', b.t));
      const rb = btn('還原', null, null, () => { try { applyValues(validate(b.s), '還原「' + b.name + '」'); } catch (e) { toast(String(e.message || e)); } });
      r.append(n, rb); return r;
    }));
    if (!bk.length) list.append(h('p', 'hint', '還沒有備份：按「儲存目前設定」，或套用／匯入前會自動存一份。'));
  });
  return c;
}
/* ============ 偵測調教：各格底噪統計（N14） ============ */
function noiseCard() {
  const c = card('各格底噪統計'), g = h('div', 'cmp'), box = h('div', 'nz');
  const qual = h('p', 'hint'); qual.hidden = true;
  box.append(g); c.append(h('p', 'sub', '上次校準（空房）取樣時，各格能量的最大值與平均值；下方「當前」超過最大值就變紅，代表那一格現在比平常吵。與原廠 App 參數頁的檢測底噪相同。'), box, h('p', 'hint', '「當前」要開著工程模式才有值；最大值與平均值是裝置端校準取樣時算的，裝置重開機後清空，需重新校準。'), qual);
  const parse = (v) => { const a = String(v ?? '').split(',').map(Number); return a.length === 18 && a.every(Number.isFinite) ? a : null; };
  let sig = '';
  watch(() => {
    const mx = parse(val(NMAX)), av = parse(val(NAVG)), eng = isOn(ENG);
    const q = val('text_sensor/Calibration Quality');
    qual.hidden = !q;
    if (q) { qual.textContent = q.startsWith('saturated') ? '校準品質：底噪飽和——偵測範圍內多格的空房能量平均已接近 100，門檻被卡在上限；請換電源、換位置，仍一樣就是雷達模組或連線有問題，不是校準能解決的。' : q.startsWith('unknown') ? '校準品質：無法判定——雷達參數沒讀回。請按「Radar Query Params」確認最大格數不是 0 後重新校準。' : q.startsWith('stable') ? '校準品質：穩定（' + q.replace(/^stable \(/, '').replace(')', '') + '）' : '校準品質：不穩定——取樣時環境有變動（冷氣、風扇、有人經過），門檻可能偏高，建議關掉風扇冷氣後重新校準。'; qual.style.color = q.startsWith('stable') ? '' : 'var(--warn)'; }
    const cur = (k) => Array.from({ length: GATES }, (_, i) => { const v = (k === 0 ? moveE(i) : stillE(i)); return eng && v !== null ? Math.round(v) : null; });
    const mv = cur(0), sv2 = cur(1), s2 = JSON.stringify([mx, av, mv, sv2]);
    if (s2 === sig) return;
    sig = s2;
    g.replaceChildren(h('span', 'lab', ''), ...Array.from({ length: GATES }, (_, i) => h('span', '', `G${i}`)));
    const col = (arr, k) => arr ? Array.from({ length: GATES }, (_, i) => arr[i * 2 + k]) : Array(GATES).fill('—');
    const fixed = (lab, arr) => g.append(h('span', 'lab', lab), ...arr.map((v) => h('span', '', v)));
    const live = (lab, curv, ref) => g.append(h('span', 'lab', lab), ...curv.map((v, i) => h('span', mx && v !== null && v > ref[i] ? 'up' : '', v === null ? '—' : v)));
    fixed('運動 最大值', col(mx, 0)); fixed('運動 平均值', col(av, 0)); live('運動 當前', mv, col(mx, 0));
    fixed('靜止 最大值', col(mx, 1)); fixed('靜止 平均值', col(av, 1)); live('靜止 當前', sv2, col(mx, 1));
  });
  return c;
}

/* ============ 偵測調教：進階參數（3.9，韌體 3.4 的時間／統計常數，預設值＝目前最佳值） ============ */
// [群組, [[實體名稱, 中文名稱, 預設, 單位, 說明], ...]]；預設要和 presence-common.yaml 的 initial_value 一致
const PARAM_GROUPS = [
  ['殘留回波（離開後的假訊號）', [
    ['Residue Drop', '能量降幅', 0, '', '0＝關閉殘留規則（韌體 4.1.1 起的出廠預設：坐定後能量沉降會被它誤判成離開）。設成 8 上下可重新啟用：靜止能量在窗內至少掉這麼多，才像離開後的殘留；與雷達能量大小有關'],
    ['Residue Max Energy', '能量上限', 35, '', '能量高於這個值不當殘留。出廠預設，與雷達能量大小有關'],
    ['Residue Rebound', '回升容許', 5, '', '能量回升超過這個值就不是殘留。出廠預設，與雷達能量大小有關'],
    ['Residue Confirm Seconds', '確認秒數', 4, '秒', '條件連續成立這麼久才判殘留'],
    ['Residue Max Seconds', '最長秒數', 60, '秒', '殘留判定最久維持多久'],
    ['Residue Window Seconds', '觀察窗', 10, '秒', '看能量變化的時間窗'],
    ['Entering Seconds', '進入期', 10, '秒', '剛判有人後的進入期長度'],
  ]],
  ['有人判定穩定化（韌體 4.0）', [
    ['Entry Confirm Seconds', '進入確認秒數', 2, '秒', '無人→有人要雷達連續有目標這麼久才算（PIR 有動作立刻算），擋空房單幀突波；0＝關。出廠預設，與場地無關'],
    ['Dropout Bridge Energy', '掉線橋接能量', 60, '%', '雷達旗標掉線、但靜止能量 ≥ 此值時仍算有人（人坐著不動被誤判離開）；0＝關。出廠預設，與雷達能量大小有關'],
    ['Dropout Bridge Seconds', '掉線橋接最久秒數', 60, '秒', '橋接最久撐幾秒，超過就照一般延時轉無人；0＝關。出廠預設，與場地無關'],
    ['Seated Lost Hold Seconds', '久坐雷達丟失保持秒數', 180, '秒', '人已在場 60 秒以上、雷達突然丟失且沒有離開座位的移動軌跡時，最久先當作有人幾秒；0＝關。出廠預設，與場地無關'],
    ['Exit Zone Near', '離開區近端', 0, 'cm', '離開區下限（公分）。人離開前雷達目標常先出現在門口附近的一段距離；目標剛出現在 近端～遠端 之內、旗標消失、靜止能量回到空房水準且 PIR 沒亮，就直接轉無人。要用得先量好門口在雷達的哪個距離（站在門口揮手看「運動距離」）；0 或遠端不大於近端＝關。與場地有關'],
    ['Exit Zone Far', '離開區遠端', 0, 'cm', '離開區上限（公分），見「離開區近端」。與場地有關'],
    ['Exit Zone Seconds', '離開區時間窗', 0, '秒', '旗標消失前這麼多秒內目標還在離開區，才算「從門口離開」；0＝關（出廠預設關）。建議 8～15 秒，要依各房間自己量'],
    ['Exit Zone Max Energy', '離開區能量上限', 15, '%', '旗標消失時靜止能量要低於這個值才轉無人（有人還在時能量會高於它）；要略高於空房靜止能量上限。與雷達能量大小有關'],
    ['Still Energy Presence', '靜止能量也算有人', 30, '%', '雷達旗標關著、但靜止能量 ≥ 此值連續 2 秒時也算有人（坐著不動時旗標常要等到有動作才回來）；0＝關。出廠預設，與雷達能量大小有關：要高於空房時的靜止能量上限'],
    ['Zone Hold Seconds', '區域保持秒數', 4, '秒', '有人時，區域輸出從有人轉無人要先保持這麼久才放開。出廠預設，與場地無關'],
    ['State Smooth Seconds', '狀態平滑秒數', 3, '秒', '有人狀態之間（走動、靜坐等）要連續維持這麼久才換；變無人或從無人變有人都立刻換。出廠預設，與場地無關'],
  ]],
  ['底噪與取樣', [
    ['Floor Wait Seconds', '空房後開始量底噪', 60, '秒', '確定空房這麼久之後才開始量。只影響「底噪／漂移」顯示，不影響有沒有人'],
    ['Floor Window Samples', '底噪平滑視窗', 180, '筆', '越大越穩、越慢跟上變化。只影響「底噪／漂移」顯示，不影響有沒有人'],
    ['Floor Sample Interval Minutes', '底噪取樣間隔', 30, '分', '每隔多久開一次工程模式量底噪。只影響「底噪／漂移」顯示，不影響有沒有人'],
    ['Occupied Sample Interval Minutes', '有人取樣間隔', 60, '分', '歷史學習：每隔多久記一筆「有人」能量（只影響門檻建議）'],
    ['PIR Recent Seconds', 'PIR 近期視窗', 300, '秒', '歷史學習：PIR 在這麼久內有觸發，才收「有人」能量（只影響門檻建議）'],
    ['PIR Hold Seconds', 'PIR 保持', 5, '秒', 'PIR 觸發後 PIR 狀態多維持幾秒。這段時間不判殘留、新進來的人不用過進入遲滯，校準取樣會因它中止；PIR 本身不會讓房間變「有人」'],
    ['PIR Mismatch Seconds', 'PIR 不一致判定', 3, '秒', 'PIR 有動、雷達這麼久還說沒人，才記一次不一致（只影響統計）'],
  ]],
  ['歷史學習', [
    ['History Start Delay Seconds', '開機後延遲', 180, '秒', '開機這麼久之後才開始收集'],
    ['History Quiet Seconds', '空房安靜時間', 600, '秒', '空房這麼久才算安靜、才收空房資料'],
    ['History Auto Apply Days', '自動套用間隔', 7, '天', '自動套用最多每幾天一次'],
    ['History Auto Apply Max Step', '自動套用單次最大變動', 10, '', '每格門檻一次最多改這麼多'],
    ['History Min Empty Samples', '空房資料下限', 20000, '筆', '低於這個筆數不給建議'],
    ['History Min Occupied Samples', '有人資料下限', 300, '筆', '低於這個筆數不用有人資料修正靜止門檻'],
    ['History Empty Percentile', '空房百分位', 99.9, '%', '空房能量取這個百分位當門檻基準'],
    ['History Occupied Percentile', '有人百分位', 10, '%', '有人能量取這個百分位當上限參考'],
    ['History Seat Gap', '座位格差', 2, '格', '有人能量要比空房高出幾格才修正'],
  ]],
  ['校準流程', [
    ['Calibration Abort Wait Seconds', '中止檢查延後', 5, '秒', '取樣開始這麼久之後才檢查要不要中止'],
    ['Calibration Abort Move Energy', '中止：移動能量', 90, '', '取樣時移動能量達此值視為有人，中止'],
    ['Calibration Abort Confirm Seconds', '中止：確認秒數', 1, '秒', '移動能量連續超標這麼久才中止'],
    ['Calibration Sit Wait Seconds', '等人坐好上限', 90, '秒', '第二點最多等多久'],
    ['Calibration Sit Confirm Seconds', '坐好確認秒數', 3, '秒', '連續偵測到這麼久才算坐好'],
    ['Calibration Verify Seconds', '驗證等待', 3, '秒', '寫入門檻後等這麼久再驗證'],
    ['Calibration Spread Limit', '品質提示：波動上限', 20, '', '取樣最大值減平均超過這個值就提示不穩定（只提示）'],
  ]],
  ['干擾格提示（只提示）', [
    ['Interference Ratio', '倍率', 2.5, '倍', '某格空房中位數比其他格高這麼多倍才標'],
    ['Interference Min Gap', '最小差距', 10, '', '且至少高出這麼多才標'],
  ]],
  ['雷達寫入與穩定期', [
    ['Radar Write Interval Seconds', '智慧延時寫入間隔', 30, '秒', '開關智慧延時、或雷達逾時被改掉時，最短隔這麼久才再寫一次雷達；平常的延長／縮短由韌體計時，不寫雷達'],
    ['Radar Settling Seconds', '重啟後穩定期', 12, '秒', '雷達設定寫入或重啟後這麼久內，新出現的有人不算（原本就有人的不受影響，PIR 有動作例外）'],
  ]],
];
const PARAM_IDS = PARAM_GROUPS.flatMap(([, l]) => l.map((x) => 'number/' + x[0]));
// 合理性檢查：回傳要顯示的警告文字陣列
function paramWarnings() {
  const g = (n) => num('number/' + n), w = [];
  const a = g('Residue Drop'), b = g('Residue Max Energy'), c = g('Residue Confirm Seconds'), d = g('Residue Max Seconds'), e = g('Residue Window Seconds');
  if (a !== null && b !== null && b <= a) w.push('「殘留能量上限」不大於「能量降幅」：殘留判定幾乎不會成立。');
  if (c !== null && d !== null && d < c) w.push('「殘留最長秒數」小於「確認秒數」：殘留判定不會成立。');
  if (c !== null && e !== null && c > e) w.push('「殘留確認秒數」大於「觀察窗」：能量歷史不夠長，殘留判定可能不成立。');
  const f = g('Floor Wait Seconds'), q = g('Floor Sample Interval Minutes');
  if (f !== null && q !== null && f > q * 60) w.push('「空房後開始量底噪」比取樣間隔還長：底噪可能一直量不到。');
  const hs = g('History Min Empty Samples');
  if (hs !== null && hs > 50000) w.push('「空房資料下限」很高：要收很久才會有建議。');
  const ab = g('Calibration Abort Move Energy');
  if (ab !== null && ab < 50) w.push('「中止：移動能量」偏低：校準取樣時稍有動靜就會中止。');
  return w;
}
// 症狀 → 建議先看的群組（建議對照；4.8 已對照韌體實際用途核對：底噪與取樣只影響診斷顯示與歷史資料收集，不對應任何症狀；歷史學習的有人資料修正靜止門檻，所以也對應「人還在卻被判無人」）
const SYMS = [['slow', '離開後很久才變無人'], ['miss', '人還在卻被判無人'], ['ghost', '空房卻顯示有人'], ['cal', '校準常中止或不穩']];
const GROUP_SYM = { '殘留回波（離開後的假訊號）': ['slow', 'miss'], '底噪與取樣': [], '歷史學習': ['ghost', 'miss'], '校準流程': ['cal'], '干擾格提示（只提示）': ['ghost'], '有人判定穩定化（韌體 4.0）': ['ghost', 'miss'] };
PARAM_GROUPS.forEach(([, l]) => l.forEach(([n, zh]) => { zhName['number/' + n] = zh; }));
function paramCard() {
  const c = card('進階參數', h('p', 'hint', '出廠預設適合大多數場地。遇到下方症狀才需要調整；改過的項目會標「已改」，可單項或全部還原。'));
  const warnBox = h('div', 'blk'), sum = h('p', 'hint');
  let q = '', onlyChanged = false, sym = null;
  const rst = btn('全部還原預設', null, '把進階參數（39 項）全部改回預設值？門檻、校準與其他設定不會動，還原前會先自動備份。', async () => {
    const jobs = [];
    PARAM_GROUPS.forEach(([, l]) => l.forEach(([n, , def]) => { if (entities['number/' + n] && num('number/' + n) !== def) jobs.push(['number/' + n, `set?value=${def}`]); }));
    if (!jobs.length) { toast('已經都是預設值'); return; }
    bkPush('還原進階參數前自動備份');
    const r = await batch('還原進階參數', jobs); toast(r.fail ? `完成，但有 ${r.fail} 項失敗` : `已還原 ${r.total} 項`);
  });
  const search = h('input', 'field'), chg = h('button', 'chip', '只看已改'), tools = h('div', 'btns ptools');
  search.type = 'search'; search.placeholder = '搜尋參數，例如「殘留」「確認秒數」'; search.setAttribute('aria-label', '搜尋參數');
  chg.type = 'button'; chg.setAttribute('aria-pressed', 'false');
  tools.append(search, chg, rst);
  const symBox = h('div', 'btns'), symBtns = SYMS.map(([k, l]) => { const b = h('button', 'chip', l); b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.onclick = () => { sym = sym === k ? null : k; filt(); }; symBox.append(b); return [b, k]; });
  const groups = [], wrap = h('div', 'pwrap');
  PARAM_GROUPS.forEach(([title, list]) => {
    const d = h('details', 'pgrp'), sm = h('summary', '', title), cnt = h('span', 'pcnt'), body = h('div', 'pbody'); sm.append(cnt); d.append(sm, body);
    const rows = list.map(([name, label, def, unit, note]) => {
      const id = 'number/' + name, r = row(label, note), rg = h('div', 'note rg'), inp = h('input', 'num'), u = h('span', 'unit', unit), tag = h('span', 'tag', '已改'), sv2 = h('span', 'saved', '');
      const save = async (v) => { const ok = await send(id, `set?value=${v}`); sv2.textContent = ok ? '已儲存' : '寫入失敗'; sv2.classList.toggle('bad', !ok); clearTimeout(sv2.t); sv2.t = setTimeout(() => { sv2.textContent = ''; }, 2500); };
      const rs = btn('還原', null, null, () => save(def));
      r.firstChild.append(rg); inp.type = 'number'; inp.setAttribute('aria-label', label + (unit ? `（${unit}）` : ''));
      inp.onchange = () => { if (inp.value !== '') save(inp.value); };
      tag.hidden = true; rs.hidden = true; r.append(sv2, tag, rs, inp, u); body.append(r);
      return { id, def, unit, label, note, name, inp, tag, rs, rg, row: r };
    });
    groups.push({ title, d, cnt, rows }); wrap.append(d);
  });
  c.append(tools, h('p', 'hint', '遇到哪種情況？按下只留相關群組，再按一次取消。（對照是建議，不是診斷）'), symBox, sum, warnBox, wrap);
  const filtering = () => !!(q || onlyChanged || sym);
  function filt() {
    chg.setAttribute('aria-pressed', String(onlyChanged)); symBtns.forEach(([b, k]) => b.setAttribute('aria-pressed', String(sym === k)));
    groups.forEach((g) => {
      let n = 0, chn = 0, shown = 0;
      g.rows.forEach((x) => {
        if (!entities[x.id]) { x.row.hidden = true; return; }
        n++; const cur = num(x.id), ch = cur !== null && Math.abs(cur - x.def) > 1e-6; if (ch) chn++;
        const ok = (!onlyChanged || ch) && (!q || (x.label + x.name + x.note + g.title).toLowerCase().includes(q)) && (!sym || (GROUP_SYM[g.title] || []).includes(sym));
        x.row.hidden = !ok; if (ok) shown++;
      });
      g.cnt.textContent = `${n} 項${chn ? ` · 已改 ${chn}` : ''}`;
      g.d.hidden = !n || !shown;
      if (filtering() && shown) g.d.open = true;
    });
  }
  search.oninput = () => { q = search.value.trim().toLowerCase(); filt(); };
  chg.onclick = () => { onlyChanged = !onlyChanged; filt(); };
  let sig = '';
  watch(() => {
    const has = groups.flatMap((g) => g.rows).filter((x) => entities[x.id]);
    c.hidden = !has.length;
    if (!has.length) return;
    let changed = 0;
    has.forEach((x) => {
      const dd = entities[x.id], cur = num(x.id);
      Object.assign(x.inp, { min: dd.min_value, max: dd.max_value, step: dd.step });
      x.rg.textContent = `範圍 ${dd.min_value}～${dd.max_value}${x.unit}　預設 ${x.def}${x.unit}`;
      if (cur !== null && document.activeElement !== x.inp) x.inp.value = cur;
      const diff = cur !== null && Math.abs(cur - x.def) > 1e-6;
      x.tag.hidden = !diff; x.rs.hidden = !diff; if (diff) changed++;
    });
    sum.textContent = changed ? `有 ${changed} 項和預設不同。` : '全部都是預設值。';
    rst.disabled = !changed;
    const ws = paramWarnings(), s2 = ws.join('|') + '#' + changed + '#' + has.length;
    if (s2 !== sig) { sig = s2; warnBox.replaceChildren(...ws.map((t) => h('div', 'banner danger', '⚠ ' + t))); filt(); }
    warnBox.hidden = !ws.length;
  });
  return c;
}
/* ============ 系統：韌體升級說明、進階（藍牙） ============ */
function fwCard() {
  const c=card('雷達韌體升級說明'); 
  const ver=h('div','tile'), vb=h('b'); ver.append(h('span','l','目前雷達韌體版本'),vb); vb.style.fontSize='var(--fs-title)';
  const ol=h('ol','steps-list'); ['升級前，先到「偵測調教 → 校準與備份」按「儲存目前設定」存一份，升級後可還原。','手機靠近感應器（3 公尺內），用原廠的 HLKRadarTool（藍牙，不是 Wi-Fi）搜尋這顆雷達。','選擇新版韌體開始升級，約 1 到 3 分鐘。','升級中不要斷電、不要鎖屏或離開 App；失敗會顯示「等待升級」，可以重試。','完成後回到這個網頁按「重新讀取雷達參數」，必要時還原設定檔。'].forEach(t=>ol.append(h('li','',t)));
  const warn=h('div','banner','雷達韌體只能用手機藍牙升級。原廠沒有公開 UART 升級協定，所以這個網頁做不到，也不會放升級按鈕。');
  c.append(ver,warn,ol);
  watch(()=>{ vb.textContent=val('text_sensor/Radar Firmware')??'—'; }); return c;
}
function advancedCard() {
  const c = card('進階（小心）'), d = h('details', 'adv'), sm = h('summary', '', '展開進階設定（一般用不到）'), body = h('div', 'blk');
  const r = row('雷達藍牙（手機 App 連線用）', '關閉後雷達不再接受手機藍牙連線', true), b = h('button', 'sw'); b.type = 'button'; b.setAttribute('role', 'switch'); b.setAttribute('aria-label', '雷達藍牙'); r.append(b);
  const warn = h('div', 'banner danger', '警告：關閉雷達藍牙後，連原廠 App 升級雷達韌體也不行。要重新開啟，必須讓感應器斷電再上電 5 次以上，這個網頁無法再把它打開。');
  const off = h('p', 'hint', '目前已關閉。只能斷電再上電 5 次以上才會重新開啟，網頁無法開啟。');
  b.onclick = () => { if (!isOn(BT)) return; if (confirm('確定關閉雷達藍牙？關閉後只能讓感應器斷電再上電 5 次以上才能重新開啟，網頁無法再開啟，原廠 App 也連不上。')) send(BT, 'turn_off'); };
  body.append(r, warn, off);
  d.append(sm, body); c.append(d);
  watch(() => { const on = isOn(BT); b.setAttribute('aria-checked', String(on)); b.disabled = !on; off.hidden = on; });
  return c;
}
/* ============ 燈光與聲音 ============ */
const ALLT = ['LED All', 'LED Left', 'LED Right', 'LED 1', 'LED 2', 'LED 3', 'LED 4', 'LED 5', 'LED 6'];
const TL = { 'LED All': '全部', 'LED Left': '左 3 顆', 'LED Right': '右 3 顆' };
const EW = { None: '無', Breath: '呼吸', 'Alert Blink': '警示閃爍', 'Left Flow': '左側流動', 'Right Flow': '右側流動' };
const light = (t) => entities['light/' + t] || {};
const lightOn = (t) => light(t).state === 'ON';
const hex = (c) => c ? '#' + [c.r, c.g, c.b].map((x) => (x || 0).toString(16).padStart(2, '0')).join('') : '#ffffff';
function ledCard() {
  let target = 'LED All';
  const c = card('燈珠'), dev = h('div', 'device'), bz = h('div', 'bezel'), gl = h('div', 'grp'), gr = h('div', 'grp');
  gl.append(h('span', 'glab', 'LEFT')); gr.append(h('span', 'glab', 'RIGHT'));
  const select = (t) => { target = t; paint(); };
  const dots = [1, 2, 3, 4, 5, 6].map((n) => { const b = h('button', 'led'); b.type = 'button'; b.setAttribute('aria-label', 'LED ' + n); const d = h('i'); b.append(d, String(n)); b.onclick = () => select('LED ' + n); (n <= 3 ? gl : gr).append(b); return [b, d, n]; });
  const dome = h('div', 'dome', 'PIR');
  bz.append(gl, dome, gr, h('div', 'rad', 'LD2410B')); dev.append(bz); c.append(A(dev));
  const tg = h('div', 'targets'); tg.setAttribute('role', 'group'); tg.setAttribute('aria-label', '控制對象');
  const chips = ALLT.map((t) => { const b = h('button', 'chip', TL[t] || t); b.type = 'button'; b.onclick = () => select(t); tg.append(b); return [b, t]; }); c.append(A(tg));
  const head = h('div', 'row first'), hs = h('div', 'name'), sw = h('button', 'sw'); sw.type = 'button'; sw.setAttribute('role', 'switch'); sw.setAttribute('aria-label', '燈珠開關'); head.append(hs, sw);
  sw.onclick = () => send('light/' + target, lightOn(target) ? 'turn_off' : 'turn_on');
  const bw = h('label', 'slide'), bi = h('input'), bv = h('span', 'val', '—'); Object.assign(bi, { type: 'range', min: 1, max: 100, step: 1 }); bi.setAttribute('aria-label', '亮度'); bw.append(bi, bv); const brow = row('亮度'); brow.append(bw);
  bi.oninput = () => { paintRange(bi); bv.textContent = bi.value + '%'; };
  bi.onchange = () => send('light/' + target, `turn_on?brightness=${Math.round(+bi.value * 2.55)}`);
  const sendColor = (col2) => { const n = parseInt(col2.slice(1), 16); send('light/' + target, `turn_on?r=${n >> 16 & 255}&g=${n >> 8 & 255}&b=${n & 255}`); };
  const crow = row('顏色'), cols = h('div', 'colors');
  ['#ffffff', '#ffb340', '#ff5a5f', '#3ddc84', '#4cc3ff', '#b794ff'].forEach((color) => { const b = h('button'); b.type = 'button'; b.style.background = color; b.setAttribute('aria-label', '顏色 ' + color); b.onclick = () => sendColor(color); cols.append(b); });
  const pickC = h('input'); pickC.type = 'color'; pickC.setAttribute('aria-label', '自選顏色'); pickC.onchange = () => sendColor(pickC.value); cols.append(pickC); crow.append(cols);
  const erow = row('效果'), es = h('div', 'seg'); erow.append(es);
  c.append(head, brow, crow, A(erow));
  let builtE = '';
  watch(() => {
    chips.forEach(([b, t]) => b.setAttribute('aria-pressed', String(t === target)));
    dots.forEach(([b, d, n]) => {
      const own = 'LED ' + n, grp = n <= 3 ? 'LED Left' : 'LED Right', src = lightOn(own) ? own : lightOn(grp) ? grp : lightOn('LED All') ? 'LED All' : null, color = src ? hex(light(src).color) : '';
      b.classList.toggle('on', !!src); b.style.color = color; d.style.background = color;
      b.setAttribute('aria-pressed', String(target === own || target === 'LED All' || target === grp));
    });
    const l = light(target);
    hs.textContent = (TL[target] || target) + ' 開關'; sw.setAttribute('aria-checked', String(lightOn(target)));
    if (typeof l.brightness === 'number' && !bi.matches(':active')) { bi.value = Math.max(1, Math.round(l.brightness / 2.55)); paintRange(bi); bv.textContent = bi.value + '%'; }
    if (document.activeElement !== pickC) pickC.value = hex(l.color);
    const list = l.effects || [], sig = target + list.join();
    if (sig !== builtE) {
      builtE = sig;
      es.replaceChildren(...list.map((e) => { const b = h('button', '', EW[e] || e); b.type = 'button'; b.dataset.e = e; b.onclick = () => send('light/' + target, `turn_on?effect=${encodeURIComponent(e)}`); return b; }));
    }
    es.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String((l.effect || 'None') === b.dataset.e)));
    erow.hidden = list.length < 2;
  });
  return c;
}
function soundCard() {
  const c = card('聲音與自動行為（預設全關）');
  c.append(
    switchRow('狀態燈', 'switch/LED Status Indicator', '開啟後：校準時 6 顆藍色呼吸；Wi-Fi 斷線時 6 顆紅色閃爍', true),
    switchRow('燈珠跟著感應走', 'switch/LED Follow Sensors', '左 3 顆＝雷達有人，右 3 顆＝PIR 有動'),
    switchRow('提示音', 'switch/Sounds', '開機、連網、校準完成時響'),
    switchRow('整點／半點報時', 'switch/Hourly Chime'),
    sliderRow('燈珠亮度', 'number/LED Brightness', { fmt: (v) => v + '%', note: '自動亮的燈（有人、PIR、Wi-Fi 斷線、校準）共用' }),
    sliderRow('蜂鳴器音量', 'number/Buzzer Volume', { fmt: (v) => v + '%', note: '夜裡可調小' }));
  const bs = h('div', 'btns'); bs.append(btn('試響蜂鳴器', null, null, press('button/Buzzer Test')));
  const mel = h('form'), mi = h('input', 'field'), mb = h('button', 'btn', '試播旋律'), hint = h('div', 'hint');
  const HELP = '輸入 RTTTL 格式的旋律字串並試播（網頁端檢查格式，不存進裝置）。';
  mi.type = 'text'; mi.maxLength = 255; mi.spellcheck = false; mi.style.fontFamily = 'ui-monospace,Menlo,Consolas,monospace'; mi.setAttribute('aria-label', 'RTTTL 旋律');
  hint.textContent = HELP;
  mel.onsubmit = async (e) => {
    e.preventDefault();
    const text = mi.value.trim(), ok = /^[^:]{0,32}:(\s*[dob]\s*=\s*\d+\s*,?){0,3}:\s*[0-9a-gp#._,\s]+$/i.test(text);
    hint.textContent = ok ? HELP : '格式不對，範例：motion:d=32,o=6,b=200:e,16p,g'; hint.classList.toggle('bad', !ok);
    if (!ok) return;
    await send(MELODY, `set?value=${encodeURIComponent(text)}`);
    await send('button/Buzzer Play Melody', 'press');
  };
  mel.append(mi, mb, hint); A(mel);
  watch(() => { if (document.activeElement !== mi && val(MELODY) != null) mi.value = val(MELODY); });
  const tl = h('ul', 'steps-list tones');
  [['兩短聲（高音）', '連上 Wi-Fi'], ['三聲（中音，間隔）', '一鍵校準第二點：請回到平常待的位置坐下不動'], ['上升三音', '校準完成'], ['高低兩聲', '校準中止：取樣時房間裡有人，門檻沒改'],
    ['兩聲／一聲短音', '整點兩聲、半點一聲（開啟「整點／半點報時」才響）'], ['短促兩音', '試響蜂鳴器']].forEach(([a, b]) => { const li = h('li'); li.append(h('b', '', a), ' — ' + b); tl.append(li); });
  c.append(bs, mel);
  return [c, card('每種聲音代表什麼', tl, h('p', 'hint', '「提示音」關閉時以上都不響（報時另有開關）；蜂鳴器音量可調小。'))];
}

/* ============ 3.6 還原設定 ============ */
const RST = ['number/Radar Presence Timeout', 'switch/Smart Delay', 'number/Delay Near Range', 'number/Delay Extend Still Near', 'number/Delay Shorten Move Away', 'number/Delay Still Near Seconds', 'number/Delay Move Away Seconds',
  'number/Hysteresis Margin', 'number/Spike Window Seconds', 'number/Radar Max Move Gate', 'number/Radar Max Still Gate', 'number/Zone 1 Start Gate', 'number/Zone 1 End Gate', 'number/Zone 2 Start Gate', 'number/Zone 2 End Gate',
  'number/Calibration Start Delay', 'number/Calibration Duration', 'number/Calibration Sit Duration', 'number/Calibration Margin', 'switch/History Learning', 'switch/History Auto Apply',
  'switch/Sounds', 'switch/Hourly Chime', 'switch/LED Follow Sensors', 'switch/LED Status Indicator', 'number/Buzzer Volume', 'number/LED Brightness', 'text/Buzzer Melody'];
const rstSnap = () => Object.fromEntries(RST.map((id) => [id, id.startsWith('switch/') ? isOn(id) : id.startsWith('text/') ? val(id) : num(id)]));
async function rstUndo(bk) {
  const x = bk.x || {};
  for (const id of RST) {
    if (!(id in x) || x[id] === null || x[id] === undefined) continue;
    const cur = id.startsWith('switch/') ? isOn(id) : id.startsWith('text/') ? val(id) : num(id);
    if (cur === x[id]) continue;
    await send(id, id.startsWith('switch/') ? (x[id] ? 'turn_on' : 'turn_off') : `set?value=${encodeURIComponent(x[id])}`);
  }
  if (!bk.s) { toast('參數已復原（這個瀏覽器沒有備份門檻）'); return; }
  try { await applyValues(validate(bk.s), '復原'); } catch (e) { toast(String(e.message || e)); }
}
// 4.7 對話框鍵盤支援：開啟時焦點移進對話框、Tab 不會跑到後面的頁面、Esc 可關（onEsc 自己判斷現在能不能關）、關閉後焦點回到原來的按鈕
function modalKeys(ov, onEsc) {
  const prev = document.activeElement, box = ov.firstElementChild;
  if (box) box.tabIndex = -1;
  const items = () => [...ov.querySelectorAll('button:not([disabled]),input:not([disabled]),select,textarea,a[href]')].filter((e) => e.offsetParent !== null);
  const onKey = (e) => {
    if (!ov.isConnected) { document.removeEventListener('keydown', onKey, true); return; }
    if (e.key === 'Escape') { if (onEsc) { e.preventDefault(); onEsc(); } return; }
    if (e.key !== 'Tab') return;
    const f = items(), a = document.activeElement;
    if (!f.length) { e.preventDefault(); if (box) box.focus(); return; }
    if (!ov.contains(a)) { e.preventDefault(); f[e.shiftKey ? f.length - 1 : 0].focus(); }
    else if (e.shiftKey && (a === f[0] || a === box)) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && a === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  };
  document.addEventListener('keydown', onKey, true);
  return {
    focus: () => { if (box && !ov.contains(document.activeElement)) box.focus(); },
    restore: () => { document.removeEventListener('keydown', onKey, true); try { if (prev && prev.isConnected) prev.focus(); } catch (_) { /* 原按鈕已不在就算了 */ } },
  };
}
function restoreFlow(factory) {
  const ov = h('div', 'ob'), box = h('section', 'card obox'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
  const title = h('h2', 'cap'), body = h('div', 'blk'); box.append(title, body); ov.append(box); document.body.append(ov);
  title.id = 'rst-title'; ov.setAttribute('aria-labelledby', 'rst-title');
  let mk = null, busy = false;
  const close = () => { ov.remove(); if (mk) mk.restore(); };
  mk = modalKeys(ov, () => { if (!busy) close(); });  // 執行中（請不要關掉這一頁）不能用 Esc 關
  const ul = (items) => { const u = h('ul', 'steps-list'); items.forEach((s) => u.append(h('li', '', s))); return u; };
  const bs = (...b) => { const d = h('div', 'btns'); d.append(...b); return d; };
  const b2 = (l, cls, fn) => { const b = h('button', 'btn ' + (cls || ''), l); b.type = 'button'; b.onclick = fn; return b; };
  const name = factory ? '恢復出廠預設值' : '恢復最佳值';
  const intro = () => {
    title.textContent = name;
    body.replaceChildren(
      h('span', 'cap', factory ? '會發生' : '會改回（建議值）'),
      ul(factory ? ['雷達模組恢復出廠（18 個門檻、最遠格、逾時回原廠）', '雷達藍牙回到「開」', '感應器參數回出廠預設（智慧延時關、工程模式自動關 10 分鐘、雷達斷線判定 5 秒、雙點校準關）', '校準紀錄清除', '歷史學習資料清除']
        : ['無人逾時 5 秒', '智慧延時開（近處 3 格、延長 10 秒、縮短 2 秒）', '進入遲滯餘裕 5', '最遠移動／靜止 8 格', '區域 1：0～3、區域 2：4～8', '校準參數（等你離開 15、取樣 120、第二點 30、餘裕 10；雙點校準關）', '工程模式自動關 10 分鐘、雷達斷線判定 5 秒', '歷史學習開、自動套用關', '燈光聲音回預設（全關、音量 80%、旋律預設）']),
      h('span', 'cap', '不會動'),
      ul(factory ? ['名稱與 Wi-Fi', '設定備份'] : ['18 個門檻', '名稱與 Wi-Fi', '溫濕度補償', '雷達藍牙', '歷史學習資料與設定備份']),
      h('div', factory ? 'banner danger' : 'banner', factory ? '恢復後到重新校準前可能誤判。按下前會先自動備份目前設定（存在這台瀏覽器）。' : '會先自動備份目前設定（存在這台瀏覽器），事後可以復原。'),
      bs(b2(factory ? '繼續' : name, factory ? 'danger' : 'primary', factory ? confirmLast : run), b2('取消', null, close)));
    mk.focus();
  };
  const confirmLast = () => {
    title.textContent = '最後確認';
    body.replaceChildren(h('p', 'hint', '雷達模組會恢復出廠、校準與歷史學習資料會清掉。確定要' + name + '？'), bs(b2(name, 'danger', run), b2('取消', null, close)));
    mk.focus();
  };
  let bk = null;
  async function run() {
    busy = true;
    const d = new Date(), before = rstSnap(), thrBefore = JSON.stringify(thresholds());
    const bkName = `恢復前自動備份 ${d.getMonth() + 1}/${d.getDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    bkPush(bkName);
    // 4.8：瀏覽器不給存（私密視窗）時 bkList() 讀不到剛推的備份，不能直接取 [0]；改成找名稱相符的那筆，找不到就只在記憶體留參數快照
    const list = bkList(), saved = list[0] && list[0].name === bkName ? list[0] : null;
    if (saved) { saved.x = before; store.set(BK_KEY, list); bk = saved; }
    else { bk = { name: '（未備份）', s: null, x: before }; toast('這個瀏覽器無法備份，仍會繼續恢復；備份只留到關掉這一頁為止'); }
    const STEPS = factory ? ['備份目前設定', '雷達模組恢復出廠', '感應器參數回出廠預設', '清除校準與歷史學習資料', '重新讀取雷達設定'] : ['備份目前設定', '參數改回建議值', '最遠格寫入雷達', '完成'];
    const stat = h('div', 'calstat', '第 1／' + STEPS.length + ' 步'), prog = h('div', 'prog'), pi = h('i'), ol = h('ol', 'rsteps');
    prog.append(pi); STEPS.forEach((s) => ol.append(h('li', '', s)));
    title.textContent = name + '中'; body.replaceChildren(stat, prog, ol, h('p', 'hint', '請不要關掉這一頁，也不要拔電。')); mk.focus();
    await send(factory ? 'button/Restore Factory Defaults' : 'button/Restore Recommended', 'press');
    const t0 = Date.now(), EST = factory ? 12000 : 6000;
    let devBusy = false;  // 裝置回報忙碌（和上面的 busy＝執行中不可用 Esc 關閉 是兩回事）
    await new Promise((ok) => {
      const iv = setInterval(() => {
        const s = String(val('text_sensor/Restore Status') || ''), done = s.startsWith('done') || (s === 'busy' && Date.now() - t0 > 1500) || Date.now() - t0 > 30000;  // busy 要等 1.5 秒，避免讀到上一次殘留的 busy
        if (done && s === 'busy') devBusy = true;
        const k = done ? STEPS.length : Math.min(STEPS.length - 1, 1 + Math.floor((Date.now() - t0) / EST * (STEPS.length - 1)));
        stat.textContent = done ? '完成' : `第 ${k + 1}／${STEPS.length} 步`; pi.style.width = (k / STEPS.length * 100) + '%';
        [...ol.children].forEach((li, i) => { li.className = i < k ? 'done' : i === k ? 'cur' : ''; });
        if (done) { clearInterval(iv); ok(); }
      }, 500);
    });
    if (devBusy) {  // 4.8：裝置正在校準或套用歷史，韌體沒有做任何事，不能說「完成」
      title.textContent = name + '沒有執行'; busy = false;
      body.replaceChildren(h('div', 'calstat', '裝置忙碌中（校準或歷史套用進行中）'), h('p', 'hint', '設定沒有改動，請等它結束再試一次。'), bs(b2('關閉', null, close)));
      return;
    }
    const after = rstSnap(), n = RST.length + (factory ? 1 : 0), m = RST.filter((id) => before[id] !== after[id]).length + (factory && JSON.stringify(thresholds()) !== thrBefore ? 1 : 0);
    title.textContent = name + '完成'; busy = false;
    body.replaceChildren(h('div', 'calstat', `改了 ${n} 項中的 ${m} 項`), h('p', 'hint', bk.s ? '已備份為「' + bk.name + '」（存在這台瀏覽器）。' : '這個瀏覽器無法備份，只能復原剛才改的參數，18 個門檻無法復原。'),
      h('div', 'banner', factory ? '請重做一鍵校準，空房才不會誤報有人。' : '建議再做一次一鍵校準，讓門檻配合現在的房間。'),
      bs(b2('前往一鍵校準', 'primary', () => { close(); location.hash = '#detect/cal'; }), b2('復原', null, async () => { close(); await rstUndo(bk); }), b2(factory ? '稍後' : '關閉', null, close))); mk.focus();
  }
  intro();
}
function restoreCard() {
  const c = card('還原設定');
  const r1 = row('恢復最佳值', '參數改回建議的值；18 個門檻、溫濕度補償不動', true), r2 = row('恢復出廠預設值', '雷達一起恢復出廠，清掉校準和歷史學習資料');
  r1.append(btn('恢復最佳值', null, null, () => restoreFlow(false))); r2.append(btn('恢復出廠預設值', 'danger', null, () => restoreFlow(true)));
  const rg = h('div', 'rgrid'); rg.append(r1, r2);
  c.append(rg, h('p', 'hint', '兩顆都不動名稱與 Wi-Fi；按下後會先自動備份目前設定，事後可以復原。'));
  watch(() => { const hs = val('text_sensor/History Status'), busy = RUNNING.includes(calPhase()) || hs === 'Applying' || hs === 'Undoing'; r1.querySelector('button').disabled = busy; r2.querySelector('button').disabled = busy; });
  return c;
}
// 3.6 基本模式的「裝置狀態」4 磚
function statusCard() {
  const c = card('裝置狀態'), g = h('div', 'dgrid');
  [['Wi-Fi 訊號', () => { const v = num('sensor/WiFi Signal'); return v === null ? '—' : `${v.toFixed(0)} dBm · ${signal(v)}`; }], ['IP 位址', () => val('text_sensor/IP Address') ?? '—'],
    ['自製韌體版本', () => val('text_sensor/Firmware Version') ?? '—'], ['運作時間', () => dur(num('sensor/Uptime') ?? NaN)]].forEach(([l, f]) => {
    const tl = h('div', 'dt'), v = h('b', 'v', '—'); tl.append(h('span', 'l', l), v); g.append(tl); watch(() => { v.textContent = f(); });
  });
  c.append(g); return c;
}
/* ============ 系統 ============ */
// 4.9 基本模式：裝置健康（韌體的 Low Memory、Config Check、PIR Mismatch Now、Radar Energy Spike Count）與版本落差提示
function healthCard() {
  const c = card('裝置健康'), st = h('div', 'calstat', '—'), g = h('div', 'dgrid'), hint = h('p', 'hint');
  const has = (id) => id in entities;
  const items = [
    ['記憶體', () => has('binary_sensor/Low Memory') ? (isOn('binary_sensor/Low Memory') ? ['偏低（可用不到 80 KB）', 1, '記憶體偏低通常是剛升級或連線的人太多，重新啟動會恢復。'] : ['充足', 0]) : null],
    ['設定自檢', () => { const v = val('text_sensor/Config Check'); if (v === undefined) return null; const n = +(String(v).match(/reset (\d+)/) || [])[1]; return v === 'ok' ? ['全部通過', 0] : [`開機時重設了 ${Number.isFinite(n) ? n : ''} 項`, 1, '開機時發現有設定超出範圍，已改回預設值；可到進階模式確認。']; }],
    ['雷達與紅外線', () => has('binary_sensor/PIR Mismatch Now') ? (isOn('binary_sensor/PIR Mismatch Now') ? ['現在不一致', 1, '雷達與紅外線的判斷不一致，其中一個可能被遮住，或對著風扇、冷氣。'] : ['一致', 0]) : null],
    ['雷達突波', () => { const n = num('sensor/Radar Energy Spike Count'); if (n === null) return null; const lg = num('sensor/Last Spike Gate'); return [`${Math.round(n)} 次${n > 0 && lg !== null ? `（最近一次第 ${Math.round(lg)} 格）` : ''}`, 0]; }],
  ].map(([l, f]) => { const d = h('div', 'dt'), v = h('b', 'v', '—'); d.append(h('span', 'l', l), v); g.append(d); return [d, v, f]; });
  c.append(st, g, hint);
  watch(() => {
    let bad = 0, tips = [], any = 0;
    items.forEach(([d, v, f]) => { const r = f(); d.hidden = !r; if (!r) return; any++; v.textContent = r[0]; d.classList.toggle('mut', !!r[1]); if (r[1]) { bad++; if (r[2]) tips.push(r[2]); } });
    c.hidden = !any;
    st.textContent = bad ? `有 ${bad} 項要留意` : '一切正常'; st.style.color = bad ? 'var(--amber)' : '';
    hint.textContent = tips.join(''); hint.hidden = !tips.length;
  });
  return c;
}
// 網頁比韌體新：韌體缺的功能列出來，說明升級後才會出現（不影響其他功能）
const FW_FEATS = [['裝置健康（記憶體、設定自檢）', 'binary_sensor/Low Memory'], ['校準階段與失敗原因', 'text_sensor/Calibration Phase'], ['進階參數', 'number/Residue Drop'], ['歷史最佳化進度', 'sensor/History Empty Hours']];
function versionCard() {
  const c = card('版本'), ban = h('div', 'banner'), g = h('div', 'dgrid'); ban.setAttribute('role', 'status');
  const mk = (l, f) => { const d = h('div', 'dt'), v = h('b', 'v', '—'); d.append(h('span', 'l', l), v); g.append(d); return [v, f]; };
  const vs = [mk('自製韌體', () => val('text_sensor/Firmware Version') ?? '—'), mk('網頁', () => WEB_VERSION)];
  c.append(ban, g);
  watch(() => {
    const fw = val('text_sensor/Firmware Version');
    const miss = fw === undefined ? [] : FW_FEATS.filter(([, id]) => !(id in entities)).map(([n]) => n);
    c.hidden = !miss.length;
    ban.textContent = `這台感應器的韌體是 ${fw}，比這個網頁舊：${miss.join('、')}要升級韌體後才會出現，現在不影響其他功能。`;
    vs.forEach(([v, f]) => { v.textContent = f(); });
  });
  return c;
}
const signal = (dbm) => dbm >= -60 ? '強' : dbm >= -75 ? '中' : '弱';
// 網路與診斷：分三組小磚，上面有篩選框（N5）；Radar MAC 沒有值是正常的，顯示灰色「未提供」
function sysCard() {
  const c = card('網路與診斷'), t = (id) => () => val(id) ?? '—';
  const tools = h('div', 'dtools'), count = h('span', 'sub'), fl = h('input', 'field'); fl.type = 'search'; fl.placeholder = '篩選：輸入 IP、MAC、雷達、記憶體…'; fl.setAttribute('aria-label', '篩選診斷項目'); tools.append(count, fl);
  const mac = (id) => () => { const v = val(id); return !v || /^[0:\-]+$/.test(String(v)) || /^(unknown|unavailable|none|n\/a|null)$/i.test(String(v).trim()) ? '未提供' : v; };
  const kb = (id) => () => { const v = num(id); return v === null ? '—' : (v / 1024).toFixed(1) + ' KB'; };
  const grid = h('div', 'dgrid'), heads = [];
  const G = [['連線', [['Wi-Fi 訊號', () => { const v = num('sensor/WiFi Signal'); return v === null ? '—' : `${v.toFixed(0)} dBm · ${v > -60 ? '強' : v > -75 ? '中' : '弱'}`; }], ['IP 位址', t('text_sensor/IP Address')], ['連線的 SSID', t('text_sensor/Connected SSID')], ['Wi-Fi MAC', t('text_sensor/WiFi MAC')], ['HA 連線', () => isOn('binary_sensor/API Connection') ? '已連線' : '未連線']]],
    ['韌體與雷達', [['自製韌體版本', t('text_sensor/Firmware Version')], ['網頁版本', () => WEB_VERSION], ['OTA 失敗自動退回', () => { const v = String(val('text_sensor/OTA Rollback') ?? ''); if (!v) return '—'; if (v === 'off') return '未啟用'; const m = v.match(/^on, ([^,]+)(?:, rolled back from (.+))?/); return m ? `開啟 · 目前 ${m[1]}${m[2] ? `（曾從 ${m[2]} 退回）` : ''}` : v; }], ['ESPHome 版本', () => String(val('text_sensor/ESPHome Version') ?? '—').split(' ')[0]], ['裝置資訊', t('text_sensor/Device Info'), true], ['雷達韌體', t('text_sensor/Radar Firmware')], ['雷達藍牙 MAC', mac('text_sensor/Radar MAC')], ['上次重開原因', t('text_sensor/Reset Reason')]]],
    ['資源與時間', [['晶片溫度', () => `${fx(num('sensor/Chip Temperature'), 1)} °C`], ['可用記憶體', kb('sensor/Heap Free')], ['最大記憶體區塊', kb('sensor/Heap Largest Block')], ['主迴圈耗時', () => `${fx(num('sensor/Loop Time'))} ms`], ['已運作', () => dur(num('sensor/Uptime') ?? NaN)], ['裝置時間', t('text_sensor/Device Time')],
      ['有人狀態最後變動', () => { const c = Date.parse(val('text_sensor/Presence Changed At') || ''); return Number.isFinite(c) ? mdhm(c) : '—'; }], ['目前狀態持續', () => { const c = Date.parse(val('text_sensor/Presence Changed At') || ''); return Number.isFinite(c) ? dur(Math.max(0, (Date.now() - c) / 1000)) : '—'; }]]]];
  const GA = ['var(--primary)', 'var(--teal)', '#e8789a'];
  G.forEach(([g, items], gi) => {
    const hd = h('div', 'dh', g); hd.dataset.n = items.length + ' 項'; hd.style.setProperty('--ga', GA[gi % 3]); grid.append(hd);
    const ts = items.map(([l, f, wide]) => {
      const tl = h('div', wide ? 'dt wide' : 'dt'), v = h('b', 'v', '—'); tl.style.setProperty('--ga', GA[gi % 3]); tl.append(h('span', 'l', l), v);
      watch(() => { const x = f(); v.textContent = x; tl.classList.toggle('mut', x === '未提供'); if (x === '未提供') tl.title = '雷達沒有回報這項（正常）'; });
      grid.append(tl); return tl;
    });
    heads.push([hd, ts]);
  });
  const total = heads.reduce((n, [, ts]) => n + ts.length, 0);
  const filt = () => { const q = fl.value.trim().toLowerCase(); let n = 0; heads.forEach(([hd, ts]) => { let k = 0; ts.forEach((tl) => { const ok = !q || tl.textContent.toLowerCase().includes(q); tl.hidden = !ok; if (ok) k++; }); hd.hidden = !k; n += k; }); count.textContent = q ? `符合 ${n} / ${total} 項` : `共 ${total} 項，依連線、韌體與雷達、資源與時間分組`; };
  fl.oninput = filt; watch(filt);
  c.append(tools, grid);
  return c;
}
function wifiForm() {
  const form = h('form'), pickW = h('select', 'field'), ssid = h('input', 'field'), pw = h('input', 'field');
  const go = h('button', 'btn primary'), hint = h('div', 'hint');
  const SCAN = 'text_sensor/WiFi Scan', CURRENT = 'text_sensor/Connected SSID';
  const current = () => val(CURRENT);
  const chosen = () => pickW.value || ssid.value;
  let picked = false, built = '';
  Object.assign(ssid, { type: 'text', maxLength: 32, placeholder: 'SSID', autocomplete: 'off' }); ssid.setAttribute('aria-label', 'Wi-Fi 名稱');
  Object.assign(pw, { type: 'password', required: true, maxLength: 64, placeholder: '密碼', autocomplete: 'new-password' }); pw.setAttribute('aria-label', 'Wi-Fi 密碼');
  pickW.setAttribute('aria-label', 'Wi-Fi 清單');
  const refresh = () => {
    const same = chosen() === current();
    ssid.hidden = !!pickW.value; ssid.required = !pickW.value;
    go.textContent = same ? '儲存新密碼' : '連線到新 Wi-Fi';
    hint.textContent = same
      ? '這是目前連線的 Wi-Fi：新密碼會先存進裝置，不會斷線，路由器改好密碼後裝置自動用新密碼連。'
      : '換到其他 Wi-Fi 時，連不上會在 30 秒後自動退回。要更新清單請重新啟動裝置。路由器已改密碼時裝置會離線，5 分鐘後開熱點，用手機連上重設。';
  };
  const fill = () => {
    const sig = `${val(SCAN)}|${current()}`;
    if (sig === built) return;
    built = sig;
    const keep = pickW.value, best = new Map();
    String(val(SCAN) || '').split('\n').forEach((line) => { const m = line.match(/^(.+): (-?\d+)dB$/); if (m && !(best.get(m[1]) >= +m[2])) best.set(m[1], +m[2]); });
    const options = [...best].sort((a, b) => b[1] - a[1]).map(([name, dbm]) => { const o = h('option', '', `${name} · ${dbm} dBm · ${signal(dbm)}${name === current() ? ' · 目前連線' : ''}`); o.value = name; return o; });
    const manual = h('option', '', '手動輸入 SSID'); manual.value = '';
    pickW.replaceChildren(...options, manual);
    pickW.value = picked ? keep : best.has(current()) ? current() : options[0]?.value ?? '';
    if (pickW.selectedIndex < 0) pickW.value = '';
    refresh();
  };
  pickW.onchange = () => { picked = true; refresh(); };
  ssid.oninput = refresh;
  watch(fill);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const name = chosen(), same = name === current();
    const ask = same
      ? `要把 ${name} 的新密碼存進裝置？這裡無法先測試：打錯時裝置會在下次斷線後連不上，5 分鐘後開熱點，用手機連上重設。存好請接著改路由器密碼。`
      : `要把裝置連到 ${name}？連上後 IP 可能改變，HA 也要在同一個網路才連得到。`;
    if (!confirm(ask)) return;
    await send('text/WiFi New SSID', `set?value=${encodeURIComponent(name)}`);
    await send(WIFI_PW, `set?value=${encodeURIComponent(pw.value)}`);
    await send('button/WiFi Apply', 'press');
    pw.value = '';
    hint.textContent = same ? '新密碼已存進裝置，請接著改路由器密碼。' : '已送出，約 30 秒內見分曉。頁面中斷時請到新網路找裝置；連不上會自動退回。';
  };
  form.append(pickW, ssid, pw, go, hint);
  return form;
}
function wifiCard() {
  const c = card('名稱與 Wi-Fi'), nr = row('裝置名稱', null, true), inp = h('input', 'field');
  Object.assign(inp, { type: 'text', maxLength: 40, placeholder: '例如：感應器 1' }); inp.setAttribute('aria-label', '裝置名稱');
  nr.append(inp, btn('儲存', null, null, () => { const t = inp.value.trim(); if (t) send(DEVICE_NAME, `set?value=${encodeURIComponent(t)}`); }));
  watch(() => { if (document.activeElement !== inp && val(DEVICE_NAME) != null) inp.value = val(DEVICE_NAME); });
  c.append(nr, wifiForm());
  return c;
}
let otaForm = null;
function maintCard() {
  const c = card('維護'), bs = h('div', 'btns');
  bs.append(
    btn('重新啟動', null, '裝置會重開約 10 秒，確定？', press('button/Restart')),
    A(btn('重新啟動雷達', null, '雷達模組會重開，確定？', press('button/Radar Restart'))),
    A(btn('雷達恢復出廠設定（只重設雷達模組）', 'danger', '只重設雷達模組：雷達內所有門檻與參數會清成出廠值，確定？', press('button/Radar Factory Reset'))));
  const f = h('form'), file = h('input'), up = h('button', 'btn', '上傳韌體');
  otaForm = f;
  f.method = 'POST'; f.action = '/update'; f.enctype = 'multipart/form-data';
  file.type = 'file'; file.name = 'update'; file.accept = '.bin'; file.setAttribute('aria-label', '韌體檔案');
  up.disabled = true; file.onchange = () => { up.disabled = !file.value; };
  f.onsubmit = (e) => { if (!confirm('上傳後裝置會重開，確定？')) e.preventDefault(); };
  f.append(file, up);
  const a = h('a', '', '切換到 ESPHome 原始介面'); a.href = '/?native';
  const ob = btn('重看調校精靈', null, null, () => onboarding(true));
  // 自動跳出開關（這個瀏覽器）：關掉後只能手動叫出；重新勾選＝還沒調校時下次開網頁會再跳一次
  const au = h('label', 'hint'), cb = h('input'); cb.type = 'checkbox'; cb.checked = !store.get(OB_OFF);
  cb.onchange = () => { store.set(OB_OFF, !cb.checked); if (cb.checked) store.set(OB_KEY, false); };
  au.append(cb, ' 感應器還沒調校時，開網頁自動跳出調校精靈（只影響這個瀏覽器）');
  c.append(bs, A(f), A(a), A(h('p', 'hint', '網址後面加 ?native 也可以回到原始介面（要連外網載入）。')), ob, au);
  return c;
}
let logBox = null;
function logCard() { logBox = h('pre', '', '目前沒有記錄（只在這一頁開著時才記，離開就停）'); return card('記錄', logBox); }

/* ============ 組頁 ============ */
/* ============ 3.5 調校精靈（七步；網址加 ?welcome 或系統頁按鈕可重看） ============ */
// OB_KEY＝精靈完整走完；OB_OFF＝按過略過／關閉（兩者任一為真就不再自動跳出，只剩手動入口）
const OB_KEY = 'presence-onboarded', OB_OFF = 'presence-wizard-auto-off', WZ_SUM = 'presence-wizard-summary', WZ_STEP = 'presence-wizard-step';
const isProduct = () => /^presence-[0-9a-f]{6}$/i.test(HOST);
// 步驟 3 規則表（切點 1.6／2.5 m 為暫定值，待實測回修）
function wzRule(d) {
  if (d > 6.75) return { res: 0.75, g: 8, lv: 'danger', t: '超出雷達最遠 6.75 m，請把感應器移到更靠近目標的位置。' };
  if (d <= 1.6) return { res: 0.2, g: Math.min(8, Math.floor(d / 0.2) + 1), lv: 'ok', t: '靜止偵測也能涵蓋。' };
  const g = Math.min(8, Math.floor(d / 0.75) + 1);
  if (d <= 2.5) return { res: 0.75, g, lv: 'warn', t: '0.2 m 最遠只到約 1.8 m，看不到目標；0.75 m 的 0～2.25 m 靜止偵測不可用，坐著不動可能被判無人。建議把感應器移近，或接受只偵測走動。' };
  return { res: 0.75, g, lv: 'ok', t: '目標都在靜止偵測可用的範圍內。' };
}
const wzParamsOk = () => {
  const m = num('number/Radar Max Move Gate'), s = num('number/Radar Max Still Gate');
  let sum = 0; for (let g = 0; g < GATES; g++) sum += (moveT(g) || 0) + (stillT(g) || 0);
  return !!m && !!s && sum > 0;
};
// 底噪判讀：底噪最大值＝校準後門檻 − 餘裕（門檻上限 100，所以 ≥ 90 視為接近飽和；切點為暫定值）
function wzNoise() {
  if (!calCompare || !calCompare.after) return null;
  const mg = num('number/Calibration Margin') ?? 0, a = calCompare.after;
  const mx = Array.from({ length: GATES }, (_, g) => Math.max((a.move[g] ?? 0) - mg, (a.still[g] ?? 0) - mg));
  const sat = mx.filter((v) => v >= 90).length, avg = mx.reduce((p, v) => p + v, 0) / GATES, top = Math.max(...mx);
  return { sat, avg, top, lv: sat >= 3 ? 'sat' : (sat >= 1 || avg >= 50) ? 'high' : 'ok' };
}
function onboarding(force) {
  if (!force && store.get(OB_KEY)) return;
  const ov = h('div', 'ob'), box = h('section', 'card obox wz'); ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', '調校精靈');
  let mk = null, tickFn = null, timer = 0;
  const S = { d: 1.5, rule: null, walk: [null, null, null], calWas: false, attempts: 0, probeAt: 0, calMsg: null, saved: false };
  const close = (done) => { clearInterval(timer); store.set(done ? OB_KEY : OB_OFF, true); store.set(WZ_STEP, null); ov.remove(); if (mk) mk.restore(); };
  const NAMES = ['取名', '擺放', '偵測範圍', '參數讀回檢查', '空房校準', '走位驗證', '完成摘要'];
  let k = Math.min(6, Math.max(0, (+store.get(WZ_STEP) || 1) - 1));
  const head = h('div', 'wzhd'), title = h('h2', 'cap'), skip = h('button', 'btn', '略過'), prog = h('div', 'wzpg'), body = h('div', 'blk wzbd'), foot = h('div', 'btns wzft');
  skip.type = 'button'; skip.onclick = () => close(false);
  head.append(title, skip);
  const bn = (cls, t) => { const b = h('div', 'banner' + (cls === 'danger' ? ' danger' : cls === 'info' ? ' info' : '')); b.append(h('span', '', t)); return b; };
  const B = (label, cls, fn) => { const b = h('button', 'btn ' + (cls || ''), label); b.type = 'button'; b.onclick = fn; return b; };
  const goto = (n) => { k = n; store.set(WZ_STEP, k + 1); draw(); };
  const next = () => goto(Math.min(6, k + 1)), prev = () => goto(Math.max(0, k - 1));
  const nav = (nextLabel, nextOk, nextFn) => { const p = B('上一步', '', prev); p.disabled = k === 0; const n = B(nextLabel, 'primary', nextFn || next); n.disabled = nextOk === false; foot.replaceChildren(p, n); return n; };

  const steps = [
    // 1 取名
    () => {
      const f = h('form'), i = h('input', 'field'), b = h('button', 'btn primary', '儲存名稱');
      i.type = 'text'; i.maxLength = 40; i.placeholder = '例如：感應器 1'; i.value = val(DEVICE_NAME) || ''; i.setAttribute('aria-label', '裝置名稱');
      f.onsubmit = async (e) => { e.preventDefault(); const v = i.value.trim(); if (v) await send(DEVICE_NAME, `set?value=${encodeURIComponent(v)}`); next(); };
      f.append(i, b); nav('下一步');
      return [h('p', 'hint', '名稱會顯示在這個網頁的標題，也會給 Home Assistant 用。建議寫位置。空白可以直接按「下一步」跳過。'), f];
    },
    // 2 擺放
    () => {
      const ol = h('ol', 'steps-list');
      ['用捲尺量出感應器到你要偵測的位置有幾公尺，下一步會用到。', '高度約 1～1.5 公尺，正面朝向你最常坐或站的位置。', '前方不要正對電扇、窗簾、晃動的植物或冷氣出風口，這些會被當成有人。', '避開金屬物與牆角正後方；感應器背面不要貼著會震動的東西。', '放好之後再往下做，位置換了也要重做。'].forEach((t) => ol.append(h('li', '', t)));
      nav('放好了');
      return [ol];
    },
    // 3 偵測範圍
    () => {
      const q = h('p', '', '你要偵測的位置，離感應器最遠是幾公尺？'), row = h('div', 'wzrow'), sl = h('input'), nb = h('input', 'field'), bar = h('div', 'wzrange'), cov = h('p', 'hint'), msg = h('div'), opt = h('p', 'hint');
      sl.type = 'range'; sl.min = '0.5'; sl.max = '7'; sl.step = '0.1'; sl.setAttribute('aria-label', '最遠偵測距離（公尺）');
      nb.type = 'number'; nb.min = '0.5'; nb.max = '7'; nb.step = '0.1'; nb.setAttribute('aria-label', '最遠偵測距離（公尺）'); nb.style.width = '84px';
      row.append(sl, nb, h('span', 'hint', '公尺'));
      const ign = h('input', 'field'); ign.type = 'number'; ign.min = '0'; ign.max = '7'; ign.step = '0.1'; ign.placeholder = '—'; ign.style.width = '72px'; ign.setAttribute('aria-label', '不想被偵測的位置（公尺）');
      opt.append('選填：有不想被偵測的地方嗎（走道、樓梯）？離感應器 ', ign, ' 公尺');
      const ignMsg = h('div');
      const apply = nav('套用建議並下一步', true, async () => {
        const r = S.rule; if (!r || r.lv === 'danger' || !(S.d >= 0.5)) return;
        apply.disabled = true;
        await batch('套用偵測範圍', [['select/Radar Distance Resolution', `set?option=${r.res === 0.2 ? '0.2m' : '0.75m'}`], ['number/Radar Max Move Gate', `set?value=${r.g}`], ['number/Radar Max Still Gate', `set?value=${r.g}`]]);
        apply.disabled = false; next();
      });
      const upd = (v, from) => {
        S.d = Math.round(v * 10) / 10; if (from !== sl) sl.value = S.d; if (from !== nb) nb.value = S.d;
        const r = S.rule = wzRule(S.d); apply.disabled = !(S.d >= 0.5) || r.lv === 'danger';
        const reach = (r.g + 1) * r.res, tg = Math.floor(S.d / r.res);
        bar.replaceChildren(...Array.from({ length: 9 }, (_, i) => h('i', i === tg && i <= r.g ? 't' : i <= r.g ? 'a' : '')));
        cov.textContent = `涵蓋約 ${reach.toFixed(1)} m（第 0～${r.g} 格，每格 ${r.res} m）；黃色那格是你的目標所在。`;
        msg.replaceChildren(bn(r.lv === 'danger' ? 'danger' : r.lv === 'warn' ? '' : 'info', `建議：解析度 ${r.res} m／最遠格數 ${r.g}。${r.t}`));
        const x = parseFloat(ign.value); ignMsg.replaceChildren();
        if (x > 0 && x <= S.d) ignMsg.append(bn('', '這個位置在你要偵測的範圍裡面，單靠距離排除不了。請之後到進階「區域與延時」用忽略格處理。'));
      };
      sl.oninput = () => upd(+sl.value, sl); nb.oninput = () => { const v = parseFloat(nb.value); if (v >= 0.5 && v <= 7) upd(v, nb); };
      ign.oninput = () => upd(S.d, ign);
      upd(S.d);
      return [q, row, bar, cov, msg, opt, ignMsg];
    },
    // 4 參數讀回檢查
    () => {
      const st = h('div', 'calstat', '讀取中…'), info = h('div', 'blk'), act = h('div', 'btns');
      const nx = nav('下一步', false);
      const probe = () => { S.probeAt = Date.now(); press('button/Radar Query Params')(); };
      if (!wzParamsOk() && !S.attempts) { S.attempts = 1; probe(); }
      const retry = B('再試一次', '', () => { S.attempts = 1; probe(); });
      const rs = B('重新啟動雷達', '', () => { if (confirm('雷達模組會重開，約 10 秒。確定？')) { press('button/Radar Restart')(); S.attempts = 0; S.probeAt = Date.now() + 10000; } });
      act.append(retry, rs);
      tickFn = () => {
        const ok = wzParamsOk();
        if (ok) { st.textContent = '已讀回'; st.className = 'calstat'; nx.disabled = false; act.hidden = true; S.attempts = 0;
          info.replaceChildren(h('p', 'hint', `解析度 ${val('select/Radar Distance Resolution') || '—'}；最遠移動格 ${num('number/Radar Max Move Gate')}、最遠靜止格 ${num('number/Radar Max Still Gate')}；各格門檻已讀到。`)); return; }
        nx.disabled = true;
        if (S.attempts >= 1 && S.attempts <= 3 && Date.now() - S.probeAt > 3500 && Date.now() > S.probeAt) { S.attempts++; if (S.attempts <= 3) probe(); }
        if (S.attempts > 3) { st.textContent = '沒有讀回來'; st.className = 'calstat warn'; act.hidden = false;
          info.replaceChildren(bn('danger', '雷達的設定沒有讀回來（最大格數或門檻全是 0）。常見原因：剛開機、雷達沒穩定。按「再試一次」；仍不行請重新啟動雷達或把感應器斷電再上電；還是不行可能是雷達硬體問題，不要繼續校準。')); }
        else { st.textContent = `讀取中…（第 ${Math.max(1, S.attempts)}／3 次）`; act.hidden = true; info.replaceChildren(h('p', 'hint', '正在向雷達讀取設定，最多重試 3 次。')); }
      };
      tickFn();
      return [st, info, act];
    },
    // 5 空房校準
    () => {
      const p = h('p', '', '按下開始後請離開房間並保持淨空，這段時間約 2～3 分鐘，結束前不要回來。'), tw = h('label', 'hint'), cb = h('input'), st = h('div', 'calstat', '—'), pr = h('div', 'prog'), pf = h('i'), res5 = h('div'), act = h('div', 'btns');
      cb.type = 'checkbox'; cb.checked = isOn('switch/Calibration Two Point'); cb.onchange = () => send('switch/Calibration Two Point', cb.checked ? 'turn_on' : 'turn_off');
      tw.append(cb, ' 加做第二點：回到目標位置坐著不動'); pr.append(pf);
      const nx = nav('下一步', false);
      const go = B('開始校準', 'primary', () => { if (!confirm('開始前請先離開房間並保持淨空。校準會依序：等你離開 → 空房取樣' + (cb.checked ? ' → 請你回到目標位置坐著不動' : '') + ' → 寫入門檻。確定開始？')) return; S.calWas = false; S.calMsg = null; press('button/Auto Calibrate')(); });
      const cancel = B('取消校準', '', press('button/Cancel Calibration'));
      act.append(go, cancel);
      const PHN = { wait: '請離開房間，即將開始', sample: '取樣中，請保持房間淨空', sit: '請回到目標位置坐著不動', write: '正在寫入門檻' };
      tickFn = () => {
        const ph = calPhase(), run = RUNNING.includes(ph), nz = wzNoise();
        if (run) S.calWas = true;
        go.disabled = run || !wzParamsOk(); cancel.hidden = !run; cb.disabled = run; nx.disabled = true;
        const endMs = Date.parse(val(CAL_ENDS) || ''), tot = num('sensor/Calibration Total Seconds');
        pf.style.width = run && endMs && tot ? Math.min(100, Math.max(0, (1 - (endMs - Date.now()) / 1000 / tot) * 100)) + '%' : (ph === 'done' && S.calWas ? '100%' : '0%');
        if (run) { st.textContent = PHN[ph] || '校準中…'; st.className = 'calstat'; res5.replaceChildren(); return; }
        const f = calFail();
        if (S.calWas && f) { st.textContent = '校準沒有完成'; st.className = 'calstat warn'; res5.replaceChildren(bn(CAL_FAIL_TXT[f][1] ? 'danger' : '', CAL_FAIL_TXT[f][0])); return; }
        if (S.calWas && ph === 'done' && nz) {
          nx.disabled = false; st.textContent = nz.lv === 'ok' ? '底噪正常' : nz.lv === 'high' ? '底噪偏高' : '底噪接近飽和'; st.className = 'calstat' + (nz.lv === 'ok' ? '' : ' warn');
          const msg = nz.lv === 'sat' ? `${nz.sat} 格的底噪接近 100（飽和）。這不太像電扇或冷氣造成的，可能是供電不穩、擺放位置，或雷達硬體問題。建議：換一個電源再校準／把感應器移到別的位置再試／仍飽和請換一顆。`
            : nz.lv === 'high' ? '底噪偏高。請確認前方沒有電扇、冷氣出風口、晃動的窗簾後重做一次。' : `底噪最大值 ${Math.round(nz.top)}，平均 ${Math.round(nz.avg)}，門檻已依此寫入。`;
          res5.replaceChildren(bn(nz.lv === 'sat' ? 'danger' : nz.lv === 'high' ? '' : 'info', msg), ...(nz.lv === 'ok' ? [] : [h('p', 'hint', '要忽略這個判讀繼續，直接按「下一步」。')]));
          nx.onclick = () => { if (nz.lv === 'sat' && !confirm('底噪接近飽和，雷達可能有問題。確定要忽略並繼續？')) return; next(); };
          S.noise = nz; return;
        }
        st.textContent = wzParamsOk() ? '準備好了' : '雷達參數還沒讀回'; st.className = 'calstat'; res5.replaceChildren();
        nx.disabled = false; nx.onclick = () => { if (!calCompare && !confirm('這顆還沒校準過，直接往下可能有人卻顯示無人。確定跳過校準？')) return; next(); };
        res5.replaceChildren(h('p', 'hint', calCompare ? '之前已校準過；要重做請按「開始校準」，或直接按「下一步」。' : '還沒校準過。建議先校準；真的要跳過可以按「下一步」。'));
      };
      tickFn();
      return [p, tw, st, pr, res5, act];
    },
    // 6 走位驗證
    () => {
      const live = h('div', 'wzlive'), big = h('span', 'calstat', '—'), sub = h('span', 'hint'), list = h('div', 'wzwalk');
      live.append(big, sub); nav('下一步');
      const T = [
        { n: 'A　坐在目標位置', say: '請坐到你要偵測的位置，坐著不動。先等 5 秒入座，再量 15 秒。', prep: 5, win: 15, pass: (c, w) => c >= 12 },
        { n: 'B　走道經過', say: '請在走道走動經過，量 15 秒。', prep: 0, win: 15, pass: (c) => c >= 1 },
        { n: 'C　範圍外', say: '請站到你不想被偵測的位置，站著不動。先等 5 秒，再量 20 秒。', prep: 5, win: 20, pass: (c) => c === 0 },
      ];
      S.walk = S.walk.map((w) => (w && w.s === 'run' ? { s: 'idle' } : w));
      const draw3 = () => {
        list.replaceChildren(...T.map((t, i) => {
          const w = S.walk[i] || { s: 'idle' }, r = h('div', 'wzitem'), l = h('div'), a = h('div', 'btns');
          l.append(h('b', '', t.n), h('div', 'hint', t.say));
          if (w.s === 'run') l.append(h('div', 'hint', w.prep > 0 ? `請就位…還有 ${w.prep} 秒開始量` : `量測中…剩 ${w.win} 秒（有人 ${w.c} 次取樣）`));
          if (w.s === 'pass') l.append(bn('info', '通過'));
          if (w.s === 'skip') l.append(h('div', 'hint', '已略過'));
          if (w.s === 'fail') {
            const adv = [];
            if (i === 2) { adv.push(['最遠格數減 1', () => { const g = Math.max(2, (num('number/Radar Max Move Gate') || 8) - 1); batch('縮小範圍', [['number/Radar Max Move Gate', `set?value=${g}`], ['number/Radar Max Still Gate', `set?value=${g}`]]); }]); }
            else { adv.push(['最遠格數加 1', () => { const g = Math.min(8, (num('number/Radar Max Move Gate') || 8) + 1); batch('加大範圍', [['number/Radar Max Move Gate', `set?value=${g}`], ['number/Radar Max Still Gate', `set?value=${g}`]]); }]);
              if (i === 0) adv.push(['該格靜止門檻 −5', () => { const g = Math.min(8, Math.floor(S.d / res())); const v = Math.max(0, (stillT(g) ?? 5) - 5); send(`number/Gate ${g} Still Threshold`, `set?value=${v}`); }]); }
            const why = i === 0 && S.d > 1.6 && S.d <= 2.5 ? '目標在 1.6～2.5 m：靜止偵測可能不可用，建議把感應器移近，或接受只偵測走動。'
              : i === 1 ? '連走動都測不到，請回步驟 3 檢查最遠格數。' : i === 2 ? '範圍外也被偵測到。縮小格數，或之後用忽略格（進階）排除。' : '目標位置偵測不到。加大格數或調低門檻後重測。';
            l.append(bn('', '沒通過。' + why)); adv.forEach(([lb, fn]) => a.append(B(lb, '', fn)));
          }
          if (w.s !== 'run') { a.append(B(w.s === 'idle' ? '開始這一步' : '重測', w.s === 'idle' ? 'primary' : '', () => start(i))); if (w.s !== 'skip' && w.s !== 'pass') a.append(B('略過這項', '', () => { S.walk[i] = { s: 'skip' }; draw3(); })); }
          r.append(l, a); return r;
        }));
      };
      const start = (i) => { const t = T[i]; S.walk[i] = { s: 'run', prep: t.prep, win: t.win, c: 0, ticks: 0 }; draw3(); };
      let sub2 = 0;
      tickFn = () => {
        const on = isOn(PRES); big.textContent = on ? '有人' : '無人'; big.className = 'calstat' + (on ? '' : ' warn');
        sub.textContent = `最大格 ${num('number/Radar Max Move Gate') ?? '—'}；移動距離 ${fx(num('sensor/Radar Moving Distance'), 0)} cm，靜止距離 ${fx(num('sensor/Radar Still Distance'), 0)} cm`;
        sub2++;
        S.walk.forEach((w, i) => {
          if (!w || w.s !== 'run') return;
          if (sub2 % 2) return;
          if (w.prep > 0) w.prep--; else { w.win--; if (on) w.c++; if (w.win <= 0) { w.s = T[i].pass(w.c) ? 'pass' : 'fail'; } }
          draw3();
        });
      };
      draw3(); tickFn();
      return [live, list];
    },
    // 7 完成摘要
    () => {
      const nz = S.noise || wzNoise(), wl = S.walk.map((w, i) => ['坐著', '走道', '範圍外'][i] + ' ' + (!w || w.s === 'idle' || w.s === 'skip' || w.s === 'run' ? '略過' : w.s === 'pass' ? '✓' : '✗')).join('／');
      const g = num('number/Radar Max Move Gate'), r = res();
      const sum = { 名稱: val(DEVICE_NAME) || HOST, 目標距離: S.d.toFixed(1) + ' m', '解析度／最遠格數': `${r} m／${g ?? '—'} 格（約 ${g != null ? ((g + 1) * r).toFixed(1) : '—'} m）`, 底噪判讀: nz ? (nz.lv === 'ok' ? '正常' : nz.lv === 'high' ? '偏高' : '接近飽和') + `（最大值 ${Math.round(nz.top)}）` : '未校準', 校準時間: (() => { const t = Date.parse(val(CAL_FIN) || ''); return t ? mdhm(t) : '—'; })(), 走位驗證: wl };
      if (!S.saved) { S.saved = true; store.set(WZ_SUM, { ...sum, 日期: new Date().toISOString() }); }
      const t = h('table', 'wztab'); Object.entries(sum).forEach(([a, b]) => { const tr = h('tr'); tr.append(h('td', 'hint', a), h('td', '', b)); t.append(tr); });
      foot.replaceChildren(B('上一步', '', prev), B('完成', 'primary', () => close(true)));
      return [h('div', 'calstat', '調校完成'), t, h('p', 'hint', '感應器移位置、或前方擺設大改，請重新做一次調校。')];
    },
  ];
  function draw() {
    tickFn = null; clearInterval(timer);
    title.textContent = `${k + 1} / 7 · ${NAMES[k]}`;
    prog.replaceChildren(...NAMES.map((_, i) => h('i', i <= k ? 'd' : '')));
    body.replaceChildren(...steps[k]());
    if (tickFn) timer = setInterval(() => { if (ov.isConnected && tickFn) tickFn(); }, 500);
    if (mk) mk.focus(); body.scrollTop = 0;
  }
  box.append(head, prog, body, foot, h('p', 'hint', '按「略過」或關閉後，不會再自動跳出；隨時可從總覽的橫幅、校準頁或系統頁的「調校精靈」重新開啟。')); ov.append(box); document.body.append(ov); mk = modalKeys(ov, () => close(false)); draw();
}
// 入口：總覽橫幅（沒調校過或參數讀不到）與校準頁按鈕
function wizardBtnCard() { const c = h('section', 'card'), r = h('div', 'banner info'); r.append(h('span', '', '不確定怎麼調？調校精靈會一步一步帶你：偵測範圍、參數檢查、空房校準、走位驗證。'), btn('調校精靈', 'primary', null, () => onboarding(true))); c.append(r); return c; }
function wizardNotice() {
  const c = h('section', 'card'), ban = h('div', 'banner'), t = h('span', '', '這顆感應器還沒調校，可能有人卻顯示無人（偵測範圍沒依你的位置設定）。');
  ban.append(t, btn('開始調校', 'primary', null, () => onboarding(true))); c.append(ban);
  watch(() => { c.hidden = !wzNeeded(); });
  return c;
}
// 這顆感應器是否還需要調校（橫幅與自動跳出共用）
// 「校準完成時間」重開機會清空，所以另看裝置上會保留的 Calibration Done 旗標（舊韌體沒有這個實體就只看完成時間）
function wzNeeded() { return !!(entities[PRES] && (!calCompare || !wzParamsOk()) && !val(CAL_FIN) && !isOn(CAL_DONE)); }
// 自動跳出：只在「沒走完也沒按過略過、而且這顆還沒調校」時跳一次；已調校過的感應器永遠不會自動跳
function wzAutoStart() {
  if (location.search.includes('welcome')) { onboarding(true); return; }
  if (store.get(OB_KEY) || store.get(OB_OFF)) return;
  let tries = 0, t0 = 0;
  const iv = setInterval(() => {
    if (++tries > 30) { clearInterval(iv); return; }
    if (conn !== 'live' || !entities[PRES]) return;
    if (!t0) t0 = Date.now();
    if (Date.now() - t0 < 3000) return; // 等初始狀態到齊，免得已校準的裝置被誤判成沒校準
    clearInterval(iv);
    if (wzNeeded() && !document.querySelector('.ob')) onboarding(true);
  }, 1000);
}
const ICON = {
  overview: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12l6-6"/></svg>',
  detect: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>',
  lights: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
  system: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>',
};
const TABS = [['overview', '總覽'], ['detect', '偵測調教'], ['lights', '燈光聲音'], ['system', '系統']];
const SUBS = [['live', '即時調教'], ['cal', '校準與備份'], ['zone', '區域與延時'], ['param', '進階參數']];
// 12 欄對齊格線：每一列的卡片欄寬加起來＝12；手機單欄直排
const grid = (...kids) => { const d = h('div', 'grid'); d.append(...kids); return d; };
const span = (n, el) => { el.classList.add('s' + n); return el; };
const BUILD = {
  overview: () => grid(span(12, wizardNotice()), span(12, histNotice()), span(12, radarCard()), A(span(12, timelineCard())), span(5, signalsCard()), span(7, activityCard()), span(12, envCard()),
    span(12, moreCard('最近 60 秒的距離時間軸。'))),
  detect_live: () => grid(span(12, spectrumCard()), span(7, gateEditor()), span(5, presetCard()), span(7, heatCard()),
    span(5, qualityCard()), span(7, seriesCard()), span(5, trigCard()), span(12, histBrief())),
  // 4.0 校準與備份：照使用順序——① 校準 ② 歷史建議 ③ 看結果 ④ 備份；進階參數搬到自己的子分頁
  detect_cal: () => { const cc = calCard(), hd = (t) => A(span(12, h('h3', 'sechd', t))); return grid(hd('① 校準'), Bs(5, span(12, wizardBtnCard())), Bs(6, span(7, cc.main)), A(span(5, cc.params)), hd('② 歷史建議'), Bs(6, span(12, histCard())), hd('③ 看結果'), A(span(12, noiseCard())), A(span(12, cc.cmp)), hd('④ 備份與還原'), A(span(12, backupCard())),
    span(12, moreCard('即時調教（各格能量、單格門檻、情境預設、熱圖、診斷、觸發日誌、工程模式）、區域與智慧延時、偵測參數、進階參數、校準參數、雷達原廠校準、歷史學習開關與門檻對照、各格底噪統計、校準前後對照、設定備份與還原。'))); },
  detect_zone: () => grid(span(7, zoneCard()), span(5, smartCard()), span(12, tuneCard())),
  detect_param: () => grid(span(12, paramCard())),
  lights: () => { const [snd, tone] = soundCard(), led = ledCard(); led.classList.add('lt-led'); snd.classList.add('lt-snd'); tone.classList.add('lt-tone'); return grid(led, snd, tone, span(12, moreCard('單顆燈珠與效果、自訂旋律。'))); },
  system: () => grid(B(span(12, healthCard())), B(span(12, versionCard())), B(span(12, statusCard())), A(span(12, sysCard())), span(6, wifiCard()), span(6, maintCard()), A(span(6, fwCard())), A(span(6, logCard())), A(span(6, advancedCard())), Bs(12, span(6, restoreCard())),
    span(12, moreCard('完整網路與診斷、重新啟動雷達、雷達恢復出廠（只重設雷達模組）、上傳韌體、ESPHome 原始介面、雷達韌體升級說明、記錄、雷達藍牙。'))),
};

let source = null, hideTimer = 0, ui = {};
// live 已連線｜reconnect 重連中（含第一次載入）｜內容變淡、暫不可操作
function setConn(c) {
  conn = c;
  if (!ui.lConn) return;
  ui.lConn.className = 'lv ' + (c === 'live' ? 'ok' : 'warnc');
  ui.lConn.textContent = c === 'live' ? '已連線' : '重連中…';
  ui.banner.hidden = c === 'live';
  ui.content.classList.toggle('re', c !== 'live');
}
// 工程模式：進入即時調教頁自動開（每次進入只開一次，手動關掉就不再開）；只有這個頁面開的才由頁面負責關；
// 離開即時調教頁、分頁藏起來、關閉頁面都關。校準進行中不碰（校準自己管工程模式）
let engByPage = false, engAsked = false;
function engAutoLive() {
  if (route.tab !== 'detect' || route.sub !== 'live' || document.hidden || conn !== 'live') { engAsked = false; return; }
  if (engAsked || !entities[ENG] || RUNNING.includes(calPhase())) return;
  engAsked = true;
  if (!isOn(ENG)) { engByPage = true; send(ENG, 'turn_on'); }
}
function toggleEng() { if (isOn(ENG)) { engByPage = false; send(ENG, 'turn_off'); } else { engByPage = true; send(ENG, 'turn_on'); } }
function engOffIfMine(direct) {
  if (!engByPage || !isOn(ENG)) return;
  engByPage = false;
  if (RUNNING.includes(calPhase())) return;
  if (direct) rawSend(ENG, 'turn_off', true).catch(() => {}); else send(ENG, 'turn_off');
}

function connect() {
  if (source) return;
  setConn('reconnect');
  const s = source = new EventSource('/events');
  s.onopen = () => { if (source === s) { setConn('live'); schedule(); } };
  s.onerror = () => { if (source === s) setConn('reconnect'); };
  s.addEventListener('ping', (e) => {
    if (!e.data) return;
    const ping = JSON.parse(e.data);
    if (ping.ota === false && otaForm) otaForm.hidden = true;
  });
  s.addEventListener('state', (e) => {
    const data = JSON.parse(e.data), before = entities[data.id]?.value;
    entities[data.id] = { ...entities[data.id], ...data };
    if (data.id === CAL) trackCalibration();
    if (data.id === PRES && before === false && data.value === true) day.trig++;
    if (data.id === PRES && typeof before === 'boolean' && typeof data.value === 'boolean' && before !== data.value) flipTrack(data.value);
    schedule();
  });
  // 日誌串流事件裝置一直會送（同一條 /events），這裡只在「系統」分頁開著時處理
  s.addEventListener('log', (e) => {
    if (document.hidden || route.tab !== 'system' || !logBox) return;
    logLines.push(e.data.replace(/\x1b\[[0-9;]*m/g, ''));
    if (logLines.length > 30) logLines.shift();
    logBox.textContent = logLines.join('\n');
  });
}
function disconnect() { if (source) { source.close(); source = null; } }
const logLines = [];

function start() {
  if (!document.documentElement.lang) document.documentElement.lang = 'zh-Hant-TW';  // 4.7 螢幕閱讀器與瀏覽器翻譯提示靠它判斷語言
  const viewport = h('meta'); viewport.name = 'viewport'; viewport.content = 'width=device-width, initial-scale=1';
  document.head.append(viewport, h('style', '', CSS));
  const stage = h('div', 'stage'), frame = h('div', 'frame'), shell = h('div', 'shell');
  const title = h('h1', '', '人體感應器'), who = h('p', 'who'), brand = h('div', 'brand'); brand.append(title, who);
  const live = h('div', 'hright'), lState = h('span', 'lv state'), lDist = h('span', 'lv'), lTemp = h('span', 'lv'); live.append(lState, lDist, lTemp);
  const lConn = h('span', 'lv warnc', '重連中…');
  const tseg = h('span', 'seg tseg'); tseg.setAttribute('role', 'group'); tseg.setAttribute('aria-label', '主題：跟隨系統、日間、夜間');
  const setTheme = (k, save) => {
    if (k === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = k;
    [...tseg.children].forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.t === k)));
    if (save) store.set(THEME_KEY, k);
  };
  Object.entries(TI).forEach(([k, [n, svg]]) => { const b = h('button'); b.type = 'button'; b.dataset.t = k; b.title = n; b.setAttribute('aria-label', n); b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + svg + '</svg>'; b.onclick = () => setTheme(k, true); tseg.append(b); });
  const savedTheme = store.get(THEME_KEY); setTheme(savedTheme in TI ? savedTheme : 'auto');
  const mseg = h('span', 'seg mseg'); mseg.setAttribute('role', 'group'); mseg.setAttribute('aria-label', '基本或進階模式');
  [['basic', '基本'], ['adv', '進階']].forEach(([k, l]) => { const b = h('button', '', l); b.type = 'button'; b.dataset.m = k; b.onclick = () => { setMode(k, true); window.dispatchEvent(new Event('modechange')); }; mseg.append(b); });
  const savedMode = store.get(MODE_KEY); setMode(savedMode === 'basic' || savedMode === 'adv' ? savedMode : (isProduct() ? 'basic' : 'adv'));
  const hright = h('div', 'hright'); hright.append(live, lConn, mseg, tseg);
  const hdr = h('div', 'hdr'), brk = h('span', 'brk'); hdr.append(brand, hright, brk);
  const nav = h('nav', 'nav'); nav.setAttribute('aria-label', '分頁');
  const bar = h('div', 'bar'); bar.append(hdr, nav);
  const content = h('div', 'content'), themeFoot = h('div', 'themefoot'); content.setAttribute('role', 'main'); themeFoot.append(h('span', 'hint', '外觀'));
  const banner = h('div', 'banner flt', '與裝置的即時連線中斷，正在重連…畫面暫停更新，重連成功前先不要操作。分頁在背景或螢幕鎖定時，網頁會主動關閉即時連線，回到前景才重連。'); banner.hidden = true; banner.setAttribute('role', 'status');
  ui = { lConn, banner, content };
  // 標題列常駐狀態（N1）：有人／無人、距離、溫度、連線
  watch(() => {
    const name = val(DEVICE_NAME) || '人體感應器', present = isOn(PRES), cal = RUNNING.includes(calPhase()) || facCal();
    title.textContent = name; document.title = name;
    who.textContent = `${HOST} · 韌體 ${val('text_sensor/Firmware Version') ?? '—'} · 網頁 ${WEB_VERSION} · ESPHome ${String(val('text_sensor/ESPHome Version') ?? '—').split(' ')[0]} · 雷達 ${val('text_sensor/Radar Firmware') ?? '—'} · 已運作 ${dur(num('sensor/Uptime') ?? NaN)}`;
    lState.classList.toggle('on', present && !cal); lState.textContent = cal ? '校準中' : present ? '有人' : '無人';
    const dd = num('sensor/Radar Detection Distance'), tt = num('sensor/Temperature');
    lDist.textContent = (dd > 0 ? Math.round(dd) : '—') + ' cm'; lTemp.textContent = (tt === null ? '—' : tt.toFixed(1)) + ' °C';
  });
  // 裝置重開機（刷過新韌體）：已開著的頁面還是舊的程式碼，偵測到已運作時間變小就自動重新載入，才會拿到新版
  let lastUp = null;
  watch(() => { const u = num('sensor/Uptime'); if (u === null) return; if (lastUp !== null && u < lastUp - 5) { location.reload(); return; } lastUp = u; });
  const panes = {}, subGrids = {};
  const dsub = A(h('div', 'seg subnav')); dsub.setAttribute('role', 'group'); dsub.setAttribute('aria-label', '偵測調教子分頁');
  SUBS.forEach(([k, l]) => { const b = h('button', '', l); b.type = 'button'; b.dataset.sub = k; b.onclick = () => show('detect', k); dsub.append(b); });
  // 方案 B：有新的建議門檻時，「校準與備份」子分頁上加琥珀小點
  const hdot = h('span', 'dot'); hdot.setAttribute('aria-hidden', 'true'); hdot.hidden = true;
  dsub.querySelector('[data-sub=cal]').append(hdot);
  watch(() => { hdot.hidden = !histNew(); });
  TABS.forEach(([k, l]) => {
    const p = h('div', 'pane'); p.id = 'pane-' + k; content.append(p);
    if (k === 'detect') {
      const dwrap = h('div', 'dwrap'); dwrap.append(dsub);
      SUBS.forEach(([sk]) => { building = 'detect_' + sk; const g = BUILD['detect_' + sk](); subGrids[sk] = g; dwrap.append(g); });
      p.append(dwrap); panes[k] = p;
    } else { building = k; p.append(BUILD[k]()); panes[k] = p; }
    const b = h('button'); b.type = 'button'; b.dataset.tab = k; b.innerHTML = ICON[k] + '<span>' + l + '</span>'; b.onclick = () => show(k); nav.append(b);
  });
  building = 'global';
  const rb = h('div', 'banner danger flt'); rb.hidden = true; rb.setAttribute('role', 'status');
  const rbt = h('span'); rb.append(rbt);
  watch(() => {
    const down = val('binary_sensor/Radar Link') !== undefined && !isOn('binary_sensor/Radar Link');
    rb.hidden = !down;
    if (down) rbt.textContent = `雷達沒有回應，下面的有人／距離／能量都不是即時資料；裝置正在自動重啟雷達（累計斷線 ${num('sensor/Radar Link Drops') ?? '—'} 次）。持續出現請檢查雷達排線與供電。`;
  });
  document.body.append(rb, banner);  // 放在 body（.frame 有 container-type，裡面的 fixed 會相對它而不是視窗）
  building = 'global';
  content.append(themeFoot); shell.append(bar, content); frame.append(shell); stage.append(frame); document.body.append(stage);
  function show(k, sub) {
    const wasLive = route.tab === 'detect' && route.sub === 'live';
    route.tab = k; if (sub) route.sub = sub;
    if (mode === 'basic' && k === 'detect') route.sub = 'cal';
    if (wasLive && !(route.tab === 'detect' && route.sub === 'live')) engOffIfMine();
    nav.querySelectorAll('button').forEach((b) => { if (b.dataset.tab === k) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    dsub.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sub === route.sub)));
    Object.entries(panes).forEach(([key, p]) => { p.hidden = key !== k; });
    Object.entries(subGrids).forEach(([key, g]) => { g.hidden = key !== route.sub; });
    try { history.replaceState(null, '', '#' + k + (k === 'detect' ? '/' + route.sub : '')); } catch (e) { /* 不影響功能 */ }
    window.scrollTo(0, 0);
    paint();
  }
  // 桌機：分頁列在標題列下方（單欄式）；手機：下方懸浮膠囊（placeNav）
  const placeNav = () => {
    const wide = frame.getBoundingClientRect().width >= 720;
    if (wide && nav.parentNode !== bar) { nav.classList.remove('dock'); bar.append(nav); }
    if (!wide && nav.parentNode !== shell) { nav.classList.add('dock'); shell.append(nav); }
    if (wide && tseg.parentNode !== hright) hright.append(tseg);
    if (!wide && tseg.parentNode !== themeFoot) themeFoot.append(tseg);
  };
  new ResizeObserver(placeNav).observe(frame); placeNav();
  const fromHash = () => { const [k, s2] = location.hash.slice(1).split('/'); return Object.prototype.hasOwnProperty.call(panes, k) ? [k, SUBS.some(([x]) => x === s2) ? s2 : 'live'] : null; };
  const h0 = fromHash(); show(h0 ? h0[0] : 'overview', h0 ? h0[1] : 'live');
  window.addEventListener('hashchange', () => { const x = fromHash(); if (x) show(x[0], x[1]); });
  // 分頁藏起來：先把自己開的工程模式關掉，超過 HIDE_MS 再關即時連線；回前景重連（重連會重送完整狀態）
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { engOffIfMine(true); hideTimer = setTimeout(disconnect, HIDE_MS); }
    else { clearTimeout(hideTimer); connect(); paint(); }
  });
  window.addEventListener('pagehide', () => engOffIfMine(true));
  // 3.6：切換模式時更新按鈕、「偵測調教」在基本模式叫「校準」，並回到合法的子分頁
  const onMode = () => {
    [...mseg.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === mode)));
    const tb = nav.querySelector('[data-tab=detect] span'); if (tb) tb.textContent = mode === 'basic' ? '校準' : '偵測調教';
    show(route.tab, route.sub);
  };
  window.addEventListener('modechange', onMode); onMode();
  wzAutoStart();
  setInterval(recordSlot, 2000);
  setInterval(() => { if (!document.hidden && conn === 'live') recordTl(); }, 1000);
  let tk = 0;
  setInterval(() => {
    engAutoLive();
    if (document.hidden || conn !== 'live') return;
    tk++; tickDay(); sampleSeries(); if (tk % 2 === 0) pushHeat();
    schedule();
  }, 1000);
  connect();
}

if (location.search.includes('native')) {
  const script = h('script');
  script.src = 'https://oi.esphome.io/v3/www.js';
  document.body.append(script);
} else {
  // 4.4 省重畫：每 0.2 秒各卡片會重寫文字，內容沒變時瀏覽器也會當成一次 DOM 變動（重新排版、耗電）。
  // 這裡讓「文字和現在一樣」的 textContent 寫入直接略過；只影響本頁（原廠介面 ?native 不走這裡）。
  const tcd = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
  if (tcd && tcd.set && tcd.configurable) {
    Object.defineProperty(Node.prototype, 'textContent', { ...tcd, set(v) {
      if (this.nodeType === 1) {
        const s = v == null ? '' : String(v), n = this.firstChild;
        if (s === '' ? !n : (n && !n.nextSibling && n.nodeType === 3 && n.data === s)) return;
      }
      tcd.set.call(this, v);
    } });
  }
  start();
}
