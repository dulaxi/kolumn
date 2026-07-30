#!/usr/bin/env node
// Generate 2D art via Gemini 2.5 Flash Image ("Nano Banana") and drop it into the halftone pipeline.
//
// Key (never pass it on the command line — it lands in shell history):
//   • preferred:  export GEMINI_API_KEY=...   (in your ~/.bashrc so it persists)
//   • or:         put the key alone in a file named .gemini-key next to this script
//
// Usage:
//   node gen.mjs "a cozy lo-fi bedroom, flat 2-3 value grayscale, thick outlines, matte, no texture, cream background, 16:9"
//   node gen.mjs "<prompt>" myscene         # saves myscene.png
//   node gen.mjs "<prompt>" myscene --embed # also bakes it into painter.html + halftone.html
//
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-image';

function getKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  const f = path.join(DIR, '.gemini-key');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  return '';
}

const KEY = getKey();
if (!KEY) {
  console.error('No API key. Set GEMINI_API_KEY in your environment, or create a .gemini-key file next to gen.mjs.');
  process.exit(1);
}

const prompt = process.argv[2];
if (!prompt) { console.error('Usage: node gen.mjs "<prompt>" [outname] [--embed]'); process.exit(1); }
const outName = (process.argv[3] && !process.argv[3].startsWith('--')) ? process.argv[3] : 'gen';
const doEmbed = process.argv.includes('--embed');
const outPath = path.join(DIR, outName.endsWith('.png') ? outName : outName + '.png');

const body = {
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9' } },
};

console.log(`Generating with ${MODEL} …`);
const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
  method: 'POST',
  headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const j = await res.json();
if (!res.ok) {
  console.error('API error', res.status, JSON.stringify(j?.error ?? j, null, 2));
  process.exit(1);
}

const parts = j?.candidates?.[0]?.content?.parts ?? [];
const imgPart = parts.find(p => p.inlineData || p.inline_data);
if (!imgPart) {
  const txt = parts.map(p => p.text).filter(Boolean).join(' ');
  console.error('No image in response.', txt ? `Model said: ${txt}` : JSON.stringify(j).slice(0, 400));
  process.exit(1);
}
const inline = imgPart.inlineData || imgPart.inline_data;
fs.writeFileSync(outPath, Buffer.from(inline.data, 'base64'));
console.log('Saved', outPath, `(${(fs.statSync(outPath).size / 1024 | 0)} KB)`);

if (doEmbed) {
  const dataURI = 'data:image/png;base64,' + inline.data;
  for (const file of ['painter.html', 'halftone.html']) {
    const p = path.join(DIR, file);
    if (!fs.existsSync(p)) continue;
    let h = fs.readFileSync(p, 'utf8');
    h = h.replace(/data:image\/png;base64,[A-Za-z0-9+/=]+/, dataURI);
    fs.writeFileSync(p, h);
    // bump mtime so the companion server serves it as newest
    const now = new Date();
    fs.utimesSync(p, now, now);
    console.log('Embedded into', file);
  }
}
