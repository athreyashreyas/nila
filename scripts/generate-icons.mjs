import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SRC = 'design/brand/dancer.png';
const OUT = 'public/icons';
const PARCHMENT = { r: 0xfa, g: 0xf9, b: 0xf6, alpha: 1 };

mkdirSync(OUT, { recursive: true });

// 1) Trim the off-white border down to the figure's bounding box.
const trimmed = await sharp(SRC).trim({ threshold: 12 }).toBuffer({ resolveWithObject: true });
const { width: tw, height: th } = trimmed.info;
console.log(`trimmed figure: ${tw}x${th}`);

// 2) Build a soft alpha mask from luminance so the off-white becomes transparent
//    while the berry figure (with its anti-aliased edges) stays, hue untouched.
const mask = await sharp(trimmed.data)
  .grayscale()
  .negate()        // figure -> light, background -> dark
  .threshold(64)   // hard cut: background -> fully transparent (no bounding box), figure -> opaque
  .blur(0.8)       // restore soft, anti-aliased edges
  .toColourspace('b-w')
  .toBuffer();

// 3) Original RGB + computed alpha = figure on transparent ground.
const figure = await sharp(trimmed.data)
  .removeAlpha()
  .joinChannel(mask)
  .png()
  .toBuffer();

// 4) Compose onto a parchment square, centered, with margin. Larger dimension
//    of the figure occupies `scale` of the tile (rest is safe-zone padding).
async function tile(size, scale, file) {
  const fig = th >= tw ? { height: Math.round(size * scale) } : { width: Math.round(size * scale) };
  const resized = await sharp(figure)
    .resize({ ...fig, fit: 'inside', kernel: 'lanczos3' })
    .toBuffer({ resolveWithObject: true });
  const left = Math.round((size - resized.info.width) / 2);
  const top = Math.round((size - resized.info.height) / 2);
  await sharp({ create: { width: size, height: size, channels: 4, background: PARCHMENT } })
    .composite([{ input: resized.data, left, top }])
    .png()
    .toFile(`${OUT}/${file}`);
  console.log(`  ${file}  (${size}px, figure ${resized.info.width}x${resized.info.height})`);
}

// figure occupies ~70% of the tile -> present but still inside the maskable safe zone
const S = 0.70;
await tile(512, S, 'icon-512.png');
await tile(192, S, 'icon-192.png');
await tile(180, S, 'apple-touch-icon.png');
await tile(167, S, 'icon-167.png');
await tile(152, S, 'icon-152.png');
await tile(64, 0.72, 'favicon-64.png');
await tile(32, 0.78, 'favicon-32.png');

// 5) Splash / launch screens: the dancer centered on parchment.
async function splash(w, h, file) {
  const figH = Math.round(0.42 * Math.min(w, h));
  const resized = await sharp(figure)
    .resize({ height: figH, fit: 'inside', kernel: 'lanczos3' })
    .toBuffer({ resolveWithObject: true });
  const left = Math.round((w - resized.info.width) / 2);
  const top = Math.round((h - resized.info.height) / 2);
  await sharp({ create: { width: w, height: h, channels: 4, background: PARCHMENT } })
    .composite([{ input: resized.data, left, top }])
    .png()
    .toFile(`public/splash/${file}`);
  console.log(`  splash ${file}  (${w}x${h})`);
}

await splash(1179, 2556, 'iphone-14-pro.png');
await splash(2556, 1179, 'iphone-14-pro-landscape.png');
await splash(750, 1334, 'iphone-se.png');
await splash(2048, 2732, 'ipad-pro-12.png');
await splash(2732, 2048, 'ipad-pro-12-landscape.png');
await splash(1668, 2388, 'ipad-pro-11.png');

console.log('done');
