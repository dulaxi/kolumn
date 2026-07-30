#!/usr/bin/env node
// Edit an existing image with Gemini 2.5 Flash Image (keeps the scene, changes only what you ask).
// Usage: node frame.mjs <baseImage.png> "<edit prompt>" <outName>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-image';
const KEY = (process.env.GEMINI_API_KEY || (fs.existsSync(path.join(DIR,'.gemini-key')) ? fs.readFileSync(path.join(DIR,'.gemini-key'),'utf8').trim() : '')).trim();
if (!KEY) { console.error('No API key (GEMINI_API_KEY or .gemini-key).'); process.exit(1); }

const base = process.argv[2], prompt = process.argv[3], outName = process.argv[4] || 'edit';
if (!base || !prompt) { console.error('Usage: node frame.mjs <baseImage> "<prompt>" <outName>'); process.exit(1); }
const b64 = fs.readFileSync(path.join(DIR, base)).toString('base64');
const outPath = path.join(DIR, outName.endsWith('.png') ? outName : outName + '.png');

const body = {
  contents: [{ parts: [ { inline_data: { mime_type: 'image/png', data: b64 } }, { text: prompt } ] }],
  generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9' } },
};

console.log(`Editing ${base} → ${outName} …`);
const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
  method: 'POST', headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const j = await res.json();
if (!res.ok) { console.error('API error', res.status, JSON.stringify(j?.error ?? j).slice(0,400)); process.exit(1); }
const parts = j?.candidates?.[0]?.content?.parts ?? [];
const img = parts.find(p => p.inlineData || p.inline_data);
if (!img) { console.error('No image returned.', parts.map(p=>p.text).filter(Boolean).join(' ').slice(0,200)); process.exit(1); }
fs.writeFileSync(outPath, Buffer.from((img.inlineData||img.inline_data).data, 'base64'));
console.log('Saved', outName + '.png', `(${fs.statSync(outPath).size/1024|0} KB)`);
