// 「選設備」畫面與各設備的產品介紹（純字串產生，沒有 DOM 操作、沒有外部資源；有 node 測試）。
// 只有「人體感應器」有韌體可刷，也只有它的卡片與介紹頁有可進入刷機流程的按鈕（data-act="choose-sensor"）；
// 其餘三類（紅外線遙控器、藍牙代理、ESP8266 紅外線收發器）一律是「即將推出／規劃中」：沒有刷入入口、主按鈕停用。
// 簡圖是手繪風格的內嵌 SVG，網頁畫面示意是 CSS 繪製的假資料，不放真截圖。文字一律中英成對。

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** 中英成對（一般 HTML）。 */
const L = (zh, en) => `<span class="l zh">${esc(zh)}</span><span class="l en">${esc(en)}</span>`;
/** 中英成對（SVG 文字用 tspan）。 */
const LT = (zh, en) => `<tspan class="l zh">${esc(zh)}</tspan><tspan class="l en">${esc(en)}</tspan>`;
/** 中英成對的屬性值（aria-label 等）。 */
const A = (zh, en) => esc(`${zh} / ${en}`);
const B = (p) => L(p[0], p[1]);

const ICON = {
  usb: '<path d="M12 3v13"/><circle cx="12" cy="19" r="2"/><path d="M12 8l4 2v3M12 11l-4-2"/><circle cx="8" cy="8.6" r="1"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
const ic = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICON[n] || ''}</svg>`;

// ===================== 手繪簡圖（位置與外形皆為示意） =====================
const ART = {
  presence: () => `
  <svg class="draw" viewBox="0 0 270 200" role="img" aria-label="${A('人體感應器手繪簡圖：ESP32-C3 搭配 LD2410 毫米波雷達板的小方盒', 'Hand-drawn sketch of the presence sensor: a small box holding an ESP32-C3 board and an LD2410 mmWave radar board')}">
    <g class="ink" filter="url(#rough)">
      <rect x="46" y="30" width="158" height="128" rx="16"/>
      <rect class="dash" x="60" y="44" width="130" height="56" rx="6"/>
      <rect class="dash" x="60" y="108" width="74" height="40" rx="6"/>
      <path class="thin" d="M70 54h70M70 62h54M70 70h62"/>
      <circle class="thin" cx="168" cy="72" r="14"/><circle class="thin solid" cx="168" cy="72" r="3.5"/>
      <rect x="108" y="154" width="34" height="9" rx="4.5"/>
      <path class="wave" d="M214 56q16 16 0 32"/><path class="wave" d="M224 48q24 24 0 48"/><path class="wave" d="M234 40q32 32 0 64"/>
    </g>
    <text class="calm" x="97" y="131" text-anchor="middle">ESP32-C3</text>
    <text class="calm" x="125" y="40" text-anchor="middle">HLK-LD2410B</text>
    <path class="lead" d="M232 108v8"/><text class="cal" x="232" y="128" text-anchor="middle">${LT('雷達感應面', 'Radar side')}</text>
    <path class="lead" d="M125 163v14"/><text class="cal" x="125" y="193" text-anchor="middle">${LT('USB-C 孔：刷機、供電', 'USB-C port: flash and power')}</text>
    <text class="cal" x="14" y="22">${LT('內部（虛線）：兩塊板', 'Inside (dashed): two boards')}</text>
  </svg>`,
  nanoc6: () => `
  <svg class="draw" viewBox="0 0 220 150" role="img" aria-label="${A('NanoC6 手繪簡圖：細長小板，一端 USB-C，另一側紅外線發射', 'Hand-drawn sketch of NanoC6: a slim small board, USB-C at one end, IR emitter on the other side')}">
    <g class="ink" filter="url(#rough)">
      <rect x="36" y="48" width="148" height="58" rx="10"/>
      <rect x="26" y="68" width="14" height="18" rx="3"/>
      <rect class="thin" x="76" y="62" width="56" height="30" rx="4"/>
      <circle cx="150" cy="77" r="5"/><circle class="thin solid" cx="150" cy="77" r="1.8"/>
      <circle class="thin" cx="56" cy="77" r="4"/>
      <path class="ray" d="M190 66l12-6M192 77h14M190 88l12 6"/>
    </g>
    <text class="calm" x="104" y="80" text-anchor="middle">ESP32-C6</text>
    <path class="lead" d="M33 90v22"/><text class="cal" x="14" y="128">USB-C</text>
    <path class="lead" d="M200 96v16"/><text class="cal" x="206" y="128" text-anchor="end">${LT('紅外線發射（示意）', 'IR emitter (approx.)')}</text>
    <text class="cal" x="56" y="40" text-anchor="middle">${LT('狀態燈', 'LED')}</text><path class="lead" d="M56 43v26"/>
  </svg>`,
  atoms3: () => squareIr('AtomS3 Lite', 'ESP32-S3'),
  atomlite: () => squareIr('Atom Lite', 'ESP32'),
  btatoms3: () => squareBt('AtomS3 Lite', 'ESP32-S3'),
  btatomlite: () => squareBt('Atom Lite', 'ESP32'),
  ir8266: () => `
  <svg class="draw" viewBox="0 0 240 160" role="img" aria-label="${A('ESP8266 紅外線收發板手繪簡圖：一塊小板，一側有紅外線發射，旁邊有紅外線接收頭', 'Hand-drawn sketch of an ESP8266 IR transceiver: a small board with an IR emitter and, next to it, an IR receiver')}">
    <g class="ink" filter="url(#rough)">
      <rect x="40" y="46" width="160" height="80" rx="10"/>
      <rect class="thin" x="90" y="70" width="60" height="34" rx="4"/>
      <circle cx="68" cy="46" r="6"/><circle class="thin solid" cx="68" cy="46" r="2"/>
      <path class="ray" d="M58 38l-7-8M68 36V24M78 38l7-8"/>
      <path d="M164 46a10 10 0 0 1 20 0z"/>
      <path class="dash" d="M174 22v10M168 26l6 7 6-7"/>
      <circle class="thin" cx="64" cy="104" r="4"/><circle class="thin" cx="176" cy="104" r="6"/>
    </g>
    <text class="calm" x="120" y="91" text-anchor="middle">ESP8266</text>
    <text class="cal" x="68" y="16" text-anchor="middle">${LT('紅外線發射', 'IR emitter')}</text>
    <text class="cal" x="176" y="16" text-anchor="middle">${LT('紅外線接收', 'IR receiver')}</text>
    <text class="cal" x="120" y="154" text-anchor="middle">${LT('通用板示意，位置以實物為準', 'generic board sketch; positions follow the real board')}</text>
  </svg>`,
};
function squareIr(label, chip) {
  return `
  <svg class="draw" viewBox="0 0 220 170" role="img" aria-label="${A(`${label} 手繪簡圖：方形小板，底邊 USB-C，頂邊紅外線發射`, `Hand-drawn sketch of ${label}: a square small board, USB-C on the bottom edge, IR emitter on the top edge`)}">
    <g class="ink" filter="url(#rough)">
      <rect x="64" y="30" width="92" height="106" rx="12"/>
      <rect class="thin" x="82" y="56" width="56" height="56" rx="8"/>
      <circle class="thin solid" cx="110" cy="84" r="3"/>
      <circle cx="110" cy="40" r="4.5"/><circle class="thin solid" cx="110" cy="40" r="1.6"/>
      <path class="ray" d="M99 30l-6-9M110 28V16M121 30l6-9"/>
      <rect x="93" y="134" width="34" height="9" rx="4.5"/>
    </g>
    <text class="calm" x="110" y="126" text-anchor="middle">${chip}</text>
    <path class="lead" d="M127 34h30"/><text class="cal" x="158" y="30">${LT('紅外線發射', 'IR emitter')}</text>
    <path class="lead" d="M110 143v10"/><text class="cal" x="110" y="164" text-anchor="middle">USB-C</text>
  </svg>`;
}
function squareBt(label, chip) {
  return `
  <svg class="draw" viewBox="0 0 220 170" role="img" aria-label="${A(`${label} 藍牙代理手繪簡圖：方形小板，上方是藍牙訊號，底邊 USB-C`, `Hand-drawn sketch of ${label} as a Bluetooth proxy: a square small board with Bluetooth signal above it, USB-C on the bottom edge`)}">
    <g class="ink" filter="url(#rough)">
      <rect x="64" y="44" width="92" height="100" rx="12"/>
      <rect class="thin" x="82" y="66" width="56" height="56" rx="8"/>
      <circle class="thin solid" cx="110" cy="94" r="3"/>
      <path class="wave" d="M101 12l18 14-9 6V4l9 6-18 14"/>
      <path class="wave" d="M90 10q-9 9 0 18M82 6q-14 13 0 26M130 10q9 9 0 18M138 6q14 13 0 26"/>
      <rect x="93" y="142" width="34" height="9" rx="4.5"/>
    </g>
    <text class="calm" x="110" y="136" text-anchor="middle">${chip}</text>
    <path class="lead" d="M146 20h12"/><text class="cal" x="160" y="24">${LT('藍牙（示意）', 'Bluetooth (approx.)')}</text>
    <path class="lead" d="M110 152v6"/><text class="cal" x="110" y="168" text-anchor="middle">USB-C</text>
  </svg>`;
}
export const ART_IDS = Object.keys(ART);

// ===================== 網頁畫面示意（CSS 繪製，假資料；不是真截圖） =====================
const WF = {
  sensor: () => `
  <div class="wf" role="img" aria-label="${A('人體感應器設備網頁示意圖（假資料）', 'Sketch of the sensor’s own web page (fake data)')}">
    <div class="bar"><i></i><i></i><i></i><span class="url">http://sensor.example/</span></div>
    <div class="in">
      <div class="row"><span class="nm">Presence Sensor</span></div>
      <div class="row"><span class="pill w">${L('有人', 'Occupied')}</span><span class="pill">212 cm</span><span class="pill">25.8 °C</span><span class="pill g">${L('已連線', 'Online')}</span></div>
      <div class="tabs"><span class="on">${L('總覽', 'Overview')}</span><span>${L('校準', 'Calibrate')}</span><span>${L('燈光聲音', 'Light & sound')}</span><span>${L('系統', 'System')}</span></div>
      <div class="radar"><svg viewBox="0 0 200 108" aria-hidden="true">
        <path class="ar" d="M67.2 77A40 40 0 0 1 132.8 77"/><path class="ar" d="M42.7 59.8A70 70 0 0 1 157.3 59.8"/><path class="ar" d="M22.2 45.5A95 95 0 0 1 177.8 45.5"/>
        <path class="ar" d="M100 100L22.2 45.5M100 100L177.8 45.5"/>
        <circle class="tg" cx="111" cy="39" r="5"/><text x="118" y="38">212 cm</text><text x="4" y="106">0 m</text><text x="170" y="106">6 m</text></svg></div>
      <div class="row"><div class="tile"><small>${L('狀態', 'State')}</small><b>${L('靜止', 'Still')}</b></div><div class="tile"><small>${L('無人逾時', 'Empty delay')}</small><b>30 s</b></div></div>
    </div></div>`,
  wizard: () => `
  <div class="wf" role="img" aria-label="${A('第一次使用引導示意圖（假資料）', 'Sketch of the first-run guide (fake data)')}">
    <div class="bar"><i></i><i></i><i></i><span class="url">http://sensor.example/?welcome</span></div>
    <div class="in">
      <div class="nm">${L('第一次使用引導', 'First-run guide')}</div>
      <div class="stepb"><span class="d">1 ${L('名稱', 'Name')}</span><span class="c">2 ${L('擺放位置', 'Placement')}</span><span>3 ${L('偵測範圍', 'Range')}</span><span>4 ${L('校準與走位', 'Calibrate & walk-test')}</span></div>
      <p class="hint">${L('說明這台感應器放在哪裡、朝哪個方向。（示意文字）', 'Tell the sensor where it sits and which way it faces. (sample text)')}</p>
      <div class="fld">${L('例：靠牆、離地 1.2 公尺', 'e.g. on a wall, 1.2 m high')}</div>
      <div class="row"><span class="mini-btn p">${L('下一步', 'Next')}</span></div>
    </div></div>`,
  flasher: () => {
    const p = (n, t, inner) => `<div><div class="n">${n}</div><div class="wf"><div class="in">${inner}</div></div><div class="sub" style="margin-top:6px">${t}</div></div>`;
    return `<div class="story" role="img" aria-label="${A('選好設備之後，刷機頁四個步驟示意圖', 'Sketch of the four flasher-page steps after choosing a device')}">
      ${p('02', L('連接：USB 線接電腦，按一個大按鈕選序列埠', 'Connect: plug in USB, press one big button to pick the serial port'), `<div class="row"><span class="pill g">ESP32-C3 ✓</span></div><div class="mini-btn p" style="margin-top:auto">${L('選擇序列埠並連接', 'Pick port and connect')}</div>`)}
      ${p('03', L('選擇操作：備份（選用）、更新、還原', 'Choose: backup (optional), update, restore'), `<div class="opr"><b>${L('備份', 'Backup')}</b><span class="mini-btn r">·</span></div><div class="opr"><b>${L('更新', 'Update')}</b><span class="mini-btn w">·</span></div><div class="opr"><b>${L('還原', 'Restore')}</b><span class="mini-btn d">·</span></div>`)}
      ${p('04', L('確認：一個畫面、一個勾選', 'Confirm: one screen, one checkbox'), `<div class="row"><span class="cb k"></span><span style="font-size:11px">${L('我了解寫入期間不能拔線', 'I understand: do not unplug while writing')}</span></div><div class="mini-btn d" style="margin-top:auto">${L('覆寫並開始更新', 'Overwrite and start')}</div>`)}
      ${p('05', L('執行：進度與驗證，完成後設備自己重新啟動', 'Run: progress and verification, then the device restarts itself'), `<div class="prog"><i></i></div><div class="row"><span class="pill g">MD5 ✓</span><span class="pill">62%</span></div>`)}
    </div>`;
  },
  btflow: () => `
  <div class="flow" role="img" aria-label="${A('藍牙代理運作概念圖（規劃中，不是實際畫面）', 'Conceptual flow of the Bluetooth proxy (planned, not a real screen)')}">
    <svg viewBox="0 0 520 90" aria-hidden="true">
      <rect class="bx" x="8" y="22" width="116" height="46" rx="8"/><text class="tx" x="66" y="50" text-anchor="middle">${LT('附近的藍牙裝置', 'Nearby BT devices')}</text>
      <rect class="bx" x="202" y="22" width="116" height="46" rx="8"/><text class="tx" x="260" y="50" text-anchor="middle">${LT('藍牙代理板', 'BT proxy board')}</text>
      <rect class="bx" x="396" y="22" width="116" height="46" rx="8"/><text class="tx" x="454" y="50" text-anchor="middle">Home Assistant</text>
      <path class="ar" d="M124 45H202"/><path class="ar" d="M318 45H396"/>
      <text class="tm" x="163" y="38" text-anchor="middle">${LT('1 廣播', '1 adverts')}</text><text class="tm" x="357" y="38" text-anchor="middle">${LT('2 經 Wi-Fi', '2 via Wi-Fi')}</text>
    </svg></div>`,
  irflow: () => `
  <div class="flow" role="img" aria-label="${A('紅外線遙控器運作概念圖（規劃中，不是實際畫面）', 'Conceptual flow of the IR remote (planned, not a real screen)')}">
    <svg viewBox="0 0 520 170" aria-hidden="true">
      <rect class="bx" x="8" y="14" width="112" height="46" rx="8"/><text class="tx" x="64" y="42" text-anchor="middle">Home Assistant</text>
      <rect class="bx" x="204" y="14" width="112" height="46" rx="8"/><text class="tx" x="260" y="42" text-anchor="middle">${LT('紅外線遙控器板', 'IR remote board')}</text>
      <rect class="bx" x="400" y="14" width="112" height="46" rx="8"/><text class="tx" x="456" y="42" text-anchor="middle">${LT('電視、冷氣…', 'TV, A/C…')}</text>
      <path class="ar" d="M120 37H204"/><path class="ar" d="M316 37H400"/>
      <text class="tm" x="162" y="30" text-anchor="middle">${LT('1 送出脈衝', '1 raw pulses')}</text><text class="tm" x="358" y="30" text-anchor="middle">${LT('2 發射紅外線', '2 IR out')}</text>
      <rect class="bx" x="8" y="110" width="112" height="46" rx="8"/><text class="tx" x="64" y="138" text-anchor="middle">${LT('實體遙控器', 'Physical remote')}</text>
      <path class="ar" d="M120 133H204"/><path class="ar" d="M260 110V60"/>
      <text class="tm" x="162" y="126" text-anchor="middle">${LT('3 按鍵學碼', '3 learn a key')}</text><text class="tm" x="266" y="92">${LT('存進 HA', 'stored in HA')}</text>
    </svg></div>`,
};

// ===================== 設備資料 =====================
const PRESENCE = {
  id: 'presence', name: ['人體感應器', 'Presence sensor'], chip: 'ESP32-C3 + HLK-LD2410B',
  lead: ['給 ESP32-C3 搭 HLK-LD2410B 毫米波雷達的感應器用的韌體。', 'Firmware for sensors built on an ESP32-C3 and an HLK-LD2410B mmWave radar.'],
  bens: [
    ['刷完自己設定 Wi-Fi，韌體裡沒有任何人的帳密或金鑰', 'Set up your own Wi-Fi after flashing; no one’s credentials or keys are inside'],
    ['內建網頁（繁體中文）：看有人／無人、距離，並有第一次使用引導', 'Built-in web page (Traditional Chinese): occupancy, distance, plus a first-run guide'],
    ['一鍵底噪校準，並可依歷史資料建議門檻', 'One-tap noise-floor calibration, plus thresholds suggested from history'],
    ['雷達可調項都是 Home Assistant 實體；雷達斷線會自動恢復', 'Every radar setting is a Home Assistant entity; radar link loss recovers automatically'],
  ],
  feats: [
    [['刷完用手機連備援熱點設定 Wi-Fi', 'Set up Wi-Fi from your phone through the fallback hotspot'], ['還沒設定 Wi-Fi 時，裝置開機會自己開一個備援熱點；用手機或電腦連上它，依畫面輸入家裡的 Wi-Fi 名稱與密碼。這個刷機頁本身不設定 Wi-Fi。', 'With no Wi-Fi set, the device opens a fallback hotspot at boot; join it from a phone or computer and enter your home Wi-Fi name and password on the page that appears. This flasher page does not set up Wi-Fi itself.']],
    [['沒有別人的帳密與金鑰', 'No one else’s credentials or keys'], ['韌體與原始碼都不含 Wi-Fi 帳密、API 加密金鑰、OTA 密碼；每台自己設定。', 'Neither the firmware nor its source contains Wi-Fi credentials, API encryption keys or OTA passwords; each unit is set up by its owner.']],
    [['內建網頁介面（繁體中文）', 'Built-in web page (Traditional Chinese)'], ['即時有人／無人、距離、溫度與雷達圖；基本與進階兩種模式；也有燈光聲音與系統頁。網頁只有中文（網址加 ?native 可改看 ESPHome 原始介面）。', 'Live occupancy, distance, temperature and a radar chart; basic and advanced modes; plus light/sound and system pages. The page is Chinese only (add ?native to the address to see the original ESPHome interface).']],
    [['第一次使用引導（調校精靈）', 'First-run guide (tuning wizard)'], ['依序設定名稱、擺放位置、偵測範圍，並做校準與走位驗證。', 'Walks you through name, placement, detection range, then calibration and a walk test.']],
    [['一鍵底噪校準', 'One-tap noise-floor calibration'], ['空房取樣各格能量，把最大值加餘裕寫回門檻；可選「坐回平常位置」的第二點；也保留雷達原廠校準。', 'Samples each gate’s energy in an empty room and writes the maximum plus a margin back as thresholds; an optional second point with you sitting where you usually do; the radar’s factory calibration is kept too.']],
    [['歷史學習建議門檻', 'History-based threshold suggestions'], ['工程模式開著時記錄各格能量，定期算出建議門檻；可套用、可復原，也可設為自動套用。', 'While engineering mode is on it records per-gate energy and periodically suggests thresholds; apply, undo, or set to auto-apply.']],
    [['有人狀態與智慧延時', 'Occupancy states and smart delay'], ['分成 Empty／Entering／Moving／Still／Leaving 五種狀態，各自有不同逾時，並說明「為什麼判定有人」。', 'Five states (Empty / Entering / Moving / Still / Leaving), each with its own timeout, plus a reason for why it says occupied.']],
    [['雷達斷線偵測與自動恢復', 'Radar link watchdog and auto-recovery'], ['一段時間收不到雷達資料就判定斷線並自動重啟雷達；開機與恢復後會自動重讀雷達參數。', 'If no radar data arrives for a while the link is flagged down and the radar restarted; parameters are re-read after boot and after recovery.']],
    [['雷達可調項都是 Home Assistant 實體', 'Radar settings are Home Assistant entities'], ['各格能量與門檻、無人逾時、最遠距離格、解析度、區域 1／2 起訖格等；API 加密金鑰可在 HA 連上後自行產生。', 'Per-gate energy and thresholds, empty timeout, farthest gate, resolution, zone 1/2 ranges and more; the API encryption key can be generated once Home Assistant has connected.']],
    [['原始碼公開（GPL-3.0）', 'Open source (GPL-3.0)'], ['可以自己看、自己改、自己編譯出同樣功能的韌體。', 'You can read it, change it and build the same firmware yourself.']],
  ],
  know: [
    ['首次設定請在你信任的網路上做：預設沒有 OTA 密碼，API 先接受明文，直到 Home Assistant 連上並產生加密金鑰。', 'Do the first setup on a network you trust: by default there is no OTA password and the API accepts plain text until Home Assistant connects and creates an encryption key.'],
    ['時區預設為台北，要換成別的時區得自己編譯。', 'The time zone defaults to Taipei; changing it means building the firmware yourself.'],
    ['韌體的腳位照原廠感應器板設定；自己組裝的板子，腳位不同就不一定能用。', 'The firmware’s pin assignments follow the original sensor board; a self-built board with different pins may not work.'],
    ['已在一台真機上用命令列工具驗證：更新（保留設定）、全部擦除後刷入、用刷前備份還原都通過（不是經由這個網頁）。', 'Verified on one real unit with a command-line tool: update (keeping settings), erase-and-flash, and restoring from a pre-flash backup all passed (not through this web page).'],
  ],
};
const IRSETUP = [['刷完自己配網、接 Home Assistant', 'Set up Wi-Fi yourself, connect to Home Assistant'], ['不含任何人的私人設定與金鑰；刷好後由你自己設定網路並加入 Home Assistant。', 'No one’s private settings or keys inside; after flashing you set up the network and add it to Home Assistant yourself.']];
const IRPULSE = [['Home Assistant 送出原始脈衝', 'Home Assistant sends raw pulses'], ['由 Home Assistant 送出紅外線的原始脈衝資料，板子照著發射。', 'Home Assistant sends raw infrared pulse data and the board emits it as is.']];
const NOFW = ['目前還沒有韌體，也沒有實測，沒有預計開放時間；上面所有項目都是方向，不是已完成的功能。', 'There is no firmware yet and nothing has been tested; there is no release date. Everything above is a direction, not a finished feature.'];
const NOFW_PUBLIC = ['目前沒有公開版韌體，也沒有實測，沒有預計開放時間；上面所有項目都是方向，不是已完成的功能。', 'There is no public firmware yet and nothing has been tested; there is no release date. Everything above is a direction, not a finished feature.'];
const SOON = {
  ir: {
    id: 'ir', flow: 'irflow', status: 'soon', cnt: ['三種板子', '3 boards'], boardsTitle: ['三塊板子', 'The three boards'],
    boardsNote: ['功能相同，只差板型。簡圖是示意，外形、USB 孔與紅外線發射位置以實物為準。', 'Same features, different boards. The sketches are approximate; shapes and the USB and IR emitter positions follow the real boards.'],
    name: ['紅外線遙控器', 'IR remote'],
    lead: ['讓 Home Assistant 用一塊小板子控制電視、冷氣等紅外線家電。', 'Lets Home Assistant control TVs, air conditioners and other infrared appliances through a small board.'],
    boards: [['nanoc6', 'M5 NanoC6', 'ESP32-C6'], ['atoms3', 'M5 AtomS3 Lite', 'ESP32-S3'], ['atomlite', 'M5 Atom Lite', 'ESP32']],
    bens: [
      ['刷完自己配網、接上 Home Assistant（規劃中）', 'Set up Wi-Fi yourself and connect to Home Assistant (planned)'],
      ['Home Assistant 送出原始紅外線脈衝，由板子發射（規劃中）', 'Home Assistant sends raw infrared pulses and the board emits them (planned)'],
      ['用你原本的實體遙控器對它按鍵，學下按鍵碼（規劃中；需要紅外線接收，硬體確認中）', 'Press keys on your existing remote to teach the board their codes (planned; needs infrared reception, hardware being confirmed)'],
    ],
    feats: [
      [IRSETUP[0], IRSETUP[1], null],
      [IRPULSE[0], IRPULSE[1], null],
      [['用實體遙控器學碼', 'Learn codes from your physical remote'], ['對板子按下原本遙控器的按鍵，把按鍵碼學下來。', 'Press a key on your existing remote at the board to learn its code.'], ['需要紅外線接收（硬體確認中）。', 'Needs infrared reception (hardware being confirmed).']],
    ],
    know: [
      NOFW,
      ['三塊板子外形相近（AtomS3 Lite 與 Atom Lite 尤其像）：規劃日後支援時，刷機頁連接後會用晶片辨識是哪一款（現在還不支援）。', 'The three boards look alike (AtomS3 Lite and Atom Lite especially): once supported, the flasher is planned to tell them apart by chip after connecting (not supported yet).'],
    ],
  },
  bt: {
    id: 'bt', flow: 'btflow', status: 'soon', cnt: ['兩種板子', '2 boards'], boardsTitle: ['兩塊板子', 'The two boards'],
    boardsNote: ['功能相同，只差板型。簡圖是示意；藍牙是板子內建的無線電，沒有固定位置。', 'Same features, different boards. The sketches are approximate; Bluetooth is a built-in radio with no fixed spot on the board.'],
    name: ['藍牙代理', 'Bluetooth proxy'],
    lead: ['讓 Home Assistant 透過一塊小板子收到附近的藍牙裝置訊號，延伸藍牙的覆蓋範圍。', 'Lets Home Assistant receive signals from nearby Bluetooth devices through a small board, extending its Bluetooth coverage.'],
    boards: [['btatoms3', 'M5 AtomS3 Lite', 'ESP32-S3'], ['btatomlite', 'M5 Atom Lite', 'ESP32']],
    bens: [
      ['刷完自己配網、接上 Home Assistant（規劃中）', 'Set up Wi-Fi yourself and connect to Home Assistant (planned)'],
      ['把附近藍牙裝置的廣播轉給 Home Assistant（規劃中）', 'Relays nearby Bluetooth devices’ broadcasts to Home Assistant (planned)'],
    ],
    feats: [
      [IRSETUP[0], IRSETUP[1], null],
      [['轉送藍牙廣播', 'Relay Bluetooth broadcasts'], ['板子收下附近藍牙裝置的廣播，轉給 Home Assistant，讓離主機太遠的藍牙裝置也看得到。', 'The board picks up nearby Bluetooth devices’ broadcasts and passes them to Home Assistant, so devices too far from the host can still be seen.'], ['具體功能範圍（有沒有設備網頁、要不要主動連線等）還沒決定。', 'The exact scope (a device page, active connections, …) has not been decided yet.']],
    ],
    know: [
      NOFW_PUBLIC,
      ['兩塊板子外形相近：規劃日後支援時，刷機頁連接後會用晶片辨識是哪一款（現在還不支援）。', 'The two boards look alike: once supported, the flasher is planned to tell them apart by chip after connecting (not supported yet).'],
    ],
  },
  ir8266: {
    id: 'ir8266', flow: 'irflow', status: 'plan', cnt: ['一種通用板', '1 generic board'], boardsTitle: ['板子', 'The board'],
    boardsNote: ['板上同時有紅外線發射與接收頭。簡圖是通用示意，不是特定品牌；位置以實物為準。', 'The board has both an infrared emitter and a receiver. The sketch is a generic illustration, not a specific brand; positions follow the real board.'],
    name: ['ESP8266 紅外線收發器', 'ESP8266 IR transceiver'],
    lead: ['用板上的紅外線發射與接收頭，讓 Home Assistant 控制紅外線家電，也能用實體遙控器學碼。', 'Uses the board’s infrared emitter and receiver so Home Assistant can control infrared appliances, and you can teach codes from a physical remote.'],
    boards: [['ir8266', 'ESP8266', ['紅外線收發板', 'IR transceiver']]],
    bens: [
      ['刷完自己配網、接上 Home Assistant（規劃中）', 'Set up Wi-Fi yourself and connect to Home Assistant (planned)'],
      ['Home Assistant 送出原始紅外線脈衝，由板子發射（規劃中）', 'Home Assistant sends raw infrared pulses and the board emits them (planned)'],
      ['用你原本的實體遙控器對板上接收頭按鍵，學下按鍵碼（規劃中）', 'Press keys on your existing remote at the board’s receiver to teach it their codes (planned)'],
    ],
    feats: [
      [IRSETUP[0], IRSETUP[1], null],
      [IRPULSE[0], IRPULSE[1], null],
      [['用實體遙控器學碼', 'Learn codes from your physical remote'], ['對板上的接收頭按下原本遙控器的按鍵，把按鍵碼學下來。', 'Press a key on your existing remote at the board’s receiver to learn its code.'], ['板上有接收頭，預期學碼不需另外接零件（規劃中，尚未實測）。', 'The board has a receiver, so learning is expected to need no extra part (planned, untested).']],
    ],
    know: [
      NOFW_PUBLIC,
      ['ESP8266 的刷機方式與 ESP32 不同，連接流程可能要另外設計；這張卡先只放介紹。', 'ESP8266 is flashed differently from ESP32, so the connect flow may need its own design; this card only introduces it for now.'],
    ],
  },
};
/** 卡片順序（只有第一張有韌體可刷）。 */
export const DEVICE_ORDER = ['presence', 'ir', 'bt', 'ir8266'];
export const DEVICE_IDS = DEVICE_ORDER;
/** 唯一可進入刷機流程的設備。 */
export const FLASHABLE_ID = 'presence';

// ===================== 元件 =====================
const benList = (arr, icon = 'check') => `<ul class="bens">${arr.map((b) => `<li>${ic(icon)}<span>${B(b)}</span></li>`).join('')}</ul>`;
const boardTile = (id, n, c) => `<div class="bt">${ART[id]()}<b>${esc(n)}</b><span class="chip">${Array.isArray(c) ? B(c) : esc(c)}</span></div>`;
const planTag = () => `<span class="src plan">${L('規劃中', 'Planned')}</span>`;
const chooseBtn = () => `<button type="button" class="btn btn-primary" data-act="choose-sensor">${ic('usb')}${L('選這個設備並連接', 'Choose this device and connect')}</button>`;
const lockedBtn = () => `<button type="button" class="btn btn-primary" disabled aria-disabled="true">${ic('lock')}${L('韌體尚未開放', 'Firmware not released yet')}</button>`;

function versionChips(ver) {
  return `<span class="chip mono">${esc(PRESENCE.chip)}</span>${ver ? `<span class="chip mono">${L('最新', 'Latest')} ${esc(ver)}</span>` : ''}`;
}
function cardPresence(ver) {
  return `
  <article class="pcard" aria-labelledby="t-presence" data-device="presence" data-flashable="true">
    <div class="art"><span class="badge tag ok">${ic('check')}${L('可以刷', 'Available')}</span>${ART.presence()}<span class="cap">${L('手繪示意', 'sketch')}</span></div>
    <div class="body">
      <div class="meta"><h3 id="t-presence">${B(PRESENCE.name)}</h3></div>
      <div class="meta">${versionChips(ver)}</div>
      <p class="lead">${B(PRESENCE.lead)}</p>
      ${benList(PRESENCE.bens)}
      <div class="acts">${chooseBtn()}<button type="button" class="btn btn-ghost" data-act="device-detail" data-dev="presence">${L('看完整介紹', 'Full details')}${ic('arrow')}</button></div>
    </div>
  </article>`;
}
function cardSoon(D) {
  const tagTxt = D.status === 'plan' ? L('規劃中，尚未提供韌體', 'Planned, no firmware yet') : L('尚無韌體、尚未實測', 'No firmware yet, untested');
  return `
  <article class="pcard soon" aria-labelledby="t-${D.id}" data-device="${D.id}" data-flashable="false">
    <div class="art"><span class="badge tag soon">${ic('clock')}${D.status === 'plan' ? L('規劃中', 'Planned') : L('即將推出', 'Coming soon')}</span>
      <div class="gap"></div>
      <div class="boards n${D.boards.length}">${D.boards.map(([id, n, c]) => boardTile(id, n, c)).join('')}</div>
      <span class="cap">${L('手繪示意，位置與比例以實物為準', 'sketch; positions and proportions follow the real boards')}</span></div>
    <div class="body">
      <div class="meta"><h3 id="t-${D.id}">${B(D.name)}</h3></div>
      <div class="meta"><span class="chip">${B(D.cnt)}</span><span class="tag soon">${tagTxt}</span></div>
      <p class="lead">${B(D.lead)}</p>
      ${benList(D.bens, 'clock')}
      <div class="acts">${lockedBtn()}<button type="button" class="btn btn-ghost" data-act="device-detail" data-dev="${D.id}">${L('看規劃', 'See the plan')}${ic('arrow')}</button></div>
      <p class="hint">${L('這張卡只寫已決定的方向，沒有效能數字，也沒有開放時間。', 'This card lists only decided directions: no performance numbers and no release date.')}</p>
    </div>
  </article>`;
}

/** 選設備畫面（步驟條第 1 段）。ctx: { steps（步驟條 HTML）, version（感應器最新版號，沒有就空） } */
export function renderDevices(ctx = {}) {
  return `${ctx.steps || ''}
    <div class="sechead"><h2 tabindex="-1">${L('選擇你要刷的設備', 'Choose the device you want to flash')}</h2><p class="sub">${L('每一種設備都有簡介：長什麼樣、刷了會得到什麼。所有操作都在你的瀏覽器本機執行。', 'Each device has a short intro: what it looks like and what you get. Everything runs locally in your browser.')}</p></div>
    <div class="cards A">${cardPresence(ctx.version)}${cardSoon(SOON.ir)}${cardSoon(SOON.bt)}${cardSoon(SOON.ir8266)}</div>`;
}

/** 單一設備的完整介紹。 */
export function renderDetail(id, ctx = {}) {
  const back = `<button type="button" class="btn btn-ghost btn-sm back" data-act="back-devices">${ic('back')}${L('回到選設備', 'Back to devices')}</button>`;
  const hx = (zh, en) => `<h2>${L(zh, en)}</h2>`;
  if (id === 'presence') {
    const D = PRESENCE;
    return `${ctx.steps || ''}${back}
    <section class="hero"><div class="art">${ART.presence()}<span class="sub mono">${L('手繪示意 · 位置與外形以實物為準', 'sketch · positions and shape follow the real device')}</span></div>
      <div class="sec"><div class="meta"><span class="tag ok">${ic('check')}${L('可以刷', 'Available')}</span>${versionChips(ctx.version)}</div>
        <h2 class="big" tabindex="-1">${B(D.name)}</h2><p class="lead">${B(D.lead)}</p>
        <div class="btns">${chooseBtn()}</div></div></section>
    <section class="sec">${hx('功能與好處', 'Features and benefits')}
      <ul class="feat">${D.feats.map(([t, d]) => `<li>${ic('check')}<div><b>${B(t)}</b><span>${B(d)}</span></div></li>`).join('')}</ul></section>
    <section class="sec">${hx('畫面長什麼樣', 'What the screens look like')}
      <div class="shots">
        <figure class="shot">${WF.sensor()}<figcaption><b>${L('刷好後，設備自己的網頁', 'The device’s own page after flashing')}</b><span class="mark">${L('示意（假資料），不是實機截圖', 'sketch (fake data), not a real screenshot')}</span><span>${L('有人／無人、距離、溫度與雷達圖，分「總覽、校準、燈光聲音、系統」四頁。', 'Occupancy, distance, temperature and a radar chart, split into Overview, Calibrate, Light & sound and System.')}</span></figcaption></figure>
        <figure class="shot">${WF.wizard()}<figcaption><b>${L('第一次使用引導', 'First-run guide')}</b><span class="mark">${L('示意（假資料）', 'sketch (fake data)')}</span><span>${L('第一次打開設備網頁會出現，依序設定名稱、擺放位置、偵測範圍、校準。', 'Shown the first time you open the device page: name, placement, range, calibration.')}</span></figcaption></figure>
      </div>
      <figure class="shot gapt">${WF.flasher()}<figcaption><b>${L('選好設備後，在刷機頁刷它：四個步驟', 'After choosing the device, flashing it here takes four steps')}</b><span class="mark">${L('示意（假資料）', 'sketch (fake data)')}</span></figcaption></figure></section>
    <section class="sec">${hx('刷之前先知道', 'Before you flash')}<ul class="bens">${D.know.map((k) => `<li>${ic('info')}<span>${B(k)}</span></li>`).join('')}</ul></section>`;
  }
  const D = Object.hasOwn(SOON, id) ? SOON[id] : undefined;
  if (!D) return `${ctx.steps || ''}${back}`;
  const tag = D.status === 'plan' ? L('規劃中', 'Planned') : L('即將推出', 'Coming soon');
  return `${ctx.steps || ''}${back}
    <section class="hero"><div class="art"><div class="boards n${D.boards.length}">${D.boards.map(([bid, n, c]) => boardTile(bid, n, c)).join('')}</div><span class="sub mono">${L('手繪示意 · 位置與外形以實物為準', 'sketch · positions and shape follow the real device')}</span></div>
      <div class="sec"><div class="meta"><span class="tag soon">${ic('clock')}${tag}</span></div>
        <h2 class="big" tabindex="-1">${B(D.name)}</h2><p class="lead">${B(D.lead)}</p>
        <div class="btns">${lockedBtn()}<span class="abhint">${L('沒有韌體可以刷，也沒有預計開放時間。', 'There is no firmware to flash and no planned release date.')}</span></div></div></section>
    <section class="sec">${hx(D.boardsTitle[0], D.boardsTitle[1])}<p class="sub">${B(D.boardsNote)}</p><div class="boards big n${D.boards.length}">${D.boards.map(([bid, n, c]) => boardTile(bid, n, c)).join('')}</div></section>
    <section class="sec">${hx('功能與好處', 'Features and benefits')}<p class="sub">${L('標「規劃中」的是還在規劃、尚未提供的項目。', 'Items marked “Planned” are still being planned and are not available yet.')}</p>
      <ul class="feat plan">${D.feats.map(([t, d, extra]) => `<li>${ic('clock')}<div><b>${B(t)}</b><span>${B(d)}</span><span>${planTag()}</span>${extra ? `<span class="sub">${B(extra)}</span>` : ''}</div></li>`).join('')}</ul></section>
    <section class="sec">${hx('畫面長什麼樣', 'What the screens look like')}
      <div class="shots">
        <figure class="shot">${WF[D.flow]()}<figcaption><b>${L('運作概念圖', 'How it is meant to work')}</b><span><span class="mark">${L('示意 · 規劃中 · 還沒有實際畫面', 'sketch · planned · no real screen yet')}</span></span><span>${L('設備網頁與 Home Assistant 裡的畫面要等韌體做出來才有，屆時再補上截圖。', 'Screens for the device page and Home Assistant will be added once the firmware exists.')}</span></figcaption></figure>
        <figure class="shot">${WF.flasher()}<figcaption><b>${L('選好設備後，刷機頁的四個步驟', 'After choosing a device, the flasher page takes four steps')}</b><span class="mark">${L('示意（假資料）', 'sketch (fake data)')}</span></figcaption></figure>
      </div></section>
    <section class="sec">${hx('刷之前先知道', 'Before you flash')}<ul class="bens">${D.know.map((k) => `<li>${ic('info')}<span>${B(k)}</span></li>`).join('')}</ul></section>`;
}
