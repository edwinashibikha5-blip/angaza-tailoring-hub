const fs = require('fs');
const zlib = require('zlib');

function createTailorIcon(size) {
  const buf = Buffer.alloc((size * 4 + 1) * size);
  const cx = size / 2;
  const cy = size / 2;

  // 16x16 crisp pixel bitmap for bold "A" + crown/needle bar
  const glyph = [
    ".......XX.......",
    "......XXXX......",
    ".....XX..XX.....",
    "....XX....XX....",
    "....XX....XX....",
    "...XX......XX...",
    "...XXXXXXXXXX...",
    "..XXXXXXXXXXXX..",
    "..XX........XX..",
    ".XX..........XX.",
    ".XX..........XX.",
    "XXX..........XXX"
  ];

  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    buf[row] = 0;
    const t = y / size;
    // Royal cobalt (#1e40af) -> Vivid Sky Blue (#0284c7)
    const bgR = Math.round(30 * (1 - t) + 2 * t);
    const bgG = Math.round(64 * (1 - t) + 132 * t);
    const bgB = Math.round(175 * (1 - t) + 199 * t);

    for (let x = 0; x < size; x++) {
      const i = row + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      let r = bgR, g = bgG, b = bgB;

      // Inner dark royal medallion circle
      if (dist < size * 0.36) {
        r = 23; g = 34; b = 77;
      }

      // Dashed gold stitching ring around medallion
      if (dist >= size * 0.37 && dist <= size * 0.405) {
        const dash = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 24);
        if (dash % 2 === 0) {
          r = 248; g = 212; b = 124; // Gold stitch
        }
      }

      // Outer sky-blue glow border
      if (dist >= size * 0.43 && dist <= size * 0.455) {
        r = 125; g = 211; b = 252;
      }

      // Diagonal silver-white needle passing behind the "A"
      const diag = Math.abs((x - cx) + (y - cy));
      if (diag < size * 0.016 && dist < size * 0.33) {
        r = 241; g = 245; b = 249;
      }
      // Crimson red thread accent curve
      const threadDist = Math.abs(Math.sin((x - cx) / (size * 0.08)) * (size * 0.06) - (y - (cy + size * 0.19)));
      if (threadDist < size * 0.012 && Math.abs(x - cx) < size * 0.24) {
        r = 220; g = 38; b = 38;
      }

      // Crisp Gold "A" Emblem in the center
      const gx = Math.floor(((x - (cx - size * 0.22)) / (size * 0.44)) * 16);
      const gy = Math.floor(((y - (cy - size * 0.20)) / (size * 0.34)) * 12);
      if (gy >= 0 && gy < 12 && gx >= 0 && gx < 16 && glyph[gy][gx] === 'X') {
        r = 251; g = 191; b = 36;
      }

      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = 255;
    }
  }

  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[n] = c;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (let j = 0; j < body.length; j++) crc = crcTable[(crc ^ body[j]) & 0xff] ^ (crc >>> 8);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 0);
    return Buffer.concat([len, body, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(buf)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

fs.writeFileSync('icon-192.png', createTailorIcon(192));
fs.writeFileSync('icon-512.png', createTailorIcon(512));
console.log('Generated detailed tailoring icons!');
