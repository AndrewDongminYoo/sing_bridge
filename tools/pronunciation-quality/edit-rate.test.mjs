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
const layer = (target = 'ko', overrides = {}) => ({
  version: 1,
  target,
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
  ...overrides,
});
const item = (pronunciations, overrides = {}) => ({
  videoId: 'AAAAAAAAAAA',
  lyricId: 7,
  title: 'Synthetic song',
  offset: 0,
  pronunciations,
  pronunciationTarget: 'ko',
  ...overrides,
});
const library = (...items) => ({ version: 1, items });

test('reports each saved layer, counting missing lines against the ratio', () => {
  const report = editRate(library(item({ ko: layer() })));
  assert.deepEqual(report.layers, [
    {
      videoId: 'AAAAAAAAAAA',
      lyricId: 7,
      title: 'Synthetic song',
      target: 'ko',
      textLines: 4,
      generatedLines: 3,
      missingLines: 1,
      complete: false,
      editedLines: 2,
      uneditedLines: 1,
      reviewFlaggedLines: 2,
      uneditedRatio: 0.25,
    },
  ]);
});

test('an edit equal to the generated text does not count as a change', () => {
  const unchanged = layer('ko', { edits: { 'line-0': '원', 'line-2': '三' } });
  const report = editRate(library(item({ ko: unchanged })));
  assert.equal(report.layers[0].editedLines, 0);
  assert.equal(report.layers[0].uneditedRatio, 0.75);
});

test('the report never contains lyric or pronunciation text', () => {
  const report = editRate(library(item({ ko: layer() })), {
    reviewed: ['7:ko'],
  });
  assert.equal(report.layers.length, 1);
  const text = JSON.stringify(report);
  assert.ok(!text.includes(SECRET));
  assert.ok(!text.includes('원'));
});

test('totals cover only reviewed layers and count songs separately from layers', () => {
  const data = library(
    item({ ko: layer(), en: layer('en', { edits: {} }) }),
    item(
      { ko: layer() },
      { videoId: 'BBBBBBBBBBB', lyricId: 8, title: 'Unreviewed' },
    ),
    item(undefined, { videoId: 'CCCCCCCCCCC', lyricId: 9, title: 'No layer' }),
  );
  const unselected = editRate(data);
  assert.equal(unselected.layers.length, 3);
  assert.equal(unselected.total, null);
  const report = editRate(data, { reviewed: ['7:ko', '7:en'] });
  assert.deepEqual(report.total, {
    songs: 1,
    layers: 2,
    textLines: 8,
    generatedLines: 6,
    missingLines: 2,
    editedLines: 2,
    uneditedLines: 4,
    uneditedRatio: 0.5,
  });
});

test('a reviewed selection must name saved layers', () => {
  const data = library(item({ ko: layer() }));
  for (const reviewed of [['7:en'], ['8:ko'], ['seven:ko']]) {
    assert.throws(() => editRate(data, { reviewed }), /reviewed/);
  }
});

test('rejects anything that is not a valid version 1 saved library', () => {
  const invalid = [
    {},
    { version: 2, items: [] },
    { version: 1, items: {} },
    library(null),
    library(item({ ko: layer() }, { videoId: 'short' })),
    library(item({ ko: layer() }, { lyricId: 0 })),
    library(item({ fr: layer('fr') })),
    library(item({ ko: layer('en') })),
    library(
      item({ ko: layer('ko', { lines: [line('bad', segment('x', 'y'))] }) }),
    ),
    library(
      item({ ko: layer('ko', { lines: [line('line-9', segment('x', 'y'))] }) }),
    ),
    library(
      item({
        ko: layer('ko', {
          lines: [
            line('line-0', segment('x', 'y')),
            line('line-0', segment('x', 'y')),
          ],
        }),
      }),
    ),
    library(
      item({
        ko: layer('ko', {
          lines: [line('line-0', { source: 'x', pronunciation: 'y' })],
        }),
      }),
    ),
    library(item({ ko: layer('ko', { edits: { 'line-4': 'z' } }) })),
  ];
  for (const data of invalid) {
    assert.throws(
      () => editRate(data),
      /saved library|saved pronunciation/,
      JSON.stringify(data).slice(0, 80),
    );
  }
});

function runCli(buffer, args = []) {
  const directory = mkdtempSync(join(tmpdir(), 'singbridge-edit-rate-'));
  try {
    const file = join(directory, 'library.json');
    writeFileSync(file, buffer);
    return spawnSync(process.execPath, [cli, file, ...args], {
      encoding: 'utf8',
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('the CLI reads UTF-8 and the UTF-16LE value WebKit stores', () => {
  const json = JSON.stringify(library(item({ ko: layer() })));
  for (const buffer of [
    Buffer.from(json, 'utf8'),
    Buffer.from(json, 'utf16le'),
  ]) {
    const child = runCli(buffer, ['--reviewed', '7:ko']);
    assert.equal(child.status, 0, child.stderr);
    assert.equal(JSON.parse(child.stdout).total.editedLines, 2);
    assert.ok(!child.stdout.includes(SECRET));
  }
});

test('the CLI exits 2 on invalid input or options without echoing input', () => {
  const valid = Buffer.from(JSON.stringify(library(item({ ko: layer() }))));
  for (const [buffer, args] of [
    [Buffer.from('{"version":1,"items":[' + SECRET), []],
    [valid, ['--reviewed']],
    [valid, ['--unknown', 'x']],
  ]) {
    const child = runCli(buffer, args);
    assert.equal(child.status, 2, args.join(' '));
    assert.equal(child.stdout, '');
    assert.ok(!child.stderr.includes(SECRET));
  }
});
