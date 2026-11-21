// 錯誤碼表。畫面層用 error.code 決定行為、用 error.messageKey 查 i18n，
// 找不到 key 時可直接顯示 error.messages['zh-TW'] / ['en']。

export const ERROR_TABLE = {
  'serial-unsupported': {
    'zh-TW': '這個瀏覽器不支援 Web Serial。請改用電腦版 Chrome 或 Edge，並以 https 或 localhost 開啟本頁。',
    en: 'This browser does not support Web Serial. Use desktop Chrome or Edge, and open this page over https or localhost.',
  },
  'user-cancelled': {
    'zh-TW': '已取消選擇序列埠。',
    en: 'Serial port selection was cancelled.',
  },
  'connect-failed': {
    'zh-TW': '無法連上設備。請確認接線／USB、讓設備進入下載模式後再試。',
    en: 'Could not connect to the device. Check the cable, put the device in download mode, and try again.',
  },
  'not-connected': {
    'zh-TW': '尚未連線（或寫入後連線已結束）。請先連線並辨識設備。',
    en: 'Not connected (or the session ended after a write). Connect and identify the device first.',
  },
  busy: {
    'zh-TW': '上一個操作還沒結束。',
    en: 'Another operation is still running.',
  },
  'wrong-chip': {
    'zh-TW': '晶片與預期不符，已拒絕所有寫入。',
    en: 'The chip does not match the expected device; all writes are refused.',
  },
  'wrong-flash': {
    'zh-TW': 'Flash 容量與預期不符，已拒絕所有寫入。',
    en: 'The flash size does not match the expected device; all writes are refused.',
  },
  'wrong-profile': {
    'zh-TW': '備份檔屬於另一種設備類型，不能還原到這台。',
    en: 'This backup belongs to a different device type and cannot be restored to this device.',
  },
  'read-failed': {
    'zh-TW': '讀取 flash 失敗或資料不一致，備份無效，請重試。',
    en: 'Reading flash failed or the data is inconsistent; the backup is invalid. Please retry.',
  },
  'save-failed': {
    'zh-TW': '備份檔沒有成功存到電腦，請再試一次或換個位置存。',
    en: 'The backup file was not saved to your computer; try again or pick another location.',
  },
  'save-cancelled': {
    'zh-TW': '已取消存檔，備份檔沒有存下來。',
    en: 'Saving was cancelled; the backup files were not saved.',
  },
  'bad-backup': {
    'zh-TW': '備份檔無效（大小、開機標頭或雜湊不符，或缺少說明檔）。',
    en: 'The backup file is invalid (size, boot header or hash mismatch, or the metadata file is missing).',
  },
  'mac-mismatch-unconfirmed': {
    'zh-TW': '這份備份來自另一台設備（MAC 不同）。還原會複製那台的 Wi-Fi 與 API 金鑰身分，需要明確確認。',
    en: 'This backup comes from a different device (MAC differs). Restoring will clone that device\'s Wi-Fi and API-key identity and needs explicit confirmation.',
  },
  'bad-parts': {
    'zh-TW': '要寫入的檔案清單有問題（空的、超出 flash 範圍、彼此重疊或開機標頭不對）。',
    en: 'The list of parts to write is invalid (empty, outside flash, overlapping, or bad boot header).',
  },
  'protected-region': {
    'zh-TW': '要寫入的範圍會覆蓋受保護區（設定／偏好設定），已拒絕。',
    en: 'The write would overwrite a protected region (settings/preferences) and was refused.',
  },
  'erase-unconfirmed': {
    'zh-TW': '整顆擦除會清掉 Wi-Fi 與所有設定，需要明確確認。',
    en: 'Erasing the whole chip clears Wi-Fi and all settings and needs explicit confirmation.',
  },
  'write-failed': {
    'zh-TW': '寫入失敗，設備可能處於不完整狀態。請不要拔線，重新寫入或還原備份。',
    en: 'Writing failed and the device may be in an incomplete state. Do not unplug; retry the write or restore your backup.',
  },
  'verify-failed': {
    'zh-TW': '寫入後驗證不符（MD5 與預期不同）。請重新寫入或還原備份。',
    en: 'Post-write verification failed (MD5 differs from expected). Retry the write or restore your backup.',
  },
  'consent-required': {
    'zh-TW': '需要先同意免責聲明與使用條款才能使用本功能。',
    en: 'You must accept the disclaimer and terms of use before using this feature.',
  },
  aborted: {
    'zh-TW': '操作已中止。',
    en: 'The operation was aborted.',
  },
};

// consent-required 依 details.reason 區分原因；messageKey 變成 flasher.error.consent-required.<reason>
export const CONSENT_REASONS = {
  missing: {
    'zh-TW': '尚未同意免責聲明與使用條款（缺少同意紀錄）。請先閱讀並同意。',
    en: 'You have not accepted the disclaimer and terms of use (no consent record). Please read and accept first.',
  },
  'version-outdated': {
    'zh-TW': '條款已更新，你先前同意的是舊版。請重新閱讀並同意新版條款。',
    en: 'The terms have been updated and your earlier consent is for an older version. Please read and accept the new terms.',
  },
  'invalid-format': {
    'zh-TW': '同意紀錄格式不正確。請重新同意。',
    en: 'The consent record is malformed. Please accept again.',
  },
  'in-future': {
    'zh-TW': '同意紀錄的時間不合理（在未來）。請檢查電腦時間後重新同意。',
    en: 'The consent record has a timestamp in the future. Check your computer clock and accept again.',
  },
  tampered: {
    'zh-TW': '同意紀錄在同意後被更動。請重新同意。',
    en: 'The consent record was changed after it was accepted. Please accept again.',
  },
};

export class FlasherError extends Error {
  /**
   * @param {string} code ERROR_TABLE 的鍵
   * @param {object} [details] 附加資料（原因、位址…）
   * @param {{cause?: unknown, partialWrite?: boolean}} [opts]
   */
  constructor(code, details = {}, opts = {}) {
    const reasonEntry = code === 'consent-required' && details && CONSENT_REASONS[details.reason];
    const entry = reasonEntry || ERROR_TABLE[code];
    super(entry ? entry.en : String(code));
    this.name = 'FlasherError';
    this.code = code;
    this.messageKey = reasonEntry ? `flasher.error.${code}.${details.reason}` : `flasher.error.${code}`;
    this.messages = entry ? { 'zh-TW': entry['zh-TW'], en: entry.en } : { 'zh-TW': String(code), en: String(code) };
    this.details = details;
    // true＝寫入已經開始卻沒有驗證成功：設備內容可能不完整，不可當成成功。
    this.partialWrite = opts.partialWrite === true;
    if (opts.cause !== undefined) this.cause = opts.cause;
  }

  toJSON() {
    return {
      code: this.code,
      messageKey: this.messageKey,
      messages: this.messages,
      details: this.details,
      partialWrite: this.partialWrite,
    };
  }
}

export function isFlasherError(e) {
  return e instanceof FlasherError;
}
