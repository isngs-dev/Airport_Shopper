/**
 * Converts the glyphs needed for the giant 3D "25+" into three.js "typeface.json"
 * format so the numerals use the brand font (Space Grotesk Bold).
 *
 * Run: npm run build:fonts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import opentype from "opentype.js";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "../public/fonts/SpaceGrotesk-Bold.woff");
const out = resolve(here, "../public/fonts/space-grotesk-bold.typeface.json");

const CHARS = "$0123456789";
const RESOLUTION = 1000;

const buf = readFileSync(src);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const scale = RESOLUTION / font.unitsPerEm;
const r = (n) => Math.round(n * scale);

const glyphs = {};
for (const ch of CHARS) {
  const g = font.charToGlyph(ch);
  const o = [];
  for (const c of g.path.commands) {
    switch (c.type) {
      case "M":
        o.push("m", r(c.x), r(c.y));
        break;
      case "L":
        o.push("l", r(c.x), r(c.y));
        break;
      case "Q":
        // typeface format: q <end> <control>
        o.push("q", r(c.x), r(c.y), r(c.x1), r(c.y1));
        break;
      case "C":
        // typeface format: b <end> <control1> <control2>
        o.push("b", r(c.x), r(c.y), r(c.x1), r(c.y1), r(c.x2), r(c.y2));
        break;
      case "Z":
        break;
    }
  }
  const bb = g.getBoundingBox();
  glyphs[ch] = {
    ha: r(g.advanceWidth),
    x_min: r(bb.x1),
    x_max: r(bb.x2),
    o: o.join(" "),
  };
}

const json = {
  glyphs,
  familyName: "Space Grotesk",
  ascender: r(font.ascender),
  descender: r(font.descender),
  underlinePosition: -100,
  underlineThickness: 50,
  boundingBox: { yMin: r(font.descender), xMin: 0, yMax: r(font.ascender), xMax: 1000 },
  resolution: RESOLUTION,
  original_font_information: { fullName: "Space Grotesk Bold" },
};

writeFileSync(out, JSON.stringify(json));
console.log(`wrote ${out} (${CHARS.length} glyphs)`);
