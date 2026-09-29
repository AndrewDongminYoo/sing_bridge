// Reports how many generated pronunciation lines a reviewer edited, from the app's saved library.
// The report holds counts and IDs only; lyric and pronunciation text never leave the process.
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const MAX_BYTES = 4 * 1048576;

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

function songReport(item, target, data) {
  if (!Array.isArray(data?.source) || !Array.isArray(data?.lines)) {
    throw new Error('Saved pronunciation needs source and lines arrays.');
  }
  const edits =
    data.edits && typeof data.edits === 'object' && !Array.isArray(data.edits)
      ? data.edits
      : {};
  let editedLines = 0;
  let reviewFlaggedLines = 0;
  for (const line of data.lines) {
    if (
      typeof line?.id !== 'string' ||
      !/^line-(0|[1-9][0-9]*)$/.test(line.id)
    ) {
      throw new Error('Saved pronunciation has an invalid line id.');
    }
    if (!Array.isArray(line.segments)) {
      throw new Error('Saved pronunciation line has no segments.');
    }
    const edit = edits[line.id];
    if (typeof edit === 'string' && edit !== generatedText(line)) editedLines++;
    if (line.segments.some((segment) => segment.needsReview === true)) {
      reviewFlaggedLines++;
    }
  }
  const textLines = data.source.filter(
    (entry) => typeof entry?.text === 'string' && entry.text.length > 0,
  ).length;
  const generatedLines = data.lines.length;
  return {
    videoId: item.videoId,
    lyricId: item.lyricId,
    title: item.title,
    target,
    textLines,
    generatedLines,
    missingLines: Math.max(0, textLines - generatedLines),
    editedLines,
    uneditedLines: generatedLines - editedLines,
    reviewFlaggedLines,
    uneditedRatio: ratio(generatedLines - editedLines, generatedLines),
  };
}

export function editRate(library) {
  if (library?.version !== 1 || !Array.isArray(library.items)) {
    throw new Error(
      'Input must be a version 1 saved library ({ version: 1, items: [...] }).',
    );
  }
  const songs = library.items.flatMap((item) =>
    Object.entries(item?.pronunciations ?? {}).map(([target, data]) =>
      songReport(item, target, data),
    ),
  );
  const generatedLines = songs.reduce(
    (sum, song) => sum + song.generatedLines,
    0,
  );
  const editedLines = songs.reduce((sum, song) => sum + song.editedLines, 0);
  return {
    songs,
    total: {
      songs: songs.length,
      generatedLines,
      editedLines,
      uneditedLines: generatedLines - editedLines,
      uneditedRatio: ratio(generatedLines - editedLines, generatedLines),
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

function main([file, ...rest]) {
  if (!file || rest.length) {
    throw new Error(
      'Usage: node tools/pronunciation-quality/edit-rate.mjs <saved library file>',
    );
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
  process.stdout.write(JSON.stringify(editRate(library), null, 2) + '\n');
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
