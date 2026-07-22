import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SRC = 'design/brand/dancer.png';
const OUT = 'public/icons';
const PARCHMENT = { r: 0xfa, g: 0xf9, b: 0xf6, alpha: 1 }; // --background (splash)
// Home-screen tile colours: the berry brand hue fills the field and the dancer
// is knocked out of it in on-accent white — the inverse of a white sticker,
// matching Hisaab's colour-field-with-light-glyph scheme. Bound to the exact
// brand tokens in src/app/globals.css so the "same Berry Wine across every
// screen and device" never drifts.
const BERRY = { r: 0x8e, g: 0x3b, b: 0x5c, alpha: 1 };   // --accent (Berry Wine)
const ON_ACCENT = { r: 0xfd, g: 0xfc, b: 0xf9 };         // --on-accent

mkdirSync(OUT, { recursive: true });

// 1) Trim the off-white border to the figure's bounding box, then read raw RGBA.
const { data, info } = await sharp(SRC)
  .trim({ threshold: 12 })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const tw = info.width;
const th = info.height;
console.log(`trimmed figure: ${tw}x${th}`);

// 2) Knock the off-white ground out to transparency by per-pixel alpha: pixels
//    near parchment fade to clear, the berry figure stays opaque, and the
//    anti-aliased rim rides the ramp so edges stay soft. Build two versions
//    from the one alpha — the original hue (splash) and parchment-white (tiles).
const figureRGBA = Buffer.from(data);
const whiteRGBA = Buffer.alloc(tw * th * 4);
for (let i = 0; i < tw * th; i++) {
  const r = data[i * 4];
  const g = data[i * 4 + 1];
  const b = data[i * 4 + 2];
  // Fully clear for anything near parchment (min channel >= 212), ramping to
  // opaque as the pixel darkens into the figure — a clean ground, soft rim.
  const alpha = Math.max(0, Math.min(255, (212 - Math.min(r, g, b)) * 4));
  figureRGBA[i * 4 + 3] = alpha;
  whiteRGBA[i * 4] = ON_ACCENT.r;
  whiteRGBA[i * 4 + 1] = ON_ACCENT.g;
  whiteRGBA[i * 4 + 2] = ON_ACCENT.b;
  whiteRGBA[i * 4 + 3] = alpha;
}
const raw = { width: tw, height: th, channels: 4 };
// figure: original hue on transparent ground (splash keeps the colour dancer).
const figure = await sharp(figureRGBA, { raw }).png().toBuffer();
// whiteFigure: the same silhouette in parchment-white (the tile knockout).
const whiteFigure = await sharp(whiteRGBA, { raw }).png().toBuffer();

// 4) Compose the white silhouette onto a berry square, centered. Larger
//    dimension of the figure occupies `scale` of the tile (rest is safe-zone
//    padding so the maskable crop never clips the dancer).
async function tile(size, scale, file) {
  const fig = th >= tw ? { height: Math.round(size * scale) } : { width: Math.round(size * scale) };
  const resized = await sharp(whiteFigure)
    .resize({ ...fig, fit: 'inside', kernel: 'lanczos3' })
    .toBuffer({ resolveWithObject: true });
  const left = Math.round((size - resized.info.width) / 2);
  const top = Math.round((size - resized.info.height) / 2);
  await sharp({ create: { width: size, height: size, channels: 4, background: BERRY } })
    .composite([{ input: resized.data, left, top }])
    .png()
    .toFile(`${OUT}/${file}`);
  console.log(`  ${file}  (${size}px, figure ${resized.info.width}x${resized.info.height})`);
}

// figure occupies ~66% of the tile -> present but comfortably inside the
// maskable safe zone (Android crops to the centre ~80%).
const S = 0.66;
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
