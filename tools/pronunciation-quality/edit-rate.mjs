// Reports how many generated pronunciation lines a reviewer edited, from the app's saved library.
// The report holds counts and IDs only; lyric and pronunciation text never leave the process.
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MAX_BYTES = 4 * 1048576;
const TARGETS = ['ko', 'en'];
const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function invalid(what) {
  throw new Error(`Invalid saved pronunciation: ${what}.`);
}

// Follows validSavedEntry and validStoredPronunciation in the page script for the fields this report reads.
function validateLayer(target, data) {
  if (!TARGETS.includes(target))
    invalid(`unsupported target ${JSON.stringify(target)}`);
  if (!isObject(data) || data.version !== 1 || data.target !== target) {
    invalid('layer version or target');
  }
  if (
    !Array.isArray(data.source) ||
    !data.source.length ||
    !data.source.every(
      (entry) =>
        isObject(entry) &&
        Number.isFinite(entry.time) &&
        entry.time >= 0 &&
        typeof entry.text === 'string',
    )
  ) {
    invalid('source lines');
  }
  if (
    !Array.isArray(data.lines) ||
    !data.lines.length ||
    data.lines.length > data.source.length
  ) {
    invalid('generated lines');
  }
  const ids = new Set();
  for (const line of data.lines) {
    const match = /^line-(0|[1-9][0-9]*)$/.exec(line?.id ?? '');
    if (!match || ids.has(line.id) || !data.source[Number(match[1])]?.text) {
      invalid('line id');
    }
    ids.add(line.id);
    if (
      !Array.isArray(line.segments) ||
      !line.segments.length ||
      !line.segments.every(
        (segment) =>
          isObject(segment) &&
          typeof segment.source === 'string' &&
          (segment.pronunciation === null ||
            typeof segment.pronunciation === 'string') &&
          typeof segment.needsReview === 'boolean',
      )
    ) {
      invalid('line segments');
    }
    // Like validatePronunciation: the segments must reproduce their source line exactly.
    if (
      line.segments.map((segment) => segment.source).join('') !==
      data.source[Number(match[1])].text
    ) {
      invalid('segments do not reproduce the source line');
    }
  }
  if (
    !isObject(data.edits) ||
    !Object.entries(data.edits).every(
      ([id, text]) => ids.has(id) && typeof text === 'string',
    )
  ) {
    invalid('edits');
  }
}

function validateLibrary(library) {
  if (
    !isObject(library) ||
    library.version !== 1 ||
    !Array.isArray(library.items)
  ) {
    throw new Error(
      'Input must be a version 1 saved library ({ version: 1, items: [...] }).',
    );
  }
  for (const item of library.items) {
    if (
      !isObject(item) ||
      typeof item.videoId !== 'string' ||
      !/^[A-Za-z0-9_-]{11}$/.test(item.videoId) ||
      !Number.isSafeInteger(item.lyricId) ||
      item.lyricId <= 0 ||
      typeof item.title !== 'string'
    ) {
      throw new Error('Invalid saved library entry.');
    }
    if (item.pronunciations === undefined) continue;
    if (!isObject(item.pronunciations)) invalid('pronunciations');
    for (const [target, data] of Object.entries(item.pronunciations)) {
      validateLayer(target, data);
    }
  }
}

// Mirrors pronunciationText in YouTubePronunciation.kt: the text a line shows before any edit.
function generatedText(line) {
  return line.segments
    .map((segment) =>
      segment.pronunciation === null
        ? segment.source
        : segment.source.match(/^\s*/)[0] +
          segment.pronunciation.trim() +
          segment.source.match(/\s*$/)[0],
    )
    .join('');
}

const ratio = (part, whole) =>
  whole ? Number((part / whole).toFixed(3)) : null;

