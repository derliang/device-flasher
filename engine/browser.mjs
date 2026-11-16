// 瀏覽器端的接線：用 vendor 內的 esptool-js bundle 與 navigator.serial 建立引擎。
// 不在測試中使用（測試改注入假的 ESPLoader／Transport）。import 時不碰任何 DOM。

import { createFlasher } from './flasher-engine.mjs';

export async function createBrowserFlasher(options = {}) {
  const mod = await import('../vendor/esptool-js-0.5.4/bundle.js');
  return createFlasher({
    ESPLoader: mod.ESPLoader,
    Transport: mod.Transport,
    serial: globalThis.navigator && globalThis.navigator.serial,
    now: () => Date.now(),
    crypto: globalThis.crypto,
    ...options,
  });
}
