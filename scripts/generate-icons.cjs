// Generate Tracy icon PNG files using pure Node.js (no dependencies)
// Tracy logo: amber "T" on dark background with cyan accent dot

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(width, height, pixels) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type (RGBA)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT chunk (image data)
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 4 + 1)] = 0; // filter byte
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

  // IEND chunk
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

// Tracy logo: amber "T" on dark stone background with cyan dot
function generateTracyLogo(size) {
  const pixels = [];
  const bgR = 12, bgG = 10, bgB = 9; // stone-950
  const amberR = 245, amberG = 158, amberB = 11; // amber-500
  const amberLightR = 251, amberLightG = 191, amberLightB = 36; // amber-400
  const cyanR = 34, cyanG = 211, cyanB = 238; // cyan-400

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Rounded rect background (fill most of the icon)
      const margin = Math.round(size * 0.08);
      const radius = Math.round(size * 0.15);
      const cx = x - size / 2;
      const cy = y - size / 2;
      const halfW = size / 2 - margin;
      const halfH = size / 2 - margin;

      let isBg = true;
      if (Math.abs(cx) <= halfW && Math.abs(cy) <= halfH) {
        isBg = true;
      } else {
        const dx = Math.max(Math.abs(cx) - halfW, 0);
        const dy = Math.max(Math.abs(cy) - halfH, 0);
        if (dx * dx + dy * dy <= radius * radius) {
          isBg = true;
        } else {
          isBg = false;
        }
      }

      if (!isBg) {
        pixels.push([0, 0, 0, 0]);
        continue;
      }

      // Draw "T" shape
      const tTop = Math.round(size * 0.22);
      const tBottom = Math.round(size * 0.72);
      const tLeft = Math.round(size * 0.25);
      const tRight = Math.round(size * 0.75);
      const tStemWidth = Math.round(size * 0.18);
      const tStemLeft = Math.round(size / 2 - tStemWidth / 2);
      const tStemRight = Math.round(size / 2 + tStemWidth / 2);
      const tBarHeight = Math.round(size * 0.12);

      let isT = false;
      let isCyanDot = false;

      // T top bar
      if (y >= tTop && y <= tTop + tBarHeight && x >= tLeft && x <= tRight) {
        isT = true;
      }
      // T stem
      if (y >= tTop && y <= tBottom && x >= tStemLeft && x <= tStemRight) {
        isT = true;
      }

      // Cyan accent dot (bottom-right area)
      const dotCx = Math.round(size * 0.78);
      const dotCy = Math.round(size * 0.78);
      const dotR = Math.round(size * 0.06);
      if ((x - dotCx) ** 2 + (y - dotCy) ** 2 <= dotR * dotR) {
        isCyanDot = true;
      }

      if (isCyanDot) {
        pixels.push([cyanR, cyanG, cyanB, 255]);
      } else if (isT) {
        // Gradient effect on T
        const tProgress = (y - tTop) / (tBottom - tTop);
        const r = Math.round(amberR + (amberLightR - amberR) * (1 - tProgress));
        const g = Math.round(amberG + (amberLightG - amberG) * (1 - tProgress));
        const b = Math.round(amberB + (amberLightB - amberB) * (1 - tProgress));
        pixels.push([r, g, b, 255]);
      } else {
        pixels.push([bgR, bgG, bgB, 255]);
      }
    }
  }

  return pixels;
}

const sizes = [32, 128, 256];
const iconsDir = path.join(__dirname, '..', 'electron', 'icons');

for (const size of sizes) {
  const pixels = generateTracyLogo(size);
  const png = createPNG(size, size, pixels);
  const filename = size === 256 ? '128x128@2x.png' : `${size}x${size}.png`;
  fs.writeFileSync(path.join(iconsDir, filename), png);
  console.log(`Created ${filename} (${size}x${size})`);
}

console.log('Done! Icons generated successfully.');
