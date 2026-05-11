const fs = require("fs");
const path = require("path");

const sampleRate = 22050;
const samples = [];

function pushTone(freqHz, durationSec, amplitude) {
  const n = Math.floor(durationSec * sampleRate);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const attack = Math.min(1, i / 120);
    const release = Math.min(1, (n - i) / 280);
    const env = attack * release;
    samples.push(Math.sin(2 * Math.PI * freqHz * t) * env * amplitude);
  }
}

// ATM-style: two rising tones + quick shimmer
pushTone(880, 0.11, 0.42);
for (let i = 0; i < Math.floor(0.045 * sampleRate); i++) {
  samples.push(0);
}
pushTone(1175, 0.16, 0.38);
for (let i = 0; i < Math.floor(0.03 * sampleRate); i++) {
  samples.push(0);
}
pushTone(1568, 0.08, 0.22);

const numSamples = samples.length;
const dataSize = numSamples * 2;
const buffer = Buffer.alloc(44 + dataSize);

buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(1, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2, 28);
buffer.writeUInt16LE(2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

let offset = 44;
for (const s of samples) {
  const v = Math.max(-1, Math.min(1, s));
  buffer.writeInt16LE(Math.round(v * 32767), offset);
  offset += 2;
}

const outDir = path.join(__dirname, "..", "assets", "sounds");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "transaction-success.wav");
fs.writeFileSync(outPath, buffer);
console.log("Wrote", outPath, buffer.length, "bytes");
