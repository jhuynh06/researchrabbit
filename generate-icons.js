/**
 * Generates icons/icon16.png, icon48.png, icon128.png
 * Pure Node.js — no external dependencies.
 * Draws the ResearchRabbit logo: dark-blue circle + grid-of-dots + sparkle.
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// ── PNG helpers ────────────────────────────────────────────────────────────

function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n, 0);
  return b;
}

function chunk(type, data) {
  const typeB = Buffer.from(type, "ascii");
  const crcBuf = Buffer.concat([typeB, data]);
  const crc = crc32(crcBuf);
  return Buffer.concat([u32(data.length), typeB, data, u32(crc)]);
}

// CRC-32 table
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makePNG(width, height, pixels) {
  // pixels: Uint8Array of length width*height*4 (RGBA, row-major)
  const IHDR = Buffer.concat([
    u32(width), u32(height),
    Buffer.from([8, 2, 0, 0, 0]), // 8-bit depth, RGB (we'll use RGBA → color type 6)
  ]);
  // Rebuild with color type 6 (RGBA)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;   // bit depth
  ihdrData[9] = 6;   // color type: RGBA
  ihdrData[10] = 0;  // compression
  ihdrData[11] = 0;  // filter
  ihdrData[12] = 0;  // interlace

  // Build raw scanlines (filter byte 0 + RGBA row)
  const raw = Buffer.alloc((1 + width * 4) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter type None
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = y * (1 + width * 4) + 1 + x * 4;
      raw[dst]     = pixels[src];
      raw[dst + 1] = pixels[src + 1];
      raw[dst + 2] = pixels[src + 2];
      raw[dst + 3] = pixels[src + 3];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdrData),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Drawing primitives ─────────────────────────────────────────────────────

function createPixels(w, h) {
  return new Uint8Array(w * h * 4); // all transparent
}

function setPixel(pixels, w, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= w || y >= Math.floor(pixels.length / (w * 4))) return;
  const i = (y * w + x) * 4;
  // Alpha-composite over existing
  const srcA = a / 255;
  const dstA = pixels[i + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA === 0) return;
  pixels[i]     = Math.round((r * srcA + pixels[i]     * dstA * (1 - srcA)) / outA);
  pixels[i + 1] = Math.round((g * srcA + pixels[i + 1] * dstA * (1 - srcA)) / outA);
  pixels[i + 2] = Math.round((b * srcA + pixels[i + 2] * dstA * (1 - srcA)) / outA);
  pixels[i + 3] = Math.round(outA * 255);
}

// Anti-aliased filled circle
function fillCircle(pixels, w, h, cx, cy, radius, r, g, b) {
  const x0 = Math.max(0, Math.floor(cx - radius - 1));
  const x1 = Math.min(w - 1, Math.ceil(cx + radius + 1));
  const y0 = Math.max(0, Math.floor(cy - radius - 1));
  const y1 = Math.min(h - 1, Math.ceil(cy + radius + 1));
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
      const alpha = Math.max(0, Math.min(1, radius - dist + 0.5));
      if (alpha > 0) setPixel(pixels, w, px, py, r, g, b, Math.round(alpha * 255));
    }
  }
}

// Draw a 4-pointed star / sparkle at (cx,cy) with outer radius R
function fillSparkle(pixels, w, h, cx, cy, R, r, g, b) {
  const inner = R * 0.35;
  const points = 4;
  // Rasterise by checking each pixel against the star polygon
  const x0 = Math.max(0, Math.floor(cx - R - 1));
  const x1 = Math.min(w - 1, Math.ceil(cx + R + 1));
  const y0 = Math.max(0, Math.floor(cy - R - 1));
  const y1 = Math.min(h - 1, Math.ceil(cy + R + 1));

  // Build star polygon vertices
  const verts = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? R : inner;
    verts.push([cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad]);
  }

  function pointInPoly(px, py) {
    let inside = false;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
      const xi = verts[i][0], yi = verts[i][1];
      const xj = verts[j][0], yj = verts[j][1];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
        inside = !inside;
    }
    return inside;
  }

  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      // Simple AA: sample 4 sub-pixels
      let hits = 0;
      for (const [ox, oy] of [[-0.25,-0.25],[0.25,-0.25],[-0.25,0.25],[0.25,0.25]]) {
        if (pointInPoly(px + ox, py + oy)) hits++;
      }
      if (hits > 0) setPixel(pixels, w, px, py, r, g, b, Math.round((hits / 4) * 255));
    }
  }
}

// ── Icon renderer ──────────────────────────────────────────────────────────

function renderIcon(size) {
  const pixels = createPixels(size, size);
  const cx = size / 2;
  const cy = size / 2;

  // Background circle (dark blue #3a509d)
  fillCircle(pixels, size, size, cx, cy, size / 2 - 0.5, 58, 80, 157);

  // Dot grid: 3 dots + 1 sparkle
  // Layout mirrors the SVG in content.js:
  //   top-left dot, bottom-left dot, bottom-right dot, top-right sparkle
  const pad = size * 0.22;
  const dotR = size * 0.115;
  const sparkR = size * 0.155;

  const left  = cx - pad * 0.7;
  const right = cx + pad * 0.7;
  const top   = cy - pad * 0.7;
  const bot   = cy + pad * 0.7;

  // Three white dots
  fillCircle(pixels, size, size, left,  top, dotR, 255, 255, 255);
  fillCircle(pixels, size, size, left,  bot, dotR, 255, 255, 255);
  fillCircle(pixels, size, size, right, bot, dotR, 255, 255, 255);

  // White sparkle (top-right)
  fillSparkle(pixels, size, size, right, top, sparkR, 255, 255, 255);

  return pixels;
}

// ── Write files ────────────────────────────────────────────────────────────

const sizes = [16, 48, 128];
const outDir = path.join(__dirname, "icons");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

for (const size of sizes) {
  const pixels = renderIcon(size);
  const png = makePNG(size, size, pixels);
  const outPath = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`✓ icons/icon${size}.png  (${png.length} bytes)`);
}
