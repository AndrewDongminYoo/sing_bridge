import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { editRate } from './edit-rate.mjs';

const cli = fileURLToPath(new URL('./edit-rate.mjs', import.meta.url));
// Original synthetic phrases; the sentinel proves no text reaches the report.
const SECRET = 'private-sentinel';
const segment = (source, pronunciation, needsReview = false) => ({
  source,
  language: 'ja',
  reading: null,
  pronunciation,
  needsReview,
});
const line = (id, ...segments) => ({ id, segments });
function library(pronunciation, extra = {}) {
  return {
    version: 1,
    items: [
      {
        videoId: 'AAAAAAAAAAA',
        lyricId: 7,
        title: 'Synthetic song',
        offset: 0,
        pronunciations: { ko: pronunciation },
        pronunciationTarget: 'ko',
        ...extra,
      },
    ],
  };
}
const pronunciation = {
  version: 1,
  target: 'ko',
  source: [
    { time: 1, text: SECRET + ' one' },
    { time: 2, text: '二' },
    { time: 3, text: '三' },
    { time: 4, text: '四' },
    { time: 5, text: '' },
  ],
  lines: [
    line('line-0', segment(SECRET + ' one', '원')),
    line('line-1', segment('二', '니', true)),
    line('line-2', segment('三', null, true)),
  ],
  edits: { 'line-0': '원 ' + SECRET, 'line-2': '산' },
};

test('reports edited, unedited, missing, and review-flagged lines per song', () => {
  const report = editRate(library(pronunciation));
  assert.deepEqual(report.songs, [
    {
      videoId: 'AAAAAAAAAAA',
      lyricId: 7,
      title: 'Synthetic song',
      target: 'ko',
      textLines: 4,
      generatedLines: 3,
      missingLines: 1,
      editedLines: 2,
      uneditedLines: 1,
      reviewFlaggedLines: 2,
      uneditedRatio: 0.333,
    },
  ]);
  assert.deepEqual(report.total, {
    songs: 1,
    generatedLines: 3,
    editedLines: 2,
    uneditedLines: 1,
    uneditedRatio: 0.333,
  });
});

test('an edit equal to the generated text does not count as a change', () => {
  const unchanged = {
    ...pronunciation,
    edits: { 'line-0': '원', 'line-2': '三' },
  };
  const song = editRate(library(unchanged)).songs[0];
  assert.equal(song.editedLines, 0);
  assert.equal(song.uneditedRatio, 1);
});

test('the report never contains lyric or pronunciation text', () => {
  const report = editRate(library(pronunciation));
  assert.equal(report.songs.length, 1);
  const text = JSON.stringify(report);
  assert.ok(!text.includes(SECRET));
  assert.ok(!text.includes('원'));
});

test('items without saved pronunciation are skipped and totals span songs and targets', () => {
  const data = library(pronunciation, {
    pronunciations: {
      ko: pronunciation,
      en: { ...pronunciation, target: 'en', edits: {} },
    },
  });
  data.items.push({
    videoId: 'BBBBBBBBBBB',
    lyricId: 8,
    title: 'No layer',
    offset: 0,
  });
  const report = editRate(data);
  assert.deepEqual(
    report.songs.map((song) => [song.lyricId, song.target, song.editedLines]),
    [
      [7, 'ko', 2],
      [7, 'en', 0],
    ],
  );
  assert.deepEqual(report.total, {
    songs: 2,
    generatedLines: 6,
    editedLines: 2,
    uneditedLines: 4,
    uneditedRatio: 0.667,
  });
});

test('rejects data that is not a version 1 saved library', () => {
  for (const invalid of [
    {},
    { version: 2, items: [] },
    { version: 1, items: {} },
  ]) {
    assert.throws(() => editRate(invalid), /saved library/);
  }
  assert.throws(
    () =>
      editRate(
        library({ ...pronunciation, lines: [line('bad', segment('x', 'y'))] }),
      ),
    /line id/,
  );
});

function runCli(buffer) {
  const directory = mkdtempSync(join(tmpdir(), 'singbridge-edit-rate-'));
  try {
    const file = join(directory, 'library.json');
    writeFileSync(file, buffer);
    return spawnSync(process.execPath, [cli, file], { encoding: 'utf8' });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('the CLI reads UTF-8 and the UTF-16LE value WebKit stores', () => {
  const json = JSON.stringify(library(pronunciation));
  for (const buffer of [
    Buffer.from(json, 'utf8'),
    Buffer.from(json, 'utf16le'),
  ]) {
    const child = runCli(buffer);
    assert.equal(child.status, 0, child.stderr);
    assert.equal(JSON.parse(child.stdout).total.editedLines, 2);
    assert.ok(!child.stdout.includes(SECRET));
  }
});

test('the CLI exits 2 on invalid input without echoing it', () => {
  const child = runCli(Buffer.from('{"version":1,"items":[' + SECRET));
  assert.equal(child.status, 2);
  assert.equal(child.stdout, '');
  assert.ok(!child.stderr.includes(SECRET));
});
