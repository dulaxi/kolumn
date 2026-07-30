#!/usr/bin/env node
// Veo 3.1 Fast (paid): text-to-video, image-to-video, and seamless loop (first frame == last frame).
// Usage:
//   node veo.mjs "<prompt>" <outName> [seconds] [--image=file.png] [--loop]
//   --image  animate a starting still (keeps its flat style)
//   --loop   set lastFrame = image  → seamless loop  (requires --image)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const MODEL = 'veo-3.1-fast-generate-preview';
const KEY = (process.env.GEMINI_API_KEY || (fs.existsSync(path.join(DIR,'.gemini-key')) ? fs.readFileSync(path.join(DIR,'.gemini-key'),'utf8').trim() : '')).trim();
if (!KEY) { console.error('No API key.'); process.exit(1); }
const H = { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const args = process.argv.slice(2);
const prompt = args[0];
const outName = args[1] || 'clip';
const dur = Number(args.find(a => /^\d+$/.test(a)) || 4);
const imgArg = args.find(a => a.startsWith('--image='));
const wantLoop = args.includes('--loop');
if (!prompt) { console.error('Usage: node veo.mjs "<prompt>" <outName> [seconds] [--image=file] [--loop]'); process.exit(1); }

const instance = { prompt };
if (imgArg) {
  const f = imgArg.split('=')[1];
  const b64 = fs.readFileSync(path.join(DIR, f)).toString('base64');
  instance.image = { bytesBase64Encoded: b64, mimeType: 'image/png' };
  if (wantLoop) instance.lastFrame = { bytesBase64Encoded: b64, mimeType: 'image/png' };
  console.log(`Image-to-video from ${f}${wantLoop ? ' (seamless loop: first==last frame)' : ''}`);
}
const body = { instances: [instance], parameters: { aspectRatio: '16:9', durationSeconds: dur, resolution: '720p' } };

console.log(`Submitting Veo Fast job (${dur}s) …`);
let r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:predictLongRunning`, { method: 'POST', headers: H, body: JSON.stringify(body) });
let j = await r.json();
if (!r.ok) { console.error('Submit error', r.status, JSON.stringify(j?.error ?? j).slice(0,600)); process.exit(1); }
const op = j.name; console.log('Operation:', op);

let done = null;
for (let i = 0; i < 40; i++) {
  await sleep(10000);
  const pj = await (await fetch(`https://generativelanguage.googleapis.com/v1beta/${op}`, { headers: H })).json();
  if (pj.error) { console.error('Poll error', JSON.stringify(pj.error).slice(0,600)); process.exit(1); }
  process.stdout.write(`  poll ${i+1}: done=${!!pj.done}\n`);
  if (pj.done) { done = pj; break; }
}
if (!done) { console.error('Timed out.'); process.exit(1); }

const uri = done.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
if (!uri) { console.error('No video uri:', JSON.stringify(done.response).slice(0,600)); process.exit(1); }
console.log('Downloading …');
const dl = await fetch(uri, { headers: { 'x-goog-api-key': KEY } });
if (!dl.ok) { console.error('Download failed', dl.status); process.exit(1); }
const buf = Buffer.from(await dl.arrayBuffer());
const outPath = path.join(DIR, outName.endsWith('.mp4') ? outName : outName + '.mp4');
fs.writeFileSync(outPath, buf);
console.log('Saved', outName + '.mp4', `(${(buf.length/1024/1024).toFixed(2)} MB)`);
