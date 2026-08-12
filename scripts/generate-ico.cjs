// Generate .ico file from PNG data
const fs = require('fs');
const path = require('path');

// Read the 256x256 PNG (which we saved as 128x128@2x.png)
const pngPath = path.join(__dirname, '..', 'electron', 'icons', '128x128@2x.png');
const pngData = fs.readFileSync(pngPath);

// ICO file format:
// Header: 6 bytes
// - Reserved: 2 bytes (0)
// - Type: 2 bytes (1 = ICO)
// - Count: 2 bytes (number of images)
// Each image entry: 16 bytes
// - Width: 1 byte (0 = 256)
// - Height: 1 byte (0 = 256)
// - Color count: 1 byte (0 = no palette)
// - Reserved: 1 byte (0)
// - Color planes: 2 bytes (0 or 1)
// - Bits per pixel: 2 bytes (32)
// - Size: 4 bytes (size of image data)
// - Offset: 4 bytes (offset to image data)

const width = 256;
const height = 256;
const pngSize = pngData.length;

// Header
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);  // Reserved
header.writeUInt16LE(1, 2);  // Type (ICO)
header.writeUInt16LE(1, 4);  // Count (1 image)

// Image entry
const entry = Buffer.alloc(16);
entry[0] = width >= 256 ? 0 : width;  // Width
entry[1] = height >= 256 ? 0 : height; // Height
entry[2] = 0;  // Color count
entry[3] = 0;  // Reserved
entry.writeUInt16LE(1, 4);  // Color planes
entry.writeUInt16LE(32, 6); // Bits per pixel
entry.writeUInt32LE(pngSize, 8);  // Size of image data
entry.writeUInt32LE(22, 12);  // Offset to image data (6 + 16 = 22)

// Combine
const ico = Buffer.concat([header, entry, pngData]);

const icoPath = path.join(__dirname, '..', 'electron', 'icons', 'icon.ico');
fs.writeFileSync(icoPath, ico);
console.log(`Created icon.ico (${ico.length} bytes)`);

// For .icns (macOS), we'll create a minimal one
// Actually .icns is complex, let's just copy the PNG for now
// The build process can generate proper .icns later

console.log('Done!');