function layerReport(item, target, data) {
  let editedLines = 0;
  let reviewFlaggedLines = 0;
  for (const line of data.lines) {
    const edit = data.edits[line.id];
    if (typeof edit === 'string' && edit !== generatedText(line)) editedLines++;
    if (line.segments.some((segment) => segment.needsReview))
      reviewFlaggedLines++;
  }
  const textLines = data.source.filter((entry) => entry.text.length > 0).length;
  const generatedLines = data.lines.length;
  const missingLines = textLines - generatedLines;
  const uneditedLines = generatedLines - editedLines;
  return {
    videoId: item.videoId,
    lyricId: item.lyricId,
    title: item.title,
    target,
    textLines,
    generatedLines,
    missingLines,
    complete: missingLines === 0,
    editedLines,
    uneditedLines,
    reviewFlaggedLines,
    // Missing lines were never assessable, so they count against the ratio.
    uneditedRatio: ratio(uneditedLines, textLines),
  };
}

// A key is "<lyricId>:<target>", or "<videoId>:<lyricId>:<target>" when one lyric is saved for several videos.
const matches = (key, layer) =>
  key === `${layer.lyricId}:${layer.target}` ||
  key === `${layer.videoId}:${layer.lyricId}:${layer.target}`;

// `reviewed` names the layers a reviewer finished; only they enter the totals.
export function editRate(library, { reviewed = [] } = {}) {
  validateLibrary(library);
  const layers = library.items.flatMap((item) =>
    Object.entries(item.pronunciations ?? {}).map(([target, data]) =>
      layerReport(item, target, data),
    ),
  );
  const selected = new Set();
  for (const key of reviewed) {
    const found = layers.filter((layer) => matches(key, layer));
    if (!found.length) {
      throw new Error(
        `The reviewed layer ${JSON.stringify(key)} is not in the saved library.`,
      );
    }
    if (found.length > 1) {
      throw new Error(
        `The reviewed layer ${JSON.stringify(key)} matches more than one saved video; use <videoId>:<lyricId>:<target>.`,
      );
    }
    selected.add(found[0]);
  }
  if (!reviewed.length) return { layers, total: null };
  const sum = (field) =>
    [...selected].reduce((total, layer) => total + layer[field], 0);
  const textLines = sum('textLines');
  const uneditedLines = sum('uneditedLines');
  return {
    layers,
    total: {
      songs: new Set(
        [...selected].map((layer) => `${layer.videoId}:${layer.lyricId}`),
      ).size,
      layers: selected.size,
      textLines,
      generatedLines: sum('generatedLines'),
      missingLines: sum('missingLines'),
      editedLines: sum('editedLines'),
      uneditedLines,
      uneditedRatio: ratio(uneditedLines, textLines),
    },
  };
}

// WebKit stores localStorage values as UTF-16LE; exported files may be either encoding.
function decode(buffer) {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString('utf16le');
  }
  if (buffer.length >= 2 && buffer[1] === 0) return buffer.toString('utf16le');
  return buffer.toString('utf8').replace(/^﻿/, '');
}

function main([file, ...options]) {
  const usage =
    'Usage: node tools/pronunciation-quality/edit-rate.mjs <saved library file> [--reviewed <lyricId>:<target>]...';
  if (!file) throw new Error(usage);
  const reviewed = [];
  for (let index = 0; index < options.length; index += 2) {
    const [option, value] = [options[index], options[index + 1]];
    if (option !== '--reviewed') throw new Error(usage);
    if (value === undefined || value.startsWith('--')) {
      throw new Error('--reviewed needs a <lyricId>:<target> value.');
    }
    reviewed.push(value);
  }
  const buffer = readFileSync(file);
  if (buffer.length > MAX_BYTES) throw new Error('Input is larger than 4 MiB.');
  let library;
  try {
    library = JSON.parse(decode(buffer));
  } catch {
    // Parser messages can quote the input, which contains lyrics.
    throw new Error('Input is not valid JSON.');
  }
  process.stdout.write(
    JSON.stringify(editRate(library, { reviewed }), null, 2) + '\n',
  );
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(error.message + '\n');
    process.exitCode = 2;
  }
}
