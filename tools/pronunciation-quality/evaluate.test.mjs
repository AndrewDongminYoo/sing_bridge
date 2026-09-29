import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cli = fileURLToPath(new URL('./evaluate.mjs', import.meta.url));
const cases = [
  {
    id: 'match',
    language: 'ja',
    source: '青い空',
    modelReading: 'アオイソラ',
    expected: 'reference_match',
  },
  {
    id: 'difference',
    language: 'ja',
    source: '青い空',
    modelReading: 'アカイソラ',
    expected: 'reference_difference',
  },
  {
    id: 'unknown',
    language: 'en',
    source: 'Hello',
    modelReading: null,
    expected: 'unassessable',
  },
];
function run(data, args = ['--check'], raw = false) {
  const dir = mkdtempSync(join(tmpdir(), 'singbridge-quality-'));
  try {
    const file = join(dir, 'cases.json');
    writeFileSync(file, raw ? data : JSON.stringify(data));
    return spawnSync(process.execPath, [cli, file, ...args], {
      encoding: 'utf8',
      timeout: 10000,
    });
  } finally {
    rmSync(dir, { recursive: true });
  }
}

test('CLI measures comparison coverage separately from dictionary agreement', () => {
  const result = run({ version: 1, cases });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.summary, {
    total: 3,
    comparable: 2,
    matches: 1,
    differences: 1,
    unassessable: 1,
    coverage: 2 / 3,
    agreementAmongComparable: 0.5,
  });
  assert.equal(report.engine.name, 'kuromoji');
  assert.equal(report.engine.version, '0.1.2');
  assert.ok(report.startupMs > 0);
  assert.ok(report.results.every((row) => row.elapsedMs >= 0));
  assert.deepEqual(
    report.results.map((row) => row.source),
    cases.map((row) => row.source),
  );
});

test('check mode fails a deliberately incorrect baseline instead of accepting its shape', () => {
  const result = run({
    version: 1,
    cases: [{ ...cases[0], expected: 'reference_difference' }],
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Baseline mismatch: match/);
  assert.deepEqual(JSON.parse(result.stdout).baselineMismatches, ['match']);
});

test('zero comparable phrases yields no agreement score', () => {
  const result = run({ version: 1, cases: [cases[2]] });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    JSON.parse(result.stdout).summary.agreementAmongComparable,
    null,
  );
});

test('malformed fixture schema, duplicate IDs, and missing baselines fail explicitly', () => {
  for (const input of [
    {},
    { version: 2, cases },
    { version: 1, cases: [] },
    { version: 1, cases: [cases[0], cases[0]] },
    { version: 1, cases: [{ ...cases[0], expected: undefined }] },
    { version: 1, cases: [{ ...cases[0], source: null }] },
  ]) {
    const result = run(input);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Invalid (fixture|phrase)/);
  }
});

test('report-only mode permits user samples without expected outcomes', () => {
  const result = run(
    { version: 1, cases: [{ ...cases[0], expected: undefined }] },
    [],
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).results[0].status, 'reference_match');
});

function capture() {
  return {
    version: 1,
    request: {
      target: 'ko',
      lines: [
        { id: 'line-8', text: '青い空 Hello 안녕' },
        { id: 'line-12', text: '今日' },
      ],
    },
    result: {
      target: 'ko',
      lines: [
        {
          id: 'line-8',
          segments: [
            {
              source: '青い空 ',
              language: 'ja',
              reading: 'アオイソラ',
              pronunciation: '아오이 소라 ',
              needsReview: false,
            },
            {
              source: 'Hello ',
              language: 'en',
              reading: 'hello',
              pronunciation: '헬로 ',
              needsReview: false,
            },
            {
              source: '안녕',
              language: 'ko',
              reading: null,
              pronunciation: null,
              needsReview: false,
            },
          ],
        },
        {
          id: 'line-12',
          segments: [
            {
              source: '今日',
              language: 'ja',
              reading: null,
              pronunciation: null,
              needsReview: true,
            },
          ],
        },
      ],
    },
  };
}

