// 使用條款與免責聲明內容（中英）。網頁（閘門與條款頁）與 TERMS.md／DISCLAIMER.md 都從這一份產生，
// 避免兩邊文字不一致。條款版本以引擎的 CURRENT_TERMS_VERSION 為唯一來源（這裡不另寫死）。
// 內文只用 <b>…</b> 一種標記；渲染時用 innerHTML（內容是這個檔案的靜態字串，不含使用者輸入）。

export const TERMS_TITLE = { zh: '使用條款與免責聲明', en: 'Terms of use and disclaimer' };

export const TERMS_CLAUSES = [
  {
    id: 'nature',
    title: { zh: '服務性質', en: 'Nature of the service' },
    body: {
      zh: '本網頁與提供下載的韌體、原始碼、說明文件（下稱「本服務」）由個人自願提供，<b>免費、按「現狀」與「可得性」提供</b>，不是商業產品或服務，<b>不附任何明示或默示的擔保</b>（包括適銷性、特定用途適用性、不侵權、無錯誤、不中斷、與你的設備相容）。',
      en: 'This website and the firmware, source code and documentation offered for download (the “Service”) are provided voluntarily by an individual, <b>free of charge, “as is” and “as available”</b>. They are not a commercial product or service and come <b>without any express or implied warranty</b> (including merchantability, fitness for a particular purpose, non-infringement, freedom from errors, uninterrupted operation, and compatibility with your device).',
    },
  },
  {
    id: 'risks',
    title: { zh: '風險告知', en: 'Risks' },
    body: {
      // 與第一版實際提供的內容一致：公開頁沒有 S31 教學，S31 韌體尚未開放，所以不寫「提供 OTA 更新教學」。
      zh: '刷寫、更新、還原韌體本質上有風險，可能造成：設備無法開機（變磚）、設定與資料遺失、失去原廠保固或售後服務、功能異常或誤動作、Wi-Fi 或本地網路安全性改變、與其他裝置整合失效；操作中斷電、拔線、關閉頁面、更換傳輸線、瀏覽器或作業系統問題都可能放大風險。<b>S31 智慧插座含市電電路</b>：本服務<b>不建議也不提供拆殼或接線說明</b>，且 S31 韌體目前尚未開放；任何自行拆殼或接線行為造成的觸電、火災、人身傷害與財產損失，由你自行承擔。',
      en: 'Flashing, updating and restoring firmware is inherently risky and may cause: a device that will not boot (“bricked”), loss of settings and data, loss of the manufacturer\'s warranty or after-sales service, malfunction or unintended behaviour, changes to Wi-Fi or local-network security, and broken integration with other devices. Power loss, unplugging, closing the page, changing cables, and browser or operating-system problems during an operation can make these risks worse. <b>The S31 smart plug contains mains-voltage circuitry</b>: this Service <b>neither recommends nor provides instructions for opening the case or wiring</b>, and S31 firmware is not released yet; any electric shock, fire, injury or property damage caused by opening or wiring it yourself is your own responsibility.',
    },
  },
  {
    id: 'responsibilities',
    title: { zh: '你的責任', en: 'Your responsibilities' },
    body: {
      zh: '你確認設備型號與本服務支援的型號相符；你自行備份並確認備份可用；你自行判斷是否適合更新；你遵守適用法令與設備原廠條款；你保管好備份檔（內含 Wi-Fi 密碼與金鑰，不得公開或交給他人）。',
      en: 'You confirm that your device model matches a model supported by this Service; you make your own backup and check that it is usable; you decide for yourself whether an update is appropriate; you comply with applicable laws and the manufacturer\'s terms; and you keep your backup files safe (they contain Wi-Fi passwords and keys and must not be made public or given to others).',
    },
  },
  {
    id: 'liability',
    title: { zh: '責任限制', en: 'Limitation of liability' },
    body: {
      zh: '<b>在適用法律允許的最大範圍內</b>，提供者不就使用或無法使用本服務所生之任何直接、間接、附帶、衍生、特別或懲罰性損害負責，包括設備損壞、資料或設定遺失、營業損失、第三方索賠、人身或財產損害。<b>法律不允許排除或限制的責任（例如因故意或重大過失、人身傷亡、消費者保護法等強制規定所生責任），不在此限</b>；若前述限制於你所在地不生效，提供者的全部責任以「你為取得本服務所付費用」為上限（本服務免費，故上限為新臺幣零元）。',
      en: '<b>To the maximum extent permitted by applicable law</b>, the provider is not liable for any direct, indirect, incidental, consequential, special or punitive damages arising from the use of, or inability to use, the Service, including device damage, loss of data or settings, loss of business, third-party claims, and personal injury or property damage. <b>Liability that the law does not allow to be excluded or limited (for example liability arising from intent or gross negligence, death or personal injury, or mandatory consumer-protection rules) is not affected</b>; if the above limitation has no effect where you live, the provider\'s total liability is capped at “the fees you paid to obtain the Service” (the Service is free, so the cap is NT$0).',
    },
  },
  {
    id: 'indemnity',
    title: { zh: '補償', en: 'Indemnity' },
    body: {
      zh: '你同意，因你違反本條款、違反法令或不當使用本服務所生第三人請求，在法律允許範圍內由你自行處理，與提供者無關。',
      en: 'You agree that, to the extent permitted by law, claims by third parties arising from your breach of these terms, your violation of law or your misuse of the Service are yours to handle and are unrelated to the provider.',
    },
  },
  {
    id: 'licences',
    title: { zh: '開源授權與第三方', en: 'Open-source licences and third parties' },
    body: {
      zh: '原始碼以 GPL-3.0 授權，其第 15、16 條（無擔保、責任限制）併入本條款；網頁程式以 MIT 授權，亦無擔保；本服務使用 ESPHome、esptool-js（Apache-2.0）等第三方軟體，各依其授權，提供者不對第三方軟體負責。',
      en: 'The source code is licensed under GPL-3.0, whose sections 15 and 16 (no warranty, limitation of liability) are incorporated into these terms; the web page code is licensed under MIT, also without warranty; the Service uses third-party software such as ESPHome and esptool-js (Apache-2.0) under their own licences, and the provider is not responsible for third-party software.',
    },
  },
  {
    id: 'privacy',
    title: { zh: '隱私', en: 'Privacy' },
    body: {
      zh: '操作全部在你的瀏覽器本機執行，備份與韌體檔不上傳；本服務不收集個人資料；瀏覽器本機只保存同意紀錄。',
      en: 'All operations run locally in your browser; backups and firmware files are not uploaded; the Service does not collect personal data; your browser stores only your consent record locally.',
    },
  },
  {
    id: 'unofficial',
    title: { zh: '非官方、無關聯', en: 'Unofficial, no affiliation' },
    body: {
      zh: '本服務為個人專案，<b>與任何設備製造商、品牌、賣家無隸屬或授權關係</b>，也不代表其立場；使用本服務可能使你的設備失去原廠支援。',
      en: 'This Service is a personal project and <b>has no affiliation with, or authorisation from, any device manufacturer, brand or seller</b>, nor does it represent their views; using it may cause your device to lose manufacturer support.',
    },
  },
  {
    id: 'changes',
    title: { zh: '條款修訂', en: 'Changes to the terms' },
    body: {
      zh: '提供者得隨時修訂條款並更新版本；新版本公布後須重新同意才能繼續使用。',
      en: 'The provider may revise these terms at any time and update the version; once a new version is published you must agree again to continue using the Service.',
    },
  },
  {
    id: 'law',
    title: { zh: '準據法與可分割性', en: 'Governing law and severability' },
    body: {
      zh: '本條款適用中華民國（臺灣）法律；爭議以臺灣臺北地方法院為第一審管轄法院（如不違反強制規定）。本條款任一條被認定無效，不影響其餘條款效力。',
      en: 'These terms are governed by the laws of the Republic of China (Taiwan); disputes are subject to the Taipei District Court of Taiwan as the court of first instance (where this does not violate mandatory rules). If any clause is held invalid, the remaining clauses are unaffected.',
    },
  },
  {
    id: 'agreement',
    title: { zh: '同意', en: 'Agreement' },
    body: {
      zh: '你勾選並確認即表示已閱讀、理解並同意本條款；不同意請勿使用本服務。',
      en: 'By ticking the boxes and confirming you state that you have read, understood and agree to these terms; if you do not agree, do not use the Service.',
    },
  },
];

