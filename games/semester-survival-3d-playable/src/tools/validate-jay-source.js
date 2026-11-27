#!/usr/bin/env node
/**
 * Read-only audit for Jay's original source sheets.
 * Detects actual image encodings, measures pixel dimensions and checks that
 * known frame grids divide evenly. It never renames, rewrites or crops assets.
 *
 * Run from any working directory:
 *   node games/semester-survival/tools/validate-jay-source.js
 * Add --strict to exit non-zero when any warning is found.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.resolve(__dirname, '../../../../artwork/semester-survival-runner/jay-source');
const expected = Object.freeze({
  '1795073501939.jpg': { action: 'turnaround', columns: 4, rows: 1 },
  '1795074192816.jpg': { action: 'idle', columns: 4, rows: 1 },
  '1795074517333.jpg': { action: 'walk', columns: 4, rows: 2 },
  '1795074841200.jpg': { action: 'jog', columns: 4, rows: 2 },
  'Meta_AI_sprint_20261119_110406.jpg': { action: 'sprint', columns: 4, rows: 2 },
  'Meta_AI_916951766_1841479800241068_9219361324369617113_n_20261119_110911.webp': { action: 'jump-standing', columns: 4, rows: 2 },
  'Meta_AI_916811181_1450185383862546_3331141356748851519_n_20261119_111431.webp': { action: 'jump-running', columns: 4, rows: 2 },
  'Meta_AI_916952132_1143042368122950_6500628437492435153_n_20261119_112204.webp': { action: 'fall-accidental', columns: 4, rows: 2 },
  'Meta_AI_916882119_2702665886828845_97200770314772330_n_20261119_112422.webp': { action: 'get-up-recovery', columns: 4, rows: 2 },
  'Meta_AI_916882035_28451130907895002_8609570660650290104_n_20261119_115527.webp': { action: 'greeting-wave', columns: 4, rows: 2 },
  'Meta_AI_916882081_994725666517201_3357036583534970929_n_20261119_120922.webp': { action: 'phone-use', columns: 4, rows: 2 },
  'Meta_AI_916953425_2325867808197235_9058160883401323934_n_20261119_121150.webp': { action: 'sit-stand', columns: 4, rows: 2 }
});

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  const sof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (offset + 4 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    let marker = buffer[offset + 1];
    offset += 2;
    while (marker === 0xff && offset < buffer.length) marker = buffer[offset++];
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (sof.has(marker) && offset + 7 < buffer.length) {
      return { width: buffer.readUInt16BE(offset + 5), height: buffer.readUInt16BE(offset + 3) };
    }
    if (length < 2) break;
    offset += length;
  }
  return null;
}

function inspect(buffer) {
  if (buffer.length >= 24 &&
      buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { format: 'PNG', width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { format: 'WebP', width: null, height: null };
  }
  const jpeg = jpegDimensions(buffer);
  if (jpeg) return { format: 'JPEG', ...jpeg };
  return { format: 'unknown', width: null, height: null };
}

function main() {
  if (!fs.existsSync(sourceDir)) {
    console.error('Jay source directory not found:', sourceDir);
    process.exitCode = 2;
    return;
  }

  const files = fs.readdirSync(sourceDir).filter(name => /\.(?:jpe?g|png|webp)$/i.test(name)).sort();
  const report = [];
  let warningCount = 0;

  for (const filename of files) {
    const fullPath = path.join(sourceDir, filename);
    const buffer = fs.readFileSync(fullPath);
    const actual = inspect(buffer);
    const ext = path.extname(filename).slice(1).toLowerCase();
    const expectedFormat = ext === 'jpg' || ext === 'jpeg' ? 'JPEG' : ext === 'webp' ? 'WebP' : 'PNG';
    const grid = expected[filename] || null;
    const warnings = [];

    if (actual.format !== expectedFormat) warnings.push('extension says ' + expectedFormat + ' but bytes are ' + actual.format);
    if (grid && actual.width && actual.height &&
        (actual.width % grid.columns !== 0 || actual.height % grid.rows !== 0)) {
      warnings.push('dimensions do not divide evenly into the expected ' + grid.columns + 'x' + grid.rows + ' grid');
    }
    if (grid && (!actual.width || !actual.height)) warnings.push('could not measure dimensions for expected frame grid');
    if (!grid) warnings.push('no authored action/grid record exists for this filename');

    warningCount += warnings.length;
    report.push({
      file: filename,
      bytes: buffer.length,
      actualFormat: actual.format,
      width: actual.width,
      height: actual.height,
      action: grid ? grid.action : 'unclassified',
      frameColumns: grid ? grid.columns : null,
      frameRows: grid ? grid.rows : null,
      cellWidth: grid && actual.width ? actual.width / grid.columns : null,
      cellHeight: grid && actual.height ? actual.height / grid.rows : null,
      warnings
    });
  }

  console.log(JSON.stringify({ sourceDir, filesChecked: report.length, warningCount, report }, null, 2));
  if (process.argv.includes('--strict') && warningCount > 0) process.exitCode = 1;
}

main();
