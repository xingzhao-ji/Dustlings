import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

const output = resolve(process.argv[2] || 'artifacts/audio');
await mkdir(output, { recursive: true });
const source = await readFile(new URL('../src/audio.js', import.meta.url), 'utf8');
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
try {
  const page = await browser.newPage();
  const result = await page.evaluate(async source => {
    const { DustAudio } = await import(URL.createObjectURL(new Blob([source], { type: 'text/javascript' })));
    const sampleRate = 44100;
    const duration = 36;
    const context = new OfflineAudioContext(2, sampleRate * duration, sampleRate);
    const audio = new DustAudio(context);
    await audio.start();
    const cueSheet = audio.scheduleAudition(duration);
    const rendered = await context.startRendering();
    const channels = [rendered.getChannelData(0), rendered.getChannelData(1)];
    let peak = 0, sum = 0, invalidSamples = 0, clippedSamples = 0, maxSampleStep = 0;
    const seconds = [];
    for (let second = 0; second < duration; second++) {
      let secondSum = 0, secondPeak = 0;
      for (let channel = 0; channel < 2; channel++) {
        const values = channels[channel];
        for (let i = second * sampleRate; i < (second + 1) * sampleRate; i++) {
          const value = values[i];
          if (!Number.isFinite(value)) invalidSamples++;
          if (Math.abs(value) >= 1) clippedSamples++;
          secondPeak = Math.max(secondPeak, Math.abs(value));
          secondSum += value * value;
          if (i) maxSampleStep = Math.max(maxSampleStep, Math.abs(value - values[i - 1]));
        }
      }
      seconds.push({ second, peak: secondPeak, rms: Math.sqrt(secondSum / (sampleRate * 2)) });
      peak = Math.max(peak, secondPeak);
      sum += secondSum;
    }
    const bytes = new Uint8Array(44 + rendered.length * 4);
    const data = new DataView(bytes.buffer);
    const string = (offset, value) => [...value].forEach((char, i) => data.setUint8(offset + i, char.charCodeAt(0)));
    string(0, 'RIFF'); data.setUint32(4, bytes.length - 8, true); string(8, 'WAVE'); string(12, 'fmt ');
    data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, 2, true);
    data.setUint32(24, sampleRate, true); data.setUint32(28, sampleRate * 4, true); data.setUint16(32, 4, true); data.setUint16(34, 16, true);
    string(36, 'data'); data.setUint32(40, bytes.length - 44, true);
    for (let i = 0; i < rendered.length; i++) {
      for (let channel = 0; channel < 2; channel++) {
        const value = Math.max(-1, Math.min(1, channels[channel][i]));
        data.setInt16(44 + i * 4 + channel * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true);
      }
    }
    let binary = '';
    for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));

    // Behavioral checks use a separate frozen offline clock. They exercise limits,
    // safe pre-start calls and master mute without a wall-clock wait or speakers.
    const testContext = new OfflineAudioContext(2, sampleRate, sampleRate);
    const testAudio = new DustAudio(testContext);
    testAudio.setBrushing(false);
    testAudio.setProgress(.5);
    const silentBeforeStart = testAudio.event('birth') === false;
    await testAudio.start();
    const birthsAccepted = Array.from({ length: 50 }, () => testAudio.event('birth')).filter(Boolean).length;
    testAudio.setBrushing(true);
    testAudio.setMix({ muted: true });
    const mutedBuffer = await testContext.startRendering();
    let mutedPeakAfterFade = 0;
    for (let i = sampleRate / 4; i < sampleRate; i++) mutedPeakAfterFade = Math.max(mutedPeakAfterFade, Math.abs(mutedBuffer.getChannelData(0)[i]), Math.abs(mutedBuffer.getChannelData(1)[i]));
    testAudio.destroy();
    const metrics = {
      kind: 'Synthetic OfflineAudioContext render; no human listening or physical-device test',
      browser: navigator.userAgent, sampleRate, duration, channels: 2,
      peak, peakDbFS: 20 * Math.log10(peak), rms: Math.sqrt(sum / (rendered.length * 2)), invalidSamples, clippedSamples, maxSampleStep,
      diagnostics: audio.getDiagnostics(), checks: { silentBeforeStart, birthsAcceptedFrom50Simultaneous: birthsAccepted, mutedPeakAfterFade }, seconds, cueSheet,
    };
    return { wav: btoa(binary), metrics };
  }, source);
  await writeFile(resolve(output, 'courtyard-audition.wav'), Buffer.from(result.wav, 'base64'));
  await writeFile(resolve(output, 'audio-checks.json'), JSON.stringify(result.metrics, null, 2) + '\n');
  const bars = result.metrics.seconds.map(({ second, peak, rms }) => `<rect x="${48 + second * 24}" y="${205 - peak * 560}" width="17" height="${peak * 560}" fill="#6eac9b"/><rect x="${48 + second * 24}" y="${205 - rms * 560}" width="17" height="${rms * 560}" fill="#e2b765"/>`).join('');
  const labels = [0, 9, 18, 27, 36].map(second => `<text x="${48 + second * 24}" y="227">${second}s</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="290" viewBox="0 0 960 290"><rect width="960" height="290" fill="#172d2c"/><g fill="#e9efdc" font-family="sans-serif"><text x="36" y="32" font-size="20">Dustlings — synthetic audio audition</text><text x="36" y="55" font-size="13">One-second sample peak (sage) and RMS (gold), linear amplitude. No listening assessment.</text>${bars}<path d="M48 205H912" stroke="#76918a"/>${labels}<text x="36" y="267" font-size="13">Peak ${result.metrics.peakDbFS.toFixed(2)} dBFS · clipped samples ${result.metrics.clippedSamples} · invalid samples ${result.metrics.invalidSamples} · 44.1 kHz stereo</text></g></svg>`;
  await writeFile(resolve(output, 'audition-levels.svg'), svg);
  console.log(JSON.stringify({ output, peakDbFS: result.metrics.peakDbFS, clippedSamples: result.metrics.clippedSamples, invalidSamples: result.metrics.invalidSamples, checks: result.metrics.checks, diagnostics: result.metrics.diagnostics }, null, 2));
  if (result.metrics.invalidSamples || result.metrics.clippedSamples || !result.metrics.checks.silentBeforeStart || result.metrics.checks.birthsAcceptedFrom50Simultaneous !== 1 || result.metrics.checks.mutedPeakAfterFade !== 0) process.exitCode = 1;
} finally {
  await browser.close();
}