/** DISCLAIMER.md 收錄的條款（免責的核心三條，內文與 TERMS 逐字相同）。 */
export const DISCLAIMER_CLAUSE_IDS = ['nature', 'risks', 'liability'];

/** 把 <b>…</b> 轉成 Markdown 的 **…**；其餘文字不動。 */
export function htmlToMarkdown(s) {
  return s.replace(/<b>/g, '**').replace(/<\/b>/g, '**');
}

/** 純文字（去掉標記），給測試與比對用。 */
export function htmlToText(s) {
  return s.replace(/<\/?b>/g, '');
}

function clauseMarkdown(clauses, lang, indexOffset = 0) {
  return clauses
    .map((c, i) => `${i + 1 + indexOffset}. **${c.title[lang]}** ${htmlToMarkdown(c.body[lang])}`)
    .join('\n\n');
}

/** TERMS.md 全文（中英對照；條款版本由呼叫端傳入）。 */
export function termsMarkdown(version) {
  return [
    `# 使用條款與免責聲明 / Terms of use and disclaimer`,
    '',
    `條款版本 / Terms version: **${version}**`,
    '',
    '## 中文',
    '',
    clauseMarkdown(TERMS_CLAUSES, 'zh'),
    '',
    '## English',
    '',
    clauseMarkdown(TERMS_CLAUSES, 'en'),
    '',
  ].join('\n');
}

/** DISCLAIMER.md（免責核心條款；完整條款見 TERMS.md）。 */
export function disclaimerMarkdown(version) {
  const picked = DISCLAIMER_CLAUSE_IDS.map((id) => TERMS_CLAUSES.find((c) => c.id === id));
  const numberOf = (id) => TERMS_CLAUSES.findIndex((c) => c.id === id) + 1;
  const lines = (lang) =>
    picked.map((c) => `- **${c.title[lang]}**（${lang === 'zh' ? '條款第' : 'clause '}${numberOf(c.id)}${lang === 'zh' ? '條' : ''}）${htmlToMarkdown(c.body[lang])}`).join('\n\n');
  return [
    `# 免責聲明 / Disclaimer`,
    '',
    `條款版本 / Terms version: **${version}**`,
    '',
    '完整條款見 [TERMS.md](TERMS.md)；使用本服務前必須先閱讀並同意完整條款。 / The full terms are in [TERMS.md](TERMS.md); you must read and accept them before using the Service.',
    '',
    '## 中文',
    '',
    lines('zh'),
    '',
    '## English',
    '',
    lines('en'),
    '',
  ].join('\n');
}
