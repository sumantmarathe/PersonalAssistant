import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function createPng(width, height, pixelFn) {
  // Signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Scanlines: each row starts with filter byte 0, followed by width * 4 bytes RGBA
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function drawAssistantIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background: Deep Slate #0f172a (15, 23, 42)
  let r = 15;
  let g = 23;
  let b = 42;
  let a = 255;

  const outerRadius = w * 0.44;
  const innerRadius = w * 0.36;

  // Outer glowing ring: Emerald #10b981
  if (dist <= outerRadius && dist >= innerRadius) {
    const t = (dist - innerRadius) / (outerRadius - innerRadius);
    // Gradient ring
    r = Math.round(16 * (1 - t) + 15 * t);
    g = Math.round(185 * (1 - t) + 60 * t);
    b = Math.round(129 * (1 - t) + 100 * t);
  } else if (dist < innerRadius) {
    // Inner badge: Dark Slate gradient
    const t = dist / innerRadius;
    r = Math.round(30 * (1 - t) + 15 * t);
    g = Math.round(41 * (1 - t) + 23 * t);
    b = Math.round(59 * (1 - t) + 42 * t);
  }

  // Draw central Rupee / Wallet symbol (geometric simplified ₹ glyph)
  // Horizontal bar 1: y in [cy - h*0.14, cy - h*0.10], x in [cx - w*0.14, cx + w*0.14]
  const inBar1 = (y >= cy - h * 0.14 && y <= cy - h * 0.09 && x >= cx - w * 0.14 && x <= cx + w * 0.14);
  // Horizontal bar 2: y in [cy - h*0.06, cy - h*0.02], x in [cx - w*0.14, cx + w*0.14]
  const inBar2 = (y >= cy - h * 0.05 && y <= cy - h * 0.00 && x >= cx - w * 0.14 && x <= cx + w * 0.14);
  // Vertical stem: x in [cx - w*0.14, cx - w*0.08], y in [cy - h*0.14, cy + h*0.18]
  const inStem = (x >= cx - w * 0.14 && x <= cx - w * 0.08 && y >= cy - h * 0.14 && y <= cy + h * 0.18);
  // Upper loop right arc:
  const loopCenterY = cy - h * 0.02;
  const loopDist = Math.sqrt((x - (cx - w*0.08))**2 + (y - loopCenterY)**2);
  const inLoop = (loopDist <= w * 0.15 && loopDist >= w * 0.09 && x >= cx - w * 0.08 && y <= cy + h * 0.06 && y >= cy - h * 0.14);
  // Diagonal leg:
  const diagX = (cx - w * 0.08) + (y - (cy + h * 0.04)) * 1.0;
  const inDiag = (y >= cy + h * 0.04 && y <= cy + h * 0.18 && Math.abs(x - diagX) <= w * 0.035);

  if (inBar1 || inBar2 || inStem || inLoop || inDiag) {
    // Pure vibrant Emerald
    r = 52;
    g = 211;
    b = 153;
  }

  return [r, g, b, a];
}

const iconsDir = path.resolve('icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createPng(192, 192, drawAssistantIcon));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createPng(512, 512, drawAssistantIcon));

console.log('Successfully generated icons/icon-192.png and icons/icon-512.png');
