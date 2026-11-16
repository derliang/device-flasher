// 純 JS 的 MD5（RFC 1321）。
// 為什麼需要：esptool-js 的 flashMd5sum 回傳的是「設備端」算出來的 MD5；
// 要和「瀏覽器端」手上的資料比對，就得在本機也算一次 MD5。
// Web Crypto（crypto.subtle）不提供 MD5，所以自己寫。這裡只用於「完整性比對」，不是資安用途。
// 單元測試用 node:crypto 的 MD5 對照（見 test/md5.test.mjs）。

const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];
const K = new Uint32Array(64);
for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;

/**
 * @param {Uint8Array} bytes
 * @returns {string} 32 字元小寫十六進位
 */
export function md5Hex(bytes) {
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const M = new Uint32Array(16);

  function block(buf, off) {
    for (let j = 0; j < 16; j++) {
      const p = off + j * 4;
      M[j] = (buf[p] | (buf[p + 1] << 8) | (buf[p + 2] << 16) | (buf[p + 3] << 24)) >>> 0;
    }
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) & 15; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) & 15; }
      else { F = C ^ (B | ~D); g = (7 * i) & 15; }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }

  const len = bytes.length;
  const full = len - (len % 64);
  for (let off = 0; off < full; off += 64) block(bytes, off);

  // 尾段（最多 2 個區塊）：原資料尾巴＋0x80＋補 0＋64 位元長度（位元數，小端）
  const rest = len - full;
  const tailLen = rest < 56 ? 64 : 128;
  const tail = new Uint8Array(tailLen);
  tail.set(bytes.subarray(full), 0);
  tail[rest] = 0x80;
  const bitsLo = (len << 3) >>> 0;
  const bitsHi = Math.floor(len / 0x20000000) >>> 0; // len * 8 的高 32 位元
  const dv = new DataView(tail.buffer);
  dv.setUint32(tailLen - 8, bitsLo, true);
  dv.setUint32(tailLen - 4, bitsHi, true);
  for (let off = 0; off < tailLen; off += 64) block(tail, off);

  const out = new Uint8Array(16);
  const odv = new DataView(out.buffer);
  odv.setUint32(0, a0, true); odv.setUint32(4, b0, true);
  odv.setUint32(8, c0, true); odv.setUint32(12, d0, true);
  let hex = '';
  for (let i = 0; i < 16; i++) hex += out[i].toString(16).padStart(2, '0');
  return hex;
}
