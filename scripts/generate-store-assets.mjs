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
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0;
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

// 512x512 Google Play Store Icon
function drawPlayStoreIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Squircle rounded container background
  // Background: Rich Deep Slate #0b0f19
  let r = 11;
  let g = 15;
  let b = 25;
  let a = 255;

  // Outer glowing ring: Emerald #10b981
  const outerRadius = w * 0.44;
  const innerRadius = w * 0.36;

  if (dist <= outerRadius && dist >= innerRadius) {
    const t = (dist - innerRadius) / (outerRadius - innerRadius);
    r = Math.round(16 * (1 - t) + 15 * t);
    g = Math.round(185 * (1 - t) + 60 * t);
    b = Math.round(129 * (1 - t) + 100 * t);
  } else if (dist < innerRadius) {
    // Inner badge: Dark Slate gradient
    const t = dist / innerRadius;
    r = Math.round(26 * (1 - t) + 15 * t);
    g = Math.round(36 * (1 - t) + 23 * t);
    b = Math.round(61 * (1 - t) + 42 * t);
  }

  // Draw central Rupee symbol
  const inBar1 = (y >= cy - h * 0.14 && y <= cy - h * 0.09 && x >= cx - w * 0.14 && x <= cx + w * 0.14);
  const inBar2 = (y >= cy - h * 0.05 && y <= cy - h * 0.00 && x >= cx - w * 0.14 && x <= cx + w * 0.14);
  const inStem = (x >= cx - w * 0.14 && x <= cx - w * 0.08 && y >= cy - h * 0.14 && y <= cy + h * 0.18);
  const loopCenterY = cy - h * 0.02;
  const loopDist = Math.sqrt((x - (cx - w*0.08))**2 + (y - loopCenterY)**2);
  const inLoop = (loopDist <= w * 0.15 && loopDist >= w * 0.09 && x >= cx - w * 0.08 && y <= cy + h * 0.06 && y >= cy - h * 0.14);
  const diagX = (cx - w * 0.08) + (y - (cy + h * 0.04)) * 1.0;
  const inDiag = (y >= cy + h * 0.04 && y <= cy + h * 0.18 && Math.abs(x - diagX) <= w * 0.035);

  if (inBar1 || inBar2 || inStem || inLoop || inDiag) {
    r = 52;
    g = 211;
    b = 153;
  }

  return [r, g, b, a];
}

// 1024x500 Google Play Store Feature Banner
function drawFeatureGraphic(x, y, w, h) {
  // Radial gradient background centered slightly left
  const bgDist = Math.sqrt((x - w * 0.3)**2 + (y - h * 0.5)**2);
  const maxBg = Math.sqrt(w*w + h*h) * 0.7;
  const bgT = Math.min(1, bgDist / maxBg);

  let r = Math.round(22 * (1 - bgT) + 11 * bgT);
  let g = Math.round(32 * (1 - bgT) + 15 * bgT);
  let b = Math.round(56 * (1 - bgT) + 25 * bgT);
  let a = 255;

  // Subtle decorative grid lines
  if (x % 32 === 0 || y % 32 === 0) {
    r = Math.min(255, r + 4);
    g = Math.min(255, g + 6);
    b = Math.min(255, b + 10);
  }

  // Draw circular app icon badge on the left side (center around x = 240, y = 250, radius = 140)
  const iconCx = 240;
  const iconCy = 250;
  const iconDist = Math.sqrt((x - iconCx)**2 + (y - iconCy)**2);

  if (iconDist <= 145) {
    // Glow border
    if (iconDist >= 135) {
      r = 16;
      g = 185;
      b = 129;
    } else {
      // Inner circle
      const t = iconDist / 135;
      r = Math.round(30 * (1 - t) + 15 * t);
      g = Math.round(41 * (1 - t) + 23 * t);
      b = Math.round(59 * (1 - t) + 42 * t);

      // Rupee glyph inside emblem
      const icW = 280;
      const icH = 280;
      const relX = x - iconCx;
      const relY = y - iconCy;

      const inB1 = (relY >= -icH * 0.14 && relY <= -icH * 0.09 && relX >= -icW * 0.14 && relX <= icW * 0.14);
      const inB2 = (relY >= -icH * 0.05 && relY <= -icH * 0.00 && relX >= -icW * 0.14 && relX <= icW * 0.14);
      const inSt = (relX >= -icW * 0.14 && relX <= -icW * 0.08 && relY >= -icH * 0.14 && relY <= icH * 0.18);
      const lpCY = -icH * 0.02;
      const lpD = Math.sqrt((relX - (-icW*0.08))**2 + (relY - lpCY)**2);
      const inLp = (lpD <= icW * 0.15 && lpD >= icW * 0.09 && relX >= -icW * 0.08 && relY <= icH * 0.06 && relY >= -icH * 0.14);
      const dgX = (-icW * 0.08) + (relY - (icH * 0.04)) * 1.0;
      const inDg = (relY >= icH * 0.04 && relY <= icH * 0.18 && Math.abs(relX - dgX) <= icW * 0.035);

      if (inB1 || inB2 || inSt || inLp || inDg) {
        r = 52;
        g = 211;
        b = 153;
      }
    }
  }

  // Right side decorative cards & graph silhouette
  // Draw sleek glowing metric bar graph silhouette between x: 500..940, y: 140..360
  if (x >= 500 && x <= 960 && y >= 140 && y <= 360) {
    // Glass card background
    const inCard = (x >= 520 && x <= 940 && y >= 150 && y <= 350);
    if (inCard) {
      r = Math.min(255, r + 15);
      g = Math.min(255, g + 20);
      b = Math.min(255, b + 35);

      // Card border
      if (x === 520 || x === 940 || y === 150 || y === 350) {
        r = 59;
        g = 130;
        b = 246;
      }

      // 6 modern financial bar columns inside the card
      const barDefs = [
        { x: 560, w: 36, h: 80, color: [59, 130, 246] },
        { x: 620, w: 36, h: 120, color: [16, 185, 129] },
        { x: 680, w: 36, h: 60, color: [59, 130, 246] },
        { x: 740, w: 36, h: 145, color: [16, 185, 129] },
        { x: 800, w: 36, h: 95, color: [139, 92, 246] },
        { x: 860, w: 36, h: 130, color: [16, 185, 129] }
      ];

      for (const bar of barDefs) {
        if (x >= bar.x && x <= bar.x + bar.w && y >= (320 - bar.h) && y <= 320) {
          r = bar.color[0];
          g = bar.color[1];
          b = bar.color[2];
        }
      }

      // Baseline track
      if (y >= 322 && y <= 324 && x >= 550 && x <= 910) {
        r = 100;
        g = 116;
        b = 139;
      }
    }
  }

  return [r, g, b, a];
}

const iconsDir = path.resolve('icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('Generating Google Play Store 512x512 App Icon...');
fs.writeFileSync(path.join(iconsDir, 'play-store-icon-512.png'), createPng(512, 512, drawPlayStoreIcon));

console.log('Generating Google Play Store 1024x500 Feature Banner Graphic...');
fs.writeFileSync(path.join(iconsDir, 'play-store-feature-graphic-1024x500.png'), createPng(1024, 500, drawFeatureGraphic));

console.log('Store assets successfully created:');
console.log(' - icons/play-store-icon-512.png');
console.log(' - icons/play-store-feature-graphic-1024x500.png');
