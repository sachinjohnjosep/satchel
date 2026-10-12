// Generates abstract, grainy placeholder frames for the sample photographs.
// They are deliberately not real photos, so nothing is mistaken for your own work.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const out = new URL("../public/sample/", import.meta.url);
mkdirSync(out, { recursive: true });

const frames = [
  ["frame-01", 1600, 1067, "#8d857a", "#3b3732", 0.62],
  ["frame-02", 1067, 1600, "#c9a46e", "#5a3f26", 0.35],
  ["frame-03", 1200, 1500, "#6c7177", "#1f2226", 0.5],
  ["frame-04", 1800, 1013, "#9aa092", "#3c4237", 0.7],
  ["frame-05", 1200, 1600, "#8a4a3c", "#2b1713", 0.42],
  ["frame-06", 1600, 1200, "#d8cfbf", "#8d8373", 0.55],
  ["frame-07", 1600, 1067, "#7f8c96", "#2c3339", 0.3],
  ["frame-08", 1200, 1200, "#c69a4b", "#5b4320", 0.6],
  ["frame-09", 1067, 1600, "#7c8358", "#2f3320", 0.45],
];

function seeded(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

for (const [i, [name, w, h, light, dark, split]] of frames.entries()) {
  const rnd = seeded(i * 7919 + 13);
  // A few soft shapes standing in for light falling across a scene.
  const shapes = Array.from({ length: 4 }, () => {
    const x = rnd() * w, y = rnd() * h, rw = w * (0.15 + rnd() * 0.4), rh = h * (0.1 + rnd() * 0.5);
    return `<rect x="${x - rw / 2}" y="${y - rh / 2}" width="${rw}" height="${rh}" fill="${rnd() > 0.5 ? light : dark}" opacity="${0.25 + rnd() * 0.35}"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="${rnd() > 0.5 ? 1 : 0.3}" y2="1">
        <stop offset="0" stop-color="${light}"/><stop offset="${split}" stop-color="${light}" stop-opacity="0.85"/>
        <stop offset="1" stop-color="${dark}"/>
      </linearGradient>
      <filter id="b"><feGaussianBlur stdDeviation="${Math.round(w / 40)}"/></filter>
      <radialGradient id="v" cx="0.5" cy="0.5" r="0.75">
        <stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <g filter="url(#b)">${shapes}</g>
    <rect width="100%" height="100%" fill="url(#v)"/>
  </svg>`;

  // Film grain: random noise blended over the image.
  const noise = Buffer.alloc(w * h);
  for (let j = 0; j < noise.length; j++) noise[j] = 128 + (Math.random() - 0.5) * 70;
  const grain = await sharp(noise, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer();

  await sharp(Buffer.from(svg))
    .composite([{ input: grain, blend: "soft-light" }])
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(new URL(`${name}.jpg`, out).pathname);
  console.log("wrote", name);
}