test('response mode compares real segment boundaries and retains provenance and review flags', () => {
  const result = run(capture(), ['--response']);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.inputKind, 'response');
  assert.equal(report.target, 'ko');
  assert.equal(report.modelReviewRequired, 1);
  assert.deepEqual(
    report.results.map((row) => [
      row.id,
      row.lineId,
      row.segmentIndex,
      row.source,
      row.language,
    ]),
    [
      ['line-8:0', 'line-8', 0, '青い空 ', 'ja'],
      ['line-8:1', 'line-8', 1, 'Hello ', 'en'],
      ['line-8:2', 'line-8', 2, '안녕', 'ko'],
      ['line-12:0', 'line-12', 0, '今日', 'ja'],
    ],
  );
  assert.equal(report.results[0].pronunciation, '아오이 소라 ');
  assert.equal(report.results[0].status, 'reference_match');
  assert.equal(report.results[3].needsReview, true);
  assert.equal(report.results[3].reason, 'unsupported_or_missing_reading');
  assert.deepEqual(report.summary, {
    total: 4,
    comparable: 1,
    matches: 1,
    differences: 0,
    unassessable: 3,
    coverage: 0.25,
    agreementAmongComparable: 1,
  });
});

test('a dictionary match does not clear the model review flag or invent final pronunciation', () => {
  const data = capture();
  Object.assign(data.result.lines[0].segments[0], {
    needsReview: true,
    pronunciation: null,
  });
  const result = run(data, ['--response']);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.modelReviewRequired, 2);
  assert.equal(report.results[0].status, 'reference_match');
  assert.equal(report.results[0].needsReview, true);
  assert.equal(report.results[0].pronunciation, null);
});

test('capture validation rejects source changes, IDs, targets, invalid reviews, and unknown envelopes', () => {
  const mutations = [
    (data) => {
      data.result.lines[0].segments[0].source = 'PRIVATE_SENTINEL';
    },
    (data) => {
      data.result.lines.reverse();
    },
    (data) => {
      data.request.lines[1].id = 'line-8';
    },
    (data) => {
      data.result.target = 'en';
    },
    (data) => {
      data.result.lines[1].segments[0].pronunciation = 'きょう';
    },
    (data) => {
      data.result.lines[0].segments[2].pronunciation = '안녕';
    },
    (data) => {
      delete data.result.lines[0].segments[0].reading;
    },
    (data) => {
      data.version = 2;
    },
    (data) => {
      data.usage = {};
    },
    (data) => {
      data.request.lines = [];
    },
  ];
  for (const mutate of mutations) {
    const data = capture();
    mutate(data);
    const result = run(data, ['--response']);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Invalid capture/);
    assert.equal(result.stdout, '');
    assert.doesNotMatch(result.stderr, /PRIVATE_SENTINEL/);
  }
});

test('response mode handles the full server segment bound but rejects an oversized line', () => {
  const request = { target: 'ko', lines: [] },
    result = { target: 'ko', lines: [] };
  for (let i = 0; i < 12; i++) {
    request.lines.push({ id: `line-${i}`, text: 'あ'.repeat(40) });
    result.lines.push({
      id: `line-${i}`,
      segments: Array.from({ length: 40 }, () => ({
        source: 'あ',
        language: 'ja',
        reading: 'ア',
        pronunciation: '아',
        needsReview: false,
      })),
    });
  }
  const valid = run({ version: 1, request, result }, ['--response']);
  assert.equal(valid.status, 0, valid.stderr);
  const report = JSON.parse(valid.stdout);
  assert.equal(report.results.length, 480);
  assert.equal(new Set(report.results.map((row) => row.id)).size, 480);
  result.lines[0].segments.push({ ...result.lines[0].segments[0] });
  request.lines[0].text += 'あ';
  const invalid = run({ version: 1, request, result }, ['--response']);
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /Invalid capture/);
});

test('response mode requires explicit input and cannot masquerade as a correctness gate', () => {
  for (const args of [
    ['--response', '--check'],
    ['--response', '--response'],
  ]) {
    const result = run(capture(), args);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Usage/);
  }
  const missing = spawnSync(process.execPath, [cli, '--response'], {
    encoding: 'utf8',
  });
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /Usage/);
});

test('whitespace-only server segments are retained as unassessable rather than breaking the batch', () => {
  const data = {
    version: 1,
    request: { target: 'ko', lines: [{ id: 'line-0', text: ' \n' }] },
    result: {
      target: 'ko',
      lines: [
        {
          id: 'line-0',
          segments: [
            {
              source: ' \n',
              language: 'und',
              reading: null,
              pronunciation: null,
              needsReview: true,
            },
          ],
        },
      ],
    },
  };
  const result = run(data, ['--response']);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.results[0].source, ' \n');
  assert.equal(report.results[0].status, 'unassessable');
  assert.equal(report.results[0].reason, 'non_lexical_source');
  assert.equal(report.summary.agreementAmongComparable, null);
});

test('malformed or oversized captures fail without exposing supplied text', () => {
  for (const raw of ['PRIVATE_SENTINEL', ' '.repeat(1048577)]) {
    const result = run(raw, ['--response'], true);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.doesNotMatch(result.stderr, /PRIVATE_SENTINEL/);
  }
});
