// Generate ProQA icon PNG files using pure Node.js (no dependencies)
// ProQA logo: vintage amber/gold P/? glyph with 4-wings star on dark roasted stone background

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const rawData = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 4 + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const pixel = pixels[idx] || [0, 0, 0, 0];
      const offset = y * (width * 4 + 1) + 1 + x * 4;
      rawData[offset] = pixel[0];
      rawData[offset + 1] = pixel[1];
      rawData[offset + 2] = pixel[2];
      rawData[offset + 3] = pixel[3];
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(data.length, 0);

  const crcData = Buffer.concat([typeBuf, data]);
  const crc = crc32(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([lengthBuf, typeBuf, data, crcBuf]);
}

function crc32(buf) {
  let c = 0xFFFFFFFF;
  const table = crc32Table();
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return c ^ 0xFFFFFFFF;
}

function crc32Table() {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
}

// Distance from point (px, py) to line segment (ax, ay)-(bx, by)
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}

// ProQA logo: vintage amber/gold P/? glyph with 4-wings star on dark stone badge
function generateProQALogo(size) {
  const pixels = [];
  const bgR = 18, bgG = 16, bgB = 14; // warm dark stone
  const borderR = 217, borderG = 119, borderB = 6; // amber-600 #d97706
  const amberR = 217, amberG = 119, amberB = 6; // amber-600
  const amberLightR = 251, amberLightG = 191, amberLightB = 36; // amber-400

  // Keypoints of the P/? glyph in normalized (0..1) coordinates
  const strokeWidth = size * 0.105;
  const strokeRadius = strokeWidth / 2;

  // Segments forming the P/? hook
  const p0 = [size * 0.34, size * 0.43]; // Left start
  const p1 = [size * 0.34, size * 0.31]; // Top-left corner
  const p2 = [size * 0.66, size * 0.31]; // Top-right corner
  const p3 = [size * 0.66, size * 0.49]; // Right bottom corner
  const p4 = [size * 0.50, size * 0.49]; // Center bend
  const p5 = [size * 0.50, size * 0.63]; // Stem bottom

  // 4-winged star centered at (0.50, 0.77) with radius ~0.09
  const starCx = size * 0.50;
  const starCy = size * 0.77;
  const starR = size * 0.095;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Rounded rect badge background
      const margin = Math.round(size * 0.08);
      const radius = Math.round(size * 0.18);
      const cx = x - size / 2;
      const cy = y - size / 2;
      const halfW = size / 2 - margin;
      const halfH = size / 2 - margin;

      let isInside = false;
      let isBorder = false;

      if (Math.abs(cx) <= halfW && Math.abs(cy) <= halfH) {
        isInside = true;
        if (Math.abs(cx) >= halfW - Math.max(1, size * 0.02) || Math.abs(cy) >= halfH - Math.max(1, size * 0.02)) {
          isBorder = true;
        }
      } else {
        const dx = Math.max(Math.abs(cx) - halfW, 0);
        const dy = Math.max(Math.abs(cy) - halfH, 0);
        const distSq = dx * dx + dy * dy;
        if (distSq <= radius * radius) {
          isInside = true;
          const innerR = radius - Math.max(1, size * 0.02);
          if (distSq >= innerR * innerR) {
            isBorder = true;
          }
        }
      }

      if (!isInside) {
        pixels.push([0, 0, 0, 0]);
        continue;
      }

      if (isBorder) {
        pixels.push([borderR, borderB, borderG, 255]);
        continue;
      }

      // Check distance to the 5 stroke segments
      const d1 = distToSegment(x, y, p0[0], p0[1], p1[0], p1[1]);
      const d2 = distToSegment(x, y, p1[0], p1[1], p2[0], p2[1]);
      const d3 = distToSegment(x, y, p2[0], p2[1], p3[0], p3[1]);
      const d4 = distToSegment(x, y, p3[0], p3[1], p4[0], p4[1]);
      const d5 = distToSegment(x, y, p4[0], p4[1], p5[0], p5[1]);

      const minDist = Math.min(d1, d2, d3, d4, d5);
      const isGlyph = minDist <= strokeRadius;

      // Check 4-winged star (Astroid / 4-pointed sparkle formula)
      const starDx = Math.abs(x - starCx);
      const starDy = Math.abs(y - starCy);
      let isStar = false;
      if (starDx <= starR && starDy <= starR) {
        const astroidVal = Math.sqrt(starDx / starR) + Math.sqrt(starDy / starR);
        if (astroidVal <= 1.05) {
          isStar = true;
        }
      }

      if (isGlyph || isStar) {
        // Warm gold-to-amber gradient
        const tProgress = Math.max(0, Math.min(1, (y - size * 0.25) / (size * 0.55)));
        const r = Math.round(amberLightR - (amberLightR - amberR) * tProgress);
        const g = Math.round(amberLightG - (amberLightG - amberG) * tProgress);
        const b = Math.round(amberLightB - (amberLightB - amberB) * tProgress);
        pixels.push([r, g, b, 255]);
      } else {
        pixels.push([bgR, bgG, bgB, 255]);
      }
    }
  }

  return pixels;
}

const sizes = [16, 32, 48, 64, 128, 256];
const iconsDir = path.join(__dirname, '..', 'electron', 'icons');
const buildDir = path.join(__dirname, '..', 'build');
const publicDir = path.join(__dirname, '..', 'public');

[iconsDir, buildDir, publicDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

for (const size of sizes) {
  const pixels = generateProQALogo(size);
  const png = createPNG(size, size, pixels);
  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.png`), png);
  console.log(`Created electron/icons/icon-${size}x${size}.png`);
}

// Write standard desktop icon aliases
const mainPixels = generateProQALogo(256);
const mainPng = createPNG(256, 256, mainPixels);
fs.writeFileSync(path.join(iconsDir, 'icon.png'), mainPng);
fs.writeFileSync(path.join(buildDir, 'icon.png'), mainPng);
fs.writeFileSync(path.join(publicDir, 'icon.png'), mainPng);

console.log('Done! All ProQA icons generated successfully.');

